/**
 * export.ts
 *
 * Export helpers for Kanam Forge projects. Since we are no longer tied to
 * Vercel, "publish" is replaced by two local-first export options:
 *   1. Download the project source as a ZIP archive.
 *   2. Push the project source to a new GitHub repository (via gh CLI).
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { readRepoMetadata } from "@/lib/docker/repo-storage-local";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const projectDir = (repoId: string) => join(KANAM_FORGE_DATA_DIR, repoId);
const workspaceDir = (repoId: string) => join(projectDir(repoId), "workspace");

/** Files/dirs to exclude from the exported ZIP. */
const EXCLUDES = [
  "node_modules/*",
  ".next/*",
  ".git/*",
  ".env",
  ".env.local",
  "*.log",
  ".DS_Store",
];

/** Sanitize a name into a safe slug for filenames / repo names. */
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "kanam-forge-app";

/** Resolve the display name of a project (falls back to the repo id). */
const resolveProjectName = async (repoId: string) => {
  const metadata = await readRepoMetadata(repoId);
  return metadata?.name?.trim() || repoId;
};

/**
 * Build a ZIP archive of the project workspace and return its path.
 * The archive is written to a temp dir and cleaned up by the caller.
 */
export const buildProjectZip = async (repoId: string): Promise<string> => {
  const ws = workspaceDir(repoId);
  if (!existsSync(ws)) {
    throw new Error("Project workspace not found");
  }

  const name = await resolveProjectName(repoId);
  const slug = slugify(name);
  const tmpDir = join(projectDir(repoId), ".export");
  mkdirSync(tmpDir, { recursive: true });

  const zipPath = join(tmpDir, `${slug}.zip`);
  // Remove any stale archive
  if (existsSync(zipPath)) rmSync(zipPath);

  const excludes = EXCLUDES.map((e) => `-x "${e}"`).join(" ");
  // cd into the workspace so the archive root is the project contents
  const cmd = `cd "${ws}" && zip -r "${zipPath}" . ${excludes}`;
  execSync(cmd, { stdio: "pipe" });

  return zipPath;
};

/** Clean up the temp export dir for a project. */
export const cleanupProjectExport = (repoId: string) => {
  const tmpDir = join(projectDir(repoId), ".export");
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
};

/**
 * Push the project source to a new GitHub repository using the gh CLI.
 * Returns the created repo URL.
 */
export const exportToGithub = async (
  repoId: string,
  opts: { private?: boolean } = {},
): Promise<{ url: string; name: string }> => {
  const ws = workspaceDir(repoId);
  if (!existsSync(ws)) {
    throw new Error("Project workspace not found");
  }

  const name = await resolveProjectName(repoId);
  const slug = slugify(name);

  // Check gh is available and authenticated
  try {
    execSync("gh auth status", { stdio: "pipe" });
  } catch {
    throw new Error(
      "GitHub CLI is not authenticated. Run 'gh auth login' first.",
    );
  }

  // Create the repo (private by default)
  const visibility = opts.private === false ? "--public" : "--private";
  execSync(`gh repo create "${slug}" ${visibility} --source "${ws}" --push`, {
    stdio: "pipe",
  });

  const url = `https://github.com/${execSync("gh api user -q .login", {
    encoding: "utf8",
  }).trim()}/${slug}`;

  return { url, name: slug };
};

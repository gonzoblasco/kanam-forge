/**
 * provision.ts
 *
 * Bootstraps a Next.js app inside the sandbox workspace when a new project is
 * created. Writes the scaffold to the host workspace dir (which is bind-mounted
 * into the container at /workspace), runs npm install + git init.
 */

import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import { FILES } from "@/lib/scaffold/files";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const workspaceDir = (repoId: string) => join(KANAM_FORGE_DATA_DIR, repoId, "workspace");

/**
 * Write the scaffold into the workspace dir. Returns true if it wrote
 * anything (i.e. the workspace was empty), false if it was already provisioned.
 */
export const provisionWorkspace = async (repoId: string): Promise<boolean> => {
  const ws = workspaceDir(repoId);
  if (!existsSync(ws)) return false;

  // If there's already a package.json, assume it's provisioned
  if (existsSync(join(ws, "package.json"))) return false;

  const { writeFileSync, mkdirSync } = await import("fs");
  for (const [rel, content] of Object.entries(FILES)) {
    const abs = join(ws, rel);
    mkdirSync(abs.substring(0, abs.lastIndexOf("/")), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }

  return true;
};

export const hasPackageJson = (repoId: string): boolean => {
  return existsSync(join(workspaceDir(repoId), "package.json"));
};

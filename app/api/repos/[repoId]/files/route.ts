import { NextResponse } from "next/server";
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".cache",
  "coverage",
]);

const EXCLUDED_FILES = new Set([".dev-server.log"]);

type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
};

const walk = (dir: string, basePath: string): FileNode[] => {
  try {
    return readdirSync(dir)
      .filter((name) => !EXCLUDED_DIRS.has(name) && !EXCLUDED_FILES.has(name))
      .sort((a, b) => {
        const aIsDir = statSync(join(dir, a)).isDirectory();
        const bIsDir = statSync(join(dir, b)).isDirectory();
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return a.localeCompare(b);
      })
      .map((name) => {
        const full = join(dir, name);
        const rel = join(basePath, name);
        const isDir = statSync(full).isDirectory();
        if (isDir) {
          return {
            name,
            path: rel,
            type: "dir" as const,
            children: walk(full, rel),
          };
        }
        return { name, path: rel, type: "file" as const };
      });
  } catch {
    return [];
  }
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  const ws = join(KANAM_FORGE_DATA_DIR, repoId, "workspace");
  if (!existsSync(ws)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const tree = walk(ws, "");
  return NextResponse.json({ tree });
}

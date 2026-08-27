import { NextResponse } from "next/server";
import { readFileSync, existsSync, statSync } from "fs";
import { join, resolve, normalize } from "path";
import { homedir } from "os";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

// Limit file reads to a reasonable size (e.g. 512KB) to avoid loading huge files.
const MAX_FILE_BYTES = 512 * 1024;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path") ?? "";

  // Resolve the absolute path and ensure it stays inside the workspace.
  const ws = join(KANAM_FORGE_DATA_DIR, repoId, "workspace");
  const abs = resolve(join(ws, normalize(filePath)));
  if (!abs.startsWith(ws)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!existsSync(abs) || !statSync(abs).isFile()) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const size = statSync(abs).size;
  if (size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is too large to preview" },
      { status: 413 },
    );
  }

  const content = readFileSync(abs, "utf8");
  return NextResponse.json({ path: filePath, content });
}

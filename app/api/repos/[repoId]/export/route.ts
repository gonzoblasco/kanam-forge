import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { basename } from "path";
import {
  buildProjectZip,
  cleanupProjectExport,
} from "@/lib/export";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  try {
    const zipPath = await buildProjectZip(repoId);
    const data = readFileSync(zipPath);
    const filename = basename(zipPath);

    // Clean up the temp archive after reading it
    cleanupProjectExport(repoId);

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to export project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

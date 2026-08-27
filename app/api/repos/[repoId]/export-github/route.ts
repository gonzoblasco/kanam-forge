import { NextResponse } from "next/server";
import { exportToGithub } from "@/lib/export";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  let body: { private?: boolean } = {};
  try {
    body = (await req.json().catch(() => ({}))) as { private?: boolean };
  } catch {
    // ignore
  }

  try {
    const result = await exportToGithub(repoId, {
      private: body.private !== false,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to export to GitHub";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { refVm } from "@/lib/docker/docker-vm";

/**
 * POST /api/repos/[repoId]/start
 * Ensures the project's container exists and the dev server is running.
 * Called when a project is opened so the preview is ready without asking
 * the agent to start it manually.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  try {
    const vm = refVm(repoId);
    // Check if the dev server is responding; if not, start it.
    const check = (await vm.exec({
      command: "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/",
    })) as { stdout?: string };
    const code = (check.stdout ?? "").trim();
    if (code !== "200") {
      await vm.exec({
        command:
          "nohup npm run dev > /workspace/.dev-server.log 2>&1 & sleep 3",
      });
    }
    return NextResponse.json({ started: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to start" },
      { status: 500 },
    );
  }
}

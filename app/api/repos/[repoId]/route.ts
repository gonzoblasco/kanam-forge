import { NextResponse } from "next/server";
import { renameRepo, deleteRepo } from "@/lib/docker/repo-storage-local";
import { removeVm } from "@/lib/docker/docker-vm";

/**
 * PATCH /api/repos/[repoId] - rename a project.
 * DELETE /api/repos/[repoId] - delete a project (container + files).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  let name: string | undefined;
  try {
    const body = (await req.json()) as { name?: string };
    name = body?.name?.trim();
  } catch {
    name = undefined;
  }

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const metadata = await renameRepo(repoId, name);
  if (!metadata) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ id: repoId, metadata });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;

  // Stop and remove the Docker container first
  removeVm(repoId);

  // Remove the project directory (metadata, conversations, workspace)
  const deleted = await deleteRepo(repoId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ id: repoId, deleted: true });
}

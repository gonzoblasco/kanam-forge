import { NextResponse } from "next/server";
import { readRepoMetadata } from "@/lib/repo-storage";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;

  const metadata = await readRepoMetadata(repoId);
  if (!metadata) {
    return NextResponse.json(
      { error: "Repository metadata not found" },
      { status: 404 },
    );
  }

  // Local MVP: no serverless deploy target. Promoting to a production domain
  // is not supported yet.
  return NextResponse.json(
    {
      error: "Production deployment is not available in the local MVP.",
      productionDomain: metadata.productionDomain,
      productionDeploymentId: null,
    },
    { status: 501 },
  );
}

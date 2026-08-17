import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  bootstrapProject,
  createVmForRepo,
  ensureSandboxImage,
  isDockerAvailable,
} from "@/lib/docker/docker-vm";
import {
  type RepoMetadata,
  createConversationInRepo,
  readRepoMetadata,
  writeRepoMetadata,
} from "@/lib/docker/repo-storage-local";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const listLocalProjects = (): string[] => {
  try {
    if (!existsSync(KANAM_FORGE_DATA_DIR)) return [];
    return readdirSync(KANAM_FORGE_DATA_DIR).filter((id) =>
      existsSync(join(KANAM_FORGE_DATA_DIR, id, "metadata.json")),
    );
  } catch {
    return [];
  }
};

export async function GET() {
  const repoIds = listLocalProjects();
  const repositories = repoIds.map((id) => {
    const metadata = readRepoMetadataSync(id);
    return {
      id,
      name: metadata?.name ?? id,
      metadata,
    };
  });

  return NextResponse.json({
    identityId: "local",
    repositories,
  });
}

// Sync wrapper for readRepoMetadata (it is async but resolves immediately)
function readRepoMetadataSync(repoId: string): RepoMetadata | null {
  // readRepoMetadata is async; use a sync read via the same file
  const full = join(KANAM_FORGE_DATA_DIR, repoId, "metadata.json");
  try {
    if (!existsSync(full)) return null;
    const metadata = JSON.parse(require("fs").readFileSync(full, "utf8")) as RepoMetadata;
    if (!metadata.sourceRepoId) return null;
    return metadata;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!isDockerAvailable()) {
    return NextResponse.json(
      { error: "Docker is not available. Kanam Forge requires Docker to run the sandbox." },
      { status: 500 },
    );
  }

  let requestedName: string | undefined;
  let requestedConversationTitle: string | undefined;
  try {
    const payload = (await req.json()) as {
      name?: string;
      conversationTitle?: string;
    };
    requestedName = payload?.name?.trim() || undefined;
    requestedConversationTitle = payload?.conversationTitle?.trim() || undefined;
  } catch {
    requestedName = undefined;
    requestedConversationTitle = undefined;
  }

  // Build the sandbox image once (idempotent)
  try {
    ensureSandboxImage();
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to build sandbox image: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }

  const repoId = randomUUID();
  const inferredName = requestedName ?? "Project";

  // Create the container for this project
  const vm = await createVmForRepo(repoId);

  // Provision the workspace + install deps + start dev server (async, best effort)
  try {
    await bootstrapProject(repoId);
  } catch (error) {
    console.error("bootstrapProject failed:", error);
  }

  const initialMetadata: RepoMetadata = {
    version: 2,
    sourceRepoId: repoId,
    ...(requestedName ? { name: requestedName } : {}),
    vm,
    conversations: [],
    deployments: [],
    productionDomain: null,
    productionDeploymentId: null,
  };

  await writeRepoMetadata(repoId, initialMetadata);

  const conversationId = randomUUID();
  const metadata = await createConversationInRepo(
    repoId,
    initialMetadata,
    conversationId,
    requestedConversationTitle,
  );

  return NextResponse.json({
    id: repoId,
    metadata,
    conversationId,
  });
}

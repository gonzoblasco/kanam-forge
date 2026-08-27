import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  bootstrapProject,
  createVmForRepo,
  ensureSandboxImage,
  importFromGithub,
  isDockerAvailable,
} from "@/lib/docker/docker-vm";
import {
  type RepoMetadata,
  createConversationInRepo,
  readRepoMetadata,
  writeRepoMetadata,
} from "@/lib/docker/repo-storage-local";
import { analyzeDescription, type AIAnalysis } from "@/lib/analyzer";

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
  let githubRepoName: string | undefined;
  try {
    const payload = (await req.json()) as {
      name?: string;
      conversationTitle?: string;
      githubRepoName?: string;
    };
    requestedName = payload?.name?.trim() || undefined;
    requestedConversationTitle = payload?.conversationTitle?.trim() || undefined;
    githubRepoName = payload?.githubRepoName?.trim() || undefined;
  } catch {
    requestedName = undefined;
    requestedConversationTitle = undefined;
    githubRepoName = undefined;
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
  const inferredName =
    requestedName ??
    (githubRepoName ? githubRepoName.split("/").pop() ?? githubRepoName : "Project");

  // If not importing from GitHub, run the analyzer on the project description
  // to personalize the scaffold. analyzeDescription has an internal try/catch
  // that returns a default analysis if Ollama is unavailable.
  let analysis: AIAnalysis | undefined;
  if (!githubRepoName) {
    const description = (requestedName ?? requestedConversationTitle ?? "").trim();
    if (description) {
      analysis = await analyzeDescription(description);
      if (!analysis || analysis.tables.length === 0) {
        console.warn("[analyzer] returned default analysis");
      }
    }
  }

  // Create the container for this project
  const vm = await createVmForRepo(repoId);

  // Provision the workspace: clone from GitHub if requested, else scaffold
  try {
    if (githubRepoName) {
      await importFromGithub(repoId, githubRepoName);
    } else {
      await bootstrapProject(repoId, analysis);
    }
  } catch (error) {
    console.error("project bootstrap failed:", error);
  }

  const initialMetadata: RepoMetadata = {
    version: 2,
    sourceRepoId: repoId,
    ...(inferredName ? { name: inferredName } : {}),
    ...(analysis ? { analysis } : {}),
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

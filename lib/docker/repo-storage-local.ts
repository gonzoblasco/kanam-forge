/**
 * repo-storage-local.ts
 *
 * Local replacement for the Freestyle-backed repo-storage.ts.
 * Persists project metadata and conversation history in the project
 * directory on disk (~/.kanam-forge/projects/<id>/).
 *
 *   <id>/
 *   ├── metadata.json
 *   ├── conversations/<conversationId>.json
 *   └── workspace/          (the actual project code, own git repo)
 */

import { type UIMessage } from "ai";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const ADORABLE_METADATA_PATH = "metadata.json";
const ADORABLE_CONVERSATIONS_DIR = "conversations";

export type RepoVmMetadata = {
  vmId: string;
  previewUrl: string;
  devCommandTerminalUrl: string | null;
  additionalTerminalsUrl: string | null;
};

export type RepoConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type RepoDeploymentSummary = {
  commitSha: string;
  commitMessage: string;
  commitDate: string;
  domain: string;
  url: string;
  deploymentId: string | null;
  state: "idle" | "deploying" | "live" | "failed";
};

export type RepoMetadata = {
  version: 2;
  sourceRepoId: string;
  name?: string;
  vm: RepoVmMetadata;
  conversations: RepoConversationSummary[];
  deployments: RepoDeploymentSummary[];
  productionDomain: string | null;
  productionDeploymentId: string | null;
};

const projectDir = (repoId: string) => join(KANAM_FORGE_DATA_DIR, repoId);

const ensureProjectDir = (repoId: string) => {
  const dir = projectDir(repoId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const conv = join(dir, ADORABLE_CONVERSATIONS_DIR);
  if (!existsSync(conv)) mkdirSync(conv, { recursive: true });
  const ws = join(dir, "workspace");
  if (!existsSync(ws)) mkdirSync(ws, { recursive: true });
  return dir;
};

const readJsonFile = <T>(repoId: string, path: string): T | null => {
  const full = join(projectDir(repoId), path);
  try {
    if (!existsSync(full)) return null;
    return JSON.parse(readFileSync(full, "utf8")) as T;
  } catch {
    return null;
  }
};

const writeJsonFile = (repoId: string, path: string, value: unknown) => {
  const full = join(projectDir(repoId), path);
  const dir = full.substring(0, full.lastIndexOf("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(full, JSON.stringify(value, null, 2), "utf8");
};

const conversationPath = (conversationId: string) =>
  join(ADORABLE_CONVERSATIONS_DIR, `${conversationId}.json`);

const deriveConversationTitle = (
  messages: UIMessage[] | undefined,
  fallback: string,
): string => {
  if (!Array.isArray(messages) || messages.length === 0) return fallback;
  const userMessage = messages.find((m) => m.role === "user");
  const textPart = userMessage?.parts?.find((part) => part.type === "text");
  const text = textPart && "text" in textPart ? textPart.text : "";
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return fallback;
  return clean.slice(0, 60);
};

export const readRepoMetadata = async (
  repoId: string,
): Promise<RepoMetadata | null> => {
  const metadata = readJsonFile<RepoMetadata>(repoId, ADORABLE_METADATA_PATH);
  if (!metadata) return null;
  if (!metadata.sourceRepoId) return null;
  return metadata;
};

export const resolveSourceRepoId = async (repoId: string) => {
  const metadata = await readRepoMetadata(repoId);
  return metadata?.sourceRepoId ?? repoId;
};

export const writeRepoMetadata = async (
  repoId: string,
  metadata: RepoMetadata,
) => {
  ensureProjectDir(repoId);
  writeJsonFile(repoId, ADORABLE_METADATA_PATH, metadata);
};

export const createConversationInRepo = async (
  repoId: string,
  metadata: RepoMetadata,
  conversationId: string,
  initialTitle?: string,
) => {
  ensureProjectDir(repoId);
  const latestMetadata = (await readRepoMetadata(repoId)) ?? metadata;
  const now = new Date().toISOString();
  const normalizedInitialTitle = initialTitle?.trim().replace(/\s+/g, " ");
  const fallbackTitle =
    normalizedInitialTitle && normalizedInitialTitle.length > 0
      ? normalizedInitialTitle.slice(0, 60)
      : `Conversation ${latestMetadata.conversations.length + 1}`;

  const nextMetadata: RepoMetadata = {
    ...metadata,
    ...latestMetadata,
    sourceRepoId: latestMetadata.sourceRepoId,
    conversations: [
      {
        id: conversationId,
        title: fallbackTitle,
        createdAt: now,
        updatedAt: now,
      },
      ...latestMetadata.conversations,
    ],
  };

  writeJsonFile(repoId, ADORABLE_METADATA_PATH, nextMetadata);
  writeJsonFile(repoId, conversationPath(conversationId), []);

  return nextMetadata;
};

export const readConversationMessages = async (
  repoId: string,
  conversationId: string,
): Promise<UIMessage[]> => {
  return (
    readJsonFile<UIMessage[]>(repoId, conversationPath(conversationId)) ?? []
  );
};

export const saveConversationMessages = async (
  repoId: string,
  metadata: RepoMetadata,
  conversationId: string,
  messages: UIMessage[],
) => {
  ensureProjectDir(repoId);
  const latestMetadata = (await readRepoMetadata(repoId)) ?? metadata;
  const now = new Date().toISOString();

  const existing = latestMetadata.conversations.find(
    (c) => c.id === conversationId,
  );
  const fallbackTitle =
    existing?.title ??
    `Conversation ${latestMetadata.conversations.length + 1}`;
  const title = deriveConversationTitle(messages, fallbackTitle);

  const updatedConversation: RepoConversationSummary = {
    id: conversationId,
    title,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextConversations = [
    updatedConversation,
    ...latestMetadata.conversations.filter((c) => c.id !== conversationId),
  ];

  const nextMetadata: RepoMetadata = {
    ...latestMetadata,
    conversations: nextConversations,
  };

  writeJsonFile(repoId, ADORABLE_METADATA_PATH, nextMetadata);
  writeJsonFile(repoId, conversationPath(conversationId), messages);

  return nextMetadata;
};

export const addRepoDeployment = async (
  repoId: string,
  metadata: RepoMetadata,
  deployment: RepoDeploymentSummary,
) => {
  ensureProjectDir(repoId);
  const latestMetadata = (await readRepoMetadata(repoId)) ?? metadata;
  const nextMetadata: RepoMetadata = {
    ...latestMetadata,
    deployments: [
      deployment,
      ...latestMetadata.deployments.filter(
        (d) => d.commitSha !== deployment.commitSha,
      ),
    ],
  };

  writeJsonFile(repoId, ADORABLE_METADATA_PATH, nextMetadata);
  return nextMetadata;
};

export const setRepoProductionDomain = async (
  repoId: string,
  metadata: RepoMetadata,
  productionDomain: string,
) => {
  ensureProjectDir(repoId);
  const latestMetadata = (await readRepoMetadata(repoId)) ?? metadata;
  const nextMetadata: RepoMetadata = {
    ...latestMetadata,
    productionDomain,
  };

  writeJsonFile(repoId, ADORABLE_METADATA_PATH, nextMetadata);
  return nextMetadata;
};

export const promoteRepoDeploymentToProduction = async (
  repoId: string,
  metadata: RepoMetadata,
  productionDeploymentId: string,
) => {
  ensureProjectDir(repoId);
  const latestMetadata = (await readRepoMetadata(repoId)) ?? metadata;
  const nextMetadata: RepoMetadata = {
    ...latestMetadata,
    productionDeploymentId,
  };

  writeJsonFile(repoId, ADORABLE_METADATA_PATH, nextMetadata);
  return nextMetadata;
};

/**
 * Rename a project (updates the visible name in metadata.json).
 * The repoId (folder name) stays unchanged.
 */
export const renameRepo = async (
  repoId: string,
  nextName: string,
): Promise<RepoMetadata | null> => {
  const metadata = await readRepoMetadata(repoId);
  if (!metadata) return null;

  const nextMetadata: RepoMetadata = {
    ...metadata,
    name: nextName,
  };
  writeJsonFile(repoId, ADORABLE_METADATA_PATH, nextMetadata);
  return nextMetadata;
};

/**
 * Delete a project: removes the project directory (metadata, conversations,
 * workspace) from disk. The caller is responsible for stopping/removing the
 * Docker container first (see removeVm in docker-vm.ts).
 */
export const deleteRepo = async (repoId: string): Promise<boolean> => {
  const dir = projectDir(repoId);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
};

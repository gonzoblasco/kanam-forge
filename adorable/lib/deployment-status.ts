/**
 * deployment-status.ts
 *
 * Local MVP: no serverless deploys. `getLatestCommitSha` and the timeline
 * read commits from the local workspace git repo. Deployment state is
 * always "idle" (no live domain) since there is no serverless target yet.
 */

import { execSync } from "child_process";
import { join } from "path";
import { homedir } from "os";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

export const DEPLOYMENT_DOMAIN_SUFFIX = "adorable.style.dev";

export type DeploymentUiStatus = {
  state: "idle" | "deploying" | "live" | "failed";
  domain: string | null;
  url: string | null;
  commitSha: string | null;
  deploymentId: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type DeploymentTimelineEntry = {
  commitSha: string;
  commitMessage: string;
  commitDate: string;
  domain: string;
  url: string;
  deploymentId: string | null;
  state: "idle" | "deploying" | "live" | "failed";
};

const workspaceDir = (repoId: string) => join(KANAM_FORGE_DATA_DIR, repoId, "workspace");

const isBootstrapCommit = (message: string | undefined) =>
  (message ?? "").trim().toLowerCase() === "initial commit";

export const getLatestCommitSha = async (repoId: string) => {
  try {
    const ws = workspaceDir(repoId);
    const output = execSync(`git -C ${JSON.stringify(ws)} log --format=%H -20`, {
      encoding: "utf8",
    });
    const shas = output.trim().split("\n").filter(Boolean);
    if (shas.length === 0) return null;
    return shas[0];
  } catch {
    return null;
  }
};

export const getDomainForCommit = (commitSha: string) => {
  return `${commitSha.slice(0, 12)}-${DEPLOYMENT_DOMAIN_SUFFIX}`;
};

export const getDeploymentStatusForLatestCommit = async (
  repoId: string,
  _isAgentRunning: boolean,
): Promise<DeploymentUiStatus> => {
  const commitSha = await getLatestCommitSha(repoId);
  const updatedAt = new Date().toISOString();

  if (!commitSha) {
    return {
      state: "idle",
      domain: null,
      url: null,
      commitSha: null,
      deploymentId: null,
      lastError: "No commits found for repository.",
      updatedAt,
    };
  }

  const domain = getDomainForCommit(commitSha);
  return {
    state: "idle",
    domain,
    url: `http://localhost:${process.env.KANAM_FORGE_PREVIEW_PORT ?? 3000}`,
    commitSha,
    deploymentId: null,
    lastError: null,
    updatedAt,
  };
};

export const getDeploymentTimelineFromCommits = async (
  repoId: string,
  limit = 12,
): Promise<DeploymentTimelineEntry[]> => {
  try {
    const ws = workspaceDir(repoId);
    const output = execSync(
      `git -C ${JSON.stringify(ws)} log --format=%H%x09%s%x09%ad --date=iso -50`,
      { encoding: "utf8" },
    );
    const lines = output.trim().split("\n").filter(Boolean);
    return lines
      .filter((line) => {
        const msg = line.split("\t")[1];
        return !isBootstrapCommit(msg);
      })
      .slice(0, limit)
      .map((line) => {
        const [sha, msg, date] = line.split("\t");
        const domain = getDomainForCommit(sha);
        return {
          commitSha: sha,
          commitMessage: msg,
          commitDate: date ?? new Date().toISOString(),
          domain,
          url: `http://localhost:${process.env.KANAM_FORGE_PREVIEW_PORT ?? 3000}`,
          deploymentId: null,
          state: "idle" as const,
        };
      });
  } catch {
    return [];
  }
};

/**
 * docker-vm.ts
 *
 * Replaces the Freestyle cloud VM with a local Docker container.
 * Exposes the same minimal interface that create-tools.ts expects:
 *   - vm.exec({ command })
 *   - vm.fs.readTextFile / writeTextFile / readFile
 *
 * Each project gets its own container (named kanam-forge-<id>), with the
 * workspace mounted from ~/.kanam-forge/projects/<id>/workspace.
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const SANDBOX_IMAGE = process.env.KANAM_FORGE_SANDBOX_IMAGE ?? "kanam-forge/sandbox:latest";
const CONTAINER_PREFIX = "kanam-forge";

export const PREVIEW_PORT = 3000;
export const DEV_TERMINAL_PORT = 3010;
export const EXTRA_TERMINAL_PORT = 3020;

export type VmRuntimeMetadata = {
  vmId: string;
  previewUrl: string;
  devCommandTerminalUrl: string | null;
  additionalTerminalsUrl: string | null;
};

const projectDir = (repoId: string) => join(KANAM_FORGE_DATA_DIR, repoId);
const workspaceDir = (repoId: string) => join(projectDir(repoId), "workspace");
const containerName = (repoId: string) => `${CONTAINER_PREFIX}-${repoId}`;

const run = (cmd: string) => {
  const result = spawnSync(cmd, { shell: true, encoding: "utf8", timeout: 120_000 });
  if (result.error) {
    throw new Error(`Command failed: ${cmd}\n${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Command exited ${result.status}: ${cmd}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  }
  return result.stdout.trim();
};

/**
 * Ask Docker to bind a container port to a random free host port.
 * Returns the assigned host port.
 */
const assignHostPort = (name: string, containerPort: number) => {
  const out = run(`docker port ${name} ${containerPort}/tcp`);
  // docker port prints like: 0.0.0.0:32768
  const match = out.match(/:([0-9]+)$/);
  if (!match) throw new Error(`No host port assigned for ${containerPort}`);
  return parseInt(match[1], 10);
};

const ensureDir = (repoId: string) => {
  const ws = workspaceDir(repoId);
  if (!existsSync(ws)) {
    mkdirSync(ws, { recursive: true });
  }
  return ws;
};

export const isDockerAvailable = (): boolean => {
  try {
    run("docker info >/dev/null 2>&1 && echo ok");
    return true;
  } catch {
    return false;
  }
};

export const ensureSandboxImage = () => {
  // Build the sandbox image if it doesn't exist
  const imageExists = (() => {
    try {
      run(`docker image inspect ${SANDBOX_IMAGE} >/dev/null 2>&1 && echo ok`);
      return true;
    } catch {
      return false;
    }
  })();

  if (!imageExists) {
    const dockerfileDir = join(process.cwd(), "docker");
    run(`docker build -t ${SANDBOX_IMAGE} ${dockerfileDir}`);
  }
};

/**
 * Create a container for a project, mounting its workspace.
 * Host ports are assigned dynamically (preview + dev terminal + extra).
 */
export const createVmForRepo = async (repoId: string): Promise<VmRuntimeMetadata> => {
  ensureDir(repoId);
  const ws = workspaceDir(repoId);
  const name = containerName(repoId);

  // Remove any existing container with the same name
  try {
    run(`docker rm -f ${name} >/dev/null 2>&1`);
  } catch {
    // ignore
  }

  // Bind to random free host ports; the dev server must listen on 0.0.0.0
  // inside the container so the host can reach it.
  run(
    `docker run -d --name ${name} ` +
      `-v ${ws}:/workspace ` +
      `--add-host=host.docker.internal:host-gateway ` +
      `-p 3000 ` +
      `-p 3010 ` +
      `-p 3020 ` +
      `${SANDBOX_IMAGE}`,
  );

  // Wait for port binding then read assigned host ports
  let previewHostPort = 0;
  let devTerminalHostPort = 0;
  let extraTerminalHostPort = 0;
  for (let i = 0; i < 20; i++) {
    try {
      previewHostPort = assignHostPort(name, 3000);
      devTerminalHostPort = assignHostPort(name, 3010);
      extraTerminalHostPort = assignHostPort(name, 3020);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return {
    vmId: name,
    previewUrl: `http://localhost:${previewHostPort}`,
    devCommandTerminalUrl: null,
    additionalTerminalsUrl: null,
  };
};

/**
 * Provision the workspace (scaffold a Next.js app if empty), install deps,
 * and start the dev server inside the container.
 */
export const bootstrapProject = async (repoId: string) => {
  const ws = workspaceDir(repoId);
  const name = containerName(repoId);

  // 1. Provision the Next.js scaffold if the workspace is empty
  const { provisionWorkspace } = await import("./provision");
  await provisionWorkspace(repoId);

  // 2. npm install (may take a while)
  await new DockerVm(name, ws).exec({ command: "npm install" });

  // 3. git init + initial commit (so commitTool works)
  await new DockerVm(name, ws).exec({
    command:
      "git init -q && git config user.email forge@kanam.local && git config user.name 'Kanam Forge' && git add -A && git commit -q -m 'Initial commit'",
  });

  // 4. Start the dev server in the background (detached so it survives
  //    the exec session). Redirect to a log inside the workspace.
  run(
    `docker exec -d ${name} sh -c "cd /workspace && npm run dev > /workspace/.dev-server.log 2>&1"`,
  );
};

export const removeVm = (repoId: string) => {
  try {
    run(`docker rm -f ${containerName(repoId)} >/dev/null 2>&1`);
  } catch {
    // ignore
  }
};

/**
 * Reconnect to an existing container (chat/route.ts).
 * If the container does not exist (e.g. after a sandbox image rebuild),
 * it is recreated with the current sandbox image.
 */
export const refVm = (repoId: string) => {
  const name = containerName(repoId);
  const ws = workspaceDir(repoId);

  // Recreate the container if it's missing (e.g. after image rebuild)
  const exists = (() => {
    try {
      run(`docker inspect ${name} >/dev/null 2>&1 && echo ok`);
      return true;
    } catch {
      return false;
    }
  })();
  if (!exists) {
    run(
      `docker run -d --name ${name} ` +
        `-v ${ws}:/workspace ` +
        `--add-host=host.docker.internal:host-gateway ` +
        `-p 3000 ` +
        `-p 3010 ` +
        `-p 3020 ` +
        `${SANDBOX_IMAGE}`,
    );
  }

  return new DockerVm(name, ws);
};

class DockerVm {
  constructor(
    private readonly name: string,
    private readonly hostWorkdir: string,
  ) {}

  async exec({ command }: { command: string }): Promise<unknown> {
    // Inside the container the workspace is always at /workspace
    // (bind-mounted from the host workdir).
    const cmd = `docker exec ${this.name} sh -c ${JSON.stringify(`cd /workspace && ${command}`)}`;
    try {
      const result = spawnSync(cmd, { shell: true, encoding: "utf8", timeout: 300_000 });
      return {
        ok: result.status === 0,
        exitCode: result.status ?? null,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stdout: "",
        stderr: "",
      };
    }
  }

  fs = {
    readTextFile: async (path: string) => {
      return this.fs.readFile(path);
    },
    readFile: async (path: string) => {
      const abs = join(this.hostWorkdir, path);
      return readFileSync(abs, "utf8");
    },
    writeTextFile: async (path: string, content: string) => {
      const abs = join(this.hostWorkdir, path);
      const dir = abs.substring(0, abs.lastIndexOf("/"));
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(abs, content, "utf8");
    },
  };
}

export type Vm = DockerVm;

/**
 * Import a project from a GitHub repository (owner/repo).
 * Clones the repo into the workspace, installs deps, and starts the dev
 * server. Falls back to the empty scaffold if the clone fails.
 */
export const importFromGithub = async (
  repoId: string,
  githubRepoName: string,
) => {
  const ws = workspaceDir(repoId);
  const name = containerName(repoId);
  const vm = new DockerVm(name, ws);

  // 1. Clone the repo into the workspace (shallow, single branch)
  const clone = (await vm.exec({
    command: `git clone --depth 1 https://github.com/${githubRepoName}.git .`,
  })) as { ok: boolean };
  if (!clone.ok) {
    throw new Error(
      `Failed to clone ${githubRepoName}. Check that the repository exists and is public.`,
    );
  }

  // 2. npm install (may take a while)
  await vm.exec({ command: "npm install" });

  // 3. Ensure it's a git repo with an initial commit (so commitTool works)
  await vm.exec({
    command:
      "git init -q && git config user.email forge@kanam.local && git config user.name 'Kanam Forge' && git add -A && (git commit -q -m 'Initial import' || true)",
  });

  // 4. Start the dev server in the background (detached)
  run(
    `docker exec -d ${name} sh -c "cd /workspace && npm run dev > /workspace/.dev-server.log 2>&1"`,
  );
};

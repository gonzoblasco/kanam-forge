import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export interface ProjectContext {
  name: string;
  type: "react-vite" | "nextjs" | "node-api" | "unknown";
  hasSupabase: boolean;
  hasAuth: boolean;
  hasTests: boolean;
  hasCI: boolean;
  dependencies: string[];
  devDependencies: string[];
  files: string[];
}

const SOURCE_FILE_RE = /\.(ts|tsx|js|jsx|json|css|sql|yml|yaml|md)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".next", ".cache"]);

const STACK_DEPS = [
  "next",
  "react",
  "react-dom",
  "vite",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "vitest",
  "jest",
  "@biomejs/biome",
  "tailwindcss",
  "lucide-react",
  "zod",
  "@tanstack/react-query",
  "react-hook-form",
];

export async function readProjectContext(
  projectDir: string,
): Promise<ProjectContext> {
  const pkgPath = join(projectDir, "package.json");
  let pkgRaw: string;
  try {
    pkgRaw = await readFile(pkgPath, "utf-8");
  } catch {
    throw new Error("El proyecto no tiene package.json");
  }

  const pkg = JSON.parse(pkgRaw) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = Object.keys(pkg.dependencies ?? {});
  const devDependencies = Object.keys(pkg.devDependencies ?? {});

  let type: ProjectContext["type"] = "unknown";
  if (dependencies.includes("next")) type = "nextjs";
  else if (dependencies.includes("react") && dependencies.includes("vite"))
    type = "react-vite";
  else if (dependencies.includes("hono") || dependencies.includes("express"))
    type = "node-api";

  const hasSupabase = dependencies.includes("@supabase/supabase-js");
  const hasAuth =
    hasSupabase ||
    dependencies.includes("next-auth") ||
    dependencies.includes("@clerk/nextjs");
  const hasTests =
    devDependencies.includes("vitest") || devDependencies.includes("jest");
  const hasCI = await fileExists(join(projectDir, ".github", "workflows", "ci.yml"));

  const files: string[] = [];
  await walkDir(projectDir, projectDir, files);

  return {
    name: pkg.name ?? projectDir.split("/").pop() ?? "unknown",
    type,
    hasSupabase,
    hasAuth,
    hasTests,
    hasCI,
    dependencies,
    devDependencies,
    files,
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function walkDir(
  root: string,
  dir: string,
  acc: string[],
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = full.replace(root + "/", "");

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkDir(root, full, acc);
    } else if (entry.isFile() && SOURCE_FILE_RE.test(entry.name)) {
      acc.push(rel);
    }
  }
}

export function buildProjectSystemPrompt(context: ProjectContext): string {
  const stack = STACK_DEPS.filter(
    (dep) =>
      context.dependencies.includes(dep) ||
      context.devDependencies.includes(dep),
  );

  const lines: string[] = [];
  lines.push("## Project context");
  lines.push(`- Name: ${context.name}`);
  lines.push(`- Type: ${context.type}`);
  lines.push(`- Stack: ${stack.join(", ")}`);
  lines.push(`- Supabase: ${context.hasSupabase ? "yes" : "no"}`);
  lines.push(`- Auth: ${context.hasAuth ? "yes" : "no"}`);
  lines.push(`- Tests: ${context.hasTests ? "yes" : "no"}`);
  lines.push(`- CI: ${context.hasCI ? "yes" : "no"}`);
  lines.push("- Files:");
  for (const file of context.files) {
    lines.push(`  - ${file}`);
  }
  lines.push("");
  lines.push("Do NOT modify files outside this list unless you add them.");

  return lines.join("\n");
}

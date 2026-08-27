import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildProjectSystemPrompt,
  readProjectContext,
  type ProjectContext,
} from "@/lib/project-context";

const tmpDirs: string[] = [];

async function makeProject(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "kanam-forge-context-"));
  tmpDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content);
  }
  return dir;
}

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const pkg = (deps: Record<string, string>, devDeps: Record<string, string> = {}) =>
  JSON.stringify({ name: "test-app", dependencies: deps, devDependencies: devDeps });

describe("readProjectContext", () => {
  it("detects nextjs type and tests from next+react+vitest", async () => {
    const dir = await makeProject({
      "package.json": pkg({ next: "1", react: "1" }, { vitest: "1" }),
    });

    const ctx = await readProjectContext(dir);

    expect(ctx.type).toBe("nextjs");
    expect(ctx.hasTests).toBe(true);
    expect(ctx.hasSupabase).toBe(false);
  });

  it("detects supabase and auth from @supabase/supabase-js + next-auth", async () => {
    const dir = await makeProject({
      "package.json": pkg({ "@supabase/supabase-js": "1", "next-auth": "1" }),
    });

    const ctx = await readProjectContext(dir);

    expect(ctx.hasSupabase).toBe(true);
    expect(ctx.hasAuth).toBe(true);
  });

  it("detects CI when .github/workflows/ci.yml exists", async () => {
    const dir = await makeProject({
      "package.json": pkg({}),
      ".github/workflows/ci.yml": "name: ci",
    });

    const ctx = await readProjectContext(dir);

    expect(ctx.hasCI).toBe(true);
  });

  it("skips node_modules when walking source files", async () => {
    const dir = await makeProject({
      "package.json": pkg({}),
      "src/index.ts": "export const x = 1;",
      "node_modules/some-pkg/index.ts": "export const y = 2;",
    });

    const ctx = await readProjectContext(dir);

    expect(ctx.files).toContain("src/index.ts");
    expect(ctx.files).not.toContain("node_modules/some-pkg/index.ts");
  });

  it("throws a clear error when package.json is missing", async () => {
    const dir = await makeProject({ "src/index.ts": "export const x = 1;" });

    await expect(readProjectContext(dir)).rejects.toThrow(
      "El proyecto no tiene package.json",
    );
  });
});

describe("buildProjectSystemPrompt", () => {
  const fullContext: ProjectContext = {
    name: "test-app",
    type: "nextjs",
    hasSupabase: true,
    hasAuth: true,
    hasTests: true,
    hasCI: true,
    dependencies: ["next", "react", "@supabase/supabase-js"],
    devDependencies: ["vitest"],
    files: ["app/layout.tsx", "app/page.tsx"],
  };

  it("renders a complete project context section", () => {
    const prompt = buildProjectSystemPrompt(fullContext);

    expect(prompt).toContain("## Project context");
    expect(prompt).toContain("Type: nextjs");
    expect(prompt).toContain("Supabase: yes");
    expect(prompt).toContain("Auth: yes");
    expect(prompt).toContain("Tests: yes");
    expect(prompt).toContain("CI: yes");
    expect(prompt).toContain("  - app/layout.tsx");
    expect(prompt).toContain("  - app/page.tsx");
  });

  it("renders Tests: no when hasTests is false", () => {
    const prompt = buildProjectSystemPrompt({ ...fullContext, hasTests: false });

    expect(prompt).toContain("Tests: no");
  });
});

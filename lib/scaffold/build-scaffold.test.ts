import { describe, expect, it } from "vitest";

import type { AIAnalysis } from "@/lib/analyzer";
import { buildScaffold } from "@/lib/scaffold/build-scaffold";
import { FILES } from "@/lib/scaffold/files";

const baseAnalysis: AIAnalysis = {
  projectType: "web-app",
  stack: "nextjs",
  features: [],
  tables: [],
  authRequired: false,
  billingRequired: false,
  description: "Test project",
};

describe("buildScaffold", () => {
  it("falls back to the default users table when no tables are provided", () => {
    const out = buildScaffold({ ...baseAnalysis, tables: [] });
    const migrations = out["supabase/migrations.sql"];

    expect(migrations).toContain("create table if not exists public.users");
    expect(migrations).toContain("email text unique not null");
  });

  it("renders CREATE TABLE for each analysis table with its columns", () => {
    const out = buildScaffold({
      ...baseAnalysis,
      tables: [
        {
          name: "products",
          columns: [
            { name: "title", type: "text" },
            { name: "price", type: "integer" },
          ],
        },
      ],
    });
    const migrations = out["supabase/migrations.sql"];

    expect(migrations).toContain("create table if not exists public.products");
    expect(migrations).toContain("title text");
    expect(migrations).toContain("price integer");
  });

  it("adds SUPABASE_SERVICE_ROLE_KEY when authRequired is true", () => {
    const out = buildScaffold({ ...baseAnalysis, authRequired: true });
    const env = out[".env.example"];

    expect(env).toContain("SUPABASE_SERVICE_ROLE_KEY=");
  });

  it("adds STRIPE_SECRET_KEY when billingRequired is true", () => {
    const out = buildScaffold({ ...baseAnalysis, billingRequired: true });
    const env = out[".env.example"];

    expect(env).toContain("STRIPE_SECRET_KEY=");
  });

  it("adds OLLAMA_BASE_URL when features mention ai/llm/ollama", () => {
    const out = buildScaffold({ ...baseAnalysis, features: ["ai chat"] });
    const env = out[".env.example"];

    expect(env).toContain("OLLAMA_BASE_URL=");
  });

  it("emits `unique not null` for a column named email", () => {
    const out = buildScaffold({
      ...baseAnalysis,
      tables: [
        {
          name: "subscribers",
          columns: [{ name: "email", type: "text" }],
        },
      ],
    });
    const migrations = out["supabase/migrations.sql"];

    expect(migrations).toContain("email text unique not null");
  });

  it("falls back to `text` for unknown column types", () => {
    const out = buildScaffold({
      ...baseAnalysis,
      tables: [
        {
          name: "events",
          columns: [
            { name: "payload", type: "weirdtype" },
            { name: "count", type: "jsonb" },
          ],
        },
      ],
    });
    const migrations = out["supabase/migrations.sql"];

    expect(migrations).toContain("payload text");
    expect(migrations).toContain("count jsonb");
  });

  it("does not mutate the original FILES record", () => {
    const originalMigrations = FILES["supabase/migrations.sql"];

    buildScaffold({
      ...baseAnalysis,
      tables: [
        {
          name: "products",
          columns: [{ name: "title", type: "text" }],
        },
      ],
    });

    expect(FILES["supabase/migrations.sql"]).toBe(originalMigrations);
    expect(FILES["supabase/migrations.sql"]).toContain(
      "create table if not exists public.users",
    );
  });
});

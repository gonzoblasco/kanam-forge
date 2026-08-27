/**
 * build-scaffold.ts
 *
 * Pure builder that adapts the static FILES scaffold to a specific
 * AIAnalysis. Today this means:
 *   - rewriting supabase/migrations.sql from analysis.tables
 *   - rewriting .env.example based on authRequired / billingRequired / features
 *
 * The original FILES record is never mutated.
 */

import type { AIAnalysis } from "@/lib/analyzer";
import { FILES } from "@/lib/scaffold/files";

const TYPE_MAP: Record<string, string> = {
  text: "text",
  string: "text",
  integer: "integer",
  int: "integer",
  boolean: "boolean",
  bool: "boolean",
  timestamptz: "timestamptz",
  timestamp: "timestamptz",
  uuid: "uuid",
  jsonb: "jsonb",
  json: "jsonb",
};

const mapType = (raw: string): string => {
  const key = raw.trim().toLowerCase();
  return TYPE_MAP[key] ?? "text";
};

const quoteIdent = (name: string): string => {
  // PostgreSQL folds unquoted identifiers to lower case. The analyzer emits
  // simple names so we keep them unquoted (matching the FILES base style).
  // We still strip embedded double quotes defensively in case a name ever
  // contains one.
  return name.replace(/"/g, "");
};

/**
 * Render the SQL migrations for the given tables. Only emits safe DDL
 * (CREATE EXTENSION / CREATE TABLE IF NOT EXISTS). Returns the FILES
 * default migrations.sql when no tables are provided so existing projects
 * keep a working schema.
 */
export const renderMigrations = (
  tables: AIAnalysis["tables"],
): string => {
  if (tables.length === 0) {
    return FILES["supabase/migrations.sql"] ?? "";
  }

  const lines: string[] = [];
  lines.push("-- Enable the uuid extension for primary keys");
  lines.push(`create extension if not exists "uuid-ossp";`);
  lines.push("");

  for (const table of tables) {
    lines.push(`-- ${table.name} table`);
    lines.push(`create table if not exists public.${quoteIdent(table.name)} (`);
    lines.push(`  id uuid primary key default uuid_generate_v4(),`);
    lines.push(`  created_at timestamptz not null default now(),`);

    for (const col of table.columns) {
      const sqlType = mapType(col.type);
      const isEmail = col.name.toLowerCase() === "email";
      const constraints = isEmail ? " unique not null" : "";
      lines.push(`  ${quoteIdent(col.name)} ${sqlType}${constraints},`);
    }

    lines.push(");");
    lines.push("");
  }

  // Drop the trailing blank line for tidier output.
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n") + "\n";
};

const matchesAny = (features: string[], needles: string[]): boolean => {
  return features.some((f) => needles.some((n) => f.toLowerCase().includes(n)));
};

/**
 * Render the .env.example file. Always includes Supabase client vars;
 * adds extra vars based on the analysis flags / features.
 */
export const renderEnvExample = (analysis: AIAnalysis): string => {
  const out: string[] = [];

  const header = analysis.description?.trim();
  if (header) {
    out.push(`# ${header}`);
    out.push("");
  }

  out.push("# Supabase (always required)");
  out.push("NEXT_PUBLIC_SUPABASE_URL=");
  out.push("NEXT_PUBLIC_SUPABASE_ANON_KEY=");

  if (analysis.authRequired) {
    out.push("");
    out.push("# Supabase server-side (server-only, optional)");
    out.push("SUPABASE_SERVICE_ROLE_KEY=");
  }

  if (analysis.billingRequired) {
    out.push("");
    out.push("# Stripe");
    out.push("STRIPE_SECRET_KEY=");
    out.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=");
    out.push("# for local dev: stripe listen --forward-to ... ");
    out.push("STRIPE_WEBHOOK_SECRET=");
  }

  if (matchesAny(analysis.features, ["storage", "upload", "file"])) {
    out.push("");
    out.push("# default bucket for user uploads");
    out.push("SUPABASE_STORAGE_BUCKET=uploads");
  }

  if (matchesAny(analysis.features, ["email", "mail"])) {
    out.push("");
    out.push("# Resend (transactional email)");
    out.push("RESEND_API_KEY=");
  }

  if (matchesAny(analysis.features, ["ai", "llm", "openai", "ollama"])) {
    out.push("");
    out.push("# Local Ollama");
    out.push("OLLAMA_BASE_URL=http://localhost:11434");
    out.push("OLLAMA_MODEL=deepseek-v4-flash:cloud");
  }

  return out.join("\n") + "\n";
};

/**
 * Return a fresh FILES-shaped record adapted to the given analysis.
 * The module-level FILES constant is never mutated.
 */
export const buildScaffold = (analysis: AIAnalysis): Record<string, string> => {
  const out: Record<string, string> = { ...FILES };
  out["supabase/migrations.sql"] = renderMigrations(analysis.tables);
  out[".env.example"] = renderEnvExample(analysis);
  return out;
};

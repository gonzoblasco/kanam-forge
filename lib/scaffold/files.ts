/**
 * files.ts
 *
 * Data-only scaffold for a Next.js App Router project with an opinionated
 * stack (Vitest, Biome, shadcn/ui, Supabase, CI). Each entry maps a path
 * relative to the project root to its file content.
 *
 * This is a plain Record of strings — it is not executable on its own.
 */

export const FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "kanam-forge-app",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev --turbopack -H 0.0.0.0",
        build: "next build",
        start: "next start -H 0.0.0.0",
        test: "vitest run",
        "test:watch": "vitest",
        "test:coverage": "vitest run --coverage",
        lint: "biome check .",
        "lint:fix": "biome check --write .",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        next: "^16.3.3",
        react: "^19",
        "react-dom": "^19",
        "@supabase/supabase-js": "^2.49",
        "@supabase/ssr": "^0.6",
        "@tanstack/react-query": "^5.70",
        zod: "^4",
        "react-hook-form": "^7.55",
        "lucide-react": "^0.510",
        "class-variance-authority": "^0.7",
        clsx: "^2.1",
        "tailwind-merge": "^3.0",
      },
      devDependencies: {
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "@types/node": "^22",
        typescript: "^5",
        tailwindcss: "^4",
        "@tailwindcss/postcss": "^4",
        postcss: "^8",
        vitest: "^4",
        "@biomejs/biome": "^2.5",
        "@testing-library/react": "^16",
        "@testing-library/jest-dom": "^6",
        "@testing-library/user-event": "^14",
        jsdom: "^26",
        "@vitejs/plugin-react": "^4",
        "@next/env": "^16",
      },
    },
    null,
    2,
  ),

  "app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanam Forge App",
  description: "Built with Kanam Forge",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,

  "app/page.tsx": `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Welcome to your new app</h1>
      <p className="text-muted-foreground">
        Built with Kanam Forge. Describe what you want to change.
      </p>
    </main>
  );
}
`,

  "app/globals.css": `@import "tailwindcss";

@theme {
  --color-muted-foreground: #525252;
}

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
  @theme {
    --color-muted-foreground: #a3a3a3;
  }
}

* {
  box-sizing: border-box;
}

html,
body {
  max-width: 100vw;
  min-height: 100vh;
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}
`,

  "app/api/health/route.ts": `import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true });
}
`,

  "lib/supabase.ts": `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`,

  "lib/utils.ts": `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,

  "components/ui/button.tsx": `import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
  outline:
    "border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800",
  ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  default: "h-10 px-4",
  lg: "h-12 px-6 text-lg",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, type ButtonProps };
`,

  "vitest.config.ts": `import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
`,

  "test/setup.ts": `import "@testing-library/jest-dom/vitest";
`,

  "test/page.test.tsx": `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("renders the welcome message", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Welcome to your new app" }),
    ).toBeInTheDocument();
  });
});
`,

  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ),

  "next.config.ts": `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`,

  "postcss.config.mjs": `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`,

  ".gitignore": `node_modules
.next
out
*.tsbuildinfo
next-env.d.ts
.env*
`,

  ".env.example": `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
`,

  "next-env.d.ts": `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
`,

  "biome.json": JSON.stringify(
    {
      $schema: "https://biomejs.dev/schemas/2.5.0/schema.json",
      files: {
        ignore: [".next/**", "node_modules/**", "out/**"],
      },
      formatter: {
        enabled: true,
        indentStyle: "space",
        indentWidth: 2,
        lineWidth: 100,
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true,
        },
      },
      javascript: {
        formatter: {
          quoteStyle: "double",
          semicolons: "always",
        },
      },
    },
    null,
    2,
  ),

  "supabase/migrations.sql": `-- Enable the uuid extension for primary keys
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamptz not null default now()
);
`,

  ".github/workflows/ci.yml": `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
`,
};

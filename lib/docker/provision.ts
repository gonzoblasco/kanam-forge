/**
 * provision.ts
 *
 * Bootstraps a minimal Next.js app inside the sandbox workspace when a new
 * project is created. Writes the scaffold to the host workspace dir (which is
 * bind-mounted into the container at /workspace), runs npm install + git init.
 */

import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const workspaceDir = (repoId: string) => join(KANAM_FORGE_DATA_DIR, repoId, "workspace");

const FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "kanam-forge-app",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev --turbopack -H 0.0.0.0",
        build: "next build",
        start: "next start -H 0.0.0.0",
        lint: "next lint",
      },
      dependencies: {
        next: "^15.4.1",
        react: "^19.1.0",
        "react-dom": "^19.1.0",
      },
      devDependencies: {
        "@types/node": "^22",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        typescript: "^5",
        tailwindcss: "^4",
        "@tailwindcss/postcss": "^4",
        postcss: "^8",
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
    <main style={{ padding: "3rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Welcome to your new app</h1>
      <p>Built with Kanam Forge. Describe what you want to change.</p>
    </main>
  );
}
`,
  "app/globals.css": `:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
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
  "next.config.ts": `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
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
  "next-env.d.ts": `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
`,
};

/**
 * Write the scaffold into the workspace dir. Returns true if it wrote
 * anything (i.e. the workspace was empty), false if it was already provisioned.
 */
export const provisionWorkspace = async (repoId: string): Promise<boolean> => {
  const ws = workspaceDir(repoId);
  if (!existsSync(ws)) return false;

  // If there's already a package.json, assume it's provisioned
  if (existsSync(join(ws, "package.json"))) return false;

  const { writeFileSync, mkdirSync } = await import("fs");
  for (const [rel, content] of Object.entries(FILES)) {
    const abs = join(ws, rel);
    mkdirSync(abs.substring(0, abs.lastIndexOf("/")), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }

  return true;
};

export const hasPackageJson = (repoId: string): boolean => {
  return existsSync(join(workspaceDir(repoId), "package.json"));
};

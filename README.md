# Kanam Forge

A self-hosted, AI-powered app builder (fork of [Adorable](https://github.com/freestyle-sh/Adorable), MIT). Describe what you want, and Kanam Forge builds it — with live preview, terminal, and a pipeline tuned to a fullstack workflow.

## What this is

Kanam Forge takes Adorable's solid conversational app-building foundation (chat → AI agent → sandboxed execution → live preview → commit) and replaces the cloud sandbox with **local Docker containers**, making it fully self-hosted and personal.

Long-term vision: a Lovable-class builder that creates *complete projects* (not just landings) following a disciplined pipeline — opinionated stack, persistent memory, accessibility built-in, multi-agent review.

## Status

MVP (local Docker, single user). Fase 1: decoupling Freestyle cloud sandbox → local Docker containers. See `projects/kanam-forge/.knowledge/` for the full plan.

## Features (from upstream)

- **Conversational app building** — Chat with an AI that writes, edits, and runs code inside a sandboxed VM
- **Live preview & terminal** — See your app update in real time with an embedded browser and terminal
- **Persistent projects** — Every project is backed by a git repo; conversations and history are preserved across sessions

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router, TypeScript, Turbopack)
- **AI:** [Vercel AI SDK](https://sdk.vercel.ai) with OpenAI and Anthropic support
- **Chat UI:** [assistant-ui](https://github.com/Yonom/assistant-ui)
- **Sandboxing:** local Docker containers (per project)
- **Styling:** Tailwind CSS + shadcn/ui

## Getting Started

### Prerequisites

- **Node.js 20+** and npm
- **Docker** (Desktop on macOS, or any daemon) - required for the sandbox
- **Ollama** running locally (for the default local LLM provider)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example and edit it. For local use with Ollama:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/api   # note the /api suffix
OLLAMA_MODEL=deepseek-v4-flash:cloud
```

> **Note:** do NOT set `KANAM_FORGE_DATA_DIR` to a literal `~` path - Node does not expand it and `existsSync` will fail. Leave it unset to use the default `~/.kanam-forge/projects`.

### 3. Start Docker

Make sure the Docker daemon is running (e.g. `open -a Docker` on macOS). The sandbox image is built automatically on first project creation.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start building.

### 5. Create a project

Describe what you want in the chat. Kanam Forge provisions a Docker container per project, installs deps, and starts a live preview. The agent writes code, runs checks, and commits changes to the project's own git repo.

## Troubleshooting

- **"No API key configured"** - make sure `.env.local` exists with `LLM_PROVIDER=ollama` (Ollama needs no key).
- **"Repository metadata not found"** - the project container was removed; create a new project.
- **Preview shows the orchestrator home instead of the project** - the project preview is a separate port (dynamic), shown in the UI. The agent is instructed not to report the orchestrator port (3000).

## Upstream

- Original: [freestyle-sh/Adorable](https://github.com/freestyle-sh/Adorable) (MIT)
- This fork: [gonzoblasco/kanam-forge](https://github.com/gonzoblasco/kanam-forge)

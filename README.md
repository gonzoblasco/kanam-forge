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

```bash
cp .env.example .env.local  # add your API keys (or use the in-app settings dialog)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start building.

## Upstream

- Original: [freestyle-sh/Adorable](https://github.com/freestyle-sh/Adorable) (MIT)
- This fork: [gonzoblasco/kanam-forge](https://github.com/gonzoblasco/kanam-forge)

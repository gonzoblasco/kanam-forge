"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  GithubIcon,
  Loader2Icon,
  PackageIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Export dialog - replaces the Vercel-bound Publish flow             */
/* ------------------------------------------------------------------ */

export function ExportDialog({ repoId }: { repoId: string }) {
  const [open, setOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [githubState, setGithubState] = React.useState<
    "idle" | "working" | "done" | "error"
  >("idle");
  const [githubUrl, setGithubUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/export`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to export");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? "kanam-forge-app.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export");
    } finally {
      setDownloading(false);
    }
  };

  const handleGithub = async () => {
    setGithubState("working");
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/export-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to export to GitHub");
      }
      setGithubUrl(data.url);
      setGithubState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export to GitHub");
      setGithubState("error");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setGithubState("idle");
          setGithubUrl(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <PackageIcon className="size-3" />
          Export
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export project</DialogTitle>
          <DialogDescription>
            Take your project with you. Download the source or push it to a new
            GitHub repository.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Option 1: Download ZIP */}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              {downloading ? (
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <DownloadIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Download ZIP</p>
              <p className="text-xs text-muted-foreground">
                Source code archive, ready to open anywhere.
              </p>
            </div>
          </button>

          {/* Option 2: Push to GitHub */}
          <button
            type="button"
            onClick={() => void handleGithub()}
            disabled={githubState === "working"}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              {githubState === "working" ? (
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <GithubIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Push to GitHub</p>
              <p className="text-xs text-muted-foreground">
                Create a new private repo with the project source.
              </p>
            </div>
            {githubState === "done" && (
              <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
            )}
          </button>

          {githubState === "done" && githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/15"
            >
              <ExternalLinkIcon className="size-3.5" />
              Open repository
            </a>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

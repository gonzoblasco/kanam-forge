import * as React from "react";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { KanamLogo } from "@/components/kanam-logo";
import { ExportDialog } from "@/components/assistant-ui/export-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FolderIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

export type RepoDeployment = {
  commitSha: string;
  commitMessage: string;
  commitDate: string;
  domain: string;
  url: string;
  deploymentId: string | null;
  state: "idle" | "deploying" | "live" | "failed";
};

export type RepoConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type RepoVmInfo = {
  vmId: string;
  previewUrl: string;
  devCommandTerminalUrl: string;
  additionalTerminalsUrl: string;
};

export type RepoItem = {
  id: string;
  name: string;
  vm: RepoVmInfo | null;
  conversations: RepoConversation[];
  deployments: RepoDeployment[];
  productionDomain: string | null;
  productionDeploymentId: string | null;
};

const AdorableLogo = () => <KanamLogo className="size-5" />;

/* ------------------------------------------------------------------ */
/*  Main sidebar                                                       */
/* ------------------------------------------------------------------ */

export function RepoSidebar({
  repos,
  selectedRepoId,
  onSelectProject,
  onCreateRepo,
  collapsible = "icon",
}: {
  repos: RepoItem[];
  selectedRepoId: string | null;
  onSelectProject: (repoId: string) => void;
  onCreateRepo: () => Promise<void>;
  collapsible?: "icon" | "offcanvas";
}) {
  const [tab, setTab] = React.useState<"threads" | "export">("threads");
  const [creatingRepo, setCreatingRepo] = React.useState(false);
  const { open, setOpen } = useSidebar();

  const onTabClick = (nextTab: "threads" | "export") => {
    if (open && tab === nextTab) {
      setOpen(false);
      return;
    }
    setTab(nextTab);
    setOpen(true);
  };

  const handleCreateRepo = async () => {
    setCreatingRepo(true);
    try {
      await onCreateRepo();
    } finally {
      setCreatingRepo(false);
    }
  };

  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) ?? null;

  return (
    <Sidebar collapsible={collapsible}>
      <div className="flex h-full">
        {/* Icon rail */}
        <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r bg-background pt-3">
          <button
            type="button"
            onClick={() => onTabClick("threads")}
            title="Projects"
            aria-label="Projects"
            className={`inline-flex size-7 items-center justify-center rounded-md transition-colors ${
              open && tab === "threads"
                ? "bg-muted text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            <FolderIcon className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onTabClick("export")}
            title="Export"
            aria-label="Export"
            className={`inline-flex size-7 items-center justify-center rounded-md transition-colors ${
              open && tab === "export"
                ? "bg-muted text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            <PackageIcon className="size-[18px]" />
          </button>
        </div>

        {/* Panel */}
        <div className="min-h-0 min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <div className="flex h-full min-h-0 flex-col">
            {/* Brand header */}
            <div className="flex h-12 shrink-0 items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <AdorableLogo />
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Kanam Forge
                </span>
              </div>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                onClick={handleCreateRepo}
                disabled={creatingRepo}
                title="New project"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>

            <div className="mx-3 border-b" />

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {tab === "threads" ? (
                <ProjectsList
                  repos={repos}
                  selectedRepoId={selectedRepoId}
                  onSelectProject={onSelectProject}
                />
              ) : (
                <ExportList repo={selectedRepo} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

/* ------------------------------------------------------------------ */
/*  Projects tab                                                       */
/* ------------------------------------------------------------------ */

function ProjectsList({
  repos,
  selectedRepoId,
  onSelectProject,
}: {
  repos: RepoItem[];
  selectedRepoId: string | null;
  onSelectProject: (repoId: string) => void;
}) {
  if (repos.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground/40">
        No projects yet
      </div>
    );
  }

  return (
    <div className="space-y-px">
      {repos.map((repo) => {
        const isActive = selectedRepoId === repo.id;
        return (
          <div
            key={repo.id}
            className={`group flex items-center rounded-md transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectProject(repo.id)}
              className="flex min-w-0 flex-1 items-center rounded-md px-3 py-1.5 text-left text-[13px]"
            >
              <span className="truncate">{repo.name}</span>
            </button>
            <ProjectActions
              repoId={repo.id}
              repoName={repo.name}
              onChanged={() => onSelectProject(repo.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Project actions (rename / delete)                                  */
/* ------------------------------------------------------------------ */

function ProjectActions({
  repoId,
  repoName,
  onChanged,
}: {
  repoId: string;
  repoName: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(repoName);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRename = async () => {
    const nextName = nameInput.trim();
    if (!nextName) {
      setError("Name cannot be empty");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/repos/${repoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to rename");
      }
      setRenameOpen(false);
      onChanged();
      window.dispatchEvent(new Event("adorable:repos-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete");
      }
      setDeleteOpen(false);
      onChanged();
      window.dispatchEvent(new Event("adorable:repos-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
            title="Project options"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontalIcon className="size-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Project options</DialogTitle>
            <DialogDescription>
              Manage <span className="font-medium">{repoName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNameInput(repoName);
                setError(null);
                setRenameOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <PencilIcon className="size-4 text-muted-foreground" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <TrashIcon className="size-4" />
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Give this project a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <Input
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename();
              }}
              autoFocus
            />
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={busy || !nameInput.trim()}>
              {busy ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This permanently deletes <span className="font-medium">{repoName}</span>,
              including its code, conversations, and Docker container. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


/* ------------------------------------------------------------------ */
/*  Export tab                                                         */
/* ------------------------------------------------------------------ */

function ExportList({ repo }: { repo: RepoItem | null }) {
  if (!repo) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground/40">
        Select a project first
      </div>
    );
  }

  return (
    <div className="space-y-3 px-3 py-2">
      <p className="text-[13px] leading-relaxed text-muted-foreground/70">
        Take your project with you. Download the source or push it to a new
        GitHub repository.
      </p>
      <ExportDialog repoId={repo.id} />
    </div>
  );
}

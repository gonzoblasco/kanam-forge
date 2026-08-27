import * as React from "react";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { KanamLogo } from "@/components/kanam-logo";
import { ExportDialog } from "@/components/assistant-ui/export-dialog";
import { FolderIcon, PackageIcon, PlusIcon } from "lucide-react";

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
          <button
            key={repo.id}
            type="button"
            onClick={() => onSelectProject(repo.id)}
            className={`flex w-full items-center rounded-md px-3 py-1.5 text-left text-[13px] transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <span className="truncate">{repo.name}</span>
          </button>
        );
      })}
    </div>
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

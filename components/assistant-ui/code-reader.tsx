"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon, FolderIcon, Loader2Icon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
};

type CodeReaderProps = {
  repoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CodeReader({ repoId, open, onOpenChange }: CodeReaderProps) {
  const [tree, setTree] = React.useState<FileNode[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [content, setContent] = React.useState<string | null>(null);
  const [contentLoading, setContentLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const loadTree = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/files`);
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  React.useEffect(() => {
    if (open) {
      setSelectedPath(null);
      setContent(null);
      setExpanded(new Set());
      void loadTree();
    }
  }, [open, loadTree]);

  const loadFile = React.useCallback(
    async (path: string) => {
      setSelectedPath(path);
      setContentLoading(true);
      setContent(null);
      try {
        const res = await fetch(
          `/api/repos/${repoId}/file?path=${encodeURIComponent(path)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setContent(data.content ?? "");
        }
      } finally {
        setContentLoading(false);
      }
    },
    [repoId],
  );

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number) => {
    const isDir = node.type === "dir";
    const isExpanded = expanded.has(node.path);
    const isSelected = selectedPath === node.path;

    if (isDir) {
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleDir(node.path)}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <ChevronRightIcon
              className={cn(
                "size-3 shrink-0 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
            <FolderIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded &&
            node.children?.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        type="button"
        onClick={() => void loadFile(node.path)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-5xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm font-semibold">
            Code reader
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          {/* File tree */}
          <div className="w-72 shrink-0 overflow-y-auto border-r p-2">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground/40" />
              </div>
            ) : (
              tree?.map((node) => renderNode(node, 0))
            )}
          </div>
          {/* File content */}
          <div className="min-w-0 flex-1 overflow-auto bg-muted/20">
            {contentLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground/40" />
              </div>
            ) : content !== null ? (
              <pre className="p-4 text-[13px] leading-relaxed text-foreground">
                <code>{content}</code>
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground/40">
                Select a file to preview
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

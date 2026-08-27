"use client";

import { useProjectConversations } from "@/lib/project-conversations-context";
import { MessageSquareIcon } from "lucide-react";
import type { FC } from "react";

/**
 * ThreadList - lists the project's conversations from the backend
 * (ProjectConversationsProvider), not from assistant-ui's localStorage.
 * This keeps the sidebar in sync with the conversations actually persisted
 * in ~/.kanam-forge/projects/<id>/.
 */
export const ThreadList: FC = () => {
  const { conversations, onSelectConversation, repoId } =
    useProjectConversations();

  if (!repoId) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground/40">
        Select a project first
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground/40">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="space-y-px">
      {conversations.map((conversation) => {
        const title = conversation.title?.trim();
        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelectConversation(conversation.id)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
            <span className="truncate">
              {title || "Untitled conversation"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

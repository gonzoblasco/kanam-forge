"use client";

import { createContext, useContext } from "react";
import type { RepoItem } from "@/lib/repo-types";

type ReposContextValue = {
  repos: RepoItem[];
  isLoading: boolean;
  onSelectProject: (repoId: string) => void;
  refreshRepos: () => Promise<void>;
};

const ReposContext = createContext<ReposContextValue>({
  repos: [],
  isLoading: true,
  onSelectProject: () => {},
  refreshRepos: async () => {},
});

export const ReposProvider = ReposContext.Provider;

export const useRepos = () => useContext(ReposContext);

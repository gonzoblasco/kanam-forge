import { Assistant } from "../assistant";
import { RepoWelcome } from "@/components/assistant-ui/repo-welcome";
import {
  readRepoMetadata,
  readConversationMessages,
} from "@/lib/docker/repo-storage-local";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;

  // Open the most recent conversation automatically (if any), so the user
  // doesn't have to pick one or start a new chat every time they open a project.
  const metadata = await readRepoMetadata(repoId);
  const latestConversation = metadata?.conversations?.[0] ?? null;

  let initialMessages: Awaited<ReturnType<typeof readConversationMessages>> = [];
  if (latestConversation) {
    initialMessages = await readConversationMessages(
      repoId,
      latestConversation.id,
    );
  }

  return (
    <Assistant
      initialMessages={initialMessages}
      selectedRepoId={repoId}
      selectedConversationId={latestConversation?.id ?? null}
      welcome={<RepoWelcome />}
    />
  );
}

import { Assistant } from "../../assistant";
import { RepoWelcome } from "@/components/assistant-ui/repo-welcome";
import { readConversationMessages } from "@/lib/repo-storage";

// Local MVP: no auth. Every local project is accessible.
const hasRepoAccess = async (_repoId: string) => true;

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ repoId: string; conversationId: string }>;
}) {
  const { repoId, conversationId } = await params;

  if (!(await hasRepoAccess(repoId))) {
    return (
      <Assistant
        initialMessages={[]}
        selectedRepoId={repoId}
        selectedConversationId={conversationId}
        welcome={<RepoWelcome />}
      />
    );
  }

  const initialMessages = await readConversationMessages(
    repoId,
    conversationId,
  );
  return (
    <Assistant
      initialMessages={initialMessages}
      selectedRepoId={repoId}
      selectedConversationId={conversationId}
      welcome={<RepoWelcome />}
    />
  );
}

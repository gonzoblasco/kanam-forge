import { type UIMessage } from "ai";
import { cookies } from "next/headers";
import { homedir } from "os";
import { join } from "path";
import { createTools } from "@/lib/docker/create-tools-local";
import { streamLlmResponse } from "@/lib/llm-provider";
import { refVm } from "@/lib/docker/docker-vm";
import { readRepoMetadata, saveConversationMessages } from "@/lib/docker/repo-storage-local";
import { readProjectContext, buildProjectSystemPrompt } from "@/lib/project-context";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

export async function POST(req: Request) {
  const payload = (await req.json()) as {
    messages?: UIMessage[];
    repoId?: string;
    conversationId?: string;
  };

  const { repoId, conversationId } = payload;
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : undefined;

  if (!repoId || !conversationId) {
    return Response.json(
      { error: "repoId and conversationId are required." },
      { status: 400 },
    );
  }

  if (!messages) {
    return Response.json(
      { error: "messages must be an array." },
      { status: 400 },
    );
  }

  const metadata = await readRepoMetadata(repoId);
  if (!metadata) {
    return Response.json(
      { error: "Repository metadata not found." },
      { status: 404 },
    );
  }

  await saveConversationMessages(repoId, metadata, conversationId, messages);

  let projectSystemPrompt = SYSTEM_PROMPT;
  try {
    const workspace = join(KANAM_FORGE_DATA_DIR, repoId, "workspace");
    const context = await readProjectContext(workspace);
    const projectSection = buildProjectSystemPrompt(context);
    projectSystemPrompt = `${SYSTEM_PROMPT}\n\n${projectSection}`;
  } catch (err) {
    // If the workspace is not provisioned yet, fall back to the base prompt.
    console.warn("[chat] no project context:", err instanceof Error ? err.message : err);
  }

  const vm = refVm(repoId);

  const tools = createTools(vm, {
    sourceRepoId: metadata.sourceRepoId,
    metadataRepoId: repoId,
  });

  // Read user-provided API key from cookie (if no global env key)
  const jar = await cookies();
  const userApiKey = jar.get("user-api-key")?.value;
  const userProvider = jar.get("user-api-provider")?.value;

  const hasGlobalKey = !!(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  );

  // Ollama local does not need an API key - only OpenAI/Anthropic do.
  const provider = (userProvider ?? process.env.LLM_PROVIDER ?? "openai")
    .toLowerCase()
    .trim();
  const isOllama = provider === "ollama" || provider === "local";

  if (!isOllama && !hasGlobalKey && !userApiKey) {
    return Response.json(
      { error: "No API key configured. Please add your API key in settings." },
      { status: 401 },
    );
  }

  const llm = await streamLlmResponse({
    system: projectSystemPrompt,
    messages,
    tools,
    ...(hasGlobalKey
      ? {}
      : { apiKey: userApiKey, providerOverride: userProvider }),
  });

  return llm.result.toUIMessageStreamResponse({
    sendReasoning: true,
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ messages: finalMessages }) => {
      const latestMetadata = await readRepoMetadata(repoId);
      if (!latestMetadata) return;
      await saveConversationMessages(
        repoId,
        latestMetadata,
        conversationId,
        finalMessages,
      );
    },
  });
}

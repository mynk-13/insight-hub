import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { streamText } from "ai";
import {
  hybridRetrieve,
  buildSystemPrompt,
  hasUsableChunks,
  NO_RESULTS_RESPONSE,
  selectLanguageModel,
  isModelAllowed,
  estimateCostUsd,
} from "@/lib/modules/rag";
import type { SseEvent, ModelId, ChatContext } from "@/lib/modules/rag";

const RegenerateSchema = z.object({
  model: z.enum(["gpt-4o-mini", "gpt-4o", "claude-haiku-4-5", "claude-sonnet-4-6"]).optional(),
  editedQuery: z.string().min(1).max(2000).optional(),
});

function sseEncode(data: SseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { chatId, messageId } = await params;

  const body = await req.json();
  const parsed = RegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const { model: overrideModel, editedQuery } = parsed.data;

  const [chat, targetMessage, subscription] = await Promise.all([
    db.chat.findFirst({
      where: { id: chatId, userId: session.user.id, deletedAt: null },
      select: { id: true, workspaceId: true, contextType: true, contextId: true },
    }),
    db.message.findFirst({
      where: { id: messageId, chatId },
      select: { id: true, role: true, content: true, model: true, createdAt: true },
    }),
    db.subscription.findFirst({
      where: { workspace: { members: { some: { userId: session.user.id } } } },
      orderBy: { createdAt: "desc" },
      select: { tier: true },
    }),
  ]);

  if (!chat || !targetMessage) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const isPro = subscription?.tier === "PRO";
  const modelId = (overrideModel ?? targetMessage.model ?? "gpt-4o-mini") as ModelId;

  if (!isModelAllowed(modelId, isPro ? "PRO" : "FREE")) {
    return new Response(JSON.stringify({ error: "Model not available on your plan" }), {
      status: 403,
    });
  }

  // Find the user message that triggered this assistant message
  const userMessage = await db.message.findFirst({
    where: {
      chatId,
      role: "USER",
      createdAt: { lte: targetMessage.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true },
  });

  const query = editedQuery ?? userMessage?.content ?? "";
  if (!query) {
    return new Response(JSON.stringify({ error: "No query found to regenerate" }), {
      status: 400,
    });
  }

  // If editing query, update the user message content
  if (editedQuery && userMessage) {
    await db.message.update({
      where: { id: userMessage.id },
      data: { content: editedQuery },
    });
  }

  const context: ChatContext = {
    type: chat.contextType as "WORKSPACE" | "COLLECTION" | "SOURCE",
    id: chat.contextId ?? undefined,
  };

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  void (async () => {
    try {
      const retrievalStart = Date.now();
      const { rankedChunks, citations } = await hybridRetrieve(query, chat.workspaceId, context);
      const retrievalMs = Date.now() - retrievalStart;

      await writer.write(sseEncode({ type: "citations", citations }));

      if (!hasUsableChunks(rankedChunks)) {
        await db.message.update({
          where: { id: messageId },
          data: { content: NO_RESULTS_RESPONSE, citations: [], model: modelId, retrievalMs },
        });
        await writer.write(sseEncode({ type: "text", text: NO_RESULTS_RESPONSE }));
        await writer.write(
          sseEncode({
            type: "done",
            messageId: userMessage?.id ?? "",
            assistantMessageId: messageId,
          }),
        );
        writer.close();
        return;
      }

      const systemPrompt = buildSystemPrompt(rankedChunks);

      const history = await db.message.findMany({
        where: {
          chatId,
          role: "USER",
          createdAt: { lt: targetMessage.createdAt },
        },
        orderBy: { createdAt: "asc" },
        take: 9,
        select: { role: true, content: true },
      });

      const messages = [
        ...history.map((m) => ({
          role: "user" as const,
          content: m.content,
        })),
        { role: "user" as const, content: query },
      ];

      const generationStart = Date.now();

      const result = streamText({
        model: selectLanguageModel(modelId),
        system: systemPrompt,
        messages,
        onFinish: async ({ text, usage }) => {
          const generationMs = Date.now() - generationStart;
          const inputTokens = usage?.inputTokens ?? 0;
          const outputTokens = usage?.outputTokens ?? 0;
          const costUsd = estimateCostUsd(modelId, inputTokens, outputTokens);

          await db.message.update({
            where: { id: messageId },
            data: {
              content: text,
              citations: citations as unknown as object[],
              model: modelId,
              tokensIn: inputTokens,
              tokensOut: outputTokens,
              costUsd,
              retrievalMs,
              generationMs,
            },
          });

          await writer.write(
            sseEncode({
              type: "done",
              messageId: userMessage?.id ?? "",
              assistantMessageId: messageId,
            }),
          );
          writer.close();
        },
      });

      for await (const chunk of result.textStream) {
        await writer.write(sseEncode({ type: "text", text: chunk }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Regeneration failed";
      await writer.write(sseEncode({ type: "error", message })).catch(() => {});
      writer.close().catch(() => {});
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

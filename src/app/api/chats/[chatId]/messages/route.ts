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
  checkChatRateLimit,
} from "@/lib/modules/rag";
import type { SseEvent, ModelId, ChatContext } from "@/lib/modules/rag";

const MessageSchema = z.object({
  query: z.string().min(1).max(2000),
  model: z
    .enum(["gpt-4o-mini", "gpt-4o", "claude-haiku-4-5", "claude-sonnet-4-6"])
    .default("gpt-4o-mini"),
  contextType: z.enum(["WORKSPACE", "COLLECTION", "SOURCE"]).optional(),
  contextId: z.string().cuid().optional(),
});

function sseEncode(data: SseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { chatId } = await params;

  const body = await req.json();
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const { query, model, contextType, contextId } = parsed.data;

  // Fetch chat + workspace membership in parallel
  const [chat, subscription] = await Promise.all([
    db.chat.findFirst({
      where: { id: chatId, userId: session.user.id, deletedAt: null },
      select: { id: true, workspaceId: true, contextType: true, contextId: true },
    }),
    db.subscription.findFirst({
      where: { workspace: { members: { some: { userId: session.user.id } } } },
      orderBy: { createdAt: "desc" },
      select: { tier: true },
    }),
  ]);

  if (!chat) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const isPro = subscription?.tier === "PRO";

  // Rate limit check
  const { allowed, remaining } = await checkChatRateLimit(chat.workspaceId, isPro);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded", remaining }), {
      status: 429,
      headers: { "Retry-After": "3600" },
    });
  }

  // Model tier enforcement
  const modelId = model as ModelId;
  if (!isModelAllowed(modelId, isPro ? "PRO" : "FREE")) {
    return new Response(JSON.stringify({ error: "Model not available on your plan" }), {
      status: 403,
    });
  }

  const context: ChatContext = {
    type: contextType ?? (chat.contextType as "WORKSPACE" | "COLLECTION" | "SOURCE"),
    id: contextId ?? chat.contextId ?? undefined,
  };

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const retrievalStart = Date.now();

  // Run retrieval + streaming asynchronously
  void (async () => {
    try {
      const { rankedChunks, citations } = await hybridRetrieve(query, chat.workspaceId, context);
      const retrievalMs = Date.now() - retrievalStart;

      // Send citations before text starts
      await writer.write(sseEncode({ type: "citations", citations }));

      // Persist user message
      const userMessage = await db.message.create({
        data: {
          chatId,
          workspaceId: chat.workspaceId,
          role: "USER",
          content: query,
        },
        select: { id: true },
      });

      // Hallucination guard: no usable chunks → return canned response
      if (!hasUsableChunks(rankedChunks)) {
        const assistantMessage = await db.message.create({
          data: {
            chatId,
            workspaceId: chat.workspaceId,
            role: "ASSISTANT",
            content: NO_RESULTS_RESPONSE,
            citations: [],
            model: modelId,
            retrievalMs,
          },
          select: { id: true },
        });

        await writer.write(sseEncode({ type: "text", text: NO_RESULTS_RESPONSE }));
        await writer.write(
          sseEncode({
            type: "done",
            messageId: userMessage.id,
            assistantMessageId: assistantMessage.id,
          }),
        );
        writer.close();
        return;
      }

      const systemPrompt = buildSystemPrompt(rankedChunks);

      // Fetch prior conversation history (last 10 messages)
      const history = await db.message.findMany({
        where: { chatId, id: { not: userMessage.id } },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { role: true, content: true },
      });

      const messages = [
        ...history.map((m) => ({
          role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
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

          const assistantMessage = await db.message.create({
            data: {
              chatId,
              workspaceId: chat.workspaceId,
              role: "ASSISTANT",
              content: text,
              citations: citations as unknown as object[],
              model: modelId,
              tokensIn: inputTokens,
              tokensOut: outputTokens,
              costUsd,
              retrievalMs,
              generationMs,
            },
            select: { id: true },
          });

          // Update chat title from first user message
          const chatRecord = await db.chat.findUnique({
            where: { id: chatId },
            select: { title: true },
          });
          if (!chatRecord?.title) {
            await db.chat.update({
              where: { id: chatId },
              data: {
                title: query.slice(0, 80),
                updatedAt: new Date(),
              },
            });
          } else {
            await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
          }

          await writer.write(
            sseEncode({
              type: "done",
              messageId: userMessage.id,
              assistantMessageId: assistantMessage.id,
            }),
          );
          writer.close();
        },
      });

      for await (const chunk of result.textStream) {
        await writer.write(sseEncode({ type: "text", text: chunk }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
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

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { chatId } = await params;

  const messages = await db.message.findMany({
    where: {
      chatId,
      chat: { userId: session.user.id, deletedAt: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      citations: true,
      model: true,
      tokensIn: true,
      tokensOut: true,
      createdAt: true,
    },
  });

  return Response.json({ messages });
}

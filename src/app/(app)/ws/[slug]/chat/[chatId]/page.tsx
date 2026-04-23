import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { ChatView } from "@/components/features/chat/chat-view";
import type { DisplayMessage } from "@/components/features/chat/message-list";
import type { Citation, ModelTier } from "@/lib/modules/rag/types";

type Props = { params: Promise<{ slug: string; chatId: string }> };

export default function ChatPage({ params }: Props) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatPageInner params={params} />
    </Suspense>
  );
}

async function ChatPageInner({ params }: Props) {
  const { slug, chatId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [chat, subscription] = await Promise.all([
    db.chat.findFirst({
      where: { id: chatId, userId: session.user.id, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            citations: true,
            model: true,
            createdAt: true,
          },
        },
      },
    }),
    db.subscription.findFirst({
      where: { workspace: { slug, members: { some: { userId: session.user.id } } } },
      orderBy: { createdAt: "desc" },
      select: { tier: true },
    }),
  ]);

  if (!chat) notFound();

  const tier: ModelTier = subscription?.tier === "PRO" ? "PRO" : "FREE";

  const initialMessages: DisplayMessage[] = chat.messages.map((m) => ({
    id: m.id,
    role: m.role as "USER" | "ASSISTANT",
    content: m.content,
    citations: (m.citations as Citation[]) ?? [],
    model: m.model,
    createdAt: m.createdAt,
  }));

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
        <h1 className="text-sm font-semibold truncate">{chat.title ?? "New Chat"}</h1>
        <span className="ml-auto text-xs text-muted-foreground capitalize">
          {chat.contextType.toLowerCase()} context
        </span>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatView
          chatId={chatId}
          workspaceSlug={slug}
          initialMessages={initialMessages}
          tier={tier}
        />
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="h-12 border-b bg-muted/30 animate-pulse" />
      <div className="flex-1" />
      <div className="h-20 border-t bg-muted/30 animate-pulse" />
    </div>
  );
}

"use client";

import * as React from "react";
import { useRagChat } from "@/hooks/use-rag-chat";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { CitationSidecar } from "./citation-sidecar";
import type { ModelId, ModelTier, Citation } from "@/lib/modules/rag/types";
import type { DisplayMessage } from "./message-list";

type Props = {
  chatId: string;
  workspaceSlug: string;
  initialMessages?: DisplayMessage[];
  tier: ModelTier;
  defaultModel?: ModelId;
};

export function ChatView({
  chatId,
  workspaceSlug: _workspaceSlug,
  initialMessages = [],
  tier,
  defaultModel = "gpt-4o-mini",
}: Props) {
  const [selectedModel, setSelectedModel] = React.useState<ModelId>(defaultModel);
  const [activeCitationIndex, setActiveCitationIndex] = React.useState<number | null>(null);
  const [sidecarOpen, setSidecarOpen] = React.useState(false);

  const { messages, streamingCitations, isLoading, sendMessage, regenerate, stop } = useRagChat(
    chatId,
    initialMessages,
  );

  const handleCitationSelect = React.useCallback((citation: Citation) => {
    setActiveCitationIndex(citation.index);
    setSidecarOpen(true);
    // Scroll to citation in sidecar
    setTimeout(() => {
      document
        .getElementById(`citation-${citation.index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }, []);

  const handleRegenerate = React.useCallback(
    (messageId: string) => {
      void regenerate(messageId, selectedModel);
    },
    [regenerate, selectedModel],
  );

  const currentCitations =
    messages
      .slice()
      .reverse()
      .find((m) => m.role === "ASSISTANT" && m.citations && m.citations.length > 0)?.citations ??
    streamingCitations;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          streamingCitations={streamingCitations}
          activeCitationIndex={activeCitationIndex}
          onCitationSelect={handleCitationSelect}
          onRegenerate={handleRegenerate}
          isLoading={isLoading}
        />

        <ChatInput
          onSubmit={(q) => void sendMessage(q, selectedModel)}
          onStop={stop}
          isLoading={isLoading}
          tier={tier}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Citation sidecar */}
      {sidecarOpen && (
        <CitationSidecar
          citations={currentCitations}
          activeCitationIndex={activeCitationIndex}
          onClose={() => {
            setSidecarOpen(false);
            setActiveCitationIndex(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { parseCitationSegments } from "@/lib/modules/rag/citation-parser";
import { CitationPill } from "./citation-pill";
import type { Citation } from "@/lib/modules/rag/types";

export type DisplayMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Citation[];
  model?: string | null;
  createdAt?: Date | string;
  isStreaming?: boolean;
};

type Props = {
  messages: DisplayMessage[];
  streamingCitations: Citation[];
  activeCitationIndex: number | null;
  onCitationSelect: (citation: Citation) => void;
  onRegenerate?: (messageId: string) => void;
  isLoading?: boolean;
};

function MessageContent({
  content,
  citations,
  onCitationSelect,
  activeCitationIndex,
}: {
  content: string;
  citations: Citation[];
  onCitationSelect: (c: Citation) => void;
  activeCitationIndex: number | null;
}) {
  const segments = parseCitationSegments(content);

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <React.Fragment key={i}>{seg.content}</React.Fragment>;
        }
        return (
          <CitationPill
            key={i}
            index={seg.index}
            citations={citations}
            onSelect={onCitationSelect}
            isActive={activeCitationIndex === seg.index}
          />
        );
      })}
    </span>
  );
}

export function MessageList({
  messages,
  streamingCitations,
  activeCitationIndex,
  onCitationSelect,
  onRegenerate,
  isLoading,
}: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
        <p className="text-2xl">💬</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Ask anything about your uploaded sources. Answers will be cited so you can trace every
          claim.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isUser = msg.role === "USER";
        const citations = msg.citations ?? streamingCitations;

        return (
          <div key={msg.id} className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                AI
              </div>
            )}

            <div
              className={cn(
                "max-w-[72%] rounded-2xl px-4 py-3 text-sm",
                isUser
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm",
              )}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <MessageContent
                  content={msg.content}
                  citations={citations}
                  onCitationSelect={onCitationSelect}
                  activeCitationIndex={activeCitationIndex}
                />
              )}

              {!isUser && msg.isStreaming && (
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-foreground/50 align-middle" />
              )}

              <div className="mt-2 flex items-center justify-between gap-2">
                {!isUser && msg.model && (
                  <span className="text-[10px] text-muted-foreground opacity-60">{msg.model}</span>
                )}
                {!isUser && onRegenerate && !msg.isStreaming && (
                  <button
                    type="button"
                    onClick={() => onRegenerate(msg.id)}
                    className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            {isUser && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                You
              </div>
            )}
          </div>
        );
      })}

      {isLoading && messages[messages.length - 1]?.role !== "ASSISTANT" && (
        <div className="flex gap-3 justify-start">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            AI
          </div>
          <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

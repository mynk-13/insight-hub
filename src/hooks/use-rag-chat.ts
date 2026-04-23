"use client";

import { useState, useCallback, useRef } from "react";
import type { Citation, SseEvent, ModelId } from "@/lib/modules/rag/types";
import type { DisplayMessage } from "@/components/features/chat/message-list";

function generateId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useRagChat(chatId: string, initialMessages: DisplayMessage[] = []) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (query: string, model: ModelId) => {
      if (isLoading) return;

      abortRef.current = new AbortController();
      setIsLoading(true);
      setStreamingCitations([]);

      const userMsgId = generateId();
      const assistantMsgId = generateId();

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "USER", content: query, createdAt: new Date() },
        {
          id: assistantMsgId,
          role: "ASSISTANT",
          content: "",
          isStreaming: true,
          createdAt: new Date(),
        },
      ]);

      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, model }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error ?? "Request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const event: SseEvent = JSON.parse(part.slice(6));

            if (event.type === "citations") {
              setStreamingCitations(event.citations);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, citations: event.citations } : m,
                ),
              );
            } else if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + event.text } : m,
                ),
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === userMsgId) return { ...m, id: event.messageId };
                  if (m.id === assistantMsgId)
                    return { ...m, id: event.assistantMessageId, isStreaming: false, model };
                  return m;
                }),
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
                    : m,
                ),
              );
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m)),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: "Generation failed. Please try again.", isStreaming: false }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [chatId, isLoading],
  );

  const regenerate = useCallback(
    async (messageId: string, model: ModelId) => {
      if (isLoading) return;

      abortRef.current = new AbortController();
      setIsLoading(true);
      setStreamingCitations([]);

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: "", isStreaming: true } : m)),
      );

      try {
        const res = await fetch(`/api/chats/${chatId}/messages/${messageId}/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("Regeneration failed");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const event: SseEvent = JSON.parse(part.slice(6));

            if (event.type === "citations") {
              setStreamingCitations(event.citations);
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, citations: event.citations } : m)),
              );
            } else if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId ? { ...m, content: m.content + event.text } : m,
                ),
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, isStreaming: false, model } : m)),
              );
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: "Regeneration failed. Please try again.", isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [chatId, isLoading],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) => prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)));
  }, []);

  return { messages, streamingCitations, isLoading, sendMessage, regenerate, stop };
}

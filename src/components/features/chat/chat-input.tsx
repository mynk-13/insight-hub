"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "./model-selector";
import type { ModelId, ModelTier } from "@/lib/modules/rag/types";

type Props = {
  onSubmit: (query: string) => void;
  onStop: () => void;
  isLoading: boolean;
  tier: ModelTier;
  selectedModel: ModelId;
  onModelChange: (model: ModelId) => void;
  disabled?: boolean;
};

export function ChatInput({
  onSubmit,
  onStop,
  isLoading,
  tier,
  selectedModel,
  onModelChange,
  disabled = false,
}: Props) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your sources…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[1.5rem]"
          aria-label="Chat input"
        />

        <div className="flex shrink-0 items-center gap-2 pb-0.5">
          <ModelSelector
            value={selectedModel}
            tier={tier}
            onChange={onModelChange}
            disabled={isLoading || disabled}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              aria-label="Stop generation"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                value.trim() && !disabled
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground",
              )}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Shift+Enter for new line · Enter to send
      </p>
    </form>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

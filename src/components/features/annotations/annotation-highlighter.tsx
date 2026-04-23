"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANNOTATION_COLORS, type AnnotationColor } from "@/lib/modules/annotations/types";

interface SelectionInfo {
  text: string;
  start: number;
  end: number;
  rect: DOMRect;
}

interface AnnotationHighlighterProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSave: (
    anchor: { text: string; start: number; end: number },
    color: AnnotationColor,
    content?: string,
  ) => Promise<void>;
  disabled?: boolean;
}

const COLOR_CLASSES: Record<AnnotationColor, string> = {
  yellow: "bg-yellow-200/70",
  green: "bg-green-200/70",
  blue: "bg-blue-200/70",
  pink: "bg-pink-200/70",
  purple: "bg-purple-200/70",
  orange: "bg-orange-200/70",
};

const COLOR_DOTS: Record<AnnotationColor, string> = {
  yellow: "bg-yellow-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  pink: "bg-pink-400",
  purple: "bg-purple-500",
  orange: "bg-orange-400",
};

export function AnnotationHighlighter({
  containerRef,
  onSave,
  disabled,
}: AnnotationHighlighterProps) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>("yellow");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (disabled) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate char offsets relative to container text content
    const preRange = document.createRange();
    preRange.setStart(container, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + text.length;

    setSelection({ text, start, end, rect });
    setPickerPos({
      top: rect.top - containerRect.top - 80,
      left: Math.min(rect.left - containerRect.left, containerRect.width - 280),
    });
  }, [disabled, containerRef]);

  const handleSave = useCallback(async () => {
    if (!selection) return;
    setSaving(true);
    try {
      await onSave(
        { text: selection.text, start: selection.start, end: selection.end },
        selectedColor,
        comment.trim() || undefined,
      );
      setSelection(null);
      setComment("");
      window.getSelection()?.removeAllRanges();
    } finally {
      setSaving(false);
    }
  }, [selection, selectedColor, comment, onSave]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setSelection(null);
        setComment("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, handleMouseUp]);

  if (!selection) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-72"
      style={{ top: pickerPos.top, left: pickerPos.left }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedColor(c)}
            className={`w-5 h-5 rounded-full ${COLOR_DOTS[c]} ${
              selectedColor === c ? "ring-2 ring-offset-1 ring-foreground" : ""
            }`}
            aria-label={c}
          />
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a note (optional)…"
        className="w-full text-xs border border-border rounded px-2 py-1.5 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        rows={2}
      />
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Highlight"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelection(null);
            setComment("");
          }}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export { COLOR_CLASSES };

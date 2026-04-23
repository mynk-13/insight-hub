"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  workspaceSlug: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

// Mention format: @[Name](userId)
function insertMention(
  text: string,
  cursorPos: number,
  member: Member,
): { text: string; cursor: number } {
  const before = text.slice(0, cursorPos);
  const atIdx = before.lastIndexOf("@");
  const mention = `@[${member.name ?? member.id}](${member.id}) `;
  const newText = text.slice(0, atIdx) + mention + text.slice(cursorPos);
  return { text: newText, cursor: atIdx + mention.length };
}

export function MentionInput({
  value,
  onChange,
  workspaceSlug,
  placeholder,
  rows = 3,
  className,
}: MentionInputProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [suggestions, setSuggestions] = useState<Member[]>([]);
  const [, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceSlug}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.members)) setMembers(data.members);
      })
      .catch(() => {});
  }, [workspaceSlug]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const cursor = e.target.selectionStart ?? val.length;
      onChange(val);

      const before = val.slice(0, cursor);
      const atMatch = before.match(/@(\w*)$/);
      if (atMatch) {
        const q = atMatch[1].toLowerCase();
        setQuery(q);
        setSuggestions(
          members
            .filter((m) => m.name?.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
            .slice(0, 6),
        );
        setShowDropdown(true);
        setSelectedIdx(0);
      } else {
        setShowDropdown(false);
      }
    },
    [onChange, members],
  );

  const pickMember = useCallback(
    (member: Member) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart ?? value.length;
      const { text, cursor: newCursor } = insertMention(value, cursor, member);
      onChange(text);
      setShowDropdown(false);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      });
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIdx]) {
          e.preventDefault();
          pickMember(suggestions[selectedIdx]);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, suggestions, selectedIdx, pickMember],
  );

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 mb-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-accent ${
                  i === selectedIdx ? "bg-accent" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMember(m);
                }}
              >
                {m.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span>{m.name ?? m.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  workspaceSlug: string;
};

export function SearchPalette({ workspaceSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Load history
      fetch(`/api/search/history?workspace=${workspaceSlug}`)
        .then((r) => r.json())
        .then((d) => setHistory(d.history ?? []))
        .catch(() => undefined);
    } else {
      // Reset query when palette closes — use ref to avoid effect dependency cycle
      debounceRef.current = setTimeout(() => setQuery(""), 0);
    }
  }, [open, workspaceSlug]);

  const navigate = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      router.push(`/ws/${workspaceSlug}/search?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
    },
    [router, workspaceSlug],
  );

  const handleInput = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    // Just update query; full search happens on submit/enter
    debounceRef.current = setTimeout(() => {}, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") navigate(query);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors w-full"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs font-mono bg-background border rounded px-1">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border bg-popover shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search sources…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 py-0 h-auto text-sm"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* History / Suggestions */}
        <div className="max-h-80 overflow-y-auto">
          {!query && history.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">
              Start typing to search your workspace
            </p>
          )}
          {!query && history.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 text-xs font-medium text-muted-foreground">Recent searches</p>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => navigate(h)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {h}
                </button>
              ))}
            </div>
          )}
          {query && (
            <div className="py-2">
              <button
                onClick={() => navigate(query)}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Search for &ldquo;{query}&rdquo;
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <kbd className="font-mono">↵</kbd> to search
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}

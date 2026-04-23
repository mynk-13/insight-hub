"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlIngestFormProps {
  workspaceId: string;
  onSuccess?: (sourceId: string) => void;
}

export function UrlIngestForm({ workspaceId, onSuccess }: UrlIngestFormProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/sources/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to ingest URL");
        return;
      }

      setStatus("success");
      setMessage("URL queued for ingestion");
      setUrl("");
      onSuccess?.(data.sourceId);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        placeholder="https://example.com/article"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={status === "loading"}
        className="flex-1"
      />
      <Button type="submit" disabled={status === "loading" || !url.trim()}>
        {status === "loading" ? "Adding…" : "Add URL"}
      </Button>
      {message && (
        <p
          className={
            status === "error" ? "text-destructive text-sm mt-1" : "text-green-600 text-sm mt-1"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}

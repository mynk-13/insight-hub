"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function OnboardingForm({ defaultName }: { defaultName?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(defaultName ?? "");
  const [workspaceName, setWorkspaceName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameNext(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) setStep(2);
  }

  function handleWorkspaceNameChange(value: string) {
    setWorkspaceName(value);
    setSlug(slugify(value));
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceName.trim() || !slug) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workspaceName.trim(), slug }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to create workspace. Please try again.");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as { slug: string };
    setStep(3);
    setTimeout(() => router.push(`/ws/${data.slug}`), 1200);
  }

  if (step === 3) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium">Workspace created!</p>
        <p className="text-sm text-muted-foreground">Taking you there now…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex gap-1">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleNameNext} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">What should we call you?</h2>
            <p className="text-sm text-muted-foreground">
              This is displayed on your profile and in workspace activity.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Continue
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Create your workspace</h2>
            <p className="text-sm text-muted-foreground">
              A workspace is where you store documents and run research queries.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => handleWorkspaceNameChange(e.target.value)}
              placeholder="My Research"
              required
              autoFocus
            />
          </div>
          {slug && (
            <p className="text-xs text-muted-foreground">
              URL: <span className="font-mono">insighthub.app/ws/{slug}</span>
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !workspaceName.trim() || !slug}
            >
              {loading ? "Creating…" : "Create workspace"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

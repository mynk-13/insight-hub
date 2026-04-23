"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  workspaceSlug: string;
  onSuccess?: () => void;
};

export function CollectionForm({ workspaceSlug, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Collection created");
      setName("");
      setDescription("");
      router.refresh();
      onSuccess?.();
    } catch {
      toast.error("Failed to create collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="col-name">Name</Label>
        <Input
          id="col-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Research Papers"
          maxLength={100}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="col-desc">Description (optional)</Label>
        <Textarea
          id="col-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this collection for?"
          maxLength={500}
          rows={2}
        />
      </div>
      <Button type="submit" disabled={loading || !name.trim()} className="w-full">
        {loading ? "Creating…" : "Create collection"}
      </Button>
    </form>
  );
}

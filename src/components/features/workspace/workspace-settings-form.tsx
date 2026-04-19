"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { WorkspaceWithRole } from "@/lib/modules/workspace";

type Props = {
  workspace: WorkspaceWithRole;
  canEdit: boolean;
  canDelete: boolean;
  canTransfer: boolean;
};

export function WorkspaceSettingsForm({ workspace, canEdit, canDelete, canTransfer }: Props) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        toast.error(error ?? "Failed to save");
        return;
      }
      toast.success("Settings saved");
      // If slug changed, navigate to new URL
      if (slug !== workspace.slug) {
        router.replace(`/ws/${slug}/settings`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/workspaces/${workspace.slug}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Workspace deleted");
      router.replace("/dashboard");
    } else {
      toast.error("Failed to delete workspace");
    }
    setDeleteOpen(false);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="ws-name">Name</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            maxLength={80}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ws-slug">
            URL slug{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (insighthub.app/ws/<strong>{slug}</strong>)
            </span>
          </Label>
          <Input
            id="ws-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            disabled={!canEdit}
            minLength={2}
            maxLength={48}
            pattern="[a-z0-9-]+"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ws-desc">Description</Label>
          <Textarea
            id="ws-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={3}
            maxLength={500}
          />
        </div>
        {canEdit && (
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        )}
      </form>

      {(canDelete || canTransfer) && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
            {canDelete && (
              <div className="flex items-start justify-between gap-4 rounded-md border border-destructive/30 p-4">
                <div>
                  <p className="text-sm font-medium">Delete workspace</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently deletes all sources, chats, and member data.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Type <strong>{workspace.slug}</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={workspace.slug}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
              disabled={deleteConfirm !== workspace.slug}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

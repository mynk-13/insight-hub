"use client";

import { useState } from "react";
import { Download, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  workspaceSlug: string;
  workspaceName: string;
  isDeleted: boolean;
}

type ExportFormat = "zip" | "md" | "notion";

interface ExportJob {
  jobId: string;
  status: "queued" | "processing" | "done" | "failed";
  downloadUrl: string | null;
  error: string | null;
}

export function WorkspaceExportPanel({ workspaceSlug, workspaceName, isDeleted }: Props) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("zip");
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [polling, setPolling] = useState(false);

  const [confirmSlug, setConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function startExport() {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: exportFormat }),
    });
    if (!res.ok) return;
    const { jobId } = (await res.json()) as { jobId: string };
    setExportJob({ jobId, status: "queued", downloadUrl: null, error: null });
    pollJob(jobId);
  }

  function pollJob(jobId: string) {
    setPolling(true);
    const interval = setInterval(async () => {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/export/${jobId}`);
      if (!res.ok) {
        clearInterval(interval);
        setPolling(false);
        return;
      }
      const job = (await res.json()) as ExportJob;
      setExportJob(job);
      if (job.status === "done" || job.status === "failed") {
        clearInterval(interval);
        setPolling(false);
      }
    }, 3000);
  }

  async function softDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}`, { method: "DELETE" });
      if (res.ok) window.location.href = "/dashboard";
    } finally {
      setDeleting(false);
    }
  }

  async function hardPurge() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/purge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmSlug }),
      });
      if (res.ok) window.location.href = "/dashboard";
      else {
        const { error } = (await res.json()) as { error: string };
        alert(error);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function restore() {
    setRestoring(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/restore`, { method: "POST" });
      if (res.ok) window.location.reload();
      else {
        const { error } = (await res.json()) as { error: string };
        alert(error);
      }
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Export section */}
      <section className="rounded-lg border p-5">
        <h2 className="font-semibold mb-1">Export Workspace</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Download all sources, chats, and annotations as a single archive. Export jobs are
          processed asynchronously — you&apos;ll receive an email when ready.
        </p>

        <div className="flex gap-2 mb-4">
          {(["zip", "md", "notion"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setExportFormat(f)}
              className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
                exportFormat === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <Button onClick={startExport} disabled={polling} className="gap-2">
          <Download className="h-4 w-4" />
          {polling ? "Processing…" : "Start Export"}
        </Button>

        {exportJob && (
          <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  exportJob.status === "done"
                    ? "default"
                    : exportJob.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {exportJob.status}
              </Badge>
              {exportJob.status === "done" && exportJob.downloadUrl && (
                <a
                  href={exportJob.downloadUrl}
                  download
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Download now
                </a>
              )}
              {exportJob.status === "failed" && (
                <span className="text-destructive">{exportJob.error}</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-destructive/50 p-5">
        <h2 className="font-semibold text-destructive mb-1">Danger Zone</h2>

        {isDeleted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This workspace is scheduled for deletion. You can restore it within 30 days, or
              permanently delete all data now.
            </p>
            <Button variant="outline" onClick={restore} disabled={restoring} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {restoring ? "Restoring…" : "Restore workspace"}
            </Button>

            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Permanently delete workspace
              </p>
              <p className="text-xs text-muted-foreground">
                Type <strong>{workspaceSlug}</strong> to confirm. This cannot be undone — all
                sources, vectors, and files will be purged.
              </p>
              <div className="flex gap-2">
                <Input
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  placeholder={workspaceSlug}
                  className="max-w-xs font-mono text-sm"
                />
                <Button
                  variant="destructive"
                  onClick={hardPurge}
                  disabled={confirmSlug !== workspaceSlug || deleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting…" : "Delete forever"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Deleting moves the workspace to a 30-day recovery queue before permanent removal.
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete {workspaceName}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm">Are you sure?</p>
                <Button variant="destructive" size="sm" onClick={softDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

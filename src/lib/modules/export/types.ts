export type ExportFormat = "zip" | "md" | "notion";
export type ExportStatus = "queued" | "processing" | "done" | "failed";

export interface ExportJobRecord {
  jobId: string;
  workspaceId: string;
  userId: string;
  format: ExportFormat;
  status: ExportStatus;
  downloadUrl: string | null;
  expiresAt: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

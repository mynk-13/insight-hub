"use client";

import { useRef, useState, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/markdown": ".md",
  "text/plain": ".txt",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface UploadFile {
  id: string;
  file: File;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  sourceId?: string;
}

interface UploadDropzoneProps {
  workspaceId: string;
  userId: string;
  onFilesAdded?: (files: UploadFile[]) => void;
  onFileComplete?: (file: UploadFile) => void;
  className?: string;
}

export function UploadDropzone({
  workspaceId,
  userId,
  onFilesAdded,
  onFileComplete,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadFile[]>([]);
  const activeUploads = useRef(0);
  const CONCURRENCY = 4;

  const updateFile = useCallback((id: string, patch: Partial<UploadFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const processFile = useCallback(
    async (uploadFile: UploadFile) => {
      const { file, id } = uploadFile;

      updateFile(id, { status: "uploading", progress: 0 });

      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/sources/upload-url",
          clientPayload: JSON.stringify({
            workspaceId,
            userId,
            filename: file.name,
            mimeType: file.type,
          }),
          onUploadProgress: ({ percentage }) => {
            updateFile(id, { progress: Math.round(percentage * 0.7) }); // 0-70% = upload
          },
        });

        // Trigger ingestion
        updateFile(id, { status: "processing", progress: 75 });

        // Find the created source by blob URL
        const res = await fetch(`/api/sources?workspaceId=${workspaceId}&status=PENDING`);
        const data = await res.json();
        const source = (data.items as Array<{ id: string; blobKey?: string }>).find(
          (s) => s.blobKey === blob.url,
        );

        if (source) {
          await fetch("/api/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceId: source.id, workspaceId }),
          });

          updateFile(id, { status: "done", progress: 100, sourceId: source.id });
          onFileComplete?.({ ...uploadFile, status: "done", progress: 100, sourceId: source.id });
        } else {
          updateFile(id, { status: "done", progress: 100 });
          onFileComplete?.({ ...uploadFile, status: "done", progress: 100 });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updateFile(id, { status: "error", error: message });
        onFileComplete?.({ ...uploadFile, status: "error", error: message });
      } finally {
        activeUploads.current -= 1;
      }
    },
    [workspaceId, userId, updateFile, onFileComplete],
  );

  const enqueueFiles = useCallback(
    (files: File[]) => {
      const valid = files.filter((f) => {
        if (!ACCEPTED_TYPES[f.type]) return false;
        if (f.size > MAX_FILE_SIZE) return false;
        return true;
      });

      const newItems: UploadFile[] = valid.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: "queued",
        progress: 0,
      }));

      setQueue((prev) => [...prev, ...newItems]);
      onFilesAdded?.(newItems);

      // Process up to CONCURRENCY files at a time
      const processNext = () => {
        setQueue((prev) => {
          const pending = prev.filter((f) => f.status === "queued");
          const slots = CONCURRENCY - activeUploads.current;
          const toStart = pending.slice(0, slots);
          for (const f of toStart) {
            activeUploads.current += 1;
            processFile(f).then(processNext);
          }
          return prev;
        });
      };
      processNext();
    },
    [processFile, onFilesAdded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      enqueueFiles(Array.from(e.dataTransfer.files));
    },
    [enqueueFiles],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, Markdown — up to 50 MB each</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={Object.values(ACCEPTED_TYPES).join(",")}
        className="hidden"
        onChange={(e) => enqueueFiles(Array.from(e.target.files ?? []))}
      />

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((f) => (
            <UploadQueueItem key={f.id} file={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadQueueItem({ file }: { file: UploadFile }) {
  const statusColor: Record<UploadFile["status"], string> = {
    queued: "text-muted-foreground",
    uploading: "text-blue-500",
    processing: "text-yellow-500",
    done: "text-green-600",
    error: "text-destructive",
  };

  const statusLabel: Record<UploadFile["status"], string> = {
    queued: "Queued",
    uploading: `Uploading ${file.progress}%`,
    processing: "Processing…",
    done: "Done",
    error: file.error ?? "Error",
  };

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 text-sm">
      <span className="flex-1 truncate font-medium">{file.file.name}</span>
      <span className={cn("shrink-0 text-xs", statusColor[file.status])}>
        {statusLabel[file.status]}
      </span>
      {(file.status === "uploading" || file.status === "processing") && (
        <div className="w-20 overflow-hidden rounded-full bg-muted h-1.5">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}
    </li>
  );
}

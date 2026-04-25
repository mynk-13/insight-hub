import "server-only";
import JSZip from "jszip";
import { put } from "@vercel/blob";
import { db } from "@/lib/shared/db";
import { redis } from "@/lib/shared/cache";
import type { ExportFormat, ExportJobRecord, ExportStatus } from "./types";

function exportJobKey(jobId: string): string {
  return `export:job:${jobId}`;
}

export async function createExportJob(
  workspaceId: string,
  userId: string,
  format: ExportFormat,
): Promise<string> {
  const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: ExportJobRecord = {
    jobId,
    workspaceId,
    userId,
    format,
    status: "queued",
    downloadUrl: null,
    expiresAt: null,
    error: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  // Store job state in Redis for 48h
  await redis.set(exportJobKey(jobId), JSON.stringify(record), { ex: 48 * 3600 });
  return jobId;
}

export async function getExportJob(jobId: string): Promise<ExportJobRecord | null> {
  const raw = await redis.get<string>(exportJobKey(jobId));
  if (!raw) return null;
  const value = typeof raw === "string" ? raw : JSON.stringify(raw);
  return JSON.parse(value) as ExportJobRecord;
}

async function updateExportJob(jobId: string, updates: Partial<ExportJobRecord>): Promise<void> {
  const existing = await getExportJob(jobId);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await redis.set(exportJobKey(jobId), JSON.stringify(updated), { ex: 48 * 3600 });
}

export async function processExportJob(jobId: string): Promise<void> {
  const job = await getExportJob(jobId);
  if (!job) return;

  await updateExportJob(jobId, { status: "processing" });

  try {
    const content = await buildExportContent(job.workspaceId, job.format);
    const blob = await put(
      `exports/${job.workspaceId}/${jobId}.${getExtension(job.format)}`,
      content,
      {
        access: "public",
        contentType: getContentType(job.format),
      },
    );

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await updateExportJob(jobId, {
      status: "done",
      downloadUrl: blob.url,
      expiresAt,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    await updateExportJob(jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
      completedAt: new Date().toISOString(),
    });
  }
}

async function buildExportContent(workspaceId: string, format: ExportFormat): Promise<Buffer> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, slug: true, description: true, createdAt: true },
  });
  if (!workspace) throw new Error("Workspace not found");

  const sources = await db.source.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      chunks: { select: { content: true, chunkIndex: true }, orderBy: { chunkIndex: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const chats = await db.chat.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const annotations = await db.annotation.findMany({
    where: { workspaceId, deletedAt: null, parentId: null },
    include: {
      user: { select: { name: true } },
      source: { select: { title: true } },
      replies: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (format === "zip") {
    const zip = new JSZip();

    // workspace.md
    zip.file(
      "workspace.md",
      [
        `# ${workspace.name}`,
        workspace.description ? `\n${workspace.description}` : "",
        `\n\n**Exported**: ${new Date().toISOString()}`,
        `\n**Created**: ${workspace.createdAt.toISOString()}`,
      ].join(""),
    );

    // sources/
    for (const source of sources) {
      const chunks = source.chunks.map((c) => c.content).join("\n\n---\n\n");
      zip.file(
        `sources/${sanitizeFilename(source.title)}.md`,
        [
          `# ${source.title}`,
          `\n\n**Type**: ${source.type}`,
          `\n**Ingested**: ${source.createdAt.toISOString()}`,
          source.tags.length ? `\n**Tags**: ${source.tags.join(", ")}` : "",
          "\n\n---\n\n",
          chunks,
        ].join(""),
      );
    }

    // chats/
    for (const chat of chats) {
      const lines = chat.messages.map((msg) => {
        const role = msg.role === "USER" ? "**You**" : "**InsightHub**";
        return `${role}: ${msg.content}`;
      });
      zip.file(
        `chats/${chat.id}.md`,
        [
          `# Chat — ${chat.createdAt.toISOString()}`,
          `\n**User**: ${chat.user.name ?? "Unknown"}`,
          "\n\n---\n\n",
          lines.join("\n\n"),
        ].join(""),
      );
    }

    // annotations.md
    const annotationLines = annotations.map((ann) => {
      const header = `### ${ann.user.name ?? "Unknown"} on *${ann.source.title}*`;
      const highlight = `> ${ann.anchorText}`;
      const comment = ann.content ? `\n${ann.content}` : "";
      const replies = ann.replies
        .map((r) => `  - **${r.user.name ?? "Unknown"}**: ${r.content ?? ""}`)
        .join("\n");
      return [header, highlight, comment, replies ? `\n**Replies:**\n${replies}` : ""].join("\n");
    });
    zip.file("annotations.md", `# Annotations\n\n${annotationLines.join("\n\n---\n\n")}`);

    return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
  }

  // md format — single file
  const sections = [
    `# ${workspace.name} — Export\n\n**Exported**: ${new Date().toISOString()}`,
    `## Sources (${sources.length})`,
    ...sources.map((s) => {
      const chunks = s.chunks.map((c) => c.content).join("\n\n");
      return `### ${s.title}\n\n${chunks}`;
    }),
    `## Chat History (${chats.length} chats)`,
    ...chats.map((chat) => {
      const lines = chat.messages
        .map((m) => `**${m.role === "USER" ? "User" : "AI"}**: ${m.content}`)
        .join("\n\n");
      return `### Chat ${chat.id}\n\n${lines}`;
    }),
  ];

  return Buffer.from(sections.join("\n\n---\n\n"), "utf-8");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function getExtension(format: ExportFormat): string {
  return format === "zip" ? "zip" : "md";
}

function getContentType(format: ExportFormat): string {
  return format === "zip" ? "application/zip" : "text/markdown";
}

export type { ExportFormat, ExportStatus };

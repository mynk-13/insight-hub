import "server-only";
import { redis, CacheKeys } from "@/lib/shared/cache";

// Job types used across ingestion and export pipelines.
// Add new types here as new async operations are introduced.
export type JobType = "source:ingest" | "source:embed" | "export:workspace";

export interface Job<T = unknown> {
  type: JobType;
  payload: T;
  enqueuedAt: number;
  attempts: number;
}

// Payload shapes for each job type
export interface IngestionJobPayload {
  sourceId: string;
  workspaceId: string;
  userId: string;
}

export interface ExportJobPayload {
  jobId: string;
  workspaceId: string;
  userId: string;
  format: "zip" | "md" | "notion";
}

// LPUSH/RPOP pattern per ADR-014.
// Upstash HTTP Redis doesn't support blocking BRPOPLPUSH, so workers poll via
// a cron API route instead of maintaining a long-lived connection.
class JobQueueImpl {
  async enqueue<T>(queueName: string, type: JobType, payload: T): Promise<void> {
    const job: Job<T> = { type, payload, enqueuedAt: Date.now(), attempts: 0 };
    await redis.lpush(CacheKeys.jobQueue(queueName), JSON.stringify(job));
  }

  async dequeue<T = unknown>(queueName: string): Promise<Job<T> | null> {
    const raw = await redis.rpop<string>(CacheKeys.jobQueue(queueName));
    if (!raw) return null;
    const value = typeof raw === "string" ? raw : JSON.stringify(raw);
    return JSON.parse(value) as Job<T>;
  }

  async size(queueName: string): Promise<number> {
    return redis.llen(CacheKeys.jobQueue(queueName));
  }
}

export const jobQueue = new JobQueueImpl();

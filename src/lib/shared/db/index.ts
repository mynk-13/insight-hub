import { PrismaClient, type Prisma } from "@prisma/client";
import { getCurrentWorkspaceId } from "./workspace-context";

// Tables subject to RLS workspace isolation
const WORKSPACE_SCOPED = new Set([
  "Source",
  "Chunk",
  "Chat",
  "Message",
  "Collection",
  "SourceCollection",
  "Annotation",
  "Invitation",
]);

declare global {
  var _prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis._prisma ??
  (globalThis._prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }));

// Runs fn inside a Postgres transaction with SET LOCAL app.current_workspace_id,
// so RLS policies scope all queries to the given workspace.
// Use this for every workspace-scoped read/write in API routes.
export async function withWorkspace<T>(
  workspaceId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`;
    return fn(tx);
  });
}

// Convenience: run workspace-scoped queries using the current AsyncLocalStorage
// context (set by runWithWorkspace). Useful in server components and actions.
export async function withCurrentWorkspace<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T | null> {
  const workspaceId = getCurrentWorkspaceId();
  if (!workspaceId) return null;
  return withWorkspace(workspaceId, fn);
}

// Re-export only what consumers need from the workspace context
export { runWithWorkspace, getCurrentWorkspaceId } from "./workspace-context";

// Convenience alias used by feature modules
export const db = prisma;

// Suppress unused import warning — kept for future use in workspace-scoped checks
void WORKSPACE_SCOPED;

import type { Role } from "@prisma/client";

export type WorkspaceAction =
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "workspace:transfer"
  | "members:invite"
  | "members:read"
  | "members:remove"
  | "roles:assign"
  | "sources:upload"
  | "sources:delete"
  | "collections:manage"
  | "chat:query"
  | "analytics:read"
  | "annotations:create"
  | "annotations:delete_own"
  | "annotations:delete_any"
  | "invitations:manage"
  | "activity:read";

// Static permission matrix — O(1) lookup, no DB hit required.
const PERMISSION_MATRIX: Record<WorkspaceAction, ReadonlySet<Role>> = {
  "workspace:read": new Set(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
  "workspace:update": new Set(["OWNER", "ADMIN"]),
  "workspace:delete": new Set(["OWNER"]),
  "workspace:transfer": new Set(["OWNER"]),
  "members:invite": new Set(["OWNER", "ADMIN"]),
  "members:read": new Set(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
  "members:remove": new Set(["OWNER", "ADMIN"]),
  "roles:assign": new Set(["OWNER", "ADMIN"]),
  "sources:upload": new Set(["OWNER", "ADMIN", "EDITOR"]),
  "sources:delete": new Set(["OWNER", "ADMIN", "EDITOR"]),
  "collections:manage": new Set(["OWNER", "ADMIN", "EDITOR"]),
  "chat:query": new Set(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
  "analytics:read": new Set(["OWNER", "ADMIN"]),
  "annotations:create": new Set(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
  "annotations:delete_own": new Set(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
  "annotations:delete_any": new Set(["OWNER", "ADMIN"]),
  "invitations:manage": new Set(["OWNER", "ADMIN"]),
  "activity:read": new Set(["OWNER", "ADMIN", "EDITOR"]),
};

export function canPerform(role: Role, action: WorkspaceAction): boolean {
  return PERMISSION_MATRIX[action].has(role);
}

// ADMIN may assign roles up to EDITOR — only OWNER can assign ADMIN.
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (!canPerform(actorRole, "roles:assign")) return false;
  if (targetRole === "OWNER") return false;
  if (targetRole === "ADMIN" && actorRole !== "OWNER") return false;
  return true;
}

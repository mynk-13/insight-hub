import { describe, it, expect } from "vitest";
import { canPerform, canAssignRole } from "@/lib/modules/workspace/permission";
import type { WorkspaceAction } from "@/lib/modules/workspace/permission";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];

const ALL_ACTIONS: WorkspaceAction[] = [
  "workspace:read",
  "workspace:update",
  "workspace:delete",
  "workspace:transfer",
  "members:invite",
  "members:read",
  "members:remove",
  "roles:assign",
  "sources:upload",
  "sources:delete",
  "collections:manage",
  "chat:query",
  "analytics:read",
  "annotations:create",
  "annotations:delete_own",
  "annotations:delete_any",
  "invitations:manage",
  "activity:read",
];

// Expected permission matrix
const EXPECTED: Record<WorkspaceAction, Role[]> = {
  "workspace:read": ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  "workspace:update": ["OWNER", "ADMIN"],
  "workspace:delete": ["OWNER"],
  "workspace:transfer": ["OWNER"],
  "members:invite": ["OWNER", "ADMIN"],
  "members:read": ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  "members:remove": ["OWNER", "ADMIN"],
  "roles:assign": ["OWNER", "ADMIN"],
  "sources:upload": ["OWNER", "ADMIN", "EDITOR"],
  "sources:delete": ["OWNER", "ADMIN", "EDITOR"],
  "collections:manage": ["OWNER", "ADMIN", "EDITOR"],
  "chat:query": ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  "analytics:read": ["OWNER", "ADMIN"],
  "annotations:create": ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  "annotations:delete_own": ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  "annotations:delete_any": ["OWNER", "ADMIN"],
  "invitations:manage": ["OWNER", "ADMIN"],
  "activity:read": ["OWNER", "ADMIN", "EDITOR"],
};

describe("canPerform — full permission matrix", () => {
  for (const action of ALL_ACTIONS) {
    const allowed = new Set(EXPECTED[action]);
    for (const role of ALL_ROLES) {
      const expected = allowed.has(role);
      it(`${role} can${expected ? "" : "not"} perform ${action}`, () => {
        expect(canPerform(role, action)).toBe(expected);
      });
    }
  }
});

describe("canAssignRole", () => {
  it("OWNER can assign any non-OWNER role", () => {
    expect(canAssignRole("OWNER", "ADMIN")).toBe(true);
    expect(canAssignRole("OWNER", "EDITOR")).toBe(true);
    expect(canAssignRole("OWNER", "VIEWER")).toBe(true);
  });

  it("OWNER cannot assign OWNER role", () => {
    expect(canAssignRole("OWNER", "OWNER")).toBe(false);
  });

  it("ADMIN can assign EDITOR and VIEWER but not ADMIN", () => {
    expect(canAssignRole("ADMIN", "EDITOR")).toBe(true);
    expect(canAssignRole("ADMIN", "VIEWER")).toBe(true);
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false);
  });

  it("ADMIN cannot assign OWNER", () => {
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false);
  });

  it("EDITOR and VIEWER cannot assign any role", () => {
    for (const role of ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as Role[]) {
      expect(canAssignRole("EDITOR", role)).toBe(false);
      expect(canAssignRole("VIEWER", role)).toBe(false);
    }
  });
});

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "./role-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { canAssignRole } from "@/lib/modules/workspace/permission";
import type { Role } from "@prisma/client";

type Member = {
  id: string;
  role: Role;
  user: { id: string; name: string | null; email: string; image: string | null };
};

type PendingInvitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
  invitedBy: { name: string | null; email: string };
};

type Props = {
  members: Member[];
  pendingInvitations: PendingInvitation[];
  currentUserId: string;
  currentUserRole: Role;
  workspaceSlug: string;
  canManageRoles: boolean;
  canRemove: boolean;
};

export function MemberList({
  members,
  pendingInvitations,
  currentUserId,
  currentUserRole,
  workspaceSlug,
  canManageRoles,
  canRemove,
}: Props) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: Role) {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      toast.success("Role updated");
      router.refresh();
    } else {
      const { error } = (await res.json()) as { error: string };
      toast.error(error ?? "Failed to update role");
    }
  }

  async function handleRemove(memberId: string) {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Member removed");
      router.refresh();
    } else {
      const { error } = (await res.json()) as { error: string };
      toast.error(error ?? "Failed to remove member");
    }
    setRemovingId(null);
  }

  async function handleRevokeInvitation(invitationId: string) {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/invitations/${invitationId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Invitation revoked");
      router.refresh();
    } else {
      toast.error("Failed to revoke invitation");
    }
  }

  const memberToRemove = members.find((m) => m.id === removingId);

  return (
    <div className="space-y-1">
      {members.map((member) => {
        const isSelf = member.user.id === currentUserId;
        const isOwner = member.role === "OWNER";
        const initials = (member.user.name ?? member.user.email)
          .split(" ")
          .map((p) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div key={member.id} className="flex items-center gap-3 py-3 px-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.user.name ?? member.user.email}
                {isSelf && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canManageRoles &&
              !isOwner &&
              !isSelf &&
              canAssignRole(currentUserRole, member.role) ? (
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.id, v as Role)}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    {currentUserRole === "OWNER" && <SelectItem value="ADMIN">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              ) : (
                <RoleBadge role={member.role} />
              )}
              {canRemove && !isOwner && !isSelf && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => setRemovingId(member.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {pendingInvitations.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Pending invitations
          </p>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 py-2 px-1">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                ?
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited by {inv.invitedBy.name ?? inv.invitedBy.email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RoleBadge role={inv.role} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground"
                  onClick={() => handleRevokeInvitation(inv.id)}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </>
      )}

      <AlertDialog
        open={!!removingId}
        onOpenChange={(open: boolean) => !open && setRemovingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.user.name ?? memberToRemove?.user.email} will lose access to this
              workspace. Their annotations will be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => removingId && handleRemove(removingId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

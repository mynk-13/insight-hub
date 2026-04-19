import { Suspense } from "react";
import { auth } from "@/auth";
import { workspaceService, invitationService, canPerform } from "@/lib/modules/workspace";
import { notFound } from "next/navigation";
import { MemberList } from "@/components/features/workspace/member-list";
import { InviteMemberDialog } from "@/components/features/workspace/invite-member-dialog";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Members — InsightHub" };

async function MembersContent({ params }: Props) {
  const session = await auth();
  const { slug } = await params;
  if (!session?.user?.id) return null;

  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) notFound();

  const [members, pendingInvitations] = await Promise.all([
    workspaceService.listMembers(workspace.id, session.user.id),
    canPerform(workspace.role, "invitations:manage")
      ? invitationService.listPending(workspace.id, session.user.id)
      : [],
  ]);

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        {canPerform(workspace.role, "members:invite") && (
          <InviteMemberDialog workspaceSlug={slug} />
        )}
      </div>
      <MemberList
        members={members}
        pendingInvitations={pendingInvitations}
        currentUserId={session.user.id}
        currentUserRole={workspace.role}
        workspaceSlug={slug}
        canManageRoles={canPerform(workspace.role, "roles:assign")}
        canRemove={canPerform(workspace.role, "members:remove")}
      />
    </div>
  );
}

export default function MembersPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <MembersContent {...props} />
    </Suspense>
  );
}

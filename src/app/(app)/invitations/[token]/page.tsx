import { Suspense } from "react";
import { auth } from "@/auth";
import { invitationService } from "@/lib/modules/workspace";
import { InvitationAcceptForm } from "@/components/features/workspace/invitation-accept-form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Invitation — InsightHub" };

type Props = { params: Promise<{ token: string }> };

async function InvitationContent({ params }: Props) {
  const session = await auth();
  const { token } = await params;

  const invitation = await invitationService.getByToken(token);

  if (!invitation) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Invitation not found</h1>
        <p className="text-muted-foreground mb-6">
          This invitation link is invalid or has expired.
        </p>
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Invitation expired</h1>
        <p className="text-muted-foreground mb-6">This invitation is no longer valid.</p>
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    );
  }

  const isOwnerTransfer = invitation.role === "OWNER";

  return (
    <>
      <div className="text-center mb-8">
        {invitation.workspace.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={invitation.workspace.avatarUrl}
            alt={invitation.workspace.name}
            className="w-16 h-16 rounded-xl mx-auto mb-4 object-cover"
          />
        )}
        <h1 className="text-2xl font-bold">
          {isOwnerTransfer ? "Ownership Transfer" : "You're invited"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isOwnerTransfer
            ? `${invitation.invitedBy.name ?? invitation.invitedBy.email} wants to transfer ownership of`
            : `${invitation.invitedBy.name ?? invitation.invitedBy.email} invited you to join`}{" "}
          <strong>{invitation.workspace.name}</strong>
          {!isOwnerTransfer && (
            <>
              {" "}
              as{" "}
              <strong>{invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}</strong>
            </>
          )}
        </p>
      </div>
      <InvitationAcceptForm
        token={token}
        isAuthenticated={!!session?.user}
        userEmail={session?.user?.email ?? null}
        invitationEmail={invitation.email}
      />
    </>
  );
}

export default function InvitationPage(props: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
          <InvitationContent {...props} />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

type Props = {
  token: string;
  isAuthenticated: boolean;
  userEmail: string | null;
  invitationEmail: string;
};

export function InvitationAcceptForm({
  token,
  isAuthenticated,
  userEmail,
  invitationEmail,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const emailMismatch =
    isAuthenticated && userEmail && userEmail.toLowerCase() !== invitationEmail.toLowerCase();

  async function handleAction(action: "accept" | "decline") {
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        toast.error(error ?? "Something went wrong");
        return;
      }
      if (action === "accept") {
        const { slug } = (await res.json()) as { slug: string };
        toast.success("Welcome to the workspace!");
        router.push(`/ws/${slug}`);
      } else {
        toast.success("Invitation declined");
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">
          Sign in to accept this invitation.
        </p>
        <Link
          href={`/auth/signin?callbackUrl=/invitations/${token}`}
          className={buttonVariants({ className: "w-full justify-center" })}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div className="rounded-md border border-destructive/30 p-4 text-sm text-center space-y-2">
        <p className="font-medium">Wrong account</p>
        <p className="text-muted-foreground">
          This invitation was sent to <strong>{invitationEmail}</strong>. You&apos;re signed in as{" "}
          <strong>{userEmail}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button className="flex-1" onClick={() => handleAction("accept")} disabled={loading}>
        Accept invitation
      </Button>
      <Button variant="outline" onClick={() => handleAction("decline")} disabled={loading}>
        Decline
      </Button>
    </div>
  );
}

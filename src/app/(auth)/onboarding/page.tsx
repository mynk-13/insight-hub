import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/shared/db";
import { OnboardingForm } from "@/components/features/auth/onboarding-form";

export const metadata: Metadata = {
  title: "Get started — InsightHub",
};

async function OnboardingContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { select: { slug: true } } },
  });
  if (membership) redirect(`/ws/${membership.workspace.slug}`);

  return <OnboardingForm defaultName={session.user.name ?? undefined} />;
}

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to InsightHub</h1>
        <p className="text-sm text-muted-foreground">Let&apos;s set up your research workspace</p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/shared/db";
import { NotificationPreferenceCenter } from "@/components/features/notifications/preference-center";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function PreferencesContent({ paramsPromise }: { paramsPromise: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const workspace = await db.workspace.findUnique({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!workspace) redirect("/dashboard");

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member) redirect("/dashboard");

  return <NotificationPreferenceCenter />;
}

export default function NotificationPreferencesPage({ params }: PageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">Notification Preferences</h1>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <PreferencesContent paramsPromise={params} />
      </Suspense>
    </div>
  );
}

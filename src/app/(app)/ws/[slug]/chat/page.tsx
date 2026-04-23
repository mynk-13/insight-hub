import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";

type Props = { params: Promise<{ slug: string }> };

export default function NewChatPage({ params }: Props) {
  return (
    <Suspense>
      <NewChatRedirect params={params} />
    </Suspense>
  );
}

async function NewChatRedirect({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const workspace = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!workspace) redirect("/dashboard");

  const chat = await db.chat.create({
    data: {
      workspaceId: workspace.id,
      userId: session.user.id,
      contextType: "WORKSPACE",
    },
    select: { id: true },
  });

  redirect(`/ws/${slug}/chat/${chat.id}`);
  // redirect() always throws — unreachable
  return null;
}

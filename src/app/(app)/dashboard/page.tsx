import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard — InsightHub" };

async function DashboardContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const workspaces = await workspaceService.listByUser(session.user.id);

  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Your Workspaces</h2>
          <p className="text-muted-foreground mt-1">Select a workspace to continue</p>
        </div>
        <Link href="/onboarding" className={buttonVariants()}>
          New workspace
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {workspaces.map((ws) => (
          <Link key={ws.id} href={`/ws/${ws.slug}`} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{ws.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {ws.role.toLowerCase()}
                  </Badge>
                </div>
                <CardDescription className="text-xs font-mono">{ws.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                {ws.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{ws.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {ws.tier === "PRO" ? "Pro plan" : "Free plan"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">InsightHub</h1>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  );
}

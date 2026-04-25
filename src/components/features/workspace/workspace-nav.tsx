"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { CollectionsSidebar } from "./collections-sidebar";
import { SearchPalette } from "@/components/features/search/search-palette";
import { NotificationBell } from "@/components/features/notifications/notification-bell";
import type { WorkspaceWithRole } from "@/lib/modules/workspace/service";
import type { CollectionWithCount } from "@/lib/modules/workspace/collection";
import { canPerform } from "@/lib/modules/workspace/permission";
import {
  Settings,
  Users,
  BookOpen,
  MessageSquare,
  BarChart2,
  FolderOpen,
  CreditCard,
  Download,
  ScrollText,
  LogOut,
  Sun,
  Moon,
  Zap,
} from "lucide-react";

type Props = {
  workspace: WorkspaceWithRole;
  userId: string;
  pinnedCollections?: CollectionWithCount[];
};

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function WorkspaceNav({ workspace, userId: _userId, pinnedCollections = [] }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/ws/${workspace.slug}`;

  const mainNav = [
    { href: `${base}/library`, label: "Library", icon: BookOpen },
    { href: `${base}/chat`, label: "Chat", icon: MessageSquare },
    { href: `${base}/collections`, label: "Collections", icon: FolderOpen },
  ];

  const workspaceNav = [
    {
      href: `${base}/settings/members`,
      label: "Members",
      icon: Users,
      show: canPerform(workspace.role, "members:read"),
    },
    {
      href: `${base}/settings`,
      label: "Settings",
      icon: Settings,
      show: canPerform(workspace.role, "workspace:update"),
    },
    {
      href: `${base}/settings/billing`,
      label: "Billing",
      icon: CreditCard,
      show: canPerform(workspace.role, "billing:manage"),
    },
  ];

  const dataNav = [
    {
      href: `${base}/analytics`,
      label: "Analytics",
      icon: BarChart2,
      show: canPerform(workspace.role, "analytics:read"),
    },
    {
      href: `${base}/settings/audit-logs`,
      label: "Audit Log",
      icon: ScrollText,
      show: canPerform(workspace.role, "analytics:read"),
    },
    {
      href: `${base}/settings/export`,
      label: "Export & Data",
      icon: Download,
      show: canPerform(workspace.role, "workspace:read"),
    },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function NavItem({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
          active
            ? "bg-primary/15 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <aside className="w-60 border-r border-border/60 bg-sidebar flex flex-col shrink-0 min-h-screen">
      {/* Brand + workspace switcher */}
      <div className="px-4 pt-5 pb-4 border-b border-border/40">
        <Link href="/dashboard" className="flex items-center gap-2.5 mb-4 group">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
            InsightHub
          </span>
        </Link>
        <WorkspaceSwitcher currentSlug={workspace.slug} currentName={workspace.name} />
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <SearchPalette workspaceSlug={workspace.slug} />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        {/* Main */}
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {/* Workspace */}
        {workspaceNav.some((i) => i.show) && (
          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              Workspace
            </p>
            {workspaceNav
              .filter((i) => i.show)
              .map((item) => (
                <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
          </div>
        )}

        {/* Data */}
        {dataNav.some((i) => i.show) && (
          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              Data
            </p>
            {dataNav
              .filter((i) => i.show)
              .map((item) => (
                <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
          </div>
        )}
      </nav>

      {/* Pinned collections */}
      <CollectionsSidebar
        collections={pinnedCollections}
        workspaceSlug={workspace.slug}
        canEdit={canPerform(workspace.role, "sources:upload")}
      />

      {/* Bottom actions */}
      <div className="px-3 pb-4 pt-2 border-t border-border/40 space-y-0.5">
        <NotificationBell workspaceSlug={workspace.slug} />
        <ThemeToggle />
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/");
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { WorkspaceWithRole } from "@/lib/modules/workspace/service";
import { canPerform } from "@/lib/modules/workspace/permission";
import { Settings, Users, BookOpen, MessageSquare, BarChart2 } from "lucide-react";

type Props = {
  workspace: WorkspaceWithRole;
  userId: string;
};

export function WorkspaceNav({ workspace, userId: _userId }: Props) {
  const pathname = usePathname();
  const base = `/ws/${workspace.slug}`;

  const navItems = [
    { href: `${base}`, label: "Library", icon: BookOpen, always: true },
    { href: `${base}/chat`, label: "Chat", icon: MessageSquare, always: true },
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
      href: `${base}/analytics`,
      label: "Analytics",
      icon: BarChart2,
      show: canPerform(workspace.role, "analytics:read"),
    },
  ];

  return (
    <aside className="w-56 border-r bg-muted/30 flex flex-col py-4 gap-1 shrink-0">
      <div className="px-3 mb-2">
        <WorkspaceSwitcher currentSlug={workspace.slug} currentName={workspace.name} />
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {navItems
          .filter((item) => item.always || item.show)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}

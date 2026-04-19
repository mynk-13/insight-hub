"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";

type WorkspaceSummary = { id: string; name: string; slug: string; role: string };

type Props = { currentSlug: string; currentName: string };

export function WorkspaceSwitcher({ currentSlug, currentName }: Props) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data: WorkspaceSummary[]) => setWorkspaces(data))
      .catch(() => {});
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="w-full justify-between font-medium text-sm px-2 h-9" />
        }
      >
        <span className="truncate">{currentName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            className={ws.slug === currentSlug ? "font-medium" : ""}
            onSelect={() => router.push(`/ws/${ws.slug}`)}
          >
            {ws.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/onboarding")}>
          <Plus className="h-4 w-4 mr-2" />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { Badge } from "@/components/ui/badge";
import type { Role } from "@prisma/client";

const ROLE_VARIANTS: Record<Role, "default" | "secondary" | "outline" | "destructive"> = {
  OWNER: "default",
  ADMIN: "secondary",
  EDITOR: "outline",
  VIEWER: "outline",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant={ROLE_VARIANTS[role]} className="text-xs capitalize">
      {role.toLowerCase()}
    </Badge>
  );
}

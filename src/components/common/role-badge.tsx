import { Badge } from "@/components/ui/badge";
import { ROLE_SHORT_LABELS, type UserRole } from "@/lib/constants/roles";

const VARIANT: Record<UserRole, "default" | "secondary" | "warning" | "outline"> = {
  ADMIN: "default",
  TRANSPORT_SUPERVISOR: "secondary",
  MANAGEMENT: "warning",
  DRIVER: "outline",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={VARIANT[role]}>{ROLE_SHORT_LABELS[role]}</Badge>;
}

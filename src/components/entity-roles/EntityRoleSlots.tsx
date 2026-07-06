import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, Check, Clock, X as XIcon, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  useEntityRoleAssignments,
  useRevokeLink,
  EntityRoleAssignment,
} from "@/hooks/useEntityRoleAssignments";
import { LinkProfileDialog } from "./LinkProfileDialog";

interface Props {
  entityType: string;
  entityId: string;
  canManage: boolean;
}

// Which slugs require equity input.
const OWNER_SLUGS = new Set(["associe_1", "associe_2"]);

export function EntityRoleSlots({ entityType, entityId, canManage }: Props) {
  const { data: rows = [], isLoading } = useEntityRoleAssignments(entityType, entityId);
  const [target, setTarget] = useState<EntityRoleAssignment | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const revoke = useRevokeLink();

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading roles…
      </div>
    );
  }

  if (!rows.length) return null;

  return (
    <div className="rounded-xl border bg-background/60 p-4 space-y-3">
      <button
        type="button"
        onClick={() => setRolesOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold">Roles</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Optional. Linking unlocks verified evidence for that person.
          </span>
          {rolesOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {rolesOpen && (
        <div className="grid gap-2 md:grid-cols-2">

        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div className="flex items-center gap-3 min-w-0">
              {r.linked_profile ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.linked_profile.avatar_url ?? undefined} />
                  <AvatarFallback>{(r.linked_profile.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.linked_profile?.full_name ??
                    (r.status === "pending" ? "Awaiting acceptance" : "Unlinked")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r.status === "accepted" && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" /> Verified
                </Badge>
              )}
              {r.status === "pending" && r.linked_user_id && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> Pending
                </Badge>
              )}
              {r.status === "declined" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <XIcon className="h-3 w-3" /> Declined
                </Badge>
              )}
              {r.status === "revoked" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  Revoked
                </Badge>
              )}
              {canManage && (r.status === "pending" || r.status === "declined" || r.status === "revoked" || !r.linked_user_id) && (
                <Button size="sm" variant="outline" onClick={() => setTarget(r)}>
                  {r.linked_user_id ? "Change" : "Link"}
                </Button>
              )}
              {canManage && r.status === "accepted" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revoke.isPending}
                  onClick={async () => {
                    try {
                      await revoke.mutateAsync(r.id);
                      toast.success("Link revoked");
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed to revoke");
                    }
                  }}
                >
                  Unlink
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      <LinkProfileDialog

        open={!!target}
        onOpenChange={(v) => !v && setTarget(null)}
        assignment={target}
        requiresEquity={target ? OWNER_SLUGS.has(target.role_slug) : false}
      />
    </div>
  );
}

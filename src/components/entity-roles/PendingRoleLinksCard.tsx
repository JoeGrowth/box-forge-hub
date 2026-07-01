import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X as XIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useMyPendingRoleLinks,
  useAcceptLink,
  useDeclineLink,
} from "@/hooks/useEntityRoleAssignments";

export function PendingRoleLinksCard() {
  const { data: rows = [], isLoading } = useMyPendingRoleLinks();
  const accept = useAcceptLink();
  const decline = useDeclineLink();

  if (isLoading || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role link requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{r.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                on {r.entity_type.replace("_", " ")}
                {r.equity_pct != null ? ` · ${r.equity_pct}% equity` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={decline.isPending}
                onClick={async () => {
                  try {
                    await decline.mutateAsync(r.id);
                    toast.success("Declined");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed");
                  }
                }}
              >
                {decline.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XIcon className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                disabled={accept.isPending}
                onClick={async () => {
                  try {
                    await accept.mutateAsync(r.id);
                    toast.success("Accepted — role verified");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed");
                  }
                }}
              >
                {accept.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

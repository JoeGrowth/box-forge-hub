import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Check, X, Inbox, Loader2 } from "lucide-react";

interface RequestRow {
  id: string;
  user_id: string;
  box_id: string;
  request_type: "advisor" | "manager";
  status: string;
  note: string | null;
  created_at: string;
  full_name?: string | null;
  avatar_url?: string | null;
  box_name?: string | null;
}

export function BoxRoleRequestsPanel({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("box_role_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const list = (data || []) as any[];
    if (list.length) {
      const userIds = Array.from(new Set(list.map((r) => r.user_id)));
      const boxIds = Array.from(new Set(list.map((r) => r.box_id)));
      const [{ data: profs }, { data: bx }] = await Promise.all([
        supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", userIds),
        supabase.from("boxes").select("id,name").in("id", boxIds),
      ]);
      const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const bmap = new Map((bx || []).map((b: any) => [b.id, b.name]));
      setRows(
        list.map((r) => ({
          ...r,
          full_name: (pmap.get(r.user_id) as any)?.full_name ?? null,
          avatar_url: (pmap.get(r.user_id) as any)?.avatar_url ?? null,
          box_name: bmap.get(r.box_id) ?? null,
        })),
      );
    } else {
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (row: RequestRow, approve: boolean) => {
    setBusy(row.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const adminId = auth.user?.id ?? null;

      if (approve) {
        if (row.request_type === "advisor") {
          const { error } = await supabase.from("box_advisors").upsert(
            {
              user_id: row.user_id,
              box_id: row.box_id,
              status: "active",
              approved_by: adminId,
              approved_at: new Date().toISOString(),
              accepting_requests: true,
            },
            { onConflict: "user_id,box_id" },
          );
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("box_ecosystem_admins")
            .upsert({ user_id: row.user_id, box_id: row.box_id }, { onConflict: "user_id,box_id" });
          if (error) throw error;
        }
      }

      const { error: upErr } = await supabase
        .from("box_role_requests")
        .update({
          status: approve ? "approved" : "declined",
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) throw upErr;

      toast.success(approve ? "Request approved" : "Request declined");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="h-4 w-4" />
          Box role requests
          {rows.length > 0 && <Badge variant="secondary">{rows.length} pending</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading requests...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending requests.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.avatar_url || undefined} />
                  <AvatarFallback>{(r.full_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.full_name || "Unknown user"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.request_type === "advisor" ? "Advisor" : "Manager"} · {r.box_name || "Box"}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={busy === r.id} onClick={() => review(r, true)}>
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="ml-1">Approve</span>
                </Button>
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r, false)}>
                  <X className="h-4 w-4" />
                  <span className="ml-1">Decline</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

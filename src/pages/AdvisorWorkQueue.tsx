import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { transitionRequest } from "@/lib/boxRequests";
import { Loader2, ShieldCheck, Clock, AlertTriangle, CheckCircle2, Archive } from "lucide-react";
import { Link } from "react-router-dom";

interface RequestRow {
  id: string;
  requester_id: string;
  request_type: string;
  topic: string;
  context: string | null;
  status: string;
  assigned_advisor_id: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  subject_entity_type: string | null;
  subject_entity_id: string | null;
  box_id: string | null;
}

const ageHours = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));

function Section({
  title,
  icon,
  rows,
  emptyHint,
  primary,
  onPrimary,
  busy,
}: {
  title: string;
  icon: React.ReactNode;
  rows: RequestRow[];
  emptyHint: string;
  primary?: string;
  onPrimary?: (r: RequestRow) => void;
  busy?: string | null;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">{icon} {title}</h3>
      {rows.length === 0 ? (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">{emptyHint}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{r.topic}</span>
                  <Badge variant="outline">{r.request_type}</Badge>
                  <span className="text-xs text-muted-foreground">· {ageHours(r.created_at)}h old</span>
                </div>
                {r.context && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.context}</p>}
                {r.subject_entity_type === "idea" && r.subject_entity_id && (
                  <Link to={`/startup-opportunities/${r.subject_entity_id}`} className="text-xs text-b4-teal hover:underline">
                    View linked idea →
                  </Link>
                )}
              </div>
              {primary && onPrimary && (
                <Button size="sm" variant="teal" disabled={busy === r.id} onClick={() => onPrimary(r)}>
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : primary}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdvisorWorkQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("box_inbound_requests")
      .select("*")
      .eq("assigned_advisor_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load queue", description: error.message, variant: "destructive" });
    setRows((data as RequestRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const sections = useMemo(() => {
    const now = Date.now();
    const awaiting = rows.filter((r) => r.status === "matched" && !r.accepted_at);
    const awaitingSignoff = rows.filter(
      (r) => r.request_type === "solution_signoff" && r.status === "accepted" && !r.completed_at
    );
    const upcoming = rows.filter((r) => {
      if (r.status !== "accepted") return false;
      const last = new Date(r.accepted_at ?? r.assigned_at ?? r.created_at).getTime();
      const days = (now - last) / 86_400_000;
      return days >= 7 && days < 14;
    });
    const stale = rows.filter((r) => {
      if (r.status !== "accepted") return false;
      const last = new Date(r.accepted_at ?? r.assigned_at ?? r.created_at).getTime();
      return (now - last) / 86_400_000 >= 14;
    });
    const completed = rows.filter((r) => r.status === "completed" || r.status === "archived");
    return { awaiting, awaitingSignoff, upcoming, stale, completed };
  }, [rows]);

  const wrap = async (r: RequestRow, status: "accepted" | "completed" | "archived") => {
    setBusy(r.id);
    try {
      await transitionRequest(r.id, status);
      await load();
      toast({ title: `Marked ${status}` });
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Advisor work queue</h1>
        <p className="text-sm text-muted-foreground">Your next action, in order. No bios. No calendars.</p>
      </div>

      <Tabs defaultValue="awaiting">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="awaiting">Awaiting response ({sections.awaiting.length})</TabsTrigger>
          <TabsTrigger value="signoff">Solution sign-off ({sections.awaitingSignoff.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming check-ins ({sections.upcoming.length})</TabsTrigger>
          <TabsTrigger value="stale">Stale ({sections.stale.length})</TabsTrigger>
          <TabsTrigger value="done">Completed ({sections.completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting" className="mt-4">
          <Section
            title="Accept or decline"
            icon={<Clock className="h-4 w-4" />}
            rows={sections.awaiting}
            emptyHint="No new requests."
            primary="Accept"
            busy={busy}
            onPrimary={(r) => wrap(r, "accepted")}
          />
        </TabsContent>
        <TabsContent value="signoff" className="mt-4">
          <Section
            title="Solution Canvas waiting on you"
            icon={<ShieldCheck className="h-4 w-4" />}
            rows={sections.awaitingSignoff}
            emptyHint="Nothing waiting for sign-off."
            primary="Open & decide"
            busy={busy}
            onPrimary={(r) => {
              if (r.subject_entity_id) window.location.href = `/edit-idea/${r.subject_entity_id}`;
            }}
          />
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          <Section
            title="Check in this week"
            icon={<Clock className="h-4 w-4" />}
            rows={sections.upcoming}
            emptyHint="No upcoming check-ins."
            primary="Mark complete"
            busy={busy}
            onPrimary={(r) => wrap(r, "completed")}
          />
        </TabsContent>
        <TabsContent value="stale" className="mt-4">
          <Section
            title="Stale — re-engage or archive"
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            rows={sections.stale}
            emptyHint="Nothing stale."
            primary="Archive"
            busy={busy}
            onPrimary={(r) => wrap(r, "archived")}
          />
        </TabsContent>
        <TabsContent value="done" className="mt-4">
          <Section
            title="Recently closed"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            rows={sections.completed}
            emptyHint="No closed requests yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { transitionRequest } from "@/lib/boxRequests";
import { Loader2, ShieldCheck, Clock, AlertTriangle, CheckCircle2, Archive, History, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { RelationshipDrawer } from "@/components/relationships/RelationshipDrawer";

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

interface RequesterHint {
  full_name: string | null;
  avatar_url: string | null;
  professional_title: string | null;
  years_of_experience: number | null;
  account_age_days: number;
  prior_requests: number;
}

function RequesterChip({ hint }: { hint?: RequesterHint }) {
  if (!hint) return null;
  const name = hint.full_name?.trim() || "Member";
  const initials = name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const accountLabel =
    hint.account_age_days < 1 ? "joined today"
      : hint.account_age_days < 7 ? `joined ${hint.account_age_days}d ago`
      : hint.account_age_days < 30 ? `joined ${Math.round(hint.account_age_days / 7)}w ago`
      : `member ${Math.round(hint.account_age_days / 30)}mo`;
  const isNew = hint.account_age_days < 3 && hint.prior_requests === 0;
  return (
    <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
      <Avatar className="h-6 w-6">
        <AvatarImage src={hint.avatar_url ?? undefined} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium truncate">{name}</span>
          {hint.professional_title && (
            <span className="text-muted-foreground truncate">· {hint.professional_title}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
          <span>{accountLabel}</span>
          <span>·</span>
          <span>{hint.prior_requests} prior request{hint.prior_requests === 1 ? "" : "s"}</span>
          {hint.years_of_experience != null && (
            <>
              <span>·</span>
              <span>{hint.years_of_experience}y exp</span>
            </>
          )}
          {isNew && (
            <Badge variant="outline" className="ml-1 border-amber-400 text-amber-600 text-[10px] px-1 py-0">
              new — verify intent
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  rows,
  emptyHint,
  primary,
  onPrimary,
  busy,
  onTimeline,
  hints,
}: {
  title: string;
  icon: React.ReactNode;
  rows: RequestRow[];
  emptyHint: string;
  primary?: string;
  onPrimary?: (r: RequestRow) => void;
  busy?: string | null;
  onTimeline?: (r: RequestRow) => void;
  hints: Record<string, RequesterHint>;
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{r.topic}</span>
                  <Badge variant="outline">{r.request_type}</Badge>
                  <span className="text-xs text-muted-foreground">· {ageHours(r.created_at)}h old</span>
                </div>
                {r.context && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.context}</p>}
                <RequesterChip hint={hints[r.requester_id]} />
                {r.subject_entity_type === "idea" && r.subject_entity_id && (
                  <Link to={`/startup-opportunities/${r.subject_entity_id}`} className="text-xs text-b4-teal hover:underline">
                    View linked idea →
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onTimeline && r.accepted_at && (
                  <Button size="sm" variant="ghost" onClick={() => onTimeline(r)} title="Open relationship timeline">
                    <History className="h-4 w-4" />
                  </Button>
                )}
                {primary && onPrimary && (
                  <Button size="sm" variant="teal" disabled={busy === r.id} onClick={() => onPrimary(r)}>
                    {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : primary}
                  </Button>
                )}
              </div>
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
  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, RequesterHint>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Boxes where I'm an active advisor → I can pick up unassigned requests there
    const { data: myBoxes } = await (supabase as any)
      .from("box_advisors")
      .select("box_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    const boxIds = (myBoxes ?? []).map((b: any) => b.box_id).filter(Boolean);

    // Admins see everything
    const { data: roleRows } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");

    let query = (supabase as any)
      .from("box_inbound_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      const orParts = [`assigned_advisor_id.eq.${user.id}`];
      if (boxIds.length > 0) {
        orParts.push(`and(assigned_advisor_id.is.null,box_id.in.(${boxIds.join(",")}))`);
      }
      query = query.or(orParts.join(","));
    }

    const { data, error } = await query;
    if (error) toast({ title: "Could not load queue", description: error.message, variant: "destructive" });
    const allRows = (data as RequestRow[]) ?? [];
    setRows(allRows);

    // Fetch requester hints (anti-spam context)
    const requesterIds = Array.from(new Set(allRows.map((r) => r.requester_id).filter(Boolean)));
    if (requesterIds.length > 0) {
      const [{ data: profs }, { data: counts }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("user_id, full_name, avatar_url, professional_title, years_of_experience, created_at")
          .in("user_id", requesterIds),
        (supabase as any)
          .from("box_inbound_requests")
          .select("requester_id")
          .in("requester_id", requesterIds),
      ]);
      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((c: any) => {
        countMap[c.requester_id] = (countMap[c.requester_id] ?? 0) + 1;
      });
      const map: Record<string, RequesterHint> = {};
      (profs ?? []).forEach((p: any) => {
        const ageMs = Date.now() - new Date(p.created_at).getTime();
        map[p.user_id] = {
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          professional_title: p.professional_title,
          years_of_experience: p.years_of_experience,
          account_age_days: Math.max(0, Math.floor(ageMs / 86_400_000)),
          prior_requests: Math.max(0, (countMap[p.user_id] ?? 0) - 1),
        };
      });
      setHints(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const sections = useMemo(() => {
    const now = Date.now();
    const awaiting = rows.filter(
      (r) =>
        (r.status === "matched" && !r.accepted_at) ||
        (r.status === "requested" && !r.assigned_advisor_id),
    );
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
      if (r.status === "requested" && !r.assigned_advisor_id && status === "accepted" && user) {
        await transitionRequest(r.id, "matched", user.id, { reason: "self_claim" });
      }
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
          <Section hints={hints}
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
          <Section hints={hints}
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
          <Section hints={hints}
            title="Check in this week"
            icon={<Clock className="h-4 w-4" />}
            rows={sections.upcoming}
            emptyHint="No upcoming check-ins."
            primary="Mark complete"
            busy={busy}
            onPrimary={(r) => wrap(r, "completed")}
            onTimeline={(r) => setDrawerRequestId(r.id)}
          />
        </TabsContent>
        <TabsContent value="stale" className="mt-4">
          <Section hints={hints}
            title="Stale — re-engage or archive"
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            rows={sections.stale}
            emptyHint="Nothing stale."
            primary="Archive"
            busy={busy}
            onPrimary={(r) => wrap(r, "archived")}
            onTimeline={(r) => setDrawerRequestId(r.id)}
          />
        </TabsContent>
        <TabsContent value="done" className="mt-4">
          <Section hints={hints}
            title="Recently closed"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            rows={sections.completed}
            emptyHint="No closed requests yet."
            onTimeline={(r) => setDrawerRequestId(r.id)}
          />
        </TabsContent>
      </Tabs>

      <RelationshipDrawer
        open={!!drawerRequestId}
        onOpenChange={(v) => !v && setDrawerRequestId(null)}
        originRequestId={drawerRequestId}
        title="Advisor relationship"
      />
    </div>
  );
}

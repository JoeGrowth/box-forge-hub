import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestAdvisorDrawer } from "./RequestAdvisorDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Award,
  Star,
  Activity,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface AdvisorRow {
  advisor_id: string;
  display_name: string | null;
  avatar_url: string | null;
  natural_role: string | null;
  verified_skills_count: number;
  track_record_count: number;
  reputation_score: number;
  response_rate: number;
  median_response_seconds: number | null;
  remaining_capacity: number;
  capacity: number;
  accepting_requests: boolean;
  eligible: boolean;
  suitability_score: number;
  status: string;
}

interface Props {
  boxSlug: string;
  boxName: string;
}

const formatResponseTime = (sec: number | null) => {
  if (sec == null) return "—";
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))}m`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
};

export function BoxAdvisorStrip({ boxSlug, boxName }: Props) {
  const [boxId, setBoxId] = useState<string | null>(null);
  const [rows, setRows] = useState<AdvisorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRequestClick = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account or sign in to request an advisor.",
      });
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setRequestOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Resolve box by slug first, then fall back to exact name match.
      // Static catalog slugs (e.g. "health") don't always equal DB slugs
      // (e.g. "box4health"), but the name is stable across both.
      let resolved: { id: string } | null = null;
      const { data: bySlug } = await (supabase as any)
        .from("boxes")
        .select("id")
        .eq("slug", boxSlug)
        .maybeSingle();
      resolved = bySlug ?? null;
      if (!resolved && boxName) {
        const { data: byName } = await (supabase as any)
          .from("boxes")
          .select("id")
          .ilike("name", boxName)
          .maybeSingle();
        resolved = byName ?? null;
      }
      if (cancelled) return;
      if (!resolved?.id) {
        setBoxId(null);
        setRows([]);
        setLoading(false);
        return;
      }
      setBoxId(resolved.id);
      const { data } = await (supabase as any).rpc("list_box_advisors_public", {
        _box_id: resolved.id,
      });
      if (cancelled) return;
      setRows((data as AdvisorRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [boxSlug, boxName]);

  const availableNow = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.status === "active" &&
          r.eligible &&
          r.accepting_requests &&
          r.remaining_capacity > 0,
      ),
    [rows],
  );

  return (
    <section className="py-20 bg-background border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl space-y-16">
        {/* SECTION 1 — Why trust these advisors */}
        <div>
          <div className="mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Why trust these advisors
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Evidence only. No biographies. Every signal comes from verified activity in the platform.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              text={`No active advisors are listed for ${boxName} yet.`}
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="col-span-3">Advisor</div>
                <div className="col-span-2">Natural Role</div>
                <div className="col-span-1 text-center" title="Verified skills">
                  Skills
                </div>
                <div className="col-span-1 text-center" title="Track record items">
                  Track
                </div>
                <div className="col-span-1 text-center" title="Reputation score">
                  Rep
                </div>
                <div className="col-span-1 text-center" title="Response rate">
                  Resp%
                </div>
                <div className="col-span-1 text-center" title="Median response time">
                  Time
                </div>
                <div className="col-span-2 text-right">Availability</div>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li
                    key={r.advisor_id}
                    className="grid grid-cols-12 gap-2 items-center px-4 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="col-span-12 md:col-span-3">
                      <Link
                        to={`/profile/${r.advisor_id}`}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={r.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {(r.display_name ?? "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground group-hover:text-b4-teal truncate">
                            {r.display_name ?? "Advisor"}
                          </div>
                          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            View full profile <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </Link>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-sm text-foreground/80 truncate">
                      {r.natural_role ?? <span className="text-muted-foreground">—</span>}
                    </div>
                    <Cell icon={ShieldCheck} value={r.verified_skills_count} label="Skills" />
                    <Cell icon={Award} value={r.track_record_count} label="Track" />
                    <Cell
                      icon={Star}
                      value={Number(r.reputation_score).toFixed(0)}
                      label="Rep"
                    />
                    <Cell
                      icon={Activity}
                      value={`${Math.round(Number(r.response_rate) * 100)}%`}
                      label="Resp"
                    />
                    <Cell
                      icon={Clock}
                      value={formatResponseTime(r.median_response_seconds)}
                      label="Time"
                    />
                    <div className="col-span-6 md:col-span-2 flex md:justify-end">
                      <AvailabilityBadge row={r} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* SECTION 2 — Available now */}
        <div>
          <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Available now
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Advisors with open capacity, ranked by suitability for this domain.
              </p>
            </div>
            <Badge variant="outline" className="border-b4-teal/40 text-b4-teal">
              {availableNow.length} accepting requests
            </Badge>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 w-full" />
              ))}
            </div>
          ) : availableNow.length === 0 ? (
            <EmptyState text="No advisor has open capacity right now. Send a request and we'll queue it." />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableNow.map((r) => (
                <div
                  key={r.advisor_id}
                  className="rounded-xl border border-border p-5 hover:border-b4-teal/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(r.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        to={`/profile/${r.advisor_id}`}
                        className="font-semibold text-foreground hover:text-b4-teal truncate block"
                      >
                        {r.display_name ?? "Advisor"}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.natural_role ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                    <Stat label="Skills" value={r.verified_skills_count} />
                    <Stat label="Track" value={r.track_record_count} />
                    <Stat label="Rep" value={Number(r.reputation_score).toFixed(0)} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {r.remaining_capacity} slot{r.remaining_capacity === 1 ? "" : "s"} open
                    </span>
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatResponseTime(r.median_response_seconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3 — Get matched */}
        <div className="rounded-2xl bg-gradient-to-br from-b4-teal/10 via-background to-b4-teal/5 border border-b4-teal/30 p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-b4-teal/15 mb-5">
            <Users className="h-7 w-7 text-b4-teal" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
            Get matched
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
            Tell us what you need. We rank advisors by domain fit, capacity and reputation, then you confirm.
          </p>
          <Button
            size="lg"
            variant="teal"
            disabled={!boxId}
            onClick={() => setRequestOpen(true)}
          >
            Request advisor <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {boxId && (
        <RequestAdvisorDrawer
          open={requestOpen}
          onOpenChange={setRequestOpen}
          defaultBoxId={boxId}
          assignmentPolicy="select"
        />
      )}
    </section>
  );
}

function Cell({
  icon: Icon,
  value,
  label,
}: {
  icon: any;
  value: string | number;
  label: string;
}) {
  return (
    <div className="col-span-2 md:col-span-1 flex md:justify-center items-center gap-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground md:hidden" />
      <span className="md:hidden text-xs text-muted-foreground">{label}:</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/40 py-2">
      <div className="font-semibold text-sm tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function AvailabilityBadge({ row }: { row: AdvisorRow }) {
  if (!row.eligible)
    return <Badge variant="outline" className="text-muted-foreground">Not eligible</Badge>;
  if (!row.accepting_requests)
    return <Badge variant="outline" className="text-muted-foreground">Paused</Badge>;
  if (row.remaining_capacity <= 0)
    return <Badge variant="outline" className="text-amber-600 border-amber-300">Full</Badge>;
  return (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
      {row.remaining_capacity} open
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

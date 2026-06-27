import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

type OpsMetrics = {
  generated_at: string;
  supply: { active_advisors: number; open_opportunities: number; available_capacity: number };
  demand: { requests_30d: number; applications_30d: number; new_commitments_30d: number };
  conversion: {
    request_to_relationship_pct: number;
    opportunity_accept_pct: number;
    commitment_complete_pct: number;
    contribution_to_milestone_pct: number;
  };
  health: {
    median_response_seconds: number | null;
    relationship_continuity: number;
    verified_contributors_30d: number;
    opportunity_fill_pct: number;
  };
  risk: {
    unanswered_requests: number;
    stale_relationships: number;
    unvalidated_ideas: number;
    full_advisors: number;
  };
  quality: {
    contributions_per_relationship: number;
    median_rel_to_contribution_seconds: number | null;
    median_contribution_to_opportunity_seconds: number | null;
    relationship_survival_30d_pct: number;
    relationship_survival_60d_pct: number;
    relationship_survival_90d_pct: number;
    advisor_effectiveness_verified_contribs: number;
  };
  funnel: Record<string, number>;
  error?: string;
};

type SystemAlert = {
  code: string;
  severity: "high" | "medium" | "low";
  subject_id: string;
  subject_kind: string;
  message: string;
  detected_at: string;
};

type EventAudit = {
  generated_at: string;
  totals: {
    events: number; with_idempotency_key: number; missing_idempotency_key: number;
    duplicates: number; dead_letters: number; unprocessed: number; unprocessed_stale_5m: number;
  };
  projections: {
    funnel_users: number; distinct_event_users: number; delta: number;
    relationships_table: number; relationship_health_rows: number;
    commitments_table: number; contributions_table: number;
  };
  checks: { name: string; value: number; unit: string; status: "pass" | "warn" | "fail"; detail: string }[];
  error?: string;
};

type WeeklyReview = {
  generated_at: string;
  healthiest_boxes: { box_id: string; name: string; active_relationships: number; avg_health: number; advisor_count: number }[];
  top_advisors: { advisor_id: string; advisor_name: string | null; total_relationships: number; successful_relationships: number; avg_health: number; verified_contributions: number }[];
  top_templates: { template_id: string; name: string; cadence: string; completed_30d: number; scheduled_30d: number; completion_pct: number }[];
  unfilled_opportunities: { opportunity_id: string; title: string; type: string; status: string; age_seconds: number; applications: number; created_at: string }[];
  recurring_alerts: { code: string; occurrences: number; severity: string; first_seen: string }[];
  error?: string;
};

interface Metric { label: string; value: string | number; tone?: "default" | "warn" | "good"; sub?: string }

function MetricCard({ label, value, tone = "default", sub }: Metric) {
  const toneClass =
    tone === "warn" ? "text-destructive" :
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-3xl font-semibold mt-1 ${toneClass}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </section>
  );
}

function fmtSeconds(s: number | null) {
  if (s == null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

export default function BetaConsole() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate("/auth"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      setAuthorized(isAdmin);
      if (!isAdmin) navigate("/");
    })();
  }, [navigate]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const [metricsRes, alertsRes] = await Promise.all([
      supabase.rpc("get_ops_metrics"),
      supabase.rpc("get_system_alerts"),
    ]);
    if (metricsRes.error) setErr(metricsRes.error.message);
    else setData(metricsRes.data as OpsMetrics);
    if (!alertsRes.error) setAlerts((alertsRes.data as SystemAlert[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (authorized) {
      refresh();
      const id = setInterval(refresh, 30_000);
      return () => clearInterval(id);
    }
  }, [authorized]);

  if (authorized === null) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  }
  if (!authorized) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Operations Console</h1>
            <Badge variant="outline">Ecosystem · Admin</Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Supply, demand, conversion, health, and risk — intervene before quality declines.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      {err && <div className="text-destructive mb-6">Could not load metrics: {err}</div>}
      {loading && !data && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading…</div>}

      {data && data.error && (
        <Card className="border-destructive/50 mb-6">
          <CardContent className="pt-6 text-sm text-destructive">Partial metrics: {data.error}</CardContent>
        </Card>
      )}

      {data && !data.error && (
        <div className="space-y-10">
          <Section title="Supply" subtitle="Capacity available right now">
            <MetricCard label="Active advisors" value={data.supply.active_advisors} />
            <MetricCard label="Open opportunities" value={data.supply.open_opportunities} />
            <MetricCard label="Available capacity" value={data.supply.available_capacity} />
          </Section>

          <Section title="Demand" subtitle="What the ecosystem is asking for (30d)">
            <MetricCard label="Requests" value={data.demand.requests_30d} />
            <MetricCard label="Applications" value={data.demand.applications_30d} />
            <MetricCard label="New commitments" value={data.demand.new_commitments_30d} />
          </Section>

          <Section title="Conversion" subtitle="How well the funnel moves (90d)">
            <MetricCard label="Request → Relationship" value={`${data.conversion.request_to_relationship_pct}%`} />
            <MetricCard label="Opportunity → Accepted" value={`${data.conversion.opportunity_accept_pct}%`} />
            <MetricCard label="Commitment → Completed" value={`${data.conversion.commitment_complete_pct}%`} />
            <MetricCard label="Contribution → Milestone" value={`${data.conversion.contribution_to_milestone_pct}%`} />
          </Section>

          <Section title="Health" subtitle="Quality signals">
            <MetricCard label="Median response" value={fmtSeconds(data.health.median_response_seconds)} />
            <MetricCard label="Relationship continuity" value={`${data.health.relationship_continuity}`} sub="avg health score" />
            <MetricCard label="Verified contributors (30d)" value={data.health.verified_contributors_30d} tone="good" />
            <MetricCard label="Opportunity fill rate" value={`${data.health.opportunity_fill_pct}%`} />
          </Section>

          <Section title="Risk" subtitle="Intervene before damage">
            <MetricCard label="Unanswered requests" value={data.risk.unanswered_requests} tone={data.risk.unanswered_requests > 0 ? "warn" : "good"} sub=">7 days" />
            <MetricCard label="Stale relationships" value={data.risk.stale_relationships} tone={data.risk.stale_relationships > 0 ? "warn" : "good"} sub=">30 days idle" />
            <MetricCard label="Unvalidated ideas" value={data.risk.unvalidated_ideas} tone={data.risk.unvalidated_ideas > 0 ? "warn" : "good"} sub=">30 days old" />
            <MetricCard label="Full advisors" value={data.risk.full_advisors} tone={data.risk.full_advisors > 0 ? "warn" : "good"} sub="not accepting" />
          </Section>

          <Section title="Quality" subtitle="Does the ecosystem compound?">
            <MetricCard label="Contributions / relationship" value={data.quality.contributions_per_relationship} />
            <MetricCard label="Median rel → contribution" value={fmtSeconds(data.quality.median_rel_to_contribution_seconds)} />
            <MetricCard label="Median contribution → opp" value={fmtSeconds(data.quality.median_contribution_to_opportunity_seconds)} />
            <MetricCard label="Advisor effectiveness" value={data.quality.advisor_effectiveness_verified_contribs} sub="verified contributors / advisor" />
            <MetricCard label="Survival 30d" value={`${data.quality.relationship_survival_30d_pct}%`} />
            <MetricCard label="Survival 60d" value={`${data.quality.relationship_survival_60d_pct}%`} />
            <MetricCard label="Survival 90d" value={`${data.quality.relationship_survival_90d_pct}%`} />
          </Section>

          <section>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">North-star funnel</h2>
              <p className="text-sm text-muted-foreground">Users at each canonical stage. Single source of truth.</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <FunnelChart funnel={data.funnel} />
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">System alerts ({alerts.length})</h2>
              <p className="text-sm text-muted-foreground">Derived from existing tables. No new workflow state.</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active alerts.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {alerts.slice(0, 50).map((a) => (
                      <li key={`${a.code}-${a.subject_id}`} className="py-2 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{a.message}</p>
                          <p className="text-[11px] text-muted-foreground">{a.code} · {a.subject_kind} · {new Date(a.detected_at).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline" className={
                          a.severity === "high" ? "border-destructive/40 text-destructive" :
                          a.severity === "medium" ? "border-amber-500/40 text-amber-600 dark:text-amber-400" :
                          ""
                        }>{a.severity}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <p className="text-xs text-muted-foreground">Generated {new Date(data.generated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

const FUNNEL_ORDER = [
  "signup","onboarded","activated","first_relationship","first_commitment",
  "first_contribution","first_milestone","first_opportunity","accepted_opportunity","retained_30d",
] as const;

function FunnelChart({ funnel }: { funnel: Record<string, number> }) {
  const max = Math.max(1, ...FUNNEL_ORDER.map((s) => funnel[s] ?? 0));
  return (
    <ol className="space-y-2">
      {FUNNEL_ORDER.map((stage) => {
        const n = funnel[stage] ?? 0;
        const pct = (n / max) * 100;
        return (
          <li key={stage} className="flex items-center gap-3">
            <span className="w-44 text-xs text-muted-foreground capitalize shrink-0">{stage.replace(/_/g, " ")}</span>
            <div className="flex-1 h-6 rounded bg-muted relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${pct}%` }} />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground">{n}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

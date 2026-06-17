import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBetaHealth } from "@/hooks/useBetaHealth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Metric { label: string; value: number | string; tone?: "default" | "warn" | "good"; }

function MetricCard({ label, value, tone = "default" }: Metric) {
  const toneClass =
    tone === "warn" ? "text-destructive" :
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-3xl font-semibold mt-1 ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function BetaConsole() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const { data, isLoading, error } = useBetaHealth();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate("/auth"); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", u.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      setAuthorized(isAdmin);
      if (!isAdmin) navigate("/");
    })();
  }, [navigate]);

  if (authorized === null) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  }
  if (!authorized) return null;

  const m = data;
  const dlqTone = (m?.dlq_size ?? 0) > 0 ? "warn" : "good";
  const notifFailTone = (m?.notif_failed ?? 0) > 0 ? "warn" : "good";
  const conv = m ? (m.loops_7d > 0 ? Math.round((m.loops_converted_7d / m.loops_7d) * 100) : 0) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Beta Command Center</h1>
          <Badge variant="outline">Admin · P0.5</Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          Real-time graph health, event spine, growth-loop conversion, and cohort vitals.
          Refreshes every 30 seconds.
        </p>
      </header>

      {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading…</div>}
      {error && <div className="text-destructive">Could not load health: {(error as Error).message}</div>}

      {m && (
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">Graph Health</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Total users" value={m.total_users} />
              <MetricCard label="Users with expertise" value={`${m.users_with_expertise} / ${m.total_users}`} />
              <MetricCard label="Users with trust" value={`${m.users_with_trust} / ${m.total_users}`} />
              <MetricCard label="Users with recs" value={`${m.users_with_recommendations} / ${m.total_users}`} />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Event Spine</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Events (24h)" value={m.events_24h} />
              <MetricCard label="DLQ size" value={m.dlq_size} tone={dlqTone} />
              <MetricCard label="Recommendation rows" value={m.recommendation_rows} />
              <MetricCard label="Notif failed" value={m.notif_failed} tone={notifFailTone} />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Application Lifecycle</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Applications" value={m.applications_total} />
              <MetricCard label="Accepted" value={m.applications_accepted} />
              <MetricCard label="Completed" value={m.applications_completed} tone="good" />
              <MetricCard
                label="Completion rate"
                value={m.applications_total ? `${Math.round((m.applications_completed / m.applications_total) * 100)}%` : "—"}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Growth Loops (7d)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Triggered" value={m.loops_7d} />
              <MetricCard label="Converted" value={m.loops_converted_7d} tone="good" />
              <MetricCard label="Conversion" value={`${conv}%`} />
              <MetricCard label="Notif delivered" value={m.notif_delivered} />
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Beta entry checklist</CardTitle>
                <CardDescription>P0 gates before inviting the first 10 users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>✓ Every user has expertise: {m.users_with_expertise >= m.total_users ? "PASS" : `${m.total_users - m.users_with_expertise} missing`}</div>
                <div>✓ Every user has recommendations: {m.users_with_recommendations >= m.total_users ? "PASS" : `${m.total_users - m.users_with_recommendations} missing`}</div>
                <div>✓ DLQ empty: {m.dlq_size === 0 ? "PASS" : `${m.dlq_size} stuck`}</div>
                <div>✓ Notifications healthy: {m.notif_failed === 0 ? "PASS" : `${m.notif_failed} failed`}</div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}

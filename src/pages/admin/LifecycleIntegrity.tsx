import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Play,
  ArrowLeft,
  Loader2,
} from "lucide-react";

// Lifecycle Integrity & Consistency Validator — admin observability surface.
// Runs run_lifecycle_integrity_checks() (RPC) and renders the persisted
// findings for the latest run. Admin-gated by the RPC itself.

type Severity = "info" | "warn" | "error";

interface Finding {
  id: string;
  run_id: string;
  check_name: string;
  severity: Severity;
  user_id: string | null;
  category: string | null;
  opportunity_id: string | null;
  lifecycle_id: string | null;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}

const CHECK_LABEL: Record<string, string> = {
  transition_validity: "Transition validity",
  multi_source_consistency: "Multi-source consistency",
  time_coherence: "Time coherence",
  category_parity: "Category parity",
  run_summary: "Run summary",
};

const SEVERITY_META: Record<Severity, { color: string; icon: typeof Info; label: string }> = {
  error: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertOctagon, label: "Error" },
  warn:  { color: "bg-amber-500/10 text-amber-600 border-amber-500/30",        icon: AlertTriangle, label: "Warn" },
  info:  { color: "bg-muted text-muted-foreground border-border",              icon: Info,          label: "Info" },
};

export default function LifecycleIntegrity() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLatest = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lifecycle_integrity_findings" as any)
      .select("run_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      setLoading(false);
      return;
    }
    const latest = (data?.[0] as any)?.run_id ?? null;
    setRunId(latest);
    if (latest) await loadFindings(latest);
    setLoading(false);
  };

  const loadFindings = async (id: string) => {
    const { data } = await supabase
      .from("lifecycle_integrity_findings" as any)
      .select("*")
      .eq("run_id", id)
      .order("severity", { ascending: true })
      .order("check_name", { ascending: true });
    setFindings((data as any) ?? []);
  };

  useEffect(() => { loadLatest(); }, []);

  const runCheck = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc("run_lifecycle_integrity_checks" as any);
    setRunning(false);
    if (error) {
      toast({
        title: "Validator failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const newRun = data as unknown as string;
    setRunId(newRun);
    await loadFindings(newRun);
    toast({ title: "Lifecycle scan complete" });
  };

  const summary = useMemo(() => findings.find((f) => f.check_name === "run_summary"), [findings]);
  const grouped = useMemo(() => {
    const byCheck: Record<string, Finding[]> = {};
    for (const f of findings) {
      if (f.check_name === "run_summary") continue;
      (byCheck[f.check_name] ||= []).push(f);
    }
    return byCheck;
  }, [findings]);

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount  = findings.filter((f) => f.severity === "warn").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to admin
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Lifecycle Integrity Validator
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Audits the opportunity lifecycle state machine: transition validity, multi-source consistency,
            time coherence, and category parity. Run before any change to the projection trigger or downstream
            consumers (Layer 5, persona, ranking).
          </p>
        </div>
        <Button onClick={runCheck} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? "Running…" : "Run scan"}
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Errors"   value={errorCount} tone="error" />
        <SummaryCard label="Warnings" value={warnCount}  tone="warn" />
        <SummaryCard
          label="Lifecycle rows"
          value={(summary?.details as any)?.lifecycle_rows ?? "—"}
          tone="info"
        />
        <SummaryCard
          label="Last run"
          value={summary ? new Date(summary.created_at).toLocaleString() : "—"}
          tone="info"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !runId ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">No scan has been run yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Run scan" to validate the lifecycle projection.</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-b4-teal/30 bg-b4-teal/5 p-8 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-b4-teal mb-3" />
          <p className="font-semibold text-foreground">All checks passed</p>
          <p className="text-sm text-muted-foreground mt-1">
            The lifecycle projection is consistent with its event sources.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([check, items]) => (
            <CheckGroup key={check} check={check} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: Severity;
}) {
  return (
    <div className={`rounded-xl border p-4 ${SEVERITY_META[tone].color}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function CheckGroup({ check, items }: { check: string; items: Finding[] }) {
  const label = CHECK_LABEL[check] ?? check;
  const worst: Severity = items.some((i) => i.severity === "error")
    ? "error"
    : items.some((i) => i.severity === "warn")
      ? "warn"
      : "info";
  const Icon = SEVERITY_META[worst].icon;
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${worst === "error" ? "text-destructive" : worst === "warn" ? "text-amber-600" : "text-muted-foreground"}`} />
          <h2 className="font-semibold">{label}</h2>
          <Badge variant="outline" className="ml-1">{items.length}</Badge>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((f) => {
          const Icon = SEVERITY_META[f.severity].icon;
          return (
            <div key={f.id} className="p-4 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${f.severity === "error" ? "text-destructive" : f.severity === "warn" ? "text-amber-600" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{f.message}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    {f.category && <span>category: <span className="font-mono">{f.category}</span></span>}
                    {f.opportunity_id && <span>opp: <span className="font-mono">{f.opportunity_id.slice(0, 8)}…</span></span>}
                    {f.user_id && <span>user: <span className="font-mono">{f.user_id.slice(0, 8)}…</span></span>}
                  </div>
                  {Object.keys(f.details ?? {}).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">details</summary>
                      <pre className="mt-1 text-xs bg-muted/40 rounded p-2 overflow-x-auto">
                        {JSON.stringify(f.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

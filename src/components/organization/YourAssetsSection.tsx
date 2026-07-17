import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrgLogo } from "@/components/organization/OrgLogo";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  Briefcase,
  Package,
  TrendingUp,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  Rocket,
} from "lucide-react";

type Criteria = {
  incorporated: boolean;
  hasJobOrTender: boolean;
  jobsCount: number;
  tendersCount: number;
  hasCoBuilder: boolean;
  membersCount: number;
  hasMatureProduct: boolean;
  bestProductIterations: number;
  productsCount: number;
};

type AssetRow = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgType: string;
  logoPath: string | null;
  description: string | null;
  role: string;
  criteria: Criteria;
  qualifies: boolean;
  valuation: { low: number; base: number; high: number; multiplier: number };
  analysis: string[];
};

const fmtUSD = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

// Business consultant / fundraising heuristic:
// Base "asset value" derives from foundational readiness. Multipliers reflect
// autonomy & brand independence signals (iterations depth + team depth + demand).
function computeValuation(c: Criteria) {
  // Base: incorporation legitimizes the vehicle
  let base = c.incorporated ? 50_000 : 0;

  // Product maturity: each shipped iteration compounds validation
  base += Math.min(c.bestProductIterations, 6) * 25_000;
  // Extra products = portfolio breadth
  if (c.productsCount > 1) base += (c.productsCount - 1) * 15_000;

  // Demand signals: open jobs = growth stage, tenders = revenue-side pipeline
  base += c.jobsCount * 20_000;
  base += c.tendersCount * 30_000;

  // Team leverage (autonomy proxy) — beyond the founder
  const coBuilders = Math.max(c.membersCount - 1, 0);
  base += coBuilders * 40_000;

  // Multiplier reflecting "operates as autonomous system" + brand independence
  let mult = 1;
  if (c.hasCoBuilder && c.bestProductIterations >= 3) mult += 0.5; // autonomy
  if (c.bestProductIterations >= 3 && (c.jobsCount + c.tendersCount) > 0) mult += 0.3; // brand pull
  if (c.incorporated && c.hasCoBuilder && c.hasMatureProduct) mult += 0.2; // fundable

  const applied = Math.round(base * mult);
  return {
    low: Math.round(applied * 0.7),
    base: applied,
    high: Math.round(applied * 1.5),
    multiplier: mult,
  };
}

function buildAnalysis(c: Criteria, v: AssetRow["valuation"]): string[] {
  const notes: string[] = [];
  if (c.incorporated) notes.push("Incorporation in place — legally fundable vehicle, ready for cap-table instruments (SAFE, convertible, equity).");
  else notes.push("Missing Certificate of Incorporation — asset is not yet transferable or investable at institutional level.");

  if (c.bestProductIterations >= 3) notes.push(`Product shipped ${c.bestProductIterations}× — signals iteration muscle and product-market fit trajectory.`);
  else notes.push("Fewer than 3 product iterations — still in discovery; valuation dominated by potential, not proof.");

  if (c.hasCoBuilder) notes.push(`Team depth of ${c.membersCount} — reduces key-person risk; a fundraising green flag.`);
  else notes.push("Solo operator — key-person risk depresses multiples; recruit a co-builder before raising.");

  if (c.jobsCount + c.tendersCount > 0) notes.push(`Active market surface: ${c.jobsCount} job(s), ${c.tendersCount} tender(s) — demonstrates operating tempo.`);
  else notes.push("No open jobs or tenders — brand not yet radiating demand; harder to argue autonomy.");

  notes.push(`Applied multiplier: ${v.multiplier.toFixed(2)}× (autonomy + brand independence).`);
  notes.push("Range is illustrative; anchor real negotiations to revenue, retention, and gross margin once available.");
  return notes;
}

export function YourAssetsSection() {
  const { user } = useAuth();
  const { memberships, loading } = useMyOrganizations(user?.id);
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const orgIds = useMemo(() => memberships.map((m) => m.organization.id), [memberships]);

  useEffect(() => {
    if (!orgIds.length) { setRows([]); return; }
    let cancelled = false;
    setBusy(true);
    (async () => {
      const [legalRes, membersRes, jobsRes, tendersRes, productsRes, iterationsRes] = await Promise.all([
        supabase.from("organization_legal_documents").select("organization_id, name").in("organization_id", orgIds),
        supabase.from("organization_members").select("organization_id, user_id").in("organization_id", orgIds),
        supabase.from("job_opportunities").select("organization_id").in("organization_id", orgIds),
        supabase.from("tenders").select("organization_id").in("organization_id", orgIds),
        supabase.from("organization_products").select("id, organization_id").in("organization_id", orgIds).is("archived_at", null),
        supabase.from("organization_product_iterations").select("product_id, organization_id").in("organization_id", orgIds).is("archived_at", null),
      ]);
      if (cancelled) return;

      const incorpSet = new Set<string>();
      (legalRes.data ?? []).forEach((d: any) => {
        if (typeof d.name === "string" && d.name.toLowerCase().includes("certificate of incorporation")) {
          incorpSet.add(d.organization_id);
        }
      });

      const membersByOrg = new Map<string, number>();
      (membersRes.data ?? []).forEach((m: any) => {
        membersByOrg.set(m.organization_id, (membersByOrg.get(m.organization_id) || 0) + 1);
      });

      const jobsByOrg = new Map<string, number>();
      (jobsRes.data ?? []).forEach((j: any) => jobsByOrg.set(j.organization_id, (jobsByOrg.get(j.organization_id) || 0) + 1));

      const tendersByOrg = new Map<string, number>();
      (tendersRes.data ?? []).forEach((t: any) => tendersByOrg.set(t.organization_id, (tendersByOrg.get(t.organization_id) || 0) + 1));

      const productsByOrg = new Map<string, number>();
      (productsRes.data ?? []).forEach((p: any) => productsByOrg.set(p.organization_id, (productsByOrg.get(p.organization_id) || 0) + 1));

      const iterByProduct = new Map<string, number>();
      const productOrg = new Map<string, string>();
      (productsRes.data ?? []).forEach((p: any) => productOrg.set(p.id, p.organization_id));
      (iterationsRes.data ?? []).forEach((it: any) => {
        iterByProduct.set(it.product_id, (iterByProduct.get(it.product_id) || 0) + 1);
      });
      const bestIterByOrg = new Map<string, number>();
      iterByProduct.forEach((count, pid) => {
        const orgId = productOrg.get(pid);
        if (!orgId) return;
        bestIterByOrg.set(orgId, Math.max(bestIterByOrg.get(orgId) || 0, count));
      });

      const built: AssetRow[] = memberships.map(({ organization: o, role }) => {
        const jobsCount = jobsByOrg.get(o.id) || 0;
        const tendersCount = tendersByOrg.get(o.id) || 0;
        const membersCount = membersByOrg.get(o.id) || 0;
        const bestProductIterations = bestIterByOrg.get(o.id) || 0;
        const productsCount = productsByOrg.get(o.id) || 0;
        const criteria: Criteria = {
          incorporated: incorpSet.has(o.id),
          hasJobOrTender: jobsCount + tendersCount > 0,
          jobsCount,
          tendersCount,
          hasCoBuilder: membersCount >= 2,
          membersCount,
          hasMatureProduct: bestProductIterations >= 3,
          bestProductIterations,
          productsCount,
        };
        const qualifies =
          criteria.incorporated &&
          criteria.hasJobOrTender &&
          criteria.hasCoBuilder &&
          criteria.hasMatureProduct;
        const valuation = computeValuation(criteria);
        return {
          orgId: o.id,
          orgName: o.name,
          orgSlug: o.slug,
          orgType: o.type,
          logoPath: o.logo_url,
          description: o.description,
          role,
          criteria,
          qualifies,
          valuation,
          analysis: buildAnalysis(criteria, valuation),
        };
      });

      // Sort: qualifying first, then by base valuation desc
      built.sort((a, b) => {
        if (a.qualifies !== b.qualifies) return a.qualifies ? -1 : 1;
        return b.valuation.base - a.valuation.base;
      });

      setRows(built);
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [orgIds.join(",")]);

  const qualifying = rows.filter((r) => r.qualifies);
  const visible = showAll ? rows : qualifying;

  const totalBase = qualifying.reduce((s, r) => s + r.valuation.base, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Your Assets — valuation lens</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Framed by a business-consultant + fundraising perspective. An <strong>asset</strong> is an
              organization that (1) is legally incorporated, (2) has at least 1 job or tender, (3) has ≥1 co-builder,
              and (4) has a product shipped through ≥3 iterations. These signal a business that{" "}
              <em>operates as an autonomous system</em> and a <em>brand that scales without your direct involvement</em>.
            </p>
            {qualifying.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                  {qualifying.length} qualifying asset{qualifying.length > 1 ? "s" : ""}
                </Badge>
                <span className="text-muted-foreground">
                  Portfolio base estimate: <strong className="text-foreground">{fmtUSD(totalBase)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading || busy ? (
        <div className="text-sm text-muted-foreground">Analyzing your organizations…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Rocket className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            You don't have any organizations yet. Create one to start building an asset.
          </p>
        </div>
      ) : qualifying.length === 0 && !showAll ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <Bot className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">No organization qualifies as an asset yet.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            To qualify: incorporate the entity, publish a job or tender, add at least one co-builder,
            and ship a product through 3 iterations.
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
            Show my organizations & gaps
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {visible.map((r) => (
              <div
                key={r.orgId}
                className={`rounded-xl border p-5 transition ${
                  r.qualifies ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-500/5" : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    <OrgLogo path={r.logoPath} alt={`${r.orgName} logo`} className="w-full h-full object-cover" iconClassName="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/org/${r.orgSlug}`} className="font-semibold text-foreground hover:underline">
                        {r.orgName}
                      </Link>
                      <span className="text-xs text-muted-foreground capitalize">{r.orgType}</span>
                      {r.qualifies ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Asset
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">In-progress</Badge>
                      )}
                    </div>

                    {/* Criteria checklist */}
                    <div className="mt-3 grid sm:grid-cols-2 gap-1.5 text-xs">
                      <CriteriaLine ok={r.criteria.incorporated} icon={ShieldCheck} label="Certificate of Incorporation" />
                      <CriteriaLine
                        ok={r.criteria.hasJobOrTender}
                        icon={Briefcase}
                        label={`Job or Tender (${r.criteria.jobsCount + r.criteria.tendersCount})`}
                      />
                      <CriteriaLine
                        ok={r.criteria.hasCoBuilder}
                        icon={Users}
                        label={`Co-builder in team (${Math.max(r.criteria.membersCount - 1, 0)})`}
                      />
                      <CriteriaLine
                        ok={r.criteria.hasMatureProduct}
                        icon={Package}
                        label={`Product shipped 3× (best: ${r.criteria.bestProductIterations})`}
                      />
                    </div>

                    {/* Valuation */}
                    <div className="mt-4 rounded-lg border border-border bg-background/60 p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">Indicative valuation</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Range</div>
                          <div className="text-sm font-semibold">
                            {fmtUSD(r.valuation.low)} — {fmtUSD(r.valuation.high)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Base <strong className="text-foreground">{fmtUSD(r.valuation.base)}</strong> · {r.valuation.multiplier.toFixed(2)}×
                          </div>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                        {r.analysis.map((a, i) => (
                          <li key={i} className="flex gap-2">
                            <Info className="w-3 h-3 mt-0.5 shrink-0 text-primary/70" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Link
                        to={`/org/${r.orgSlug}`}
                        className="text-xs text-primary inline-flex items-center hover:underline"
                      >
                        Open organization <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {qualifying.length > 0 && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
                {showAll ? "Show qualifying assets only" : "Show all organizations & gaps"}
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-muted-foreground italic">
        Estimates are directional signals from a 15-year fundraising heuristic — not a formal valuation.
        Anchor negotiations to revenue, retention, gross margin, and comparables when available.
      </p>
    </div>
  );
}

function CriteriaLine({ ok, icon: Icon, label }: { ok: boolean; icon: any; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      <Icon className="w-3 h-3 opacity-70" />
      <span>{label}</span>
    </div>
  );
}

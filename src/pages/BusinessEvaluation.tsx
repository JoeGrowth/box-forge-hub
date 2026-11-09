import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessEvaluationForm } from "@/components/organization/BusinessEvaluationForm";
import { supabase } from "@/integrations/supabase/client";
import { evaluationOrganizations, evaluationStorageKey, initialEvaluation, normalizePersonName, productMaturity, supposedLeader, teamSizeFrom, type Evaluation, type EvaluationAuto } from "@/lib/businessEvaluation";

async function loadAuto(orgId: string): Promise<EvaluationAuto> {
  const [ents, people, products, iterations] = await Promise.all([
    supabase.from("declaration_entities").select("id,name,split_config").eq("organization_id", orgId),
    supabase.from("organization_people").select("full_name").eq("organization_id", orgId).eq("tier", "crew"),
    supabase.from("organization_products").select("id,name").eq("organization_id", orgId).is("archived_at", null),
    supabase.from("organization_product_iterations").select("product_id").eq("organization_id", orgId).is("archived_at", null),
  ]);
  const entities = (ents.data ?? []) as EvaluationAuto["entities"];
  const ids = entities.map(e => e.id);
  const [missions, slots] = ids.length ? await Promise.all([
    supabase.from("declaration_missions").select("entity_id,budget,currency,internal,external").in("entity_id", ids),
    supabase.from("entity_role_assignments").select("entity_id,role_slug,linked_user_id").in("entity_id", ids).eq("status", "accepted"),
  ]) : [{ data: [] }, { data: [] }];
  const userIds = [...new Set((slots.data ?? []).map((s: any) => s.linked_user_id).filter(Boolean))];
  const profiles = userIds.length ? (await supabase.from("profiles").select("user_id,full_name").in("user_id", userIds)).data ?? [] : [];
  const nameOf = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? "";
  const accepted = (slots.data ?? []).filter((s: any) => /^(associe_|internal_)/.test(s.role_slug));
  const associateNames: Record<string, string[]> = {};
  for (const s of accepted as any[]) if (s.role_slug.startsWith("associe_")) (associateNames[s.entity_id] ??= [])[Number(s.role_slug.slice(8)) - 1] = nameOf(s.linked_user_id);
  const firstAssociate = (accepted as any[]).find(s => s.role_slug === "associe_1");
  const counts: Record<string, number> = {};
  for (const it of iterations.data ?? []) if (it.product_id) counts[it.product_id] = (counts[it.product_id] ?? 0) + 1;
  return {
    leader: firstAssociate ? supposedLeader(nameOf(firstAssociate.linked_user_id)) : "",
    teamBreakdown: (() => { const core = teamSizeFrom(accepted.map((s: any) => nameOf(s.linked_user_id))); const total = teamSizeFrom([...accepted.map((s: any) => nameOf(s.linked_user_id)), ...(people.data ?? []).map(p => p.full_name)]); return `${core} associés / core team + ${total - core} other crew members = ${total} (same full name counted once)`; })(),
    teamSize: teamSizeFrom([...accepted.map((s: any) => nameOf(s.linked_user_id)), ...(people.data ?? []).map(p => p.full_name)]),
    products: (products.data ?? []).map(p => ({ name: p.name, shipped: counts[p.id] ?? 0 })),
    entities, missions: (missions.data ?? []) as EvaluationAuto["missions"], associateNames,
  };
}


function OrganizationEvaluation({ userId, org }: { userId: string; org: { id: string; name: string; slug: string } }) {
  const key = evaluationStorageKey(userId, org.id);
  const [saveError, setSaveError] = useState(false);
  const [data, setData] = useState<Evaluation>(() => {
    const initial = initialEvaluation(org.name, org.slug);
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return initial;
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.beneficiaries) || typeof parsed.evaluations !== "object" || !parsed.evaluations) return initial;
      return { ...initial, ...parsed, evaluations: { ...initial.evaluations, ...parsed.evaluations } };
    } catch { return initial; }
  });
  const [auto, setAuto] = useState<EvaluationAuto | null>(null);
  useEffect(() => { let live = true; loadAuto(org.id).then(a => live && setAuto(a)).catch(() => {}); return () => { live = false; }; }, [org.id]);
  useEffect(() => {
    if (!auto) return;
    setData(prev => {
      const have = new Set(prev.products.map(p => normalizePersonName(p.name)));
      const added = auto.products.filter(p => productMaturity(p.shipped) && !have.has(normalizePersonName(p.name))).map(p => ({ id: crypto.randomUUID(), name: p.name, type: "", stage: "" }));
      const next = { ...prev, leader: auto.leader || prev.leader, teamSize: auto.teamSize ? String(auto.teamSize) : prev.teamSize, products: [...prev.products, ...added] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* shown on next edit */ }
      return next;
    });
  }, [auto, key]);
  const change = (next: Evaluation) => {
    setData(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaveError(false); }
    catch { setSaveError(true); }
  };
  return <><BusinessEvaluationForm data={data} onChange={change} auto={auto} /><p className={`mt-4 text-center text-xs ${saveError ? "text-destructive" : "text-muted-foreground"}`} role="status">{saveError ? "Changes could not be saved in this browser. Keep this page open." : "Changes are saved automatically in this browser. Financial figures and legal information are entered by you."}</p></>;
}

export default function BusinessEvaluation() {
  const { user } = useAuth();
  const { memberships, loading, reload } = useMyOrganizations(user?.id);
  const [order, setOrder] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!user) return;
    (supabase.from as any)("organization_orders").select("organization_id, position").eq("user_id", user.id)
      .then(({ data }: any) => setOrder(Object.fromEntries((data ?? []).map((r: any) => [r.organization_id, r.position]))));
  }, [user?.id]);
  // Same default order as /organizations: saved rank, then logo first, then newest.
  const orgs = useMemo(() => [...evaluationOrganizations(memberships)].sort((a: any, b: any) => {
    const ap = order[a.id], bp = order[b.id];
    if (ap !== undefined || bp !== undefined) { if (ap === undefined) return 1; if (bp === undefined) return -1; if (ap !== bp) return ap - bp; }
    if (!!a.logo_url !== !!b.logo_url) return a.logo_url ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [memberships, order]);
  const [selectedId, setSelectedId] = useState("");
  const selected = orgs.find(org => org.id === selectedId) ?? orgs[0];
  useEffect(() => { document.title = "Business Evaluation | Box4Solutions"; }, []);
  return <main className="mx-auto min-h-screen max-w-5xl px-4 pb-12 pt-24 sm:px-6">
    <header className="mb-5 space-y-2 sm:mb-6"><h1 className="text-2xl font-bold sm:text-3xl">Business Evaluation</h1><p className="text-sm text-muted-foreground">A simple view of how the business is built and operating.</p></header>
    {loading ? <Skeleton className="h-96 w-full" /> : orgs.length === 0 ? <div className="space-y-4 py-8"><p className="text-muted-foreground">No organizations found in your memberships.</p><div className="flex gap-3"><Button asChild variant="outline"><Link to="/organizations">Organizations</Link></Button><Button variant="ghost" onClick={reload}>Retry</Button></div></div> : <>
      <div className="mb-5 sm:hidden"><Select value={selected?.id} onValueChange={setSelectedId}><SelectTrigger aria-label="Organization" className="h-auto min-h-12 w-full gap-3 bg-card text-left text-base [&>span]:whitespace-normal [&>span]:break-words"><SelectValue /></SelectTrigger><SelectContent className="max-w-[calc(100vw-2rem)]">{orgs.map(org => <SelectItem key={org.id} value={org.id} className="min-h-11 py-3 [&>span]:whitespace-normal [&>span]:break-words">{org.name}</SelectItem>)}</SelectContent></Select></div>
      <div role="tablist" aria-label="Organizations" className="mb-5 hidden max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit sm:flex">{orgs.map(org => <Button key={org.id} variant="ghost" role="tab" aria-selected={selected?.id === org.id} className={`h-auto min-h-9 max-w-full whitespace-normal px-5 py-2 text-sm hover:bg-card hover:text-foreground ${selected?.id === org.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setSelectedId(org.id)}>{org.name}</Button>)}</div>
      {user && selected && <OrganizationEvaluation key={`${user.id}:${selected.id}`} userId={user.id} org={selected} />}
    </>}
  </main>;
}
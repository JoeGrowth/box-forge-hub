import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessEvaluationForm } from "@/components/organization/BusinessEvaluationForm";
import { evaluationOrganizations, evaluationStorageKey, initialEvaluation, type Evaluation } from "@/lib/businessEvaluation";

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
  const change = (next: Evaluation) => {
    setData(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaveError(false); }
    catch { setSaveError(true); }
  };
  return <><BusinessEvaluationForm data={data} onChange={change} /><p className={`mt-4 text-center text-xs ${saveError ? "text-destructive" : "text-muted-foreground"}`} role="status">{saveError ? "Changes could not be saved in this browser. Keep this page open." : "Changes are saved automatically in this browser. Financial figures and legal information are entered by you."}</p></>;
}

export default function BusinessEvaluation() {
  const { user } = useAuth();
  const { memberships, loading, reload } = useMyOrganizations(user?.id);
  const orgs = useMemo(() => evaluationOrganizations(memberships), [memberships]);
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
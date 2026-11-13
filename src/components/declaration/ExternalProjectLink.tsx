import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Link2, Plus, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isFinishedProject } from "@/lib/projectLifecycle";
import { toast } from "@/hooks/use-toast";

type Project = { id: string; name: string; status: string; progress: number };

export function ExternalProjectLink({
  organizationId,
  missionId,
  projectId,
  defaultName,
  budget,
  onLinked,
}: {
  organizationId?: string | null;
  missionId: string;
  projectId?: string | null;
  defaultName: string;
  budget: number;
  onLinked: (id: string | null) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [slug, setSlug] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!organizationId) return;
    const [{ data }, { data: org }] = await Promise.all([
      supabase
        .from("organization_projects")
        .select("id,name,status,progress")
        .eq("organization_id", organizationId)
        .eq("project_kind", "external")
        .order("name"),
      supabase.from("organizations").select("slug").eq("id", organizationId).maybeSingle(),
    ]);
    setProjects((data as Project[]) ?? []);
    setSlug((org as any)?.slug ?? "");
  };

  useEffect(() => { load(); }, [organizationId]);

  const linked = projects.find((p) => p.id === projectId);
  // The suggested name sits in the box for one-click creation, but it must not
  // hide the rest of the list: only text the user actually types narrows it.
  const searching = typed && query.trim().length > 0;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return searching ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  }, [projects, query, searching]);
  const exact = projects.some((p) => p.name.trim().toLowerCase() === query.trim().toLowerCase());

  const save = async (id: string) => {
    const { error } = await supabase.from("declaration_missions").update({ external_project_id: id } as any).eq("id", missionId);
    if (error) {
      toast({ title: "Link failed", description: error.message, variant: "destructive" });
      return false;
    }
    onLinked(id);
    return true;
  };

  const choose = async (id: string) => {
    setBusy(true);
    if (await save(id)) setOpen(false);
    setBusy(false);
  };

  const create = async () => {
    const name = query.trim();
    if (!name || !organizationId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("organization_projects")
      .insert({
        organization_id: organizationId,
        name,
        project_kind: "external",
        status: "active",
        budget: budget || null,
        created_by: u.user?.id ?? null,
      } as any)
      .select("id,name,status,progress")
      .single();
    if (error || !data) {
      toast({ title: "Could not create project", description: error?.message, variant: "destructive" });
      setBusy(false);
      return;
    }
    setProjects((ps) => [...ps, data as Project]);
    if (await save((data as Project).id)) {
      toast({ title: "External project created", description: `“${name}” added to the Project section.` });
      setOpen(false);
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Rocket className="h-4 w-4 text-primary" /> External Project
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!organizationId}
          onClick={() => { setQuery(linked?.name ?? defaultName ?? ""); setTyped(false); setOpen(true); }}
        >
          <Link2 className="h-4 w-4 mr-1" /> Adequate External Project
        </Button>
      </div>
      {!organizationId ? (
        <p className="text-xs text-muted-foreground">Link this declaration to an organization to connect a project.</p>
      ) : linked ? (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="font-semibold break-words">{linked.name}</span>
          <Badge variant="secondary">{linked.progress ?? 0}%</Badge>
          {slug && (
            <Link to={`/org/${slug}?tab=projects`} className="inline-flex items-center gap-1 text-primary text-xs hover:underline">
              Open project page <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No external project connected yet.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-full max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[85dvh] max-sm:p-4 flex flex-col gap-3 overflow-hidden">
          <div className="sm:hidden mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30 -mt-1" />
          <DialogHeader><DialogTitle className="text-left pr-6">Adequate External Project</DialogTitle></DialogHeader>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Project name" className="h-11 text-base" />
          <div className="flex-1 min-h-0 max-h-64 max-sm:max-h-none overflow-y-auto space-y-1.5 -mx-1 px-1">
            {matches.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => choose(p.id)}
                className={`w-full text-left rounded-md border px-3 py-3 text-sm hover:bg-muted min-h-11 ${p.id === projectId ? "border-primary" : ""}`}
              >
                <div className="font-medium break-words">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.status} · {p.progress ?? 0}%</div>
              </button>
            ))}
            {matches.length === 0 && <p className="text-xs text-muted-foreground py-2">No matching external project.</p>}
          </div>
          {query.trim() && !exact && (
            <Button onClick={create} disabled={busy} className="w-full h-11 whitespace-normal h-auto min-h-11 text-left">
              <Plus className="h-4 w-4 mr-1" /> Create “{query.trim()}” as new project
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

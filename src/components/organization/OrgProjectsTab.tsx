// Project — manage internal projects of an organization.
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Rocket, CalendarDays, User, Loader2, AlertTriangle, Archive, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

type TalentCandidate = { user_id: string; full_name: string | null; avatar_url: string | null };

type OrgProject = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: string;
  lead: string | null;
  start_date: string | null;
  target_date: string | null;
  progress: number;
  status_note: string | null;
};

const STATUSES = [
  { value: "planned", label: "Planned", className: "bg-muted text-muted-foreground" },
  { value: "active", label: "Active", className: "bg-primary/10 text-primary border-primary/30" },
  { value: "on_hold", label: "On hold", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "done", label: "Done", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
];
const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

const emptyDraft = {
  name: "", description: "", status: "planned", lead: "",
  start_date: "", target_date: "", progress: 0, status_note: "",
};

export function OrgProjectsTab({ orgId, orgName, canEdit, userId }: { orgId: string; orgName?: string; canEdit: boolean; userId?: string }) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgProject | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [leadResults, setLeadResults] = useState<TalentCandidate[]>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [leadFocused, setLeadFocused] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [legacyLinked, setLegacyLinked] = useState(true);

  const searchTalents = async (q: string) => {
    setDraft((d) => ({ ...d, lead: q }));
    if (q.trim().length < 2) { setLeadResults([]); return; }
    setLeadSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .ilike("full_name", `%${q.trim()}%`)
      .limit(8);
    setLeadResults((data ?? []) as TalentCandidate[]);
    setLeadSearching(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: idea }] = await Promise.all([
      supabase
        .from("organization_projects" as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("startup_ideas").select("id").eq("organization_id", orgId).maybeSingle(),
    ]);
    setProjects(((data as any[]) ?? []) as OrgProject[]);
    setLegacyLinked(!!idea?.id);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setDraft({ ...emptyDraft }); setOpen(true); };
  const openEdit = (p: OrgProject) => {
    setEditing(p);
    setDraft({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      lead: p.lead ?? "",
      start_date: p.start_date ?? "",
      target_date: p.target_date ?? "",
      progress: p.progress ?? 0,
      status_note: p.status_note ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    const progressValue = Math.max(0, Math.min(100, Number(draft.progress) || 0));
    const payload: any = {
      organization_id: orgId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      status: progressValue >= 100 ? "done" : draft.status === "done" ? "active" : draft.status,
      lead: draft.lead.trim() || null,
      start_date: draft.start_date || null,
      target_date: draft.target_date || null,
      progress: progressValue,
      status_note: draft.status_note.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("organization_projects" as any).update(payload).eq("id", editing.id)
      : await supabase.from("organization_projects" as any).insert({ ...payload, created_by: userId ?? null });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Project updated" : "Project added" });
    setOpen(false);
    load();
  };

  const updateProgress = async (p: OrgProject, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    if (v === p.progress) return;
    const nextStatus = v >= 100 ? "done" : p.status === "done" ? "active" : p.status;
    setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, progress: v, status: nextStatus } : x)));
    const { error } = await supabase
      .from("organization_projects" as any)
      .update({ progress: v, status: nextStatus })
      .eq("id", p.id);
    if (!error && v >= 100 && p.status !== "done") {
      toast({ title: "Project closed", description: `"${p.name}" reached 100% and moved to the archive.` });
    }
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const handleBarInteract = (e: MouseEvent<HTMLDivElement>, p: OrgProject) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    updateProgress(p, Math.round(pct / 5) * 5);
  };

  const [adding, setAdding] = useState(false);
  const addOrgAsProject = async () => {
    if (!orgName) return;
    setAdding(true);
    if (!hasOrgProject) {
      const { error } = await supabase.from("organization_projects" as any).insert({
        organization_id: orgId,
        name: orgName,
        description: `Core project track for ${orgName}.`,
        status: "active",
        progress: 0,
        created_by: userId ?? null,
      });
      if (error) {
        setAdding(false);
        return toast({ title: "Could not add", description: error.message, variant: "destructive" });
      }
    }
    const { error: linkError } = await supabase.rpc("link_organization_to_legacy" as any, { _org_id: orgId });
    setAdding(false);
    if (linkError) {
      return toast({ title: "Could not publish", description: linkError.message, variant: "destructive" });
    }
    toast({ title: `${orgName} is now tracked`, description: "It appears in Projects and in Your Legacy." });
    load();
  };

  const remove = async (p: OrgProject) => {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    const { error } = await supabase.from("organization_projects" as any).delete().eq("id", p.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const isClosed = (p: OrgProject) => p.status === "done" || (p.progress ?? 0) >= 100;
  const openProjects = projects.filter((p) => !isClosed(p));
  const archivedProjects = projects.filter(isClosed);
  const counts = STATUSES.map((s) => ({ ...s, count: projects.filter((p) => p.status === s.value).length }));
  const hasOrgProject = !!orgName && projects.some((p) => p.name.trim().toLowerCase() === orgName.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Project</h3>
          <p className="text-sm text-muted-foreground">Projects run inside this organization, with status and progress.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add project</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Project name</Label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. CHU pilot deployment" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Scope, objective, expected outcome" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead</Label>
                    <div className="relative">
                      <Input
                        value={draft.lead}
                        onChange={(e) => searchTalents(e.target.value)}
                        onFocus={() => setLeadFocused(true)}
                        onBlur={() => setTimeout(() => setLeadFocused(false), 150)}
                        placeholder="Owner name (e.g. Imen Harrazi)"
                      />
                      {leadSearching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                      {leadFocused && leadResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md divide-y max-h-56 overflow-auto">
                          {leadResults.map((c) => (
                            <button
                              key={c.user_id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setDraft((d) => ({ ...d, lead: c.full_name ?? "" })); setLeadResults([]); }}
                              className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/60"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={c.avatar_url ?? undefined} />
                                <AvatarFallback>{(c.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground">{c.full_name ?? "Unnamed"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Target date</Label>
                    <Input type="date" value={draft.target_date} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Progress (%)</Label>
                    <Input type="number" min={0} max={100} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} />
                   </div>
                   <div>
                     <Label>Blocker / where it stands</Label>
                     <Input
                       value={draft.status_note}
                       onChange={(e) => setDraft({ ...draft, status_note: e.target.value })}
                       placeholder="e.g. Waiting for Mehdi to give access"
                     />
                   </div>
                 </div>
               </div>
               <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? "Save changes" : "Add project"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {counts.map((c) => (
          <div key={c.value} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-xl font-semibold text-foreground">{c.count}</p>
          </div>
        ))}
      </div>

      {!loading && canEdit && orgName && (!hasOrgProject || !legacyLinked) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{orgName} is not published as a venture yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Publish it to track it here and make it visible in Projects and in Your Legacy.
            </p>
          </div>
          <Button onClick={addOrgAsProject} disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Publish {orgName} to Projects & Legacy
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Rocket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canEdit ? "Add the first project this organization is running." : "An editor needs to add one."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {openProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">All projects are finished — see the archive below.</p>
          )}
          {openProjects.map((p) => {
            const meta = statusMeta(p.status);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground truncate">{p.name}</h4>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
                      {p.lead && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.lead}</span>}
                      {(p.start_date || p.target_date) && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {p.start_date || "—"} → {p.target_date || "—"}
                        </span>
                      )}
                     </div>
                     {p.status_note && (
                       <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                         <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                         <span>{p.status_note}</span>
                       </div>
                     )}
                   </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit project">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)} title="Delete project">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress{canEdit && " · click the bar to update"}</span><span>{p.progress}%</span>
                  </div>
                  <div
                    onClick={canEdit ? (e) => handleBarInteract(e, p) : undefined}
                    className={canEdit ? "cursor-pointer group" : undefined}
                    title={canEdit ? "Click to set progress" : undefined}
                  >
                    <Progress
                      value={p.progress}
                      className={`h-2 pointer-events-none ${canEdit ? "group-hover:h-3 transition-all" : ""}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && archivedProjects.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setShowArchive((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Archive className="w-4 h-4 text-muted-foreground" />
              Archive · finished projects
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {archivedProjects.length}
              </Badge>
            </span>
            {showArchive ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showArchive && (
            <div className="px-4 pb-4 space-y-2">
              {archivedProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Closed at {p.progress}%{p.target_date ? ` · ${p.target_date}` : ""}{p.lead ? ` · ${p.lead}` : ""}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => updateProgress(p, 90)} title="Reopen project">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)} title="Delete project">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Project — manage internal projects of an organization.
import { useCallback, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Rocket, CalendarDays, User } from "lucide-react";

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
  start_date: "", target_date: "", progress: 0,
};

export function OrgProjectsTab({ orgId, canEdit, userId }: { orgId: string; canEdit: boolean; userId?: string }) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgProject | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_projects" as any)
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    setProjects(((data as any[]) ?? []) as OrgProject[]);
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
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    const payload: any = {
      organization_id: orgId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      lead: draft.lead.trim() || null,
      start_date: draft.start_date || null,
      target_date: draft.target_date || null,
      progress: Math.max(0, Math.min(100, Number(draft.progress) || 0)),
    };
    const { error } = editing
      ? await supabase.from("organization_projects" as any).update(payload).eq("id", editing.id)
      : await supabase.from("organization_projects" as any).insert({ ...payload, created_by: userId ?? null });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Project updated" : "Project added" });
    setOpen(false);
    load();
  };

  const remove = async (p: OrgProject) => {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    const { error } = await supabase.from("organization_projects" as any).delete().eq("id", p.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const counts = STATUSES.map((s) => ({ ...s, count: projects.filter((p) => p.status === s.value).length }));

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
                    <Input value={draft.lead} onChange={(e) => setDraft({ ...draft, lead: e.target.value })} placeholder="Owner name" />
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
          {projects.map((p) => {
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
                    <span>Progress</span><span>{p.progress}%</span>
                  </div>
                  <Progress
                    value={p.progress}
                    className="h-2"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Reusable distribution models for an organization.
// A model = a named split template (tasks with % + charges) that can be
// applied to any mission inside the Distribution workspace.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createDistEntity } from "@/pages/Distribution";

import { Plus, Trash2, Layers, ArrowRight, Copy, Pencil, Lock, FileText } from "lucide-react";

type ModelTask = { id: string; label: string; percent: number; locked?: boolean };
type ModelCharge = { id: string; label: string; amount: number; percent?: number; fixed?: boolean; system?: boolean };

export type DistributionModel = {
  id: string;
  name: string;
  description: string | null;
  tasks: ModelTask[];
  charges: ModelCharge[];
};

const uid = () => Math.random().toString(36).slice(2, 9);

// Fixed charges every model starts with. Percentages are editable by the user,
// except Platform Fees which is controlled by the platform (code only).
const PLATFORM_FEE_PERCENT = 1;
const BASE_CHARGES: Array<{ label: string; percent: number; system?: boolean; aliases?: string[] }> = [
  { label: "Broker", percent: 5 },
  { label: "Administration", percent: 5 },
  { label: "Quality Ensurance", percent: 5, aliases: ["Quality", "Quality Assurance"] },
  { label: "Platform Fees", percent: PLATFORM_FEE_PERCENT, system: true, aliases: ["Platform Fee"] },
];
const norm = (v: unknown) => String(v || "").trim().toLowerCase();
const BASE_LABELS = BASE_CHARGES.flatMap((b) => [b.label, ...(b.aliases ?? [])]);

const withBaseCharges = (list: ModelCharge[]): ModelCharge[] => {
  const arr = Array.isArray(list) ? list : [];
  const rest = arr.filter((c) => !BASE_LABELS.some((l) => norm(l) === norm(c.label)));
  const base = BASE_CHARGES.map((b) => {
    const existing = arr.find((c) => [b.label, ...(b.aliases ?? [])].some((l) => norm(l) === norm(c.label)));
    const percent = b.system
      ? b.percent
      : existing?.percent !== undefined && existing?.percent !== null
        ? Number(existing.percent)
        : b.percent;
    return {
      id: uid(),
      label: b.label,
      amount: Number(existing?.amount) || 0,
      percent,
      fixed: true,
      system: b.system,
    } as ModelCharge;
  });
  return [...base, ...rest.map((c) => ({ ...c, fixed: false }))];
};

const PRESETS: Record<string, { tasks: Omit<ModelTask, "id">[]; charges: Omit<ModelCharge, "id">[] }> = {
  Consulting: {
    tasks: [
      { label: "Scoping & proposal", percent: 15 },
      { label: "Client discovery", percent: 15 },
      { label: "Delivery / execution", percent: 40 },
      { label: "Reporting & handover", percent: 15 },
      { label: "Follow-up & admin", percent: 10 },
      { label: "Structural reserve", percent: 5, locked: true },
    ],
    charges: [
      { label: "Tools & software", amount: 0 },
      { label: "Travel", amount: 0 },
    ],
  },
  Training: {
    tasks: [
      { label: "Curriculum design", percent: 20 },
      { label: "Slides & materials", percent: 15 },
      { label: "Live delivery", percent: 30 },
      { label: "Assessment & feedback", percent: 15 },
      { label: "Communication & promo", percent: 10 },
      { label: "Structural reserve", percent: 10, locked: true },
    ],
    charges: [
      { label: "Room / platform", amount: 0 },
      { label: "Handouts", amount: 0 },
    ],
  },
  Event: {
    tasks: [
      { label: "Promotion & registrations", percent: 20 },
      { label: "Logistics & purchases", percent: 20 },
      { label: "Setup", percent: 15 },
      { label: "Hosting participants", percent: 20 },
      { label: "Wrap-up & content", percent: 15 },
      { label: "Structural reserve", percent: 10, locked: true },
    ],
    charges: [
      { label: "Materials", amount: 0 },
      { label: "Space", amount: 0 },
    ],
  },
  Blank: { tasks: [{ label: "Preparation", percent: 0 }], charges: [] },
};

export function DistributionModels({
  orgId,
  orgName,
  canEdit,
  entities,
}: {
  orgId: string;
  orgName: string;
  canEdit: boolean;
  entities: Array<{ id: string; name: string }>;
}) {
  const { user } = useAuth();
  const [models, setModels] = useState<DistributionModel[]>([]);
  const [editing, setEditing] = useState<DistributionModel | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyTarget, setApplyTarget] = useState<DistributionModel | null>(null);
  const [applyEntity, setApplyEntity] = useState<string>("");
  const [applyClient, setApplyClient] = useState("");
  const [applyTitle, setApplyTitle] = useState("");
  const [applyBudget, setApplyBudget] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [missions, setMissions] = useState<any[]>([]);
  const navigate = useNavigate();

  // Each mission gets its own dedicated page: we create one distribution record
  // from the selected model and open /mission/<id>.
  const createMissionPage = async () => {
    if (!applyTarget || !user) return;
    const title = applyTitle.trim();
    if (!title) return;
    setCreating(true);
    // No distribution folder yet → create a default one so the flow never blocks.
    let entityId = applyEntity;
    if (!entityId) {
      try {
        const ent = await createDistEntity(`${orgName} distribution`, user.id, orgId);
        entityId = ent.id;
        setApplyEntity(ent.id);
      } catch {
        setCreating(false);
        toast.error("Could not create a distribution folder.");
        return;
      }
    }
    const kind = `${entityId}:model-${applyTarget.id}`;
    const table = () => supabase.from("distribution_records" as never) as never as any;
    const { count } = await table().select("id", { count: "exact", head: true }).eq("kind", kind);

    const budgetNum = Number(applyBudget) || 0;
    const charges = withBaseCharges(applyTarget.charges).map((c) => ({
      ...c,
      id: uid(),
      amount:
        c.fixed && c.percent !== undefined && c.percent !== null
          ? Math.round(((Number(c.percent) || 0) / 100) * budgetNum * 100) / 100
          : Number(c.amount) || 0,
    }));
    const { data, error } = await table()
      .insert({
        user_id: user.id,
        kind,
        client: applyClient.trim() || null,
        title,
        iteration: (count ?? 0) + 1,
        budget_label: applyTarget.name,
        budget: budgetNum,
        currency: "TND",
        charges,
        tasks: applyTarget.tasks.map((t) => ({ ...t, id: uid() })),
        people: ["Person (1)", "Person (2)"],
      })
      .select("id")
      .maybeSingle();
    setCreating(false);
    if (error || !data?.id) {
      toast.error(error?.message ?? "Could not create the mission page.");
      return;
    }
    setApplyTarget(null);
    setApplyClient("");
    setApplyTitle("");
    setApplyBudget("");
    void loadMissions();
    navigate(`/mission/${data.id}`);
  };



  const loadMissions = useCallback(async () => {
    const ids = entities.map((e) => e.id);
    if (ids.length === 0) {
      setMissions([]);
      return;
    }
    const { data } = await (supabase.from("distribution_records" as never) as never as any)
      .select("id,kind,title,client,budget,currency,budget_label,iteration,created_at")
      .order("created_at", { ascending: false });
    setMissions(
      ((data as any[]) ?? []).filter((r) => {
        const k = String(r.kind || "");
        const [folder, rest] = k.split(":");
        return ids.includes(folder) && String(rest || "").startsWith("model-");
      }),
    );
  }, [entities]);

  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  const deleteMission = async (id: string) => {
    if (!confirm("Delete this mission distribution page?")) return;
    const { error } = await (supabase.from("distribution_records" as never) as never as any)
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
    else void loadMissions();
  };

  const reload = useCallback(async () => {
    const { data } = await (supabase.from("distribution_models" as never) as never as any)
      .select("id,name,description,tasks,charges")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    setModels(
      ((data as any[]) ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        tasks: Array.isArray(m.tasks) ? m.tasks : [],
        charges: withBaseCharges(Array.isArray(m.charges) ? m.charges : []),
      })),
    );
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startNew = (preset: keyof typeof PRESETS = "Consulting") => {
    const p = PRESETS[preset];
    setEditing({
      id: "",
      name: preset === "Blank" ? "" : `${preset} model`,
      description: null,
      tasks: p.tasks.map((t) => ({ ...t, id: uid() })),
      charges: withBaseCharges(p.charges.map((c) => ({ ...c, id: uid() }))),
    });
    setOpen(true);
  };

  const totalPercent = (editing?.tasks ?? []).reduce((s, t) => s + (Number(t.percent) || 0), 0);

  const save = async () => {
    if (!editing || !user) return;
    if (!editing.name.trim()) {
      toast.error("Model name is required.");
      return;
    }
    if (totalPercent !== 100) {
      toast.error(`Task percentages must total 100% (currently ${totalPercent}%).`);
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      org_id: orgId,
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      tasks: editing.tasks,
      charges: editing.charges,
    };
    const table = supabase.from("distribution_models" as never) as never as any;
    const { error } = editing.id
      ? await table.update(payload).eq("id", editing.id)
      : await table.insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing.id ? "Model updated." : "Model created.");
    setOpen(false);
    setEditing(null);
    void reload();
  };

  const remove = async (m: DistributionModel) => {
    if (!confirm(`Delete model "${m.name}"?`)) return;
    const { error } = await (supabase.from("distribution_models" as never) as never as any)
      .delete()
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else void reload();
  };

  const duplicate = (m: DistributionModel) => {
    setEditing({
      id: "",
      name: `${m.name} (copy)`,
      description: m.description,
      tasks: m.tasks.map((t) => ({ ...t, id: uid() })),
      charges: withBaseCharges(m.charges.map((c) => ({ ...c, id: uid() }))),
    });
    setOpen(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Layers className="h-4 w-4 text-primary" /> Distribution models
          </p>
          <p className="text-xs text-muted-foreground">
            Reusable split templates for {orgName} — pick one to distribute a mission.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {(["Consulting", "Training", "Event", "Blank"] as const).map((p) => (
              <Button key={p} size="sm" variant="outline" onClick={() => startNew(p)}>
                <Plus className="mr-1 h-3 w-3" /> {p}
              </Button>
            ))}
          </div>
        )}
      </div>

      {models.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No models yet. {canEdit ? "Start from a preset above to create one." : "An editor needs to create one."}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {models.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.tasks.length} tasks · {m.charges.length} charges
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canEdit && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(m); setOpen(true); }} title="Edit model">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(m)} title="Duplicate model">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(m)} title="Delete model">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.tasks.slice(0, 4).map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-[10px]">
                    {t.label} {Number(t.percent) || 0}%
                  </Badge>
                ))}
                {m.tasks.length > 4 && (
                  <Badge variant="outline" className="text-[10px]">+{m.tasks.length - 4}</Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setApplyTarget(m);
                  setApplyEntity(entities[0]?.id ?? "");
                }}
              >
                Distribute a mission <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Mission distribution pages created from models */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 text-primary" /> Mission distribution pages ({missions.length})
        </p>
        {missions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No mission pages yet — distribute a mission with a model above.
          </p>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => {
              const folder = entities.find((e) => e.id === String(m.kind || "").split(":")[0]);
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{m.title || "Untitled mission"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.client ? `${m.client} · ` : ""}Iteration ({Number(m.iteration) || 1})
                      {m.budget_label ? ` · model ${m.budget_label}` : ""}
                      {folder ? ` · ${folder.name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {(Number(m.budget) || 0).toLocaleString()} {m.currency || "TND"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/mission/${m.id}`)}>
                      Open <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMission(m.id)}
                        title="Delete mission page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / edit model */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit distribution model" : "New distribution model"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Model name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Consulting mission split"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                <Input
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="When to use this model"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</Label>
                  <Badge variant={totalPercent === 100 ? "secondary" : "destructive"}>{totalPercent}%</Badge>
                </div>
                {editing.tasks.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Input
                      value={t.label}
                      onChange={(e) => {
                        const tasks = [...editing.tasks];
                        tasks[i] = { ...t, label: e.target.value };
                        setEditing({ ...editing, tasks });
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={t.percent}
                      onChange={(e) => {
                        const tasks = [...editing.tasks];
                        tasks[i] = { ...t, percent: Number(e.target.value) || 0 };
                        setEditing({ ...editing, tasks });
                      }}
                      className="w-20 text-right font-mono"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setEditing({ ...editing, tasks: editing.tasks.filter((x) => x.id !== t.id) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ ...editing, tasks: [...editing.tasks, { id: uid(), label: "New task", percent: 0 }] })}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add task
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Charges (fixed % first, then default amounts)
                </Label>
                {editing.charges.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Input
                      value={c.label}
                      readOnly={c.fixed}
                      className={`flex-1 ${c.fixed ? "bg-muted/40 font-medium" : ""}`}
                      onChange={(e) => {
                        if (c.fixed) return;
                        const charges = [...editing.charges];
                        charges[i] = { ...c, label: e.target.value };
                        setEditing({ ...editing, charges });
                      }}
                    />
                    {c.fixed ? (
                      <div className="relative w-24">
                        <Input
                          type="number"
                          step="0.01"
                          readOnly={c.system}
                          title={c.system ? "Platform fee — set by the platform" : undefined}
                          value={c.percent ?? 0}
                          onChange={(e) => {
                            if (c.system) return;
                            const charges = [...editing.charges];
                            charges[i] = { ...c, percent: Number(e.target.value) || 0 };
                            setEditing({ ...editing, charges });
                          }}
                          className={`pr-6 text-right font-mono ${c.system ? "bg-muted/40" : ""}`}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        value={c.amount}
                        onChange={(e) => {
                          const charges = [...editing.charges];
                          charges[i] = { ...c, amount: Number(e.target.value) || 0 };
                          setEditing({ ...editing, charges });
                        }}
                        className="w-24 text-right font-mono"
                      />
                    )}
                    {c.fixed ? (
                      <span className="flex h-8 w-8 items-center justify-center text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setEditing({ ...editing, charges: editing.charges.filter((x) => x.id !== c.id) })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ ...editing, charges: [...editing.charges, { id: uid(), label: "New charge", amount: 0 }] })}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add charge
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {editing?.id ? "Update model" : "Create model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply model to a mission */}
      <Dialog
        open={!!applyTarget}
        onOpenChange={(o) => {
          if (!o) {
            setApplyTarget(null);
            setApplyClient("");
            setApplyTitle("");
            setApplyBudget("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Distribute a mission with "{applyTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Distribution folder</Label>
              {entities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No folder yet — one named "{orgName} distribution" will be created automatically.
                </p>
              ) : (
                <Select value={applyEntity} onValueChange={setApplyEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Client</Label>
              <Input
                value={applyClient}
                onChange={(e) => setApplyClient(e.target.value)}
                placeholder="e.g. Ministry of Health"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mission title</Label>
              <Input
                value={applyTitle}
                onChange={(e) => setApplyTitle(e.target.value)}
                placeholder="e.g. Digital audit — phase 1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budget</Label>
              <Input
                type="number"
                value={applyBudget}
                onChange={(e) => setApplyBudget(e.target.value)}
                placeholder="0"
                className="text-right font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The iteration number is calculated automatically from how many times this model has already been used.
            </p>
          </div>
          <DialogFooter>
            {entities.length > 0 && applyTarget && applyEntity && (
              <Button onClick={createMissionPage} disabled={!applyTitle.trim() || creating}>
                {creating ? "Creating…" : "Create mission page"} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

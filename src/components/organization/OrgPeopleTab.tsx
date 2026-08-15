// People section for /org/:slug — community tiers around an organization.
// Friend → Crew Member (Chouch Ward / Ch3ir / Helba) → Mentor / Support System.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Heart, Users, GraduationCap, Plus, Trash2, Pencil, Activity, CalendarClock } from "lucide-react";

type Tier = "friend" | "crew" | "mentor";
type CrewType = "chouch_ward" | "ch3ir" | "helba";

export interface OrgPerson {
  id: string;
  organization_id: string;
  full_name: string;
  tier: Tier;
  crew_type: CrewType | null;
  has_expertise: boolean;
  present_type: "7areka" | "wagafa" | null;
  activities_count: number;
  years_contribution: number;
  notes: string | null;
}


const CREW_META: Record<CrewType, { label: string; desc: string; className: string }> = {
  chouch_ward: { label: "Chouch Ward", desc: "Li elleh — with/without expertise", className: "bg-rose-500/10 text-rose-700 border-rose-200" },
  ch3ir: { label: "Ch3ir", desc: "Volunteer — with/without expertise", className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  helba: { label: "Helba", desc: "Paid — with expertise", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
};

const PRESENT_META: Record<NonNullable<OrgPerson["present_type"]>, { label: string; desc: string; className: string }> = {
  "7areka": { label: "7areka", desc: "Active movement — energy deployed into action", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  wagafa: { label: "Wagafa", desc: "Steady presence — holding position and clarity", className: "bg-violet-500/10 text-violet-700 border-violet-200" },
};


export function OrgPeopleTab({
  orgId,
  orgName,
  canEdit,
}: {
  orgId: string;
  orgName: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [people, setPeople] = useState<OrgPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgPerson | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("organization_people")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    setPeople((data ?? []) as OrgPerson[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Remove this person?")) return;
    const { error } = await (supabase as any).from("organization_people").delete().eq("id", id);
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Person removed" }); load(); }
  };

  const groups: { tier: Tier; title: string; subtitle: string; icon: typeof Heart }[] = [
    { tier: "friend", title: `Friend of ${orgName}`, subtitle: "Interested participant.", icon: Heart },
    { tier: "crew", title: `Crew Member ${orgName} (Internal)`, subtitle: "Trusted contributor with proven contribution.", icon: Users },
    { tier: "mentor", title: `Mentor / Support System ${orgName}`, subtitle: "Knowledge carrier and ecosystem builder.", icon: GraduationCap },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">People</h3>
          <p className="text-sm text-muted-foreground">
            Community layers around {orgName} — from interest to proven contribution.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add person
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        groups.map((g) => {
          const rows = people.filter((p) => p.tier === g.tier);
          const Icon = g.icon;
          return (
            <div key={g.tier} className="rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2"><Icon className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <p className="font-medium text-foreground">{g.title}</p>
                    <p className="text-xs text-muted-foreground">{g.subtitle}</p>
                  </div>
                </div>
                <Badge variant="secondary">{rows.length}</Badge>
              </div>

              {g.tier === "crew" && (
                <div className="grid gap-2 p-4 pb-0 sm:grid-cols-3">
                  {(Object.keys(CREW_META) as CrewType[]).map((ct) => (
                    <div key={ct} className="rounded-lg border border-border p-3">
                      <Badge className={CREW_META[ct].className}>{CREW_META[ct].label}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{CREW_META[ct].desc}</p>
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {rows.filter((r) => r.crew_type === ct).length} people
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="divide-y divide-border">
                {rows.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No one listed yet.</p>
                ) : rows.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground truncate">{p.full_name}</p>
                        {p.crew_type && <Badge className={CREW_META[p.crew_type].className}>{CREW_META[p.crew_type].label}</Badge>}
                        <Badge variant="outline">{p.has_expertise ? "With expertise" : "Without expertise"}</Badge>
                        {p.present_type && <Badge className={PRESENT_META[p.present_type].className}>{PRESENT_META[p.present_type].label}</Badge>}

                      </div>
                      <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
                        <p className="text-xs font-medium text-foreground">Track Record in {orgName}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Activity className="w-3 h-3" /> {p.activities_count} activities contributed to
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" /> {p.years_contribution} years of contribution
                          </span>
                        </div>
                      </div>
                      {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <PersonDialog
        open={open}
        onOpenChange={setOpen}
        orgId={orgId}
        orgName={orgName}
        person={editing}
        onSaved={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

function PersonDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  person,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  orgName: string;
  person: OrgPerson | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [tier, setTier] = useState<Tier>("friend");
  const [crewType, setCrewType] = useState<CrewType>("ch3ir");
  const [expertise, setExpertise] = useState("no");
  const [presentType, setPresentType] = useState<"7areka" | "wagafa" | null>(null);
  const [activities, setActivities] = useState("0");
  const [years, setYears] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(person?.full_name ?? "");
    setTier(person?.tier ?? "friend");
    setCrewType(person?.crew_type ?? "ch3ir");
    setExpertise(person?.has_expertise ? "yes" : "no");
    setPresentType(person?.present_type ?? null);
    setActivities(String(person?.activities_count ?? 0));
    setYears(String(person?.years_contribution ?? 0));
    setNotes(person?.notes ?? "");
  }, [open, person]);



  const save = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    const hasExpertise =
      (tier === "crew" && crewType === "helba") || tier === "mentor" ? true : expertise === "yes";
    const payload = {
      organization_id: orgId,
      full_name: name.trim(),
      tier,
      crew_type: tier === "crew" ? crewType : null,
      has_expertise: hasExpertise,
      present_type: tier === "crew" && hasExpertise ? presentType : null,
      activities_count: Number(activities) || 0,
      years_contribution: Number(years) || 0,
      notes: notes.trim() || null,
    };

    const { error } = person
      ? await (supabase as any).from("organization_people").update(payload).eq("id", person.id)
      : await (supabase as any).from("organization_people").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: person ? "Person updated" : "Person added" }); onSaved(); }
  };

  const TIERS: { value: Tier; label: string; desc: string; icon: typeof Heart }[] = [
    { value: "friend", label: "Friend", desc: "Interested participant", icon: Heart },
    { value: "crew", label: "Crew Member", desc: "Proven contributor", icon: Users },
    { value: "mentor", label: "Mentor", desc: "Support system", icon: GraduationCap },
  ];

  const helbaLocked = tier === "crew" && crewType === "helba";
  const expertiseLocked = helbaLocked || tier === "mentor";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{person ? "Edit person" : "Add person"}</DialogTitle>
          <DialogDescription>Place this person in the right community layer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="person-name">Full name</Label>
            <Input
              id="person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Houssem Kaabi"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Community layer</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIERS.map((t) => {
                const Icon = t.icon;
                const active = tier === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTier(t.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-1.5 text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {tier === "crew" && (
            <div className="space-y-2">
              <Label>Crew type</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(CREW_META) as CrewType[]).map((ct) => {
                  const active = crewType === ct;
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setCrewType(ct)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Badge className={CREW_META[ct].className}>{CREW_META[ct].label}</Badge>
                      <p className="mt-1.5 text-xs text-muted-foreground">{CREW_META[ct].desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Expertise</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "yes", l: "With expertise" },
                { v: "no", l: "Without expertise" },
              ].map((o) => {
                const current = helbaLocked ? "yes" : expertise;
                const active = current === o.v;
                return (
                    <button
                    key={o.v}
                    type="button"
                    disabled={helbaLocked}
                    onClick={() => {
                      setExpertise(o.v);
                      if (o.v === "no") setPresentType(null);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                      active ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >

                    {o.l}
                  </button>
                );
              })}
            </div>
            {helbaLocked && (
              <p className="text-xs text-muted-foreground">Helba is paid with expertise — locked.</p>
            )}
            {(helbaLocked || expertise === "yes") && (
              <div className="space-y-2 pt-2">
                <Label>Present</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PRESENT_META) as Array<NonNullable<OrgPerson["present_type"]>>).map((pt) => {
                    const active = presentType === pt;
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setPresentType(pt)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Badge className={PRESENT_META[pt].className}>{PRESENT_META[pt].label}</Badge>
                        <p className="mt-1.5 text-xs text-muted-foreground">{PRESENT_META[pt].desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">

            <p className="text-sm font-medium text-foreground">Track Record in {orgName}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="person-activities" className="flex items-center gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" /> Activities contributed to
                </Label>
                <Input
                  id="person-activities"
                  type="number"
                  min="0"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="person-years" className="flex items-center gap-1.5 text-xs">
                  <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" /> Years of contribution
                </Label>
                <Input
                  id="person-years"
                  type="number"
                  min="0"
                  step="0.5"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="person-notes">Notes (optional)</Label>
            <Textarea
              id="person-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Context, role, how they contribute…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : person ? "Save changes" : "Add person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


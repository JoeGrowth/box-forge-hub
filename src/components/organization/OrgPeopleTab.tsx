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
import { Heart, Users, GraduationCap, Plus, Trash2, Pencil, Activity, CalendarClock, ChevronDown, ChevronRight, Search } from "lucide-react";

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
  email: string | null;
  phone: string | null;
  age: number | null;
  events_participated: string | null;
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


const PAGE_SIZE = 24;

type TierState = {
  rows: OrgPerson[];
  total: number;
  page: number;
  loading: boolean;
  search: string;
};

const emptyTierState = (): TierState => ({ rows: [], total: 0, page: 0, loading: true, search: "" });

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
  const [state, setState] = useState<Record<Tier, TierState>>({
    friend: emptyTierState(),
    crew: emptyTierState(),
    mentor: emptyTierState(),
  });
  const [stats, setStats] = useState({ total: 0, crew: 0, activities: 0, years: 0 });
  const [crewBreakdown, setCrewBreakdown] = useState<Record<CrewType, number>>({
    chouch_ward: 0, ch3ir: 0, helba: 0,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgPerson | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Tier>>(new Set(["friend"]));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Tier | null>(null);

  // Search inputs are debounced so typing never fires a query per keystroke.
  const [searchInput, setSearchInput] = useState<Record<Tier, string>>({ friend: "", crew: "", mentor: "" });

  const fetchTier = useCallback(
    async (tier: Tier, page: number, search: string, append: boolean) => {
      setState((s) => ({ ...s, [tier]: { ...s[tier], loading: true } }));
      let q = (supabase as any)
        .from("organization_people")
        .select("*", { count: "exact" })
        .eq("organization_id", orgId)
        .eq("tier", tier);
      if (search.trim()) q = q.ilike("full_name", `%${search.trim()}%`);
      const { data, count } = await q
        .order("full_name", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const rows = (data ?? []) as OrgPerson[];
      setState((s) => ({
        ...s,
        [tier]: {
          rows: append ? [...s[tier].rows, ...rows] : rows,
          total: count ?? rows.length,
          page,
          loading: false,
          search,
        },
      }));
    },
    [orgId],
  );

  const loadStats = useCallback(async () => {
    const base = () => (supabase as any).from("organization_people").eq("organization_id", orgId);
    const [{ count: total }, { count: crew }, { data: contrib }, { data: crewRows }] = await Promise.all([
      (supabase as any).from("organization_people").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      (supabase as any).from("organization_people").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("tier", "crew"),
      (supabase as any).from("organization_people").select("activities_count, years_contribution").eq("organization_id", orgId).neq("tier", "friend"),
      (supabase as any).from("organization_people").select("crew_type").eq("organization_id", orgId).eq("tier", "crew"),
    ]);
    const rows = (contrib ?? []) as { activities_count: number; years_contribution: number }[];
    setStats({
      total: total ?? 0,
      crew: crew ?? 0,
      activities: rows.reduce((s, r) => s + (r.activities_count || 0), 0),
      years: rows.reduce((s, r) => s + (Number(r.years_contribution) || 0), 0),
    });
    const bd: Record<CrewType, number> = { chouch_ward: 0, ch3ir: 0, helba: 0 };
    ((crewRows ?? []) as { crew_type: CrewType | null }[]).forEach((r) => {
      if (r.crew_type && bd[r.crew_type] !== undefined) bd[r.crew_type] += 1;
    });
    setCrewBreakdown(bd);
  }, [orgId]);

  const reloadAll = useCallback(() => {
    loadStats();
    (["friend", "crew", "mentor"] as Tier[]).forEach((t) => fetchTier(t, 0, searchInput[t], false));
  }, [loadStats, fetchTier, searchInput]);

  useEffect(() => {
    loadStats();
    (["friend", "crew", "mentor"] as Tier[]).forEach((t) => fetchTier(t, 0, "", false));
  }, [loadStats, fetchTier]);

  // Debounced search per tier.
  useEffect(() => {
    const timers = (["friend", "crew", "mentor"] as Tier[]).map((t) =>
      setTimeout(() => {
        if (searchInput[t] !== state[t].search) fetchTier(t, 0, searchInput[t], false);
      }, 350),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleDrop = (tier: Tier) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id || !canEdit) return;
    const all = [...state.friend.rows, ...state.crew.rows, ...state.mentor.rows];
    const p = all.find((x) => x.id === id);
    if (!p || p.tier === tier) return;
    setEditing({
      ...p,
      tier,
      crew_type: tier === "crew" ? p.crew_type ?? "ch3ir" : null,
      present_type: tier === "crew" ? p.present_type : null,
      has_expertise: tier === "mentor" ? true : p.has_expertise,
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this person?")) return;
    const { error } = await (supabase as any).from("organization_people").delete().eq("id", id);
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Person removed" }); reloadAll(); }
  };

  const groups: { tier: Tier; title: string; subtitle: string; icon: typeof Heart }[] = [
    { tier: "friend", title: `Friend of ${orgName}`, subtitle: "Interested participant.", icon: Heart },
    { tier: "crew", title: `Crew Member ${orgName} (Internal)`, subtitle: "Trusted contributor with proven contribution.", icon: Users },
    { tier: "mentor", title: `Mentor / Support System ${orgName}`, subtitle: "Knowledge carrier and ecosystem builder.", icon: GraduationCap },
  ];

  const initials = (n: string) =>
    n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">People</h3>
          <p className="text-sm text-muted-foreground">
            Community layers around {orgName} — from interest to proven contribution.
          </p>
          {canEdit && (
            <p className="mt-1 text-xs text-muted-foreground">
              Drag a person onto another layer to promote them — Friend → Crew Member → Mentor.
            </p>
          )}
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add person
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "People", value: stats.total, icon: Users },
          { label: "Crew members", value: stats.crew, icon: Heart },
          { label: "Activities", value: stats.activities, icon: Activity },
          { label: "Years contributed", value: stats.years, icon: CalendarClock },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" /> {s.label}
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {s.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {groups.map((g) => {
        const ts = state[g.tier];
        const rows = ts.rows;
        const Icon = g.icon;
        const isCollapsed = collapsed.has(g.tier);
        const toggle = () => {
          setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(g.tier)) next.delete(g.tier);
            else next.add(g.tier);
            return next;
          });
        };
        return (
          <div
            key={g.tier}
            onDragOver={(e) => { if (dragId && canEdit) { e.preventDefault(); setDragOver(g.tier); } }}
            onDragLeave={() => setDragOver((t) => (t === g.tier ? null : t))}
            onDrop={(e) => { e.preventDefault(); handleDrop(g.tier); }}
            className={`overflow-hidden rounded-xl border bg-card transition-colors ${
              dragOver === g.tier && dragId ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
          >
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-start justify-between gap-3 border-b border-border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-background p-2 shadow-sm"><Icon className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">{g.title}</p>
                  <p className="text-xs text-muted-foreground">{g.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{ts.total.toLocaleString()}</Badge>
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {!isCollapsed && (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput[g.tier]}
                      onChange={(e) => setSearchInput((s) => ({ ...s, [g.tier]: e.target.value }))}
                      placeholder={`Search ${g.tier === "friend" ? "friends" : g.tier === "crew" ? "crew members" : "mentors"} by name…`}
                      className="pl-8"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Showing {rows.length.toLocaleString()} of {ts.total.toLocaleString()}
                  </span>
                </div>

                {g.tier === "crew" && (
                  <div className="grid gap-2 border-b border-border p-4 sm:grid-cols-3">
                    {(Object.keys(CREW_META) as CrewType[]).map((ct) => (
                      <div key={ct} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={CREW_META[ct].className}>{CREW_META[ct].label}</Badge>
                          <span className="text-sm font-semibold text-foreground">{crewBreakdown[ct]}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{CREW_META[ct].desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                {ts.loading && rows.length === 0 ? (
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {searchInput[g.tier] ? "No match for this search." : "No one listed yet."}
                    </p>
                    {canEdit && !searchInput[g.tier] && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => { setEditing(null); setOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add person
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {rows.map((p) => (
                        <div
                          key={p.id}
                          draggable={canEdit}
                          onDragStart={(e) => { setDragId(p.id); e.dataTransfer.effectAllowed = "move"; }}
                          onDragEnd={() => { setDragId(null); setDragOver(null); }}
                          className={`group relative rounded-xl border border-border bg-background p-3 transition-shadow hover:shadow-md ${
                            canEdit ? "cursor-grab active:cursor-grabbing" : ""
                          } ${dragId === p.id ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {initials(p.full_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">{p.full_name}</p>
                              {p.tier !== "friend" && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  {p.tier === "crew" && p.present_type && (
                                    <Badge className={PRESENT_META[p.present_type].className}>{PRESENT_META[p.present_type].label}</Badge>
                                  )}
                                  {p.crew_type && <Badge className={CREW_META[p.crew_type].className}>{CREW_META[p.crew_type].label}</Badge>}
                                  <Badge variant="outline">{p.has_expertise ? "With expertise" : "Without expertise"}</Badge>
                                </div>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(p); setOpen(true); }}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(p.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {p.tier !== "friend" && p.notes && <p className="mt-2 text-xs text-muted-foreground">{p.notes}</p>}
                        </div>
                      ))}
                    </div>

                    {rows.length < ts.total && (
                      <div className="flex justify-center border-t border-border p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={ts.loading}
                          onClick={() => fetchTier(g.tier, ts.page + 1, ts.search, true)}
                        >
                          {ts.loading ? "Loading…" : `Load more (${(ts.total - rows.length).toLocaleString()} left)`}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        );
      })}




      <PersonDialog
        open={open}
        onOpenChange={setOpen}
        orgId={orgId}
        orgName={orgName}
        person={editing}
        onSaved={() => { setOpen(false); reloadAll(); }}
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [events, setEvents] = useState("");
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
    setEmail(person?.email ?? "");
    setPhone(person?.phone ?? "");
    setAge(person?.age ? String(person.age) : "");
    setEvents(person?.events_participated ?? "");
  }, [open, person]);



  const save = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Invalid email", variant: "destructive" }); return;
    }
    setSaving(true);
    const hasExpertise =
      (tier === "crew" && crewType === "helba") || tier === "mentor" ? true : expertise === "yes";
    const payload = {
      organization_id: orgId,
      full_name: name.trim(),
      tier,
      crew_type: tier === "crew" ? crewType : null,
      has_expertise: hasExpertise,
      present_type: tier === "crew" ? presentType : null,
      activities_count: tier === "friend" ? 0 : Number(activities) || 0,
      years_contribution: tier === "friend" ? 0 : Number(years) || 0,
      notes: tier === "friend" ? null : notes.trim() || null,
      email: tier === "friend" ? email.trim() || null : null,
      phone: tier === "friend" ? phone.trim() || null : null,
      age: tier === "friend" ? (age ? Number(age) : null) : null,
      events_participated: tier === "friend" ? events.trim() || null : null,
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
            <Label htmlFor="person-name">Name & last name</Label>
            <Input
              id="person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Imen Harrazi"
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

          {tier === "friend" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="person-email">Email</Label>
                <Input
                  id="person-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="imen@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="person-phone">Phone</Label>
                <Input
                  id="person-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 00 000 000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="person-age">Age</Label>
                <Input
                  id="person-age"
                  type="number"
                  min="0"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="person-events">Events participated in</Label>
                <Input
                  id="person-events"
                  value={events}
                  onChange={(e) => setEvents(e.target.value)}
                  placeholder="e.g. Zomita Launch, Community Day 2026"
                />
              </div>
            </div>
          )}


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

          {tier !== "friend" && (
            <div className="space-y-2">
              <Label>Expertise</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "yes", l: "With expertise" },
                  { v: "no", l: "Without expertise" },
                ].map((o) => {
                  const current = expertiseLocked ? "yes" : expertise;
                  const active = current === o.v;
                  return (
                      <button
                      key={o.v}
                      type="button"
                      disabled={expertiseLocked}
                      onClick={() => {
                        setExpertise(o.v);
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
              {tier === "mentor" && (
                <p className="text-xs text-muted-foreground">Mentors always carry expertise — locked.</p>
              )}
              {tier === "crew" && (
                <div className="space-y-2 pt-2">
                  <Label>Presence</Label>
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
          )}

          {tier !== "friend" && (
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
          )}

          {tier !== "friend" && (
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
          )}
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


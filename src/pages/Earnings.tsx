import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Banknote,
  Building2,
  Users,
  UserCheck,
  Handshake,
  ArrowRight,
  Briefcase,
} from "lucide-react";

// Earnings — shows a user how much money was generated from every entity they
// belong to, split by how they belong to it:
//   Associé         → named in the declaration's Recognition split (split_config.partners)
//   Internal member → listed in the org's People section (organization_people.user_id)
//   External member → named as a person on a mission distribution (distribution_records.people)

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

type Role = "associe" | "internal" | "external";

interface DistTask {
  label?: string;
  percent?: number;
  locked?: boolean;
  personShares?: number[];
}
interface DistCharge {
  label?: string;
  amount?: number;
  percent?: number;
}
interface DistRecord {
  id: string;
  kind: string | null;
  title: string | null;
  client: string | null;
  budget: number | null;
  currency: string | null;
  charges: DistCharge[] | null;
  tasks: DistTask[] | null;
  people: string[] | null;
  created_at: string;
}
interface DistEntity {
  id: string;
  name: string;
  org_id: string | null;
}
interface DeclEntity {
  id: string;
  name: string;
  organization_id: string | null;
  split_config: {
    recognitionPct?: number;
    partners?: { id: string; name: string; pct: number }[];
  } | null;
}
interface OrgRow {
  id: string;
  name: string;
  slug: string | null;
}

interface MissionEarning {
  recordId: string;
  title: string;
  client: string | null;
  amount: number;
  currency: string;
  role: Role;
  createdAt: string;
}
interface EntityEarnings {
  key: string;
  name: string;
  orgSlug: string | null;
  roles: Set<Role>;
  missions: MissionEarning[];
  totals: Record<string, number>; // currency -> amount
}

const ROLE_META: Record<Role, { label: string; icon: typeof Handshake; className: string }> = {
  associe: {
    label: "Associé",
    icon: Handshake,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  internal: {
    label: "Internal member",
    icon: UserCheck,
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  external: {
    label: "External member",
    icon: Users,
    className: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
};

export default function Earnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string>("");
  const [records, setRecords] = useState<DistRecord[]>([]);
  const [distEntities, setDistEntities] = useState<DistEntity[]>([]);
  const [declEntities, setDeclEntities] = useState<DeclEntity[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [internalOrgIds, setInternalOrgIds] = useState<Set<string>>(new Set());
  const [myAssocSlots, setMyAssocSlots] = useState<{ entity_id: string; label: string | null; slot: number | null }[]>([]);
  const [declMissions, setDeclMissions] = useState<
    { entity_id: string; budget: number | null; currency: string | null; internal: any[]; external: any[] }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setFullName((profile as { full_name: string | null } | null)?.full_name ?? "");

      const [recs, dEnts, decls, orgRows, peopleRows] = await Promise.all([
        supabase
          .from("distribution_records")
          .select("id,kind,title,budget,currency,charges,tasks,people,created_at")
          .order("created_at", { ascending: false }),
        (supabase as any).from("distribution_entities").select("id,name,org_id"),
        supabase.from("declaration_entities").select("id,name,organization_id,split_config"),
        supabase.from("organizations").select("id,name,slug"),
        (supabase as any)
          .from("organization_people")
          .select("organization_id,full_name,email"),
      ]);

      setRecords((recs.data ?? []) as unknown as DistRecord[]);
      setDistEntities((dEnts.data ?? []) as DistEntity[]);
      setDeclEntities((decls.data ?? []) as unknown as DeclEntity[]);
      setOrgs((orgRows.data ?? []) as OrgRow[]);
      setInternalOrgIds(
        new Set(
          ((peopleRows.data ?? []) as { organization_id: string; full_name: string | null; email: string | null }[])
            .filter((r) => {
              const n = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
              const me = n((profile as { full_name: string | null } | null)?.full_name);
              return (!!user.email && n(r.email) === n(user.email)) || (!!me && n(r.full_name) === me);
            })
            .map((r) => r.organization_id),
        ),
      );
      // Associé slots linked to me in declaration entities (Statement of the organization)
      const { data: slots } = await (supabase as any)
        .from("entity_role_assignments")
        .select("entity_id,label,slot,role_slug")
        .eq("linked_user_id", user.id)
        .eq("status", "accepted")
        .eq("entity_type", "declaration_entity")
        .like("role_slug", "associe_%");
      const slotRows = (slots ?? []) as { entity_id: string; label: string | null; slot: number | null }[];
      setMyAssocSlots(slotRows);
      if (slotRows.length) {
        const { data: dm } = await (supabase as any)
          .from("declaration_missions")
          .select("entity_id,budget,currency,internal,external")
          .in("entity_id", [...new Set(slotRows.map((r) => r.entity_id))]);
        setDeclMissions(dm ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const entities = useMemo<EntityEarnings[]>(() => {
    if (!user) return [];
    const me = norm(fullName);
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    const distById = new Map(distEntities.map((d) => [d.id, d]));

    const out = new Map<string, EntityEarnings>();
    const ensure = (orgId: string | null, fallbackName: string): EntityEarnings => {
      const org = orgId ? orgById.get(orgId) : undefined;
      const key = orgId ?? `name:${fallbackName}`;
      if (!out.has(key)) {
        out.set(key, {
          key,
          name: org?.name ?? fallbackName,
          orgSlug: org?.slug ?? null,
          roles: new Set<Role>(),
          missions: [],
          totals: {},
        });
      }
      return out.get(key)!;
    };
    const addAmount = (e: EntityEarnings, currency: string, amount: number) => {
      e.totals[currency] = (e.totals[currency] ?? 0) + amount;
    };

    // --- Associé via linked slot: replicate the declaration "Statement of the organization" ---
    const assocDeclOrgs = new Set<string>();
    for (const slot of myAssocSlots) {
      const decl = declEntities.find((d) => d.id === slot.entity_id);
      if (!decl) continue;
      const partners = decl.split_config?.partners ?? [];
      const partner =
        partners.find((p) => norm(p.name) === norm(slot.label)) ??
        (slot.slot ? partners[slot.slot - 1] : undefined);
      if (!partner) continue;
      const recPct = Math.min(45, Math.max(0, Number(decl.split_config?.recognitionPct ?? 30)));
      const partnerTotal = partners.reduce((s, p) => s + (Number(p.pct) || 0), 0) || 100;
      const rest: Record<string, number> = {};
      for (const m of declMissions.filter((x) => x.entity_id === decl.id)) {
        const used = [...(m.internal ?? []), ...(m.external ?? [])].reduce(
          (s: number, p: any) => s + (Number(p?.amount) || 0),
          0,
        );
        const cur = m.currency || "TND";
        rest[cur] = (rest[cur] ?? 0) + Math.max(0, (Number(m.budget) || 0) - used);
      }
      const orgId = decl.organization_id ?? null;
      if (orgId) assocDeclOrgs.add(orgId);
      for (const [cur, r] of Object.entries(rest)) {
        if (r < 1000) continue;
        const amount = (((r * recPct) / 100) * (Number(partner.pct) || 0)) / partnerTotal;
        if (amount <= 0) continue;
        const e = ensure(orgId, decl.name);
        e.roles.add("associe");
        e.missions.push({
          recordId: `decl:${decl.id}:${cur}`,
          title: `Statement of the organization — ${decl.name.trim()} (${slot.label ?? partner.name})`,
          client: null,
          amount,
          currency: cur,
          role: "associe",
          createdAt: new Date().toISOString(),
        });
        addAmount(e, cur, amount);
      }
    }

    for (const r of records) {
      const budget = Number(r.budget ?? 0);
      const currency = r.currency ?? "TND";
      const chargesTotal = (r.charges ?? []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const distEntityId = (r.kind ?? "").split(":")[0];
      const distEntity = distById.get(distEntityId);
      const orgId = distEntity?.org_id ?? null;
      const entityName = distEntity?.name ?? "Unknown entity";
      const title = r.title ?? "Untitled mission";

      // --- External member: my name is on the mission's people list ---
      const people = r.people ?? [];
      const idx = people.findIndex((p) => norm(p) === me && me !== "");
      if (idx >= 0) {
        const e = ensure(orgId, entityName);
        e.roles.add("external");
        let amount = 0;
        for (const t of r.tasks ?? []) {
          if (t.locked) continue;
          const taskAmount = (budget * (Number(t.percent) || 0)) / 100;
          const shares = t.personShares;
          if (Array.isArray(shares) && shares.length === people.length) {
            const totalShares = shares.reduce((s, v) => s + (Number(v) || 0), 0);
            if (totalShares > 0) amount += (taskAmount * (Number(shares[idx]) || 0)) / totalShares;
          } else if (people.length > 0) {
            amount += taskAmount / people.length;
          }
        }
        e.missions.push({
          recordId: r.id,
          title,
          client: r.client,
          amount,
          currency,
          role: "external",
          createdAt: r.created_at,
        });
        addAmount(e, currency, amount);
      }

    }

    // --- Internal member: I'm in the org's People section ---
    for (const orgId of internalOrgIds) {
      const orgRecs = records.filter((r) => distById.get((r.kind ?? "").split(":")[0])?.org_id === orgId);
      if (orgRecs.length === 0) continue;
      const e = ensure(orgId, orgById.get(orgId)?.name ?? "Organization");
      e.roles.add("internal");
      // Internal members see the entity's generated volume, not a personal share.
      for (const r of orgRecs) {
        const currency = r.currency ?? "TND";
        e.missions.push({
          recordId: r.id,
          title: r.title ?? "Untitled mission",
          client: r.client,
          amount: Number(r.budget ?? 0),
          currency,
          role: "internal",
          createdAt: r.created_at,
        });
      }
    }

    return [...out.values()].sort((a, b) => {
      const sum = (e: EntityEarnings) => Object.values(e.totals).reduce((s, v) => s + v, 0);
      return sum(b) - sum(a);
    });
  }, [user, fullName, records, distEntities, declEntities, orgs, internalOrgIds, myAssocSlots, declMissions]);

  const grandTotals = useMemo(() => {
    const t: Record<string, number> = {};
    entities.forEach((e) =>
      Object.entries(e.totals).forEach(([c, v]) => {
        t[c] = (t[c] ?? 0) + v;
      }),
    );
    return t;
  }, [entities]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 space-y-6">
          {/* Hero */}
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8">
            <Badge variant="secondary" className="mb-3">
              <Banknote className="mr-1.5 h-3.5 w-3.5" /> Earnings
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Money generated from your entities</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every organization you belong to — as associé, internal member or external member — and what
              its missions generated for you.
            </p>
            {!loading && Object.keys(grandTotals).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(grandTotals).map(([c, v]) => (
                  <Badge key={c} className="text-sm px-3 py-1">
                    {fmt(v)} {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : entities.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">No entity earnings yet</CardTitle>
                <CardDescription>
                  Once you are an associé in a declaration, a member of an organization's People section, or
                  named on a mission distribution, your earnings will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link to="/organizations">
                    Browse organizations <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            entities.map((e) => (
              <Card key={e.key}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        {e.name}
                      </CardTitle>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[...e.roles].map((r) => {
                          const meta = ROLE_META[r];
                          return (
                            <Badge key={r} variant="outline" className={meta.className}>
                              <meta.icon className="mr-1 h-3 w-3" />
                              {meta.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      {Object.entries(e.totals).map(([c, v]) => (
                        <p key={c} className="text-xl font-bold tracking-tight">
                          {fmt(v)} <span className="text-sm font-normal text-muted-foreground">{c}</span>
                        </p>
                      ))}
                      {e.orgSlug && (
                        <Button asChild size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs">
                          <Link to={`/org/${e.orgSlug}`}>Open workspace</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {e.missions.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" /> No mission distributed yet for this entity.
                    </div>
                  ) : (
                    e.missions.map((m, i) => (
                      <div
                        key={`${m.recordId}-${m.role}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.client || "No client"} · {ROLE_META[m.role].label}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {fmt(m.amount)} <span className="text-xs font-normal text-muted-foreground">{m.currency}</span>
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}

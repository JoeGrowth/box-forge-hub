import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Shield, Eye, Pencil, ArrowRight, Trash2, Cog, Search, Filter, Rocket, Sparkles, TrendingUp, Trophy, FileWarning, ShieldCheck, Wallet } from "lucide-react";
import { OrgLogo } from "@/components/organization/OrgLogo";

type LifecycleStage = "venture" | "business" | "startup" | "mature";
const STAGE_META: Record<LifecycleStage, { label: string; icon: typeof Rocket; className: string }> = {
  venture:  { label: "Venture",  icon: Rocket,     className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  business: { label: "Business", icon: Sparkles,   className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  startup:  { label: "Startup",  icon: TrendingUp, className: "bg-purple-500/10 text-purple-700 border-purple-200" },
  mature:   { label: "Mature",   icon: Trophy,     className: "bg-amber-500/10 text-amber-700 border-amber-200" },
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const ROLE_ICON = { admin: Shield, editor: Pencil, viewer: Eye } as const;
const ROLE_COLOR = {
  admin: "bg-primary/10 text-primary",
  editor: "bg-amber-500/10 text-amber-600",
  viewer: "bg-muted text-muted-foreground",
} as const;

type MoneyBox = { tnd: number; eur: number; usd: number };
type SortKey = "default" | "total-out";

const fmtMoney = (n: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0) + " " + currency;

export default function Organizations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { memberships, loading, reload } = useMyOrganizations(user?.id);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("organization");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [incorporatedIds, setIncorporatedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [moneyBox, setMoneyBox] = useState<Record<string, MoneyBox>>({});
  const [moneyBoxLoading, setMoneyBoxLoading] = useState(false);

  const companyOrgIds = useMemo(
    () => memberships.filter(m => m.organization.type === "company").map(m => m.organization.id),
    [memberships],
  );

  useEffect(() => {
    if (companyOrgIds.length === 0) { setIncorporatedIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("organization_legal_documents")
        .select("organization_id, name")
        .in("organization_id", companyOrgIds);
      if (cancelled) return;
      const ids = new Set<string>();
      (data ?? []).forEach((d: any) => {
        if (typeof d.name === "string" && d.name.toLowerCase().includes("certificate of incorporation")) {
          ids.add(d.organization_id);
        }
      });
      setIncorporatedIds(ids);
    })();
    return () => { cancelled = true; };
  }, [companyOrgIds.join(",")]);

  // Load Money Box outflows for all user's organizations
  useEffect(() => {
    if (!memberships.length) { setMoneyBox({}); return; }
    let cancelled = false;
    setMoneyBoxLoading(true);
    (async () => {
      const orgIds = memberships.map(m => m.organization.id);
      // Fetch declaration entities for these orgs
      const { data: entities } = await supabase
        .from("declaration_entities")
        .select("id, organization_id")
        .in("organization_id", orgIds);
      if (cancelled) return;
      const entityIds = (entities ?? []).map((e: any) => e.id);
      const entityToOrg = new Map<string, string>();
      (entities ?? []).forEach((e: any) => entityToOrg.set(e.id, e.organization_id));

      if (!entityIds.length) { setMoneyBox({}); setMoneyBoxLoading(false); return; }

      const { data: missions } = await supabase
        .from("declaration_missions")
        .select("entity_id, currency, internal, external")
        .in("entity_id", entityIds);
      if (cancelled) return;

      const out: Record<string, MoneyBox> = {};
      orgIds.forEach(id => { out[id] = { tnd: 0, eur: 0, usd: 0 }; });

      (missions ?? []).forEach((m: any) => {
        const orgId = entityToOrg.get(m.entity_id);
        if (!orgId) return;
        const cur = (m.currency as string)?.toLowerCase() as keyof MoneyBox;
        if (!cur || !(cur in out[orgId])) return;

        const sumPaid = (arr: any[]) =>
          (arr ?? []).reduce((s, p) => s + (p?.paid ? Number(p?.amount || 0) : 0), 0);

        out[orgId][cur] += sumPaid(m.internal) + sumPaid(m.external);
      });

      setMoneyBox(out);
      setMoneyBoxLoading(false);
    })();
    return () => { cancelled = true; };
  }, [memberships.map(m => m.organization.id).join(",")]);

  const filtered = useMemo(() => {
    const list = memberships.filter(({ organization: o }) => {
      const q = filter.toLowerCase();
      const matchesText =
        o.name.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q) ||
        (o.description ?? "").toLowerCase().includes(q);
      const matchesType = !typeFilter || typeFilter === "all" || o.type === typeFilter;
      return matchesText && matchesType;
    });

    if (sortBy === "default") return list;

    return [...list].sort((a, b) => {
      const av = (moneyBox[a.organization.id]?.tnd ?? 0) + (moneyBox[a.organization.id]?.eur ?? 0) + (moneyBox[a.organization.id]?.usd ?? 0);
      const bv = (moneyBox[b.organization.id]?.tnd ?? 0) + (moneyBox[b.organization.id]?.eur ?? 0) + (moneyBox[b.organization.id]?.usd ?? 0);
      return bv - av; // highest first
    });
  }, [memberships, filter, typeFilter, sortBy, moneyBox]);

  const create = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const finalSlug = (slug || slugify(name)).trim();
    const { error } = await supabase.from("organizations").insert({
      slug: finalSlug,
      name: name.trim(),
      type,
      description: description.trim() || null,
      website: website.trim() || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not create organization", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Organization "${name}" created` });
    setOpen(false);
    setName(""); setSlug(""); setDescription(""); setWebsite("");
    await reload();
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Organizations own opportunities and group team members with roles (admin · editor · viewer).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link to="/opsmanagement" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto"><Cog className="w-4 h-4 mr-1" /> Ops management</Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-1" /> New organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create an organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                    placeholder="Elspace"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="elspace" />
                  <p className="text-xs text-muted-foreground mt-1">Used in URLs: /org/{slug || "your-slug"}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organization">Organization</SelectItem>
                      <SelectItem value="company">Company (requires Certificate of Incorporation)</SelectItem>
                      <SelectItem value="ministry">Ministry</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Website (optional)</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://elspace.io" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={saving || !name.trim()}>
                  {saving ? "Creating…" : "Create organization"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">You don't belong to any organization yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create one above. As the creator you'll automatically be admin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by name, type, or description…"
                  className="pl-9"
                />
              </div>
              <div className="sm:w-44">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full">
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="ministry">Ministry</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:w-56">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="w-full">
                    <Wallet className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Sort by…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default order</SelectItem>
                    <SelectItem value="total-out">Outflow: Total (highest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No organizations match your filter.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map(({ organization: o, role }) => {
                const RoleIcon = ROLE_ICON[role];
                const canDelete = role === "admin";
                const handleDelete = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!confirm(`Delete "${o.name}"? This removes the organization, its memberships, and unlinks its opportunities. This cannot be undone.`)) return;
                  const { error } = await supabase.from("organizations").delete().eq("id", o.id);
                  if (error) {
                    toast({ title: "Could not delete organization", description: error.message, variant: "destructive" });
                    return;
                  }
                  toast({ title: `Deleted "${o.name}"` });
                  await reload();
                };
                return (
                  <Link
                    key={o.id}
                    to={`/org/${o.slug}`}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary/40 hover:shadow-sm transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          <OrgLogo
                            path={o.logo_url}
                            alt={`${o.name} logo`}
                            className="w-full h-full object-cover"
                            iconClassName="w-5 h-5 text-primary"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">{o.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground capitalize">
                              {o.type === "company" && !incorporatedIds.has(o.id) ? "Unverified company" : o.type}
                            </p>
                            {o.type === "company" && incorporatedIds.has(o.id) && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 h-4">
                                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Incorporated
                              </Badge>
                            )}
                            {(() => {
                              const stage = (o.lifecycle_stage ?? "venture") as LifecycleStage;
                              const meta = STAGE_META[stage];
                              const I = meta.icon;
                              return (
                                <Badge variant="outline" className={`${meta.className} text-[10px] py-0 px-1.5 h-4`}>
                                  <I className="w-2.5 h-2.5 mr-0.5" /> {meta.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                        <Badge className={ROLE_COLOR[role]}>
                          <RoleIcon className="w-3 h-3 mr-1" /> {role}
                        </Badge>
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={handleDelete}
                            aria-label={`Delete ${o.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {o.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{o.description}</p>
                    )}
                    {o.type === "company" && !incorporatedIds.has(o.id) && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                        <FileWarning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          Only recognized as a <strong>Company</strong> once a <strong>Certificate of Incorporation</strong> is uploaded. Open the organization and add it under Legal documents (e.g. name the file "Certificate of Incorporation.pdf").
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-4 text-xs text-primary">
                      Open <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { OrgLogo } from "@/components/organization/OrgLogo";
import {
  Building2, Globe, ArrowRight, ArrowLeft, Rocket, Sparkles, TrendingUp, Trophy,
  Users, Package, Layers, CalendarDays, Target, AlertTriangle, CheckCircle2,
  UserCheck, HeartHandshake, GraduationCap,
} from "lucide-react";

const STAGE_META: Record<string, { label: string; icon: typeof Rocket; className: string }> = {
  venture:  { label: "Venture",  icon: Rocket,     className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  business: { label: "Business", icon: Sparkles,   className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  startup:  { label: "Startup",  icon: TrendingUp, className: "bg-purple-500/10 text-purple-700 border-purple-200" },
  mature:   { label: "Mature",   icon: Trophy,     className: "bg-amber-500/10 text-amber-700 border-amber-200" },
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  planned: "bg-blue-500/10 text-blue-700 border-blue-200",
  on_hold: "bg-amber-500/10 text-amber-700 border-amber-200",
  done: "bg-muted text-muted-foreground border-border",
};

type Org = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  lifecycle_stage: string | null;
  created_at: string;
};

type Project = {
  id: string; name: string; description: string | null; status: string;
  progress: number; lead: string | null; target_date: string | null; status_note: string | null;
};

type Product = { id: string; name: string; description: string | null; created_at: string };
type Iteration = { id: string; product_id: string | null; title: string; shipped_at: string | null; version_number: number };
type Person = { id: string; full_name: string; tier: string; crew_type: string | null; activities_count: number; years_contribution: number; has_expertise: boolean };

const TIER_META: Record<string, { label: string; icon: typeof Users; className: string }> = {
  friend: { label: "Friends", icon: HeartHandshake, className: "bg-sky-500/10 text-sky-700 border-sky-200" },
  crew: { label: "Crew", icon: UserCheck, className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  mentor: { label: "Mentors", icon: GraduationCap, className: "bg-purple-500/10 text-purple-700 border-purple-200" },
};

function Section({ id, eyebrow, title, subtitle, children }: {
  id: string; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-14 border-t border-border/60">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function OrgPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, slug, name, type, description, website, logo_url, lifecycle_stage, created_at")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!cancelled && !sessionData.session) setLoggedOut(true);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrg(data as Org);
      const orgId = (data as Org).id;
      const [pj, pr, it, pe] = await Promise.all([
        supabase.from("organization_projects")
          .select("id, name, description, status, progress, lead, target_date, status_note")
          .eq("organization_id", orgId).order("position", { ascending: true }),
        supabase.from("organization_products")
          .select("id, name, description, created_at")
          .eq("organization_id", orgId).is("archived_at", null).order("position", { ascending: true }),
        supabase.from("organization_product_iterations")
          .select("id, product_id, title, shipped_at, version_number")
          .eq("organization_id", orgId).is("archived_at", null),
        supabase.from("organization_people")
          .select("id, full_name, tier, crew_type, activities_count, years_contribution, has_expertise")
          .eq("organization_id", orgId),
      ]);
      if (cancelled) return;
      setProjects((pj.data as Project[]) ?? []);
      setProducts((pr.data as Product[]) ?? []);
      setIterations((it.data as Iteration[]) ?? []);
      setPeople(((pe.data as Person[]) ?? []).filter((p) => p.tier !== "database"));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!org) return;
    const clean = org.name.split(" — ")[0];
    document.title = `${clean} — Organization profile`;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", org.description?.slice(0, 155) || `${clean}: projects, products and people.`);
  }, [org]);

  const shipped = useMemo(() => iterations.filter((i) => i.shipped_at), [iterations]);
  const activeProjects = useMemo(() => projects.filter((p) => p.status !== "done"), [projects]);
  const doneProjects = useMemo(() => projects.filter((p) => p.status === "done"), [projects]);
  const peopleByTier = useMemo(() => ({
    friend: people.filter((p) => p.tier === "friend"),
    crew: people.filter((p) => p.tier === "crew"),
    mentor: people.filter((p) => p.tier === "mentor"),
  }), [people]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {loggedOut
            ? "This page is available to signed-in members. Log in to view it."
            : <>No organization or page exists at <span className="font-mono">/{slug}</span>.</>}
        </p>
        <Button asChild className="mt-6">
          {loggedOut ? (
            <Link to="/auth"><ArrowLeft className="w-4 h-4 mr-1" /> Log in</Link>
          ) : (
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Back to home</Link>
          )}
        </Button>
      </div>
    );
  }

  const stage = STAGE_META[org.lifecycle_stage ?? "venture"] ?? STAGE_META.venture;
  const StageIcon = stage.icon;
  const cleanName = org.name.split(" — ")[0];
  const years = Math.max(1, new Date().getFullYear() - new Date(org.created_at).getFullYear() + 1);

  const stats = [
    { icon: Layers, value: projects.length, label: "Projects" },
    { icon: CheckCircle2, value: doneProjects.length, label: "Delivered" },
    { icon: Package, value: products.length, label: "Products" },
    { icon: Rocket, value: shipped.length, label: "Shipped iterations" },
    { icon: Users, value: people.length, label: "People" },
    { icon: CalendarDays, value: years, label: years === 1 ? "Year active" : "Years active" },
  ];

  const navItems = [
    { id: "about", label: "About" },
    ...(projects.length ? [{ id: "projects", label: "Projects" }] : []),
    ...(products.length ? [{ id: "products", label: "Products" }] : []),
    ...(people.length ? [{ id: "people", label: "People" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-accent/60" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative container mx-auto px-4 max-w-6xl py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="w-20 h-20 rounded-2xl bg-background/95 shadow-xl flex items-center justify-center overflow-hidden mb-6">
                <OrgLogo
                  path={org.logo_url}
                  alt={`${cleanName} logo`}
                  className="w-full h-full object-cover"
                  iconClassName="w-9 h-9 text-primary"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight">{cleanName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Badge variant="outline" className="capitalize bg-background/20 text-primary-foreground border-primary-foreground/30">
                  {org.type}
                </Badge>
                <Badge variant="outline" className="bg-background/20 text-primary-foreground border-primary-foreground/30">
                  <StageIcon className="w-3 h-3 mr-1" /> {stage.label}
                </Badge>
              </div>
              {org.description && (
                <p className="mt-5 text-primary-foreground/90 text-base md:text-lg leading-relaxed line-clamp-4 whitespace-pre-line">
                  {org.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <Button asChild size="lg" variant="secondary">
                <Link to={`/org/${org.slug}`}>Open workspace <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              {org.website && (
                <Button asChild size="lg" variant="outline" className="bg-background/10 text-primary-foreground border-primary-foreground/30 hover:bg-background/20">
                  <a href={org.website} target="_blank" rel="noreferrer">
                    <Globe className="w-4 h-4 mr-1" /> {org.website.replace(/^https?:\/\//, "")}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* NAV */}
      {navItems.length > 1 && (
        <nav className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="container mx-auto px-4 max-w-6xl flex gap-6 overflow-x-auto py-3 text-sm">
            {navItems.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="text-muted-foreground hover:text-primary whitespace-nowrap font-medium">
                {n.label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* STATS */}
      <section className="container mx-auto px-4 max-w-6xl py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/40 hover:shadow-sm">
              <s.icon className="w-4 h-4 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl pb-20">
        {/* ABOUT */}
        <Section id="about" eyebrow="Identity" title={`About ${cleanName}`}>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed">
                {org.description || "No description has been added yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium text-foreground capitalize">{org.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stage</p>
                <p className="font-medium text-foreground">{stage.label}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Since</p>
                <p className="font-medium text-foreground">{new Date(org.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* PROJECTS */}
        {projects.length > 0 && (
          <Section
            id="projects"
            eyebrow="Execution"
            title="Projects"
            subtitle={`${activeProjects.length} in motion · ${doneProjects.length} delivered`}
          >
            <div className="grid md:grid-cols-2 gap-4">
              {[...activeProjects, ...doneProjects].map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <Badge variant="outline" className={STATUS_STYLE[p.status] ?? STATUS_STYLE.planned}>
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.description}</p>
                  )}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span><span>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-2" />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    {p.lead && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {p.lead}</span>}
                    {p.target_date && (
                      <span className="inline-flex items-center gap-1">
                        <Target className="w-3 h-3" /> {new Date(p.target_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {p.status_note && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{p.status_note}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* PRODUCTS */}
        {products.length > 0 && (
          <Section
            id="products"
            eyebrow="Offer"
            title="Products"
            subtitle={`${shipped.length} shipped iterations across ${products.length} product${products.length > 1 ? "s" : ""}`}
          >
            <div className="grid md:grid-cols-3 gap-4">
              {products.map((pr) => {
                const its = iterations.filter((i) => i.product_id === pr.id);
                const ship = its.filter((i) => i.shipped_at).length;
                const maturity =
                  ship >= 3 ? { label: "Repeatable", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" }
                  : ship === 2 ? { label: "Validated", className: "bg-blue-500/10 text-blue-700 border-blue-200" }
                  : ship === 1 ? { label: "First delivery", className: "bg-amber-500/10 text-amber-700 border-amber-200" }
                  : { label: "In build", className: "bg-muted text-muted-foreground border-border" };
                return (
                  <div key={pr.id} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{pr.name}</h3>
                      <Badge variant="outline" className={maturity.className}>{maturity.label}</Badge>
                    </div>
                    {pr.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{pr.description}</p>}
                    <p className="text-xs text-muted-foreground mt-4">
                      {its.length} iteration{its.length === 1 ? "" : "s"} · {ship} shipped
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* PEOPLE */}
        {people.length > 0 && (
          <Section id="people" eyebrow="Community" title="People" subtitle="Friends, crew and mentors contributing to this organization.">
            <div className="grid md:grid-cols-3 gap-4">
              {(["crew", "mentor", "friend"] as const).map((tier) => {
                const meta = TIER_META[tier];
                const list = peopleByTier[tier];
                return (
                  <div key={tier} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground inline-flex items-center gap-2">
                        <meta.icon className="w-4 h-4 text-primary" /> {meta.label}
                      </h3>
                      <Badge variant="outline" className={meta.className}>{list.length}</Badge>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {list.length === 0 && <li className="text-xs text-muted-foreground">None yet.</li>}
                      {list.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-foreground">{p.full_name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {p.activities_count} act. · {p.years_contribution}y
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* CTA */}
        <section className="mt-14 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center">
          <h2 className="text-xl font-bold text-foreground">Work with {cleanName}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Open the workspace to see projects, missions, distribution and the full operating picture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <Button asChild>
              <Link to={`/org/${org.slug}`}>Open workspace <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/organizations">All organizations</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

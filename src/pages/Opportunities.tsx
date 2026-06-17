import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, ArrowRight, Sparkles, Plus, Bookmark, ListChecks } from "lucide-react";
import { OpportunityCard, type Opportunity } from "@/components/opportunities/OpportunityCard";
import { SEEDED_OPPORTUNITIES } from "@/data/seededOpportunities";
import { useExpertise } from "@/hooks/useExpertise";
import {
  useOpportunityScoreMap,
  type OpportunityRecommendation,
} from "@/hooks/useOpportunityRecommendations";
import { USE_OPPORTUNITY_GRAPH } from "@/lib/featureFlags";
import { useOpportunityPersona, type OpportunityCategory } from "@/hooks/useOpportunityPersona";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES: { key: OpportunityCategory; label: string }[] = [
  { key: "job", label: "Jobs" },
  { key: "training", label: "Training" },
  { key: "consulting", label: "Consulting" },
  { key: "tender", label: "Tenders" },
  { key: "startup", label: "Startups" },
];

type View = "feed" | "saved" | "applied";
type Sort = "match" | "newest" | "reward";

function computeMatchScore(userSkillNames: string[], oppSkills: string[]): number {
  if (oppSkills.length === 0 || userSkillNames.length === 0) return 0;
  const userSet = new Set(userSkillNames.map((s) => s.toLowerCase()));
  const matches = oppSkills.filter((s) => userSet.has(s.toLowerCase()));
  return Math.round((matches.length / oppSkills.length) * 100);
}

function parseReward(s: string): number {
  if (!s) return 0;
  // Pull the first number from a free-text reward range (e.g. "5000-8000 USD").
  const m = s.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

const Opportunities = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const persona = useOpportunityPersona();
  const { savedIds } = useSavedOpportunities(user?.id);

  const [rawStartups, setRawStartups] = useState<any[]>([]);
  const [rawTrainings, setRawTrainings] = useState<any[]>([]);
  const [rawTenders, setRawTenders] = useState<any[]>([]);
  const [rawJobs, setRawJobs] = useState<any[]>([]);
  const [rawConsulting, setRawConsulting] = useState<any[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const { expertise } = useExpertise(user?.id);
  const userSkillNames = expertise?.tags ?? [];
  const { scoreById } = useOpportunityScoreMap(user?.id);
  const [userCapacity, setUserCapacity] = useState<{
    hasTrackRecord: boolean;
    sectors: string[];
    experience: number;
  }>({ hasTrackRecord: false, sectors: [], experience: 0 });
  const [loading, setLoading] = useState(true);

  // URL-driven state (mandatory).
  const view = (searchParams.get("view") as View) || "feed";
  const categoryFilter = (searchParams.get("tab") as OpportunityCategory) || persona.defaultTab;
  const searchQuery = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as Sort) || "match";
  const sectorFilter = searchParams.get("sector") || "";

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const setParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  };

  // Apply persona default tab once on initial load if no ?tab param.
  useEffect(() => {
    if (!searchParams.get("tab") && !persona.loading) {
      setParam("tab", persona.defaultTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.loading, persona.defaultTab]);

  const isApproved =
    onboardingState?.journey_status === "approved" ||
    onboardingState?.journey_status === "entrepreneur_approved";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      const [startupsRes, trainingsRes, tendersRes, jobsRes, consultingRes, myProfileRes, interactionsRes] = await Promise.all([
        supabase
          .from("startup_ideas")
          .select("*")
          .eq("status", "active")
          .eq("review_status", "approved")
          .eq("is_looking_for_cobuilders", true)
          .order("created_at", { ascending: false }),
        supabase.from("training_opportunities" as any).select("*").eq("review_status", "approved").order("created_at", { ascending: false }),
        supabase.from("tenders" as any).select("*").eq("status", "published").order("created_at", { ascending: false }),
        supabase.from("job_opportunities" as any).select("*").eq("status", "published").order("created_at", { ascending: false }),
        (supabase.from("consulting_services" as any) as any).select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("preferred_sector, primary_skills, years_of_experience, key_projects, summary_statement, professional_title")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase.from("opportunity_interactions" as any) as any)
          .select("opportunity_id")
          .eq("user_id", user.id),
      ]);

      const startupData = startupsRes.data || [];
      const trainingData = (trainingsRes.data as any[]) || [];
      const tenderData = (tendersRes.data as any[]) || [];
      const jobData = (jobsRes.data as any[]) || [];
      const consultingData = (consultingRes?.data as any[]) || [];

      const p = (myProfileRes.data as any) || {};
      const sectors = [
        p.preferred_sector,
        ...(p.primary_skills ? String(p.primary_skills).split(",") : []),
      ]
        .map((s: string) => (s || "").trim().toLowerCase())
        .filter(Boolean);
      const tagCount = userSkillNames.length;
      const hasTrackRecord = Boolean(
        (p.key_projects && String(p.key_projects).trim().length > 20) ||
          (p.summary_statement && String(p.summary_statement).trim().length > 20) ||
          (p.years_of_experience && Number(p.years_of_experience) >= 1) ||
          tagCount >= 3
      );
      setUserCapacity({
        hasTrackRecord,
        sectors: [...new Set([...sectors, ...userSkillNames.map((s) => s.toLowerCase())])],
        experience: Number(p.years_of_experience) || 0,
      });

      const allUserIds = [
        ...startupData.map((s: any) => s.creator_id),
        ...trainingData.map((t: any) => t.user_id),
        ...tenderData.map((t: any) => t.user_id),
        ...jobData.map((j: any) => j.user_id),
        ...consultingData.map((c: any) => c.user_id),
      ].filter(Boolean);

      let profileMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", [...new Set(allUserIds)]);
        profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
      }

      const orgIds = [
        ...tenderData.map((t: any) => t.organization_id),
        ...jobData.map((j: any) => j.organization_id),
      ].filter(Boolean) as string[];
      let orgMap = new Map<string, { name: string; slug: string }>();
      if (orgIds.length > 0) {
        const { data: orgs } = await (supabase.from("organizations" as any) as any)
          .select("id, name, slug")
          .in("id", [...new Set(orgIds)]);
        orgMap = new Map((orgs || []).map((o: any) => [o.id, { name: o.name, slug: o.slug }]));
      }

      const skillTagIds = [...new Set(consultingData.map((c: any) => c.skill_tag_id).filter(Boolean))] as string[];
      let skillTagMap = new Map<string, string>();
      if (skillTagIds.length > 0) {
        const { data: tags } = await supabase.from("skill_tags").select("id, name").in("id", skillTagIds);
        skillTagMap = new Map((tags || []).map((t: any) => [t.id, t.name]));
      }

      const orgLabel = (orgId: string | null, fallback: string) =>
        orgId && orgMap.get(orgId) ? orgMap.get(orgId)!.name : fallback;

      setRawStartups(startupData.map((s: any) => ({ ...s, _author: profileMap.get(s.creator_id) || "Unknown" })));
      setRawTrainings(trainingData.map((t: any) => ({ ...t, _author: profileMap.get(t.user_id) || "Unknown" })));
      setRawTenders(tenderData.map((t: any) => ({
        ...t,
        _author: orgLabel(t.organization_id, profileMap.get(t.user_id) || "Unknown"),
        _org_slug: t.organization_id ? orgMap.get(t.organization_id)?.slug ?? null : null,
      })));
      setRawJobs(jobData.map((j: any) => ({
        ...j,
        _author: orgLabel(j.organization_id, profileMap.get(j.user_id) || "Unknown"),
        _org_slug: j.organization_id ? orgMap.get(j.organization_id)?.slug ?? null : null,
      })));
      setRawConsulting(
        consultingData.map((c: any) => ({
          ...c,
          _author: profileMap.get(c.user_id) || "Unknown",
          _skill_name: c.skill_tag_id ? skillTagMap.get(c.skill_tag_id) || null : null,
        }))
      );

      const applied = new Set<string>(
        ((interactionsRes?.data as any[]) || []).map((r: any) => r.opportunity_id)
      );
      setAppliedIds(applied);

      setLoading(false);
    };

    fetchAll();
  }, [user, authLoading, expertise?.tags.length]);

  // Normalize → unified Opportunity[] with correct per-category detail routes.
  const allOpportunities = useMemo<
    (Opportunity & { match_score: number; recommendation?: OpportunityRecommendation })[]
  >(() => {
    const startupOpps: Opportunity[] = rawStartups.map((s, i) => ({
      id: s.id,
      title: s.title,
      category: "startup" as const,
      required_skills: (s.roles_needed || []).slice(0, 5),
      income_range: "Equity-based",
      effort_level: "Part-time",
      description: s.description,
      primary_action: { type: "apply", label: "View role", route: `/opportunities/startup/${s.id}` },
      source_id: s.id,
      created_at: s.created_at,
      author_name: s._author || "Unknown",
      author_user_id: s.creator_id ?? null,
      sector: s.sector,
      rank: 50 + i,
    }));

    const trainingOpps: Opportunity[] = rawTrainings.map((t, i) => ({
      id: t.id,
      title: t.title,
      category: "training" as const,
      required_skills: [t.sector, t.target_audience, t.format, t.duration].filter(Boolean).slice(0, 5),
      income_range: "Free",
      effort_level: t.duration || "Self-paced",
      description: t.description,
      primary_action: { type: "start", label: "View training", route: `/opportunities/training/${t.id}` },
      source_id: t.id,
      created_at: t.created_at,
      author_name: t._author || "Unknown",
      author_user_id: t.user_id ?? null,
      sector: t.sector,
      rank: 200 + i,
    }));

    const tenderOpps: Opportunity[] = rawTenders.map((t, i) => ({
      id: t.id,
      title: t.title,
      category: "tender" as const,
      required_skills: [t.sector, t.location, t.budget_range].filter(Boolean).slice(0, 5),
      income_range: t.budget_range || "Contract",
      effort_level: t.deadline ? `Due ${t.deadline}` : "Open",
      description: t.description,
      primary_action: { type: "apply", label: "View tender", route: `/opportunities/tender/${t.id}` },
      source_id: t.id,
      created_at: t.created_at,
      author_name: t._author || "Unknown",
      author_user_id: t.user_id ?? null,
      sector: t.sector,
      rank: 100 + i,
    }));

    const jobOpps: Opportunity[] = rawJobs.map((j, i) => ({
      id: j.id,
      title: j.title,
      category: "job" as const,
      required_skills: [j.sector, j.employment_type, j.location].filter(Boolean).slice(0, 5),
      income_range: j.salary_range || "Not specified",
      effort_level: j.employment_type || "Full-time",
      description: j.description,
      primary_action: { type: "apply", label: "View job", route: `/opportunities/job/${j.id}` },
      source_id: j.id,
      created_at: j.created_at,
      author_name: j._author || "Unknown",
      author_user_id: j.user_id ?? null,
      sector: j.sector,
      rank: 75 + i,
    }));

    const consultingOpps: Opportunity[] = rawConsulting.map((c, i) => ({
      id: c.id,
      title: c.service_title,
      category: "consulting" as const,
      required_skills: [c._skill_name, c.delivery_type, c.availability].filter(Boolean).slice(0, 5),
      income_range: c.price > 0 ? `${c.price} ${c.currency}` : "Free",
      effort_level: c.delivery_type === "remote" ? "Remote" : c.delivery_type === "on-site" ? "On-site" : "Remote / On-site",
      description: c.description || `Consulting service offered by ${c._author || "a co-builder"}.`,
      primary_action: { type: "apply", label: "View service", route: `/opportunities/consulting/${c.id}` },
      source_id: c.id,
      created_at: c.created_at,
      author_name: c._author || "Unknown",
      author_user_id: c.user_id ?? null,
      sector: c._skill_name || null,
      rank: 60 + i,
    }));

    const all = [...SEEDED_OPPORTUNITIES, ...startupOpps, ...trainingOpps, ...tenderOpps, ...jobOpps, ...consultingOpps];

    const scored = all.map((opp) => {
      const rec = USE_OPPORTUNITY_GRAPH ? scoreById.get(opp.source_id ?? opp.id) : undefined;
      const legacy = computeMatchScore(userSkillNames, opp.required_skills);
      const projected = rec ? Math.min(100, Math.round(rec.matchScore)) : null;
      return { ...opp, recommendation: rec, match_score: projected ?? legacy };
    });

    return scored;
  }, [rawStartups, rawTrainings, rawTenders, rawJobs, rawConsulting, userSkillNames, scoreById]);

  const passesTenderCapacity = (opp: Opportunity & { match_score: number }) => {
    if (opp.category !== "tender") return true;
    if (!userCapacity.hasTrackRecord) return false;
    const tenderSector = (opp.sector || "").toLowerCase().trim();
    if (!tenderSector) return userCapacity.experience >= 1;
    const sectorMatch = userCapacity.sectors.some(
      (s) => s && (tenderSector.includes(s) || s.includes(tenderSector))
    );
    return sectorMatch || userCapacity.experience >= 3 || opp.match_score > 0;
  };

  const hiddenTenderCount = useMemo(
    () => allOpportunities.filter((o) => o.category === "tender" && !passesTenderCapacity(o)).length,
    [allOpportunities, userCapacity]
  );

  // Available sectors in current category (chip filter).
  const sectorsForCategory = useMemo(() => {
    const set = new Set<string>();
    allOpportunities
      .filter((o) => o.category === categoryFilter && o.sector)
      .forEach((o) => set.add(o.sector as string));
    return [...set].sort();
  }, [allOpportunities, categoryFilter]);

  // Filter + sort.
  const filtered = useMemo(() => {
    let base = allOpportunities;

    // View-level filtering first.
    if (view === "saved") {
      const savedSet = new Set(savedIds);
      base = base.filter((o) => savedSet.has(o.id));
    } else if (view === "applied") {
      base = base.filter((o) => appliedIds.has(o.id));
    } else {
      base = base.filter((o) => o.category === categoryFilter && passesTenderCapacity(o));
    }

    if (sectorFilter && view === "feed") {
      base = base.filter((o) => (o.sector || "").toLowerCase() === sectorFilter.toLowerCase());
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          (o.sector || "").toLowerCase().includes(q) ||
          o.required_skills.some((s) => s.toLowerCase().includes(q)) ||
          o.author_name.toLowerCase().includes(q)
      );
    }

    // Sort.
    const sorted = [...base];
    if (sort === "newest") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "reward") {
      sorted.sort((a, b) => parseReward(b.income_range) - parseReward(a.income_range));
    } else {
      // match (default)
      if (USE_OPPORTUNITY_GRAPH || userSkillNames.length > 0) {
        sorted.sort((a, b) => b.match_score - a.match_score || a.rank - b.rank);
      } else {
        sorted.sort((a, b) => a.rank - b.rank);
      }
    }
    return sorted;
  }, [allOpportunities, categoryFilter, searchQuery, sort, sectorFilter, view, savedIds, appliedIds, userCapacity, userSkillNames]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const isVentureCreator = persona.persona === "venture_creator";

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-10">
            <div className="container mx-auto px-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">Opportunity Marketplace</h1>
                  <p className="text-muted-foreground max-w-2xl">
                    Discover jobs, consulting missions, tenders, training, and startup roles tailored to you.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Viewing as {persona.label}
                </Badge>
              </div>
            </div>
          </section>

          {/* Persona banner */}
          {persona.banner && view === "feed" && (
            <section className="pb-4">
              <div className="container mx-auto px-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{persona.banner.title}</p>
                    <p className="text-sm text-muted-foreground">{persona.banner.body}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(persona.banner!.ctaRoute)}
                    className="shrink-0"
                  >
                    {persona.banner.ctaLabel}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* View tabs: Feed / Saved / Applied */}
          <section className="pb-3">
            <div className="container mx-auto px-4">
              <div className="inline-flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setParam("view", null)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === "feed" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Feed
                </button>
                <button
                  onClick={() => setParam("view", "saved")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-border flex items-center gap-1.5 ${
                    view === "saved" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" /> Saved {savedIds.length > 0 && `(${savedIds.length})`}
                </button>
                <button
                  onClick={() => setParam("view", "applied")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-border flex items-center gap-1.5 ${
                    view === "applied" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" /> Applied {appliedIds.size > 0 && `(${appliedIds.size})`}
                </button>
              </div>
            </div>
          </section>

          {/* Category pills (feed only) */}
          {view === "feed" && (
            <section className="pb-3">
              <div className="container mx-auto px-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setParams({ tab: cat.key, sector: null })}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        categoryFilter === cat.key
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Search + sort + sector chips */}
          <section className="pb-6">
            <div className="container mx-auto px-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title, sector, skill, author..."
                    value={searchQuery}
                    onChange={(e) => setParam("q", e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sort} onValueChange={(v) => setParam("sort", v === "match" ? null : v)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match">Best match</SelectItem>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="reward">Highest reward</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {view === "feed" && sectorsForCategory.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs text-muted-foreground shrink-0">Sector:</span>
                  <button
                    onClick={() => setParam("sector", null)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs transition-colors border ${
                      !sectorFilter ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    All
                  </button>
                  {sectorsForCategory.map((s) => (
                    <button
                      key={s}
                      onClick={() => setParam("sector", sectorFilter === s ? null : s)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs transition-colors border ${
                        sectorFilter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Venture Creator sticky CTA row */}
          {isVentureCreator && view === "feed" && (
            <section className="pb-4">
              <div className="container mx-auto px-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="default" onClick={() => navigate("/create-idea")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Post a startup role
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/publish-job")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Post a job
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/publish-training")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Post a training
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/publish-consulting")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Post a consulting service
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Capacity banner for tenders */}
          {view === "feed" && categoryFilter === "tender" && !userCapacity.hasTrackRecord && (
            <section className="pb-4">
              <div className="container mx-auto px-4">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <p className="font-medium text-foreground mb-1">Build your track record to unlock tenders</p>
                  <p className="text-muted-foreground">
                    Tenders are filtered by capacity. Add key projects, experience, or skills to your{" "}
                    <a href="/resume" className="text-primary hover:underline">profile</a> to qualify.
                  </p>
                </div>
              </div>
            </section>
          )}
          {view === "feed" && categoryFilter === "tender" && userCapacity.hasTrackRecord && hiddenTenderCount > 0 && (
            <section className="pb-4">
              <div className="container mx-auto px-4">
                <p className="text-xs text-muted-foreground">
                  {hiddenTenderCount} tender{hiddenTenderCount > 1 ? "s" : ""} hidden — outside your current capacity.
                </p>
              </div>
            </section>
          )}

          {/* Feed */}
          <section className="pb-16">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">
                    {view === "saved"
                      ? "You haven't saved any opportunities yet. Tap the bookmark icon on any card."
                      : view === "applied"
                      ? "No applications yet. Apply from any opportunity detail page."
                      : "No opportunities match your current filters."}
                  </p>
                  <button
                    onClick={() => setParams({ q: null, sector: null, view: null })}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      matchScore={opp.match_score}
                      recommendation={opp.recommendation}
                      ctaOverride={
                        isVentureCreator && opp.category === "startup"
                          ? { label: "Compare to my venture" }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Opportunities;

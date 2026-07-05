// Sprint 5A — Opportunities surface rebuilt as the primary entry point to the
// Opportunity Graph. Five top-level tabs:
//   discover · recommended · mine · applications · created
//
// The 4-question card (OpportunityCardV2) is mounted in every tab.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, ArrowRight, Sparkles, Briefcase, Inbox, FilePlus2, Users, Handshake, Lightbulb, GraduationCap, ChevronRight, Trash2, Eye, Layers, Film, Shield, TrendingUp, CheckCircle } from "lucide-react";
import { OpportunityCardV2 } from "@/components/opportunities/OpportunityCardV2";
import { IdeaDevelopDialog } from "@/components/idea/IdeaDevelopDialog";
import { IdeaValidationDialog } from "@/components/idea/IdeaValidationDialog";
import { IdeaGrowthDialog } from "@/components/idea/IdeaGrowthDialog";
import { IdeaEpisodesDialog } from "@/components/idea/IdeaEpisodesDialog";
import { TeamManagementDialog } from "@/components/idea/TeamManagementDialog";
import { FiveElementsDialog } from "@/components/idea/FiveElementsDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { Opportunity } from "@/components/opportunities/OpportunityCard";
import { SEEDED_OPPORTUNITIES } from "@/data/seededOpportunities";
import { useExpertise } from "@/hooks/useExpertise";
import {
  useOpportunityScoreMap,
  type OpportunityRecommendation,
} from "@/hooks/useOpportunityRecommendations";
import { USE_OPPORTUNITY_GRAPH } from "@/lib/featureFlags";
import { useOpportunityPersona, type OpportunityCategory } from "@/hooks/useOpportunityPersona";

const sb = supabase as any;

type Tab = "discover" | "recommended" | "mine" | "applications" | "created" | "my-projects" | "collabs";

const TABS: { key: Tab; label: string; icon: React.ReactNode; hint: string; dividerBefore?: boolean }[] = [
  { key: "discover",     label: "Discover",        icon: <Sparkles className="w-4 h-4" />,    hint: "Every open opportunity in the graph." },
  { key: "recommended",  label: "Recommended",     icon: <Sparkles className="w-4 h-4" />,    hint: "Ranked for you by skill, trust, and intent." },
  { key: "mine",         label: "My opportunities", icon: <Users className="w-4 h-4" />,      hint: "Relationships you're already in.", dividerBefore: true },
  { key: "applications", label: "My applications", icon: <Inbox className="w-4 h-4" />,       hint: "Pending and historical applications." },
  { key: "created",      label: "Created by me",   icon: <FilePlus2 className="w-4 h-4" />,    hint: "Opportunities you posted." },
  { key: "my-projects",  label: "My Projects",     icon: <Lightbulb className="w-4 h-4" />,   hint: "Startup ventures you created.", dividerBefore: true },
  { key: "collabs",      label: "Collabs",         icon: <Users className="w-4 h-4" />,       hint: "Ventures you're contributing to as a co-builder." },
];

const KINDS: { key: OpportunityCategory; label: string }[] = [
  { key: "job", label: "Jobs" },
  { key: "startup", label: "Startups" },
  { key: "training", label: "Training" },
  { key: "consulting", label: "Consulting" },
  { key: "tender", label: "Tenders" },
];

function computeMatchScore(userSkillNames: string[], oppSkills: string[]): number {
  if (oppSkills.length === 0 || userSkillNames.length === 0) return 0;
  const userSet = new Set(userSkillNames.map((s) => s.toLowerCase()));
  const matches = oppSkills.filter((s) => userSet.has(s.toLowerCase()));
  return Math.round((matches.length / oppSkills.length) * 100);
}

const Opportunities = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading } = useOnboarding();
  const persona = useOpportunityPersona();

  // Legacy `?tab=job` (kind) is now `?kind=job`. Backward-compat shim below.
  const tab = (searchParams.get("v") as Tab) || "discover";
  const kindFilter = (searchParams.get("kind") as OpportunityCategory | "all") || "all";
  const searchQuery = searchParams.get("q") || "";

  // Back-compat: prior code linked to /opportunities?tab=startup; preserve.
  useEffect(() => {
    const legacyTab = searchParams.get("tab");
    if (legacyTab && !searchParams.get("kind")) {
      const next = new URLSearchParams(searchParams);
      next.set("kind", legacyTab);
      next.delete("tab");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  // Data ------------------------------------------------------------------
  const [rawStartups, setRawStartups] = useState<any[]>([]);
  const [rawTrainings, setRawTrainings] = useState<any[]>([]);
  const [rawTenders, setRawTenders] = useState<any[]>([]);
  const [rawJobs, setRawJobs] = useState<any[]>([]);
  const [rawConsulting, setRawConsulting] = useState<any[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());
  const [mineIds, setMineIds] = useState<Set<string>>(new Set());
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [collabProjects, setCollabProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Project action dialog state
  const [selectedIdea, setSelectedIdea] = useState<{ id: string; title: string; currentEpisode: string } | null>(null);
  const [developDialogOpen, setDevelopDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [growthDialogOpen, setGrowthDialogOpen] = useState(false);
  const [episodesDialogOpen, setEpisodesDialogOpen] = useState(false);
  const [teamDialogIdea, setTeamDialogIdea] = useState<{ id: string; title: string } | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [fiveElementsDialogOpen, setFiveElementsDialogOpen] = useState(false);
  const [fiveElementsIdea, setFiveElementsIdea] = useState<{ id: string; title: string; description: string } | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"archive" | "permanent" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { expertise } = useExpertise(user?.id);
  const userSkillNames = expertise?.tags ?? [];
  const { scoreById } = useOpportunityScoreMap(user?.id);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const [startupsRes, trainingsRes, tendersRes, jobsRes, consultingRes, interactionsRes, teamRes, appsRes] = await Promise.all([
        supabase.from("startup_ideas").select("*").eq("status", "active").eq("review_status", "approved").eq("is_looking_for_cobuilders", true).order("created_at", { ascending: false }),
        sb.from("training_opportunities").select("*").eq("review_status", "approved").order("created_at", { ascending: false }),
        sb.from("tenders").select("*").eq("status", "published").order("created_at", { ascending: false }),
        sb.from("job_opportunities").select("*").eq("status", "published").order("created_at", { ascending: false }),
        sb.from("consulting_services").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        sb.from("opportunity_interactions").select("opportunity_id").eq("user_id", user.id),
        sb.from("startup_team_members").select("startup_idea_id").eq("user_id", user.id),
        sb.from("startup_applications").select("startup_idea_id, status").eq("applicant_id", user.id),
      ]);

      const startupData = startupsRes.data || [];
      const trainingData = (trainingsRes.data as any[]) || [];
      const tenderData = (tendersRes.data as any[]) || [];
      const jobData = (jobsRes.data as any[]) || [];
      const consultingData = (consultingRes?.data as any[]) || [];

      // Author profile resolution.
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
      let orgMap = new Map<string, { name: string }>();
      if (orgIds.length > 0) {
        const { data: orgs } = await sb.from("organizations").select("id, name").in("id", [...new Set(orgIds)]);
        orgMap = new Map((orgs || []).map((o: any) => [o.id, { name: o.name }]));
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
      setRawTenders(tenderData.map((t: any) => ({ ...t, _author: orgLabel(t.organization_id, profileMap.get(t.user_id) || "Unknown") })));
      setRawJobs(jobData.map((j: any) => ({ ...j, _author: orgLabel(j.organization_id, profileMap.get(j.user_id) || "Unknown") })));
      setRawConsulting(consultingData.map((c: any) => ({
        ...c,
        _author: profileMap.get(c.user_id) || "Unknown",
        _skill_name: c.skill_tag_id ? skillTagMap.get(c.skill_tag_id) || null : null,
      })));

      // Personal projections.
      setAppliedIds(new Set(
        [
          ...((interactionsRes?.data as any[]) || []).map((r: any) => r.opportunity_id),
          ...((appsRes?.data as any[]) || []).map((r: any) => r.startup_idea_id),
        ].filter(Boolean)
      ));
      setMineIds(new Set(
        [
          ...((teamRes?.data as any[]) || []).map((r: any) => r.startup_idea_id),
          ...((appsRes?.data as any[]) || []).filter((r: any) => r.status === "accepted").map((r: any) => r.startup_idea_id),
        ].filter(Boolean)
      ));
      const created = new Set<string>();
      for (const s of startupData) if (s.creator_id === user.id) created.add(s.id);
      for (const t of trainingData) if (t.user_id === user.id) created.add(t.id);
      for (const t of tenderData) if (t.user_id === user.id) created.add(t.id);
      for (const j of jobData) if (j.user_id === user.id) created.add(j.id);
      for (const c of consultingData) if (c.user_id === user.id) created.add(c.id);
      setCreatedIds(created);

      setLoading(false);
    })();
  }, [user, authLoading, expertise?.tags.length]);

  // My Projects / Collabs (mirrors /entrepreneurship)
  const refreshMyAndCollabs = useCallback(async () => {
    if (!user) {
      setMyProjects([]);
      setCollabProjects([]);
      return;
    }
    const [myRes, teamRes] = await Promise.all([
      supabase.from("startup_ideas").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
      sb.from("startup_team_members").select("startup_id, role_type").eq("member_user_id", user.id),
    ]);
    setMyProjects(myRes.data || []);
    const ids = ((teamRes.data as any[]) || []).map((m) => m.startup_id).filter(Boolean);
    if (ids.length > 0) {
      const { data } = await supabase.from("startup_ideas").select("*").in("id", ids).order("created_at", { ascending: false });
      setCollabProjects(data || []);
    } else {
      setCollabProjects([]);
    }
  }, [user]);

  useEffect(() => { refreshMyAndCollabs(); }, [refreshMyAndCollabs]);

  const handleDeleteIdea = async () => {
    if (!ideaToDelete || !user || !deleteType) return;
    setIsDeleting(true);
    try {
      if (deleteType === "archive") {
        const { error } = await supabase.from("startup_ideas").update({ status: "archived" }).eq("id", ideaToDelete.id).eq("creator_id", user.id);
        if (error) throw error;
        toast({ title: "Idea archived", description: `"${ideaToDelete.title}" was archived.` });
      } else {
        const { error } = await supabase.from("startup_ideas").delete().eq("id", ideaToDelete.id).eq("creator_id", user.id);
        if (error) throw error;
        toast({ title: "Idea deleted", description: `"${ideaToDelete.title}" was permanently deleted.` });
      }
      setMyProjects((prev) => prev.filter((p) => p.id !== ideaToDelete.id));
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message ?? "Try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setIdeaToDelete(null);
      setDeleteType(null);
    }
  };

  const allOpportunities = useMemo<
    (Opportunity & { match_score: number; recommendation?: OpportunityRecommendation })[]
  >(() => {
    const toStartup: Opportunity[] = rawStartups.map((s, i) => ({
      id: s.id, title: s.title, category: "startup", required_skills: (s.roles_needed || []).slice(0, 5),
      income_range: "Equity-based", effort_level: "Part-time", description: s.description,
      primary_action: { type: "apply", label: "Check venture", route: `/opportunities/startup/${s.id}` },
      source_id: s.id, created_at: s.created_at, author_name: s._author, author_user_id: s.creator_id ?? null, sector: s.sector, rank: 50 + i,
    }));
    const toTraining: Opportunity[] = rawTrainings.map((t, i) => ({
      id: t.id, title: t.title, category: "training", required_skills: [t.sector, t.target_audience, t.format, t.duration].filter(Boolean).slice(0, 5),
      income_range: "Free", effort_level: t.duration || "Self-paced", description: t.description,
      primary_action: { type: "start", label: "View training", route: `/opportunities/training/${t.id}` },
      source_id: t.id, created_at: t.created_at, author_name: t._author, author_user_id: t.user_id ?? null, sector: t.sector, rank: 200 + i,
    }));
    const toTender: Opportunity[] = rawTenders.map((t, i) => ({
      id: t.id, title: t.title, category: "tender", required_skills: [t.sector, t.location, t.budget_range].filter(Boolean).slice(0, 5),
      income_range: t.budget_range || "Contract", effort_level: t.deadline ? `Due ${t.deadline}` : "Open", description: t.description,
      primary_action: { type: "apply", label: "View tender", route: `/opportunities/tender/${t.id}` },
      source_id: t.id, created_at: t.created_at, author_name: t._author, author_user_id: t.user_id ?? null, sector: t.sector, rank: 100 + i,
    }));
    const toJob: Opportunity[] = rawJobs.map((j, i) => ({
      id: j.id, title: j.title, category: "job", required_skills: [j.sector, j.employment_type, j.location].filter(Boolean).slice(0, 5),
      income_range: j.salary_range || "Not specified", effort_level: j.employment_type || "Full-time", description: j.description,
      primary_action: { type: "apply", label: "View job", route: `/opportunities/job/${j.id}` },
      source_id: j.id, created_at: j.created_at, author_name: j._author, author_user_id: j.user_id ?? null, sector: j.sector, rank: 75 + i,
    }));
    const toConsulting: Opportunity[] = rawConsulting.map((c, i) => ({
      id: c.id, title: c.service_title, category: "consulting", required_skills: [c._skill_name, c.delivery_type, c.availability].filter(Boolean).slice(0, 5),
      income_range: c.price > 0 ? `${c.price} ${c.currency}` : "Free",
      effort_level: c.delivery_type === "remote" ? "Remote" : c.delivery_type === "on-site" ? "On-site" : "Remote / On-site",
      description: c.description || `Consulting service offered by ${c._author || "a co-builder"}.`,
      primary_action: { type: "apply", label: "View service", route: `/opportunities/consulting/${c.id}` },
      source_id: c.id, created_at: c.created_at, author_name: c._author, author_user_id: c.user_id ?? null, sector: c._skill_name || null, rank: 60 + i,
    }));
    const all = [...SEEDED_OPPORTUNITIES, ...toStartup, ...toTraining, ...toTender, ...toJob, ...toConsulting];
    return all.map((opp) => {
      const rec = USE_OPPORTUNITY_GRAPH ? scoreById.get(opp.source_id ?? opp.id) : undefined;
      const legacy = computeMatchScore(userSkillNames, opp.required_skills);
      const projected = rec ? Math.min(100, Math.round(rec.matchScore)) : null;
      return { ...opp, recommendation: rec, match_score: projected ?? legacy };
    });
  }, [rawStartups, rawTrainings, rawTenders, rawJobs, rawConsulting, userSkillNames, scoreById]);

  // Tab projections -------------------------------------------------------
  const filtered = useMemo(() => {
    let base = allOpportunities;
    if (tab === "recommended") {
      base = base.filter((o) => o.match_score > 0);
    } else if (tab === "mine") {
      base = base.filter((o) => mineIds.has(o.id));
    } else if (tab === "applications") {
      base = base.filter((o) => appliedIds.has(o.id));
    } else if (tab === "created") {
      base = base.filter((o) => createdIds.has(o.id));
    }
    if (kindFilter !== "all" && (tab === "discover" || tab === "recommended" || tab === "created")) {
      base = base.filter((o) => o.category === kindFilter);
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
    const sorted = [...base];
    if (tab === "recommended") {
      sorted.sort((a, b) => b.match_score - a.match_score || a.rank - b.rank);
    } else if (tab === "mine" || tab === "applications" || tab === "created") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => b.match_score - a.match_score || a.rank - b.rank);
    }
    return sorted;
  }, [allOpportunities, tab, kindFilter, searchQuery, mineIds, appliedIds, createdIds]);

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

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="pt-20">
          <section className="py-8">
            <div className="container mx-auto px-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">Opportunities</h1>
                  <p className="text-muted-foreground max-w-2xl text-sm">{activeTab.hint}</p>
                </div>
                <Badge variant="outline" className="text-xs">Viewing as {persona.label}</Badge>
              </div>
            </div>
          </section>

          {/* Primary tabs */}
          <section className="pb-3">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
                {TABS.map((t) => (
                  <div key={t.key} className="flex items-center">
                    {t.dividerBefore && (
                      <span aria-hidden className="mx-2 h-5 w-px bg-border/70 shrink-0" />
                    )}
                    <button
                      onClick={() => setParam("v", t.key === "discover" ? null : t.key)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === t.key
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Kind chips + search (Discover / Recommended / Created) */}
          {(tab === "discover" || tab === "recommended" || tab === "created") && (
            <section className="pb-3">
              <div className="container mx-auto px-4 space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setParam("kind", null)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      kindFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    All kinds
                  </button>
                  {KINDS.map((k) => (
                    <button
                      key={k.key}
                      onClick={() => setParam("kind", kindFilter === k.key ? null : k.key)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        kindFilter === k.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title, sector, skill, author..."
                    value={searchQuery}
                    onChange={(e) => setParam("q", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Created by me CTAs */}
          {tab === "created" && !loading && (
            <section className="pb-4">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    to="/publish-consulting"
                    className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-b4-teal/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center shrink-0">
                      <Handshake className="w-5 h-5 text-b4-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Consulting</p>
                      <p className="text-xs text-muted-foreground">Create a service</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-b4-teal transition-colors" />
                  </Link>
                  <Link
                    to="/create-idea"
                    className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-b4-teal/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-5 h-5 text-b4-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Launching</p>
                      <p className="text-xs text-muted-foreground">Start a venture</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-b4-teal transition-colors" />
                  </Link>
                  <Link
                    to="/publish-training"
                    className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-b4-teal/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-b4-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Training</p>
                      <p className="text-xs text-muted-foreground">Submit a training</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-b4-teal transition-colors" />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Feed */}
          <section className="pb-16 pt-2">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : tab === "my-projects" || tab === "collabs" ? (
                (() => {
                  const projects = tab === "my-projects" ? myProjects : collabProjects;
                  const isOwner = tab === "my-projects";
                  if (projects.length === 0) {
                    return <EmptyState tab={tab} onPost={() => navigate("/entrepreneurship?new=1")} onDiscover={() => setParam("v", null)} />;
                  }
                  return (
                    <div className="space-y-3">
                      {projects.map((project) => {
                        const episodeLabel = project.current_episode === "validation" ? "MVP" : project.current_episode === "growth" ? "Growth" : "Idea";
                        return (
                          <div key={project.id} className="border border-border rounded-2xl p-4 sm:p-6 bg-card hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-display text-base sm:text-lg font-bold text-foreground break-words">{project.title}</h3>
                                  <Badge variant="outline" className="text-[10px]">{episodeLabel}</Badge>
                                  {isOwner && project.review_status && (
                                    <Badge variant="secondary" className="text-[10px] capitalize">{project.review_status}</Badge>
                                  )}
                                </div>
                                {project.sector && (
                                  <p className="text-xs sm:text-sm text-muted-foreground italic mb-1">{project.sector}</p>
                                )}
                                {project.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto sm:max-w-[65%] justify-start sm:justify-end">
                                {isOwner && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => { setIdeaToDelete({ id: project.id, title: project.title }); setDeleteDialogOpen(true); }}
                                    title="Delete idea"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/opportunities/startup/${project.id}`}>
                                    <Eye className="w-3 h-3 mr-1" /> View
                                  </Link>
                                </Button>
                                {(isOwner ? project.review_status === "approved" : true) && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => { setTeamDialogIdea({ id: project.id, title: project.title }); setTeamDialogOpen(true); }}>
                                      <Users className="w-4 h-4 mr-1" /> Team
                                    </Button>
                                    {isOwner && !project.development_completed_at && (
                                      <Button variant="outline" size="sm" onClick={() => { setFiveElementsIdea({ id: project.id, title: project.title, description: project.description }); setFiveElementsDialogOpen(true); }}>
                                        <Layers className="w-4 h-4 mr-1" /> 5 Elements
                                      </Button>
                                    )}
                                    {project.development_completed_at && (
                                      <Button variant="outline" size="sm" onClick={() => { setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode }); setEpisodesDialogOpen(true); }}>
                                        <Film className="w-4 h-4 mr-1" /> Episodes
                                      </Button>
                                    )}
                                    {isOwner && project.current_episode === "development" && (
                                      <Button size="sm" onClick={() => { setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode }); setDevelopDialogOpen(true); }}>
                                        Develop
                                      </Button>
                                    )}
                                    {isOwner && project.current_episode === "validation" && (
                                      <Button size="sm" onClick={() => { setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode }); setValidationDialogOpen(true); }}>
                                        <Shield className="w-4 h-4 mr-1" /> Validate
                                      </Button>
                                    )}
                                    {isOwner && project.current_episode === "growth" && (
                                      <Button size="sm" onClick={() => { setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode }); setGrowthDialogOpen(true); }}>
                                        <TrendingUp className="w-4 h-4 mr-1" /> Grow
                                      </Button>
                                    )}
                                    {project.current_episode === "completed" && (
                                      <Badge className="bg-b4-teal text-white">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Journey Complete
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : filtered.length === 0 ? (
                <EmptyState tab={tab} onPost={() => navigate("/publish-job")} onDiscover={() => setParam("v", null)} />
              ) : (
                <div className="space-y-3">
                  {filtered.map((opp) => (
                    <OpportunityCardV2
                      key={opp.id}
                      opportunity={opp}
                      matchScore={opp.match_score}
                      recommendation={opp.recommendation}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />

      {/* Project action dialogs */}
      {selectedIdea && (
        <>
          <IdeaDevelopDialog
            open={developDialogOpen}
            onOpenChange={setDevelopDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            onEpisodeComplete={refreshMyAndCollabs}
          />
          <IdeaValidationDialog
            open={validationDialogOpen}
            onOpenChange={setValidationDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            onEpisodeComplete={refreshMyAndCollabs}
          />
          <IdeaGrowthDialog
            open={growthDialogOpen}
            onOpenChange={setGrowthDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            onEpisodeComplete={refreshMyAndCollabs}
          />
          <IdeaEpisodesDialog
            open={episodesDialogOpen}
            onOpenChange={setEpisodesDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            currentEpisode={selectedIdea.currentEpisode}
          />
        </>
      )}
      {teamDialogIdea && (
        <TeamManagementDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          ideaId={teamDialogIdea.id}
          ideaTitle={teamDialogIdea.title}
        />
      )}
      {fiveElementsIdea && (
        <FiveElementsDialog
          open={fiveElementsDialogOpen}
          onOpenChange={setFiveElementsDialogOpen}
          ideaId={fiveElementsIdea.id}
          ideaTitle={fiveElementsIdea.title}
          ideaDescription={fiveElementsIdea.description}
          onCompleted={refreshMyAndCollabs}
        />
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{ideaToDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose "Archive" to hide it but keep the data, or "Permanent" to delete it forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setDeleteType("archive"); handleDeleteIdea(); }}
              disabled={isDeleting}
            >
              Archive
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setDeleteType("permanent"); handleDeleteIdea(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


function EmptyState({ tab, onPost, onDiscover }: { tab: Tab; onPost: () => void; onDiscover: () => void }) {
  const copy: Record<Tab, { title: string; body: string; cta?: { label: string; onClick: () => void } }> = {
    discover:     { title: "No opportunities match your filters.", body: "Try removing kind filters or clearing your search." },
    recommended:  { title: "We haven't matched any opportunities yet.", body: "Add skills to your profile so the graph can rank for you.", cta: { label: "Browse all", onClick: onDiscover } },
    mine:         { title: "You're not in any opportunities yet.", body: "Once an application is accepted, the resulting relationship shows up here.", cta: { label: "Discover opportunities", onClick: onDiscover } },
    applications: { title: "No applications yet.", body: "Apply from any opportunity detail page.", cta: { label: "Discover opportunities", onClick: onDiscover } },
    created:      { title: "You haven't posted any opportunities.", body: "Post a job, training, or open a startup role.", cta: { label: "Post one", onClick: onPost } },
    "my-projects": { title: "You haven't created any ventures yet.", body: "Start a project to see it here.", cta: { label: "Start a venture", onClick: onPost } },
    collabs:      { title: "You're not collaborating on any ventures yet.", body: "Apply to a co-builder role to join a team.", cta: { label: "Discover ventures", onClick: onDiscover } },
  };
  const c = copy[tab];
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
      <p className="font-medium text-foreground mb-1">{c.title}</p>
      <p className="text-sm text-muted-foreground mb-4">{c.body}</p>
      {c.cta && (
        <Button variant="outline" size="sm" onClick={c.cta.onClick}>
          {c.cta.label}
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

export default Opportunities;

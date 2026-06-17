import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2 } from "lucide-react";
import { OpportunityCard, type Opportunity } from "@/components/opportunities/OpportunityCard";
import { SEEDED_OPPORTUNITIES } from "@/data/seededOpportunities";
import { useExpertise } from "@/hooks/useExpertise";
import {
  useOpportunityScoreMap,
  type OpportunityRecommendation,
} from "@/hooks/useOpportunityRecommendations";
import { USE_OPPORTUNITY_GRAPH } from "@/lib/featureFlags";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "job", label: "Jobs" },
  { key: "consulting", label: "Consulting" },
  { key: "startup", label: "Startups" },
  { key: "training", label: "Training" },
  { key: "tender", label: "Tenders" },
] as const;

function computeMatchScore(userSkillNames: string[], oppSkills: string[]): number {
  if (oppSkills.length === 0 || userSkillNames.length === 0) return 0;
  const userSet = new Set(userSkillNames.map((s) => s.toLowerCase()));
  const matches = oppSkills.filter((s) => userSet.has(s.toLowerCase()));
  return Math.round((matches.length / oppSkills.length) * 100);
}

const Opportunities = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const [rawStartups, setRawStartups] = useState<any[]>([]);
  const [rawTrainings, setRawTrainings] = useState<any[]>([]);
  const [rawTenders, setRawTenders] = useState<any[]>([]);
  const [rawJobs, setRawJobs] = useState<any[]>([]);
  const [rawConsulting, setRawConsulting] = useState<any[]>([]);
  // Expertise tags (skill/certification labels) come exclusively from the
  // expertise_graph projection. Match score is derived from these tags.
  const { expertise } = useExpertise(user?.id);
  const userSkillNames = expertise?.tags ?? [];
  // Phase 3: per-user opportunity_graph projection. Drives ranking and the
  // "Why?" explanation on each card. Keyed by source row id so seeded
  // opportunities (not in the projection) fall back to legacy tag overlap.
  const { scoreById } = useOpportunityScoreMap(user?.id);
  const [userCapacity, setUserCapacity] = useState<{ hasTrackRecord: boolean; sectors: string[]; experience: number }>({
    hasTrackRecord: false,
    sectors: [],
    experience: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get("tab") || "all");


  const isApproved =
    onboardingState?.journey_status === "approved" || onboardingState?.journey_status === "entrepreneur_approved";

  useEffect(() => {
    if (!user || !isApproved) {
      if (!onboardingLoading) setLoading(false);
      return;
    }

    const fetchAll = async () => {
    const [startupsRes, trainingsRes, tendersRes, jobsRes, myProfileRes] = await Promise.all([
        supabase
          .from("startup_ideas")
          .select("*")
          .eq("status", "active")
          .eq("review_status", "approved")
          .eq("is_looking_for_cobuilders", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("training_opportunities" as any)
          .select("*")
          .eq("review_status", "approved")
          .order("created_at", { ascending: false }),
        supabase
          .from("tenders" as any)
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false }),
        supabase
          .from("job_opportunities" as any)
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("preferred_sector, primary_skills, years_of_experience, key_projects, summary_statement, professional_title")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const startupData = startupsRes.data || [];
      const trainingData = (trainingsRes.data as any[]) || [];
      const tenderData = (tendersRes.data as any[]) || [];
      const jobData = (jobsRes.data as any[]) || [];

      // Capacity derives from profile narrative fields + expertise tag count
      // (which already encodes both skills and certifications via the graph).
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

      // Fetch profiles for all
      const allUserIds = [
        ...startupData.map((s: any) => s.creator_id),
        ...trainingData.map((t: any) => t.user_id),
        ...tenderData.map((t: any) => t.user_id),
        ...jobData.map((j: any) => j.user_id),
      ].filter(Boolean);

      let profileMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", [...new Set(allUserIds)]);
        profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
      }

      setRawStartups(startupData.map((s: any) => ({ ...s, _author: profileMap.get(s.creator_id) || "Unknown" })));
      setRawTrainings(trainingData.map((t: any) => ({ ...t, _author: profileMap.get(t.user_id) || "Unknown" })));
      setRawTenders(tenderData.map((t: any) => ({ ...t, _author: profileMap.get(t.user_id) || "Unknown" })));
      setRawJobs(jobData.map((j: any) => ({ ...j, _author: profileMap.get(j.user_id) || "Unknown" })));

      setLoading(false);
    };

    fetchAll();
  }, [user, isApproved, onboardingLoading, expertise?.tags.length]);


  // Normalize all sources into Opportunity[]
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
      primary_action: { type: "apply" as const, label: "View", route: `/opportunities/${s.id}` },
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
      effort_level: "Self-paced",
      description: t.description,
      primary_action: { type: "start" as const, label: "Details", route: "#" },
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
      primary_action: { type: "apply" as const, label: "Apply", route: "#" },
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
      primary_action: { type: "apply" as const, label: "Apply", route: "#" },
      source_id: j.id,
      created_at: j.created_at,
      author_name: j._author || "Unknown",
      author_user_id: j.user_id ?? null,
      sector: j.sector,
      rank: 75 + i,
    }));

    const all = [...SEEDED_OPPORTUNITIES, ...startupOpps, ...trainingOpps, ...tenderOpps, ...jobOpps];

    // Phase 3: prefer opportunity_graph projection. Falls back to legacy tag
    // overlap for rows not yet in the projection (e.g. SEEDED_OPPORTUNITIES).
    const scored = all.map((opp) => {
      const rec = USE_OPPORTUNITY_GRAPH ? scoreById.get(opp.source_id ?? opp.id) : undefined;
      const legacy = computeMatchScore(userSkillNames, opp.required_skills);
      // Normalize projection match_score (0..100 cap) for the badge.
      const projected = rec ? Math.min(100, Math.round(rec.matchScore)) : null;
      return {
        ...opp,
        recommendation: rec,
        match_score: projected ?? legacy,
      };
    });

    if (USE_OPPORTUNITY_GRAPH || userSkillNames.length > 0) {
      scored.sort((a, b) => b.match_score - a.match_score || a.rank - b.rank);
    } else {
      scored.sort((a, b) => a.rank - b.rank);
    }

    return scored;
  }, [rawStartups, rawTrainings, rawTenders, rawJobs, userSkillNames, scoreById]);

  // Capacity-based tender filter helper
  const passesTenderCapacity = (opp: Opportunity & { match_score: number }) => {
    if (opp.category !== "tender") return true;
    // Must have a track record to see any tender
    if (!userCapacity.hasTrackRecord) return false;
    // Sector / skill alignment: tender sector matches one of user's sectors OR user is senior (>=3y)
    const tenderSector = (opp.sector || "").toLowerCase().trim();
    if (!tenderSector) return userCapacity.experience >= 1;
    const sectorMatch = userCapacity.sectors.some(
      (s) => s && (tenderSector.includes(s) || s.includes(tenderSector))
    );
    return sectorMatch || userCapacity.experience >= 3 || opp.match_score > 0;
  };

  // Count hidden tenders for the banner
  const hiddenTenderCount = useMemo(
    () => allOpportunities.filter((o) => o.category === "tender" && !passesTenderCapacity(o)).length,
    [allOpportunities, userCapacity]
  );

  // Filter
  const filtered = useMemo(() => {
    return allOpportunities.filter((opp) => {
      if (!passesTenderCapacity(opp)) return false;
      if (categoryFilter !== "all" && opp.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return opp.title.toLowerCase().includes(q) || opp.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allOpportunities, categoryFilter, searchQuery, userCapacity]);


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

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-10">
            <div className="container mx-auto px-4">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">Opportunity Marketplace</h1>
              <p className="text-muted-foreground max-w-2xl">
                Discover jobs, consulting missions, and startup roles tailored to you
              </p>
            </div>
          </section>

          {/* Category pills + Search */}
          <section className="pb-6">
            <div className="container mx-auto px-4 space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
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
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </section>

          {/* Capacity banner for tenders */}
          {categoryFilter === "tender" && !userCapacity.hasTrackRecord && (
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
          {categoryFilter === "tender" && userCapacity.hasTrackRecord && hiddenTenderCount > 0 && (
            <section className="pb-4">
              <div className="container mx-auto px-4">
                <p className="text-xs text-muted-foreground">
                  {hiddenTenderCount} tender{hiddenTenderCount > 1 ? "s" : ""} hidden — outside your current capacity (sector / experience mismatch).
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
                  <p className="text-muted-foreground mb-4">No opportunities match your current filters.</p>
                  <button
                    onClick={() => { setCategoryFilter("all"); setSearchQuery(""); }}
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

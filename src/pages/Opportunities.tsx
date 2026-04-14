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
  const [userSkillNames, setUserSkillNames] = useState<string[]>([]);
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
      const [startupsRes, trainingsRes, userSkillsRes] = await Promise.all([
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
          .from("user_skills")
          .select("skill_tag_id, skill_tags(name)")
          .eq("user_id", user.id),
      ]);

      const startupData = startupsRes.data || [];
      const trainingData = (trainingsRes.data as any[]) || [];

      // Extract user skill names
      const skillNames = (userSkillsRes.data || []).map((r: any) => r.skill_tags?.name).filter(Boolean);
      setUserSkillNames(skillNames);

      // Fetch profiles for both
      const allUserIds = [
        ...startupData.map((s: any) => s.creator_id),
        ...trainingData.map((t: any) => t.user_id),
      ].filter(Boolean);

      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", [...new Set(allUserIds)]);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

        setRawStartups(startupData.map((s: any) => ({ ...s, _author: profileMap.get(s.creator_id) || "Unknown" })));
        setRawTrainings(trainingData.map((t: any) => ({ ...t, _author: profileMap.get(t.user_id) || "Unknown" })));
      } else {
        setRawStartups(startupData);
        setRawTrainings(trainingData);
      }

      setLoading(false);
    };

    fetchAll();
  }, [user, isApproved, onboardingLoading]);

  // Normalize all sources into Opportunity[]
  const allOpportunities = useMemo<(Opportunity & { match_score: number })[]>(() => {
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
      sector: s.sector,
      rank: 10 + i,
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
      sector: t.sector,
      rank: 100 + i,
    }));

    const all = [...SEEDED_OPPORTUNITIES, ...startupOpps, ...trainingOpps];

    // Compute match scores
    const scored = all.map((opp) => ({
      ...opp,
      match_score: computeMatchScore(userSkillNames, opp.required_skills),
    }));

    // Sort: match_score descending first, then rank ascending as tiebreaker
    if (userSkillNames.length > 0) {
      scored.sort((a, b) => b.match_score - a.match_score || a.rank - b.rank);
    } else {
      scored.sort((a, b) => a.rank - b.rank);
    }

    return scored;
  }, [rawStartups, rawTrainings, userSkillNames]);

  // Filter
  const filtered = useMemo(() => {
    return allOpportunities.filter((opp) => {
      if (categoryFilter !== "all" && opp.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return opp.title.toLowerCase().includes(q) || opp.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allOpportunities, categoryFilter, searchQuery]);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Opportunities</h1>
                <p className="text-muted-foreground mb-8">Please log in to access opportunities.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Opportunities</h1>
                <p className="text-muted-foreground mb-8">
                  This page is only available to approved co-builders and entrepreneurs.
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete your co-builder journey and get approved to access this feature.
                </p>
              </div>
            </section>
          </main>
        </PageTransition>
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

          {/* Feed */}
          <section className="pb-16">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No opportunities found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((opp) => (
                    <OpportunityCard key={opp.id} opportunity={opp} matchScore={opp.match_score} />
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

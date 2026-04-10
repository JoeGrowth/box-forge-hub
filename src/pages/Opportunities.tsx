import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2 } from "lucide-react";
import { OpportunityCard, type Opportunity } from "@/components/opportunities/OpportunityCard";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "startup", label: "Startups" },
  { key: "training", label: "Training" },
  { key: "consulting", label: "Consulting" },
  { key: "tender", label: "Tenders" },
  { key: "job", label: "Jobs" },
] as const;

const B4_PROGRAMS: Opportunity[] = [
  {
    id: "b4-cobuilder",
    title: "Learn to be a Co-Builder",
    category: "training",
    required_skills: ["Practice", "Training", "Consulting", "Teamwork"],
    income_range: "Free",
    effort_level: "Self-paced",
    description: "Practice, Training, Consulting based on the B4 model. Learn the fundamentals, apply through case studies, and become a certified Co-Builder.",
    primary_action: { type: "start", label: "Start", route: "/journey" },
    source_id: "b4-cobuilder",
    created_at: "2025-01-01",
    author_name: "B4",
    sector: "Professional Development",
    rank: 0,
  },
  {
    id: "b4-initiator",
    title: "Learn to be an Initiator",
    category: "training",
    required_skills: ["Ideation", "Structuring", "Team Building", "Launch"],
    income_range: "Free",
    effort_level: "Self-paced",
    description: "Ideation, Structuring, Team Building, and Launch. Transform your idea into a structured startup with the right team.",
    primary_action: { type: "start", label: "Start", route: "/journey" },
    source_id: "b4-initiator",
    created_at: "2025-01-01",
    author_name: "B4",
    sector: "Entrepreneurship",
    rank: 1,
  },
  {
    id: "b4-finance",
    title: "Learn Finance",
    category: "training",
    required_skills: ["Financial Statements", "Budgeting", "Forecasting", "KPI Reporting"],
    income_range: "Free",
    effort_level: "Self-paced",
    description: "Master corporate finance fundamentals: financial statements, budgeting, forecasting, ROI analysis, and KPI reporting.",
    primary_action: { type: "start", label: "Start", route: "/journey" },
    source_id: "b4-finance",
    created_at: "2025-01-01",
    author_name: "B4",
    sector: "Finance",
    rank: 2,
  },
  {
    id: "b4-security",
    title: "Learn to Be Secure",
    category: "training",
    required_skills: ["Risk Awareness", "Security Practices", "Data Protection", "Compliance"],
    income_range: "Free",
    effort_level: "Self-paced",
    description: "Practical security decisions, risk awareness, security best practices, and behavioral habits for professionals.",
    primary_action: { type: "start", label: "Start", route: "/journey" },
    source_id: "b4-security",
    created_at: "2025-01-01",
    author_name: "B4",
    sector: "Cybersecurity",
    rank: 3,
  },
];

const Opportunities = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const [rawStartups, setRawStartups] = useState<any[]>([]);
  const [rawTrainings, setRawTrainings] = useState<any[]>([]);
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
      const [startupsRes, trainingsRes] = await Promise.all([
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
      ]);

      const startupData = startupsRes.data || [];
      const trainingData = (trainingsRes.data as any[]) || [];

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
  const allOpportunities = useMemo<Opportunity[]>(() => {
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

    return [...B4_PROGRAMS, ...startupOpps, ...trainingOpps].sort((a, b) => a.rank - b.rank);
  }, [rawStartups, rawTrainings]);

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
                    <OpportunityCard key={opp.id} opportunity={opp} />
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

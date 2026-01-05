import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Briefcase, MapPin, ArrowRight, Filter, Rocket, Loader2 } from "lucide-react";

interface StartupIdea {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  roles_needed: string[] | null;
  status: string;
  created_at: string;
  creator_profile?: {
    full_name: string | null;
  };
}

const Opportunities = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const [ideas, setIdeas] = useState<StartupIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Allow both "approved" and "entrepreneur_approved" users
    const isApproved =
      onboardingState?.journey_status === "approved" || onboardingState?.journey_status === "entrepreneur_approved";
    if (onboardingState && !isApproved) {
      navigate("/profile", { replace: true });
    }
  }, [onboardingState, navigate]);

  useEffect(() => {
    const fetchIdeas = async () => {
      const { data, error } = await supabase
        .from("startup_ideas")
        .select("*")
        .eq("status", "active")
        .eq("review_status", "approved")
        .eq("is_looking_for_cobuilders", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Fetch creator profiles
        const creatorIds = data.map((idea) => idea.creator_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);

        const ideasWithProfiles = data.map((idea) => ({
          ...idea,
          creator_profile: profiles?.find((p) => p.user_id === idea.creator_id),
        }));

        setIdeas(ideasWithProfiles);
      }
      setLoading(false);
    };

    if (user) {
      fetchIdeas();
    }
  }, [user]);

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = !sectorFilter || idea.sector?.toLowerCase().includes(sectorFilter.toLowerCase());
    return matchesSearch && matchesSector;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold"> Opportunities</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                Browse startup ideas looking for co-builders. Find opportunities that match your skills and natural
                role.
              </p>
            </div>
          </section>

          {/* Filters */}
          <section className="py-6 border-b border-border">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by sector..."
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="pl-10 w-48"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Opportunities List */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {filteredIdeas.length === 0 ? (
                <div className="text-center py-16">
                  <Rocket className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">No opportunities yet</h2>
                  <p className="text-muted-foreground mb-6">
                    Be the first to create a startup idea and find co-builders!
                  </p>
                  <Button variant="teal" onClick={() => navigate("/create-idea")}>
                    Create Your Startup Idea
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className="bg-card rounded-2xl border border-border p-6 hover:border-b4-teal/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-b4-teal/10 flex items-center justify-center">
                          <Rocket className="w-6 h-6 text-b4-teal" />
                        </div>
                        {idea.sector && (
                          <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {idea.sector}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-lg font-bold text-foreground mb-2">{idea.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{idea.description}</p>

                      {idea.roles_needed && idea.roles_needed.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-2">Looking for:</p>
                          <div className="flex flex-wrap gap-1">
                            {idea.roles_needed.slice(0, 3).map((role, i) => (
                              <span key={i} className="px-2 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-xs">
                                {role}
                              </span>
                            ))}
                            {idea.roles_needed.length > 3 && (
                              <span className="px-2 py-1 text-xs text-muted-foreground">
                                +{idea.roles_needed.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          By {idea.creator_profile?.full_name || "Unknown"}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/opportunities/${idea.id}`)}>
                          View Details
                          <ArrowRight className="ml-1 w-3 h-3" />
                        </Button>
                      </div>
                    </div>
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

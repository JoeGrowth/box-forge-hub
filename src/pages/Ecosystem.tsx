import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ApplyToJoinDialog } from "@/components/idea/ApplyToJoinDialog";

interface StartupIdea {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  roles_needed: string[] | null;
  current_episode: string;
  creator_id: string;
  is_looking_for_cobuilders: boolean | null;
  created_at: string;
  status: string | null;
}

const getEpisodeLabel = (episode: string) => {
  switch (episode) {
    case "development": return "Idea";
    case "validation": return "MVP";
    case "growth": return "Growth";
    default: return "Idea";
  }
};

const getEpisodeBadgeClasses = (episode: string) => {
  switch (episode) {
    case "development": return "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100";
    case "validation": return "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100";
    case "growth": return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    default: return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
};

const Ecosystem = () => {
  const { user } = useAuth();
  const [browseProjects, setBrowseProjects] = useState<StartupIdea[]>([]);
  const [myProjects, setMyProjects] = useState<StartupIdea[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [applyProject, setApplyProject] = useState<StartupIdea | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: all } = await supabase
          .from("startup_ideas")
          .select("*")
          .eq("review_status", "approved")
          .eq("is_looking_for_cobuilders", true);
        const list = (all || []) as StartupIdea[];
        const mine = list.filter((p) => p.creator_id === user.id);
        const others = list.filter((p) => p.creator_id !== user.id);
        setMyProjects(mine);
        setBrowseProjects(others);

        const creatorIds = [...new Set(others.map((p) => p.creator_id))];
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", creatorIds);
          const names: Record<string, string> = {};
          (profiles || []).forEach((p: any) => { names[p.user_id] = p.full_name || "Unknown"; });
          setCreatorNames(names);
        }

        const ids = list.map((p) => p.id);
        if (ids.length > 0) {
          const { data: teamData } = await supabase
            .from("startup_team_members")
            .select("startup_id")
            .in("startup_id", ids);
          const counts: Record<string, number> = {};
          (teamData || []).forEach((t: any) => { counts[t.startup_id] = (counts[t.startup_id] || 0) + 1; });
          setTeamCounts(counts);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const renderProjectCard = (project: StartupIdea, isOwn: boolean) => (
    <div key={project.id} className="border border-border rounded-2xl p-4 sm:p-6 bg-card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground break-words">{project.title}</h3>
            <Badge variant="outline" className={`text-xs ${getEpisodeBadgeClasses(project.current_episode)}`}>{getEpisodeLabel(project.current_episode)}</Badge>
            {isOwn && <Badge variant="secondary" className="text-xs">Your listing</Badge>}
          </div>
          {project.sector && (
            <p className="text-sm text-muted-foreground italic mb-2">{project.sector}</p>
          )}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground">Founder</p>
              <p className="font-semibold text-foreground truncate">{isOwn ? "You" : (creatorNames[project.creator_id] || "—")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Team Size</p>
              <p className="font-semibold text-foreground">{(teamCounts[project.id] || 0) + 1} members</p>
            </div>
            <div>
              <p className="text-muted-foreground">Industry</p>
              <p className="font-semibold text-foreground truncate">{project.sector || "General"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Equity Offer</p>
              <p className="font-semibold text-secondary">5-15%</p>
            </div>
          </div>

          {project.roles_needed && project.roles_needed.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Seeking roles:</p>
              <div className="flex flex-wrap gap-1">
                {project.roles_needed.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
          <Rocket className="w-8 h-8 text-primary mx-auto mb-1 hidden sm:block" />
          {!isOwn && (
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setApplyProject(project)}>
              Express Interest
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
            <Link to={`/opportunities/${project.id}`}>
              <Eye className="w-3 h-3 mr-1" /> View Details
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20 pb-8">
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold">Startup Projects</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                Discover startup projects seeking co-builders and join the ventures shaping the platform.
              </p>
            </div>
          </section>

          <section>
            <div className="container mx-auto px-4 max-w-5xl space-y-6 pt-8">

            {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="border border-border rounded-2xl p-6 bg-card">
                      <Skeleton className="h-6 w-48 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : browseProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Rocket className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No projects seeking co-builders right now.</p>
                  <p className="text-sm mt-1">Check back soon or start your own!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {browseProjects.map((project) => (
                    <div key={project.id} className="border border-border rounded-2xl p-4 sm:p-6 bg-card hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground break-words">{project.title}</h3>
                            <Badge variant="outline" className={`text-xs ${getEpisodeBadgeClasses(project.current_episode)}`}>{getEpisodeLabel(project.current_episode)}</Badge>
                          </div>
                          {project.sector && (
                            <p className="text-sm text-muted-foreground italic mb-2">{project.sector}</p>
                          )}
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Founder</p>
                              <p className="font-semibold text-foreground truncate">{creatorNames[project.creator_id] || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Team Size</p>
                              <p className="font-semibold text-foreground">{(teamCounts[project.id] || 0) + 1} members</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Industry</p>
                              <p className="font-semibold text-foreground truncate">{project.sector || "General"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Equity Offer</p>
                              <p className="font-semibold text-secondary">5-15%</p>
                            </div>
                          </div>

                          {project.roles_needed && project.roles_needed.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Seeking roles:</p>
                              <div className="flex flex-wrap gap-1">
                                {project.roles_needed.map((role) => (
                                  <Badge key={role} variant="secondary" className="text-xs">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                          <Rocket className="w-8 h-8 text-primary mx-auto mb-1 hidden sm:block" />
                          <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setApplyProject(project)}>
                            Express Interest
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
                            <Link to={`/opportunities/${project.id}`}>
                              <Eye className="w-3 h-3 mr-1" /> View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>

      {applyProject && (
        <ApplyToJoinDialog
          open={!!applyProject}
          onOpenChange={(open) => !open && setApplyProject(null)}
          idea={{
            id: applyProject.id,
            title: applyProject.title,
            creator_id: applyProject.creator_id,
            roles_needed: applyProject.roles_needed,
          }}
        />
      )}
    </div>
  );
};

export default Ecosystem;

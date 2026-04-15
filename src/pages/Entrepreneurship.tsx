import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Rocket, Eye } from "lucide-react";
import { CreateIdeaDialog } from "@/components/idea/CreateIdeaDialog";
import { ApplyToJoinDialog } from "@/components/idea/ApplyToJoinDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

interface StatsData {
  yourProjects: number;
  coBuilderRoles: number;
  projectInvites: number;
  totalEquity: number;
  activeProjects: number;
  ideaStageProjects: number;
  contributingVentures: number;
}

const getEpisodeLabel = (episode: string) => {
  switch (episode) {
    case "development": return "Idea";
    case "validation": return "MVP";
    case "growth": return "Growth";
    default: return "Idea";
  }
};

const Entrepreneurship = () => {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [applyProject, setApplyProject] = useState<StartupIdea | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [browseProjects, setBrowseProjects] = useState<StartupIdea[]>([]);
  const [myProjects, setMyProjects] = useState<StartupIdea[]>([]);
  const [collaborations, setCollaborations] = useState<StartupIdea[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<StatsData>({
    yourProjects: 0, coBuilderRoles: 0, projectInvites: 0, totalEquity: 0,
    activeProjects: 0, ideaStageProjects: 0, contributingVentures: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all data in parallel
      const [
        browseRes,
        myRes,
        teamMembershipsRes,
        applicationsRes,
        pendingAppsRes,
        certificationsRes,
      ] = await Promise.all([
        // Browse: approved projects seeking co-builders (not mine)
        supabase
          .from("startup_ideas")
          .select("*")
          .eq("review_status", "approved")
          .eq("is_looking_for_cobuilders", true)
          .neq("creator_id", user.id),
        // My projects
        supabase
          .from("startup_ideas")
          .select("*")
          .eq("creator_id", user.id),
        // Team memberships (collaborations)
        supabase
          .from("startup_team_members")
          .select("startup_id, role_type")
          .eq("member_user_id", user.id),
        // My applications
        supabase
          .from("startup_applications")
          .select("id, startup_id, status")
          .eq("applicant_id", user.id),
        // Pending applications to my projects
        supabase
          .from("startup_applications")
          .select("id, startup_id")
          .eq("status", "pending"),
        // Certifications for equity calc
        supabase
          .from("user_certifications")
          .select("id")
          .eq("user_id", user.id),
      ]);

      const browse = browseRes.data || [];
      const my = myRes.data || [];
      setBrowseProjects(browse);
      setMyProjects(my);

      // Fetch collaboration startups
      const membershipStartupIds = (teamMembershipsRes.data || []).map(m => m.startup_id);
      if (membershipStartupIds.length > 0) {
        const { data: collabData } = await supabase
          .from("startup_ideas")
          .select("*")
          .in("id", membershipStartupIds);
        setCollaborations(collabData || []);
      }

      // Get creator names for browse projects
      const creatorIds = [...new Set(browse.map(p => p.creator_id))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);
        const names: Record<string, string> = {};
        (profiles || []).forEach(p => { names[p.user_id] = p.full_name || "Unknown"; });
        setCreatorNames(names);
      }

      // Get team counts for browse projects
      const allProjectIds = browse.map(p => p.id);
      if (allProjectIds.length > 0) {
        const { data: teamData } = await supabase
          .from("startup_team_members")
          .select("startup_id")
          .in("startup_id", allProjectIds);
        const counts: Record<string, number> = {};
        (teamData || []).forEach(t => { counts[t.startup_id] = (counts[t.startup_id] || 0) + 1; });
        setTeamCounts(counts);
      }

      // Calc stats
      const activeCount = my.filter(p => p.status !== "draft").length;
      const ideaCount = my.filter(p => p.current_episode === "development").length;
      const coBuilderRoles = (teamMembershipsRes.data || []).length;
      const myProjectIds = my.map(p => p.id);
      const pendingInvites = (pendingAppsRes.data || []).filter(a => myProjectIds.includes(a.startup_id)).length;
      const certCount = (certificationsRes.data || []).length;
      const teamEquity = coBuilderRoles * 5;
      const certEquity = Math.min(certCount * 2, 10);
      const totalEquity = Math.min(teamEquity + certEquity, 25);

      setStats({
        yourProjects: my.length,
        coBuilderRoles,
        projectInvites: pendingInvites,
        totalEquity,
        activeProjects: activeCount,
        ideaStageProjects: ideaCount,
        contributingVentures: coBuilderRoles,
      });
    } catch (err) {
      console.error("Error fetching entrepreneurship data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Your Projects",
      value: stats.yourProjects,
      sub: `${stats.activeProjects} active, ${stats.ideaStageProjects} in idea stage`,
    },
    {
      label: "Co-Builder Roles",
      value: stats.coBuilderRoles,
      sub: `Contributing to ventures`,
    },
    {
      label: "Project Invites",
      value: stats.projectInvites,
      sub: "Pending invitations",
    },
    {
      label: "Total Equity",
      value: `${stats.totalEquity}%`,
      sub: "Across all ventures",
    },
  ];

  const ProjectCard = ({ project }: { project: StartupIdea }) => (
    <div className="border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-xl font-bold text-foreground">{project.title}</h3>
            <Badge variant="outline" className="text-xs">{getEpisodeLabel(project.current_episode)}</Badge>
          </div>
          {project.sector && (
            <p className="text-sm text-muted-foreground italic mb-2">{project.sector}</p>
          )}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground">Founder</p>
              <p className="font-semibold text-foreground">{creatorNames[project.creator_id] || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Team Size</p>
              <p className="font-semibold text-foreground">{(teamCounts[project.id] || 0) + 1} members</p>
            </div>
            <div>
              <p className="text-muted-foreground">Industry</p>
              <p className="font-semibold text-foreground">{project.sector || "General"}</p>
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

        <div className="flex flex-col gap-2 shrink-0">
          <Rocket className="w-8 h-8 text-primary mx-auto mb-1" />
          <Button size="sm" onClick={() => setApplyProject(project)}>
              Express Interest
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/opportunities/${project.id}`}>
              <Eye className="w-3 h-3 mr-1" /> View Details
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  const MyProjectCard = ({ project }: { project: StartupIdea }) => (
    <div className="border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-xl font-bold text-foreground">{project.title}</h3>
            <Badge variant="outline" className="text-xs">{getEpisodeLabel(project.current_episode)}</Badge>
          </div>
          {project.sector && (
            <p className="text-sm text-muted-foreground italic mb-2">{project.sector}</p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to="/start">Manage</Link>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          <section className="py-10">
            <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                Entrepreneurship Engine
              </h1>
              <p className="text-muted-foreground">
                Launch ventures or join exciting startup projects
              </p>
            </div>
            <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4" /> Start New Project
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border border-border rounded-xl p-5 bg-card">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-12 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))
              : statCards.map((card) => (
                  <div key={card.label} className="border border-border rounded-xl p-5 bg-card">
                    <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </div>
                ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="browse">Browse Projects</TabsTrigger>
              <TabsTrigger value="my">My Projects</TabsTrigger>
              <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
            </TabsList>

            {/* Browse Projects */}
            <TabsContent value="browse">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Startup Projects Seeking Co-Builders
                </h2>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/opportunities">View All</Link>
                </Button>
              </div>
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
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Projects */}
            <TabsContent value="my">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Your Startup Projects
                </h2>
                <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4" /> New Project
                </Button>
              </div>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : myProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>You haven't created any projects yet.</p>
                  <Button className="mt-3 gap-2" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4" /> Create Your First Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myProjects.map((project) => (
                    <MyProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Collaborations */}
            <TabsContent value="collaborations">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">
                Projects You're Contributing To
              </h2>
              {loading ? (
                <Skeleton className="h-24 w-full rounded-2xl" />
              ) : collaborations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>You're not collaborating on any projects yet.</p>
                  <Button variant="outline" className="mt-3" onClick={() => setActiveTab("browse")}>
                    Browse Projects
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {collaborations.map((project) => (
                    <MyProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </PageTransition>
      <Footer />
      <ScrollToTopButton />
      <CreateIdeaDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      {applyProject && (
        <ApplyToJoinDialog
          open={!!applyProject}
          onOpenChange={(open) => { if (!open) setApplyProject(null); }}
          idea={applyProject}
          onApplicationSubmitted={() => fetchData()}
        />
      )}
    </div>
  );
};

export default Entrepreneurship;

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Rocket, Eye, Users, Layers, Film, Shield, TrendingUp, Trash2, CheckCircle, Loader2, Lightbulb } from "lucide-react";
import { CreateIdeaDialog } from "@/components/idea/CreateIdeaDialog";
import { ApplyToJoinDialog } from "@/components/idea/ApplyToJoinDialog";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEngineAccess } from "@/hooks/useEngineAccess";
import { EngineLockedPanel } from "@/components/engines/EngineLockedPanel";

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
  review_status?: string | null;
  development_completed_at?: string | null;
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
  const { engines, loading: accessLoading } = useEngineAccess();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [applyProject, setApplyProject] = useState<StartupIdea | null>(null);
  const [mainTab, setMainTab] = useState<"ecosystem" | "legacy">(
    searchParams.get("tab") === "legacy" ? "legacy" : "ecosystem"
  );
  const [legacySubTab, setLegacySubTab] = useState<"initiated" | "joined">(
    searchParams.get("sub") === "joined" ? "joined" : "initiated"
  );

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreateDialog(true);
      setMainTab("legacy");
      setLegacySubTab("initiated");
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [browseProjects, setBrowseProjects] = useState<StartupIdea[]>([]);
  const [myProjects, setMyProjects] = useState<StartupIdea[]>([]);
  const [collaborations, setCollaborations] = useState<StartupIdea[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Action dialog state (mirrors /start)
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

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const handleDeleteIdea = async () => {
    if (!ideaToDelete || !user || !deleteType) return;
    setIsDeleting(true);
    try {
      if (deleteType === "archive") {
        const { error } = await supabase
          .from("startup_ideas")
          .update({ status: "archived" })
          .eq("id", ideaToDelete.id)
          .eq("creator_id", user.id);
        if (error) throw error;
        toast({ title: "Idea archived", description: `"${ideaToDelete.title}" was archived.` });
      } else {
        const { error } = await supabase
          .from("startup_ideas")
          .delete()
          .eq("id", ideaToDelete.id)
          .eq("creator_id", user.id);
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



  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [
        browseRes,
        myRes,
        teamMembershipsRes,
      ] = await Promise.all([
        supabase
          .from("startup_ideas")
          .select("*")
          .eq("review_status", "approved")
          .eq("is_looking_for_cobuilders", true)
          .neq("creator_id", user.id),
        supabase
          .from("startup_ideas")
          .select("*")
          .eq("creator_id", user.id),
        supabase
          .from("startup_team_members")
          .select("startup_id, role_type")
          .eq("member_user_id", user.id),
      ]);

      const browse = browseRes.data || [];
      const my = myRes.data || [];
      setBrowseProjects(browse);
      setMyProjects(my);

      const membershipStartupIds = (teamMembershipsRes.data || []).map(m => m.startup_id);
      if (membershipStartupIds.length > 0) {
        const { data: collabData } = await supabase
          .from("startup_ideas")
          .select("*")
          .in("id", membershipStartupIds);
        setCollaborations(collabData || []);
      }

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
    } catch (err) {
      console.error("Error fetching entrepreneurship data:", err);
    } finally {
      setLoading(false);
    }
  };


  const ProjectCard = ({ project }: { project: StartupIdea }) => (
    <div className="border border-border rounded-2xl p-4 sm:p-6 bg-card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground break-words">{project.title}</h3>
            <Badge variant="outline" className="text-xs">{getEpisodeLabel(project.current_episode)}</Badge>
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
  );

  const refreshMyAndCollabs = async () => {
    if (!user) return;
    const [{ data: mine }, { data: memberships }] = await Promise.all([
      supabase.from("startup_ideas").select("*").eq("creator_id", user.id),
      supabase.from("startup_team_members").select("startup_id").eq("member_user_id", user.id),
    ]);
    setMyProjects(mine || []);
    const ids = (memberships || []).map((m) => m.startup_id);
    if (ids.length) {
      const { data: collabs } = await supabase.from("startup_ideas").select("*").in("id", ids);
      setCollaborations(collabs || []);
    } else {
      setCollaborations([]);
    }
  };

  const MyProjectCard = ({ project, isOwner }: { project: StartupIdea; isOwner: boolean }) => (
    <div className="border border-border rounded-2xl p-4 sm:p-6 bg-card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground break-words">{project.title}</h3>
            <Badge variant="outline" className="text-xs">{getEpisodeLabel(project.current_episode)}</Badge>
            {isOwner && project.review_status && (
              <Badge variant="secondary" className="text-xs capitalize">{project.review_status}</Badge>
            )}
          </div>
          {project.sector && (
            <p className="text-sm text-muted-foreground italic mb-2">{project.sector}</p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 justify-start sm:justify-end w-full sm:w-auto sm:max-w-[60%]">
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setIdeaToDelete({ id: project.id, title: project.title });
                setDeleteDialogOpen(true);
              }}
              title="Delete idea"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/opportunities/${project.id}`}>
              <Eye className="w-3 h-3 mr-1" /> View
            </Link>
          </Button>
          {(isOwner ? project.review_status === "approved" : true) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTeamDialogIdea({ id: project.id, title: project.title });
                  setTeamDialogOpen(true);
                }}
              >
                <Users className="w-4 h-4 mr-1" /> Team
              </Button>
              {isOwner && !project.development_completed_at && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiveElementsIdea({ id: project.id, title: project.title, description: project.description });
                    setFiveElementsDialogOpen(true);
                  }}
                >
                  <Layers className="w-4 h-4 mr-1" /> 5 Elements
                </Button>
              )}
              {project.development_completed_at && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode });
                    setEpisodesDialogOpen(true);
                  }}
                >
                  <Film className="w-4 h-4 mr-1" /> Episodes
                </Button>
              )}
              {isOwner && project.current_episode === "development" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode });
                    setDevelopDialogOpen(true);
                  }}
                >
                  Develop
                </Button>
              )}
              {isOwner && project.current_episode === "validation" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode });
                    setValidationDialogOpen(true);
                  }}
                >
                  <Shield className="w-4 h-4 mr-1" /> Validate
                </Button>
              )}
              {isOwner && project.current_episode === "growth" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode });
                    setGrowthDialogOpen(true);
                  }}
                >
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


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        {accessLoading ? (
          <main className="pt-24 container mx-auto px-4 max-w-3xl">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </main>
        ) : !engines.entrepreneurship.unlocked ? (
          <EngineLockedPanel engine="entrepreneurship" access={engines.entrepreneurship} />
        ) : (
        <main className="pt-20">
          <section className="py-10">
            <div className="container mx-auto px-4">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 md:mb-12 bg-muted/40 rounded-2xl p-4 sm:p-6">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                    Entrepreneurship Engine
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Launch ventures or join exciting startup projects
                  </p>
                </div>
                <Button className="gap-2 w-full sm:w-auto shrink-0" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4" /> Start Startup Project
                </Button>
              </div>


              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "ecosystem" | "legacy")} className="w-full">
                <div className="flex border-b border-border mb-6">
                  <button
                    onClick={() => setMainTab("ecosystem")}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      mainTab === "ecosystem"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Rocket className="w-4 h-4" />
                    Ecosystem
                  </button>
                  <button
                    onClick={() => setMainTab("legacy")}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      mainTab === "legacy"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Legacy
                  </button>
                </div>

                <TabsContent value="ecosystem">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                      Startup Projects Seeking Co-Builders
                    </h2>
                    <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
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

                <TabsContent value="legacy">
                  <Tabs value={legacySubTab} onValueChange={(v) => setLegacySubTab(v as "initiated" | "joined")} className="w-full">
                    <TabsList className="mb-4 w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                      <TabsTrigger value="initiated" className="text-xs sm:text-sm">Initiated</TabsTrigger>
                      <TabsTrigger value="joined" className="text-xs sm:text-sm">Joined</TabsTrigger>
                    </TabsList>

                    <TabsContent value="initiated">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                          Initiated Projects
                        </h2>
                        <Button size="sm" className="gap-2 self-start sm:self-auto" onClick={() => setShowCreateDialog(true)}>
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
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myProjects.map((project) => (
                            <MyProjectCard key={project.id} project={project} isOwner={true} />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="joined">
                      <h2 className="font-display text-xl font-bold text-foreground mb-4">
                        Projects You're Contributing To
                      </h2>
                      {loading ? (
                        <Skeleton className="h-24 w-full rounded-2xl" />
                      ) : collaborations.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>You're not collaborating on any projects yet.</p>
                          <Button variant="outline" className="mt-3" onClick={() => setMainTab("ecosystem")}>
                            Explore Ecosystem
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {collaborations.map((project) => (
                            <MyProjectCard key={project.id} project={project} isOwner={false} />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </main>
        )}
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
            startupId={selectedIdea.id}
            startupTitle={selectedIdea.title}
            currentEpisode={selectedIdea.currentEpisode}
          />
        </>
      )}

      {teamDialogIdea && (
        <TeamManagementDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          startupId={teamDialogIdea.id}
          startupTitle={teamDialogIdea.title}
          currentUserId={user?.id || ""}
        />
      )}

      <FiveElementsDialog
        open={fiveElementsDialogOpen}
        onOpenChange={setFiveElementsDialogOpen}
        idea={fiveElementsIdea}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteType(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Choose deletion type</AlertDialogTitle>
            <AlertDialogDescription>
              What would you like to do with{" "}
              <span className="font-semibold text-foreground">"{ideaToDelete?.title}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                deleteType === "archive" ? "border-amber-500 bg-amber-500/10" : "border-border hover:border-amber-500/50"
              }`}
              onClick={() => setDeleteType("archive")}
            >
              <p className="font-semibold text-foreground">Archive Idea (Recommended)</p>
              <p className="text-sm text-muted-foreground mt-1">
                Hidden from public view but can be restored later.
              </p>
            </div>
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                deleteType === "permanent" ? "border-destructive bg-destructive/10" : "border-border hover:border-destructive/50"
              }`}
              onClick={() => setDeleteType("permanent")}
            >
              <p className="font-semibold text-foreground">Delete Permanently</p>
              <p className="text-sm text-muted-foreground mt-1">
                Idea and associated data will be permanently removed. Cannot be undone.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIdea}
              disabled={isDeleting || !deleteType}
              className={
                deleteType === "permanent"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{deleteType === "permanent" ? "Deleting..." : "Archiving..."}</>
              ) : deleteType === "permanent" ? "Delete Permanently" : "Archive Idea"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Entrepreneurship;

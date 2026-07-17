import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, Eye, Users, Layers, Film, Shield, TrendingUp, Trash2, CheckCircle, Loader2, Lightbulb, Plus, Building2, UserRoundCog, Sparkles } from "lucide-react";
import { TransferInitiationDialog } from "@/components/idea/TransferInitiationDialog";
import { Switch } from "@/components/ui/switch";
import { NextGoalBanner } from "@/components/progression/NextGoalBanner";
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
import { useProgressionLadder } from "@/hooks/useProgressionLadder";
import { ScaledCard } from "@/components/idea/ScaledCard";

import ConsultingGrowthPage from "@/pages/ConsultingGrowth";
import { SuggestDomainDialog } from "@/components/domain/SuggestDomainDialog";
import { MyOrganizationsSection } from "@/components/organization/MyOrganizationsSection";
import { YourAssetsSection } from "@/components/organization/YourAssetsSection";

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

const getEpisodeBadgeClasses = (episode: string) => {
  switch (episode) {
    case "development": return "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100";
    case "validation": return "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100";
    case "growth": return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    default: return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
};

const getReviewStatusLabel = (status: string) => {
  switch (status) {
    case "pending": return "waiting for admin approval";
    default: return status;
  }
};

const getReviewStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "pending": return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100";
    case "approved": return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    default: return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
};

const Entrepreneurship = () => {
  const { user } = useAuth();
  const { engines, loading: accessLoading } = useEngineAccess();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [applyProject, setApplyProject] = useState<StartupIdea | null>(null);
  type MainTab = "legacy" | "growth" | "organizations" | "assets";
  type GrowthSub = "developed" | "monetized" | "systematized";
  const initialTab = (() => {
    const t = searchParams.get("tab");
    if (t === "legacy" || t === "growth" || t === "organizations" || t === "assets") return t as MainTab;
    return "growth" as MainTab;
  })();
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [growthSubTab, setGrowthSubTab] = useState<GrowthSub>(() => {
    const g = searchParams.get("growth");
    if (g === "monetized" || g === "systematized") return g as GrowthSub;
    return "developed";
  });
  const [legacySubTab, setLegacySubTab] = useState<"initiated" | "joined" | "partnered">(
    (searchParams.get("sub") === "joined" || searchParams.get("sub") === "partnered")
      ? (searchParams.get("sub") as "joined" | "partnered")
      : "initiated"
  );
  const { stages, loading: ladderLoading } = useProgressionLadder();
  const advisorAchieved = stages.find((s) => s.key === "advisor")?.achieved ?? false;
  const [profileStartupName, setProfileStartupName] = useState<string | null>(null);
  const [naturalRoleDesc, setNaturalRoleDesc] = useState<string | null>(null);
  const [profileTitle, setProfileTitle] = useState<string | null>(null);
  const [profilePrimarySkills, setProfilePrimarySkills] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [suggestDomainOpen, setSuggestDomainOpen] = useState(false);

  const [hasInitiatorCert, setHasInitiatorCert] = useState(false);
  const [hasCoBuilderCert, setHasCoBuilderCert] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [gatingLoaded, setGatingLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [
        { data: prof },
        { data: nr },
        { data: certs },
        { data: memberships },
        { data: ownedOrgs },
      ] = await Promise.all([
        supabase.from("profiles").select("startup_name, professional_title, primary_skills").eq("user_id", user.id).maybeSingle(),
        supabase.from("natural_roles").select("description").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_certifications").select("certification_type").eq("user_id", user.id),
        supabase.from("organization_members").select("role").eq("user_id", user.id),
        supabase.from("organizations").select("id").eq("created_by", user.id).limit(1),
      ]);
      setProfileStartupName((prof as any)?.startup_name ?? null);
      setProfileTitle((prof as any)?.professional_title ?? null);
      setProfilePrimarySkills((prof as any)?.primary_skills ?? null);
      setProfileUsername(null);
      setNaturalRoleDesc(nr?.description ?? null);
      const certList = (certs ?? []) as Array<{ certification_type: string }>;
      setHasInitiatorCert(certList.some((c) => c.certification_type === "initiator_b4"));
      setHasCoBuilderCert(certList.some((c) => c.certification_type === "cobuilder_b4"));
      const mem = (memberships ?? []) as Array<{ role: string }>;
      setIsOrgMember(mem.length > 0 || (ownedOrgs?.length ?? 0) > 0);
      setIsOrgAdmin(mem.some((m) => m.role === "admin") || (ownedOrgs?.length ?? 0) > 0);
      setGatingLoaded(true);
    })();
  }, [user]);

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
  const [linkedOrgs, setLinkedOrgs] = useState<Record<string, { id: string; slug: string; is_public: boolean }>>({});



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
  const [transferIdea, setTransferIdea] = useState<{ id: string; title: string } | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
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

      // Load organizations linked to my ideas (source_idea_id) so we can show
      // an "Organization" button + ecosystem visibility toggle on those cards.
      const myAndCollabIds = [
        ...my.map(p => p.id),
        ...membershipStartupIds,
      ];
      if (myAndCollabIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, slug, source_idea_id, is_public")
          .in("source_idea_id", myAndCollabIds);
        const map: Record<string, { id: string; slug: string; is_public: boolean }> = {};
        (orgs || []).forEach((o: any) => {
          if (o.source_idea_id) map[o.source_idea_id] = { id: o.id, slug: o.slug, is_public: o.is_public !== false };
        });
        setLinkedOrgs(map);
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

  const MyProjectCard = ({ project, isOwner }: { project: StartupIdea; isOwner: boolean }) => {
    const org = linkedOrgs[project.id];

    return (
      <div className="border border-border rounded-2xl p-4 sm:p-6 bg-card hover:shadow-md transition-shadow">
        {/* Header row: title + meta + delete */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground break-words">{project.title}</h3>
              <Badge variant="outline" className={`text-xs ${getEpisodeBadgeClasses(project.current_episode)}`}>{getEpisodeLabel(project.current_episode)}</Badge>
              {isOwner && project.review_status && (
                <Badge variant="outline" className={`text-xs capitalize ${getReviewStatusBadgeClasses(project.review_status)}`}>{getReviewStatusLabel(project.review_status)}</Badge>
              )}
            </div>
            {project.sector && (
              <p className="text-sm text-muted-foreground italic mb-2">{project.sector}</p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              {project.current_episode === "development" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => {
                    setTransferIdea({ id: project.id, title: project.title });
                    setTransferDialogOpen(true);
                  }}
                  title="Transfer initiation to another initiator"
                >
                  <UserRoundCog className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setIdeaToDelete({ id: project.id, title: project.title });
                  setDeleteDialogOpen(true);
                }}
                title="Delete idea"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            {isOwner && project.current_episode === "development" && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode });
                  setDevelopDialogOpen(true);
                }}
              >
                <Rocket className="w-4 h-4 mr-1.5" /> Develop
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
                <Shield className="w-4 h-4 mr-1.5" /> Validate
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
                <TrendingUp className="w-4 h-4 mr-1.5" /> Grow
              </Button>
            )}
            {project.current_episode === "completed" && (
              <Badge className="bg-b4-teal text-white h-9 px-3">
                <CheckCircle className="w-3 h-3 mr-1.5" /> Journey Complete
              </Badge>
            )}
            {!isOwner && project.current_episode !== "completed" && (
              <Button size="sm" disabled variant="secondary" className="opacity-100 cursor-default">
                {project.current_episode === "development" && (
                  <><Rocket className="w-4 h-4 mr-1.5" /> In Development</>
                )}
                {project.current_episode === "validation" && (
                  <><Shield className="w-4 h-4 mr-1.5" /> In Validation</>
                )}
                {project.current_episode === "growth" && (
                  <><TrendingUp className="w-4 h-4 mr-1.5" /> In Growth</>
                )}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-border shrink-0" />

          {/* Secondary actions */}
          <div className="flex flex-wrap gap-2">
            {(isOwner ? project.review_status === "approved" : true) && (
              <>
                {org && project.current_episode !== "development" && (
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                    <Link to={`/org/${org.slug}`}>
                      <Building2 className="w-3.5 h-3.5 mr-1.5" /> Organization
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setTeamDialogIdea({ id: project.id, title: project.title });
                    setTeamDialogOpen(true);
                  }}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Team
                </Button>

                {isOwner && !project.development_completed_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFiveElementsIdea({ id: project.id, title: project.title, description: project.description });
                      setFiveElementsDialogOpen(true);
                    }}
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5" /> 5 Elements
                  </Button>
                )}

                {project.development_completed_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSelectedIdea({ id: project.id, title: project.title, currentEpisode: project.current_episode });
                      setEpisodesDialogOpen(true);
                    }}
                  >
                    <Film className="w-3.5 h-3.5 mr-1.5" /> Episodes
                  </Button>
                )}
              </>
            )}

            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to={`/opportunities/${project.id}`}>
                <Eye className="w-3.5 h-3.5 mr-1.5" /> View
              </Link>
            </Button>
          </div>


          {/* Visibility toggle — pushed to right on desktop */}
          {org && isOwner && (
            <div className="sm:ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Ecosystem</span>
              <Switch
                checked={org.is_public}
                onCheckedChange={async (checked) => {
                  setLinkedOrgs((prev) => ({ ...prev, [project.id]: { ...prev[project.id], is_public: checked } }));
                  const { error } = await supabase
                    .from("organizations")
                    .update({ is_public: checked } as any)
                    .eq("id", org.id);
                  if (error) {
                    setLinkedOrgs((prev) => ({ ...prev, [project.id]: { ...prev[project.id], is_public: !checked } }));
                    toast({ title: "Update failed", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: checked ? "Published to ecosystem" : "Hidden from ecosystem" });
                  }
                }}
              />
              <span className={`text-xs font-medium ${org.is_public ? "text-b4-teal" : "text-muted-foreground"}`}>
                {org.is_public ? "On" : "Off"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        {accessLoading ? (
          <main className="pt-24 pb-8 min-h-[80vh] container mx-auto px-4 max-w-5xl space-y-6">
            <Skeleton className="h-10 w-56 rounded-lg" />
            <Skeleton className="h-5 w-96 rounded-lg" />
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </main>
        ) : !engines.entrepreneurship.unlocked ? (
          <div className="min-h-[80vh]">
            <EngineLockedPanel engine="entrepreneurship" access={engines.entrepreneurship} />
          </div>
        ) : (
        <main className="pt-24 pb-8 min-h-[80vh]">
          <section>
            <div className="container mx-auto px-4 max-w-5xl space-y-6">

              {/* Header */}
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  Build Assets
                </h1>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground">
                Stop trading hours for dollars—start Building long term talent assets or trading talent for equity
              </p>


              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)} className="w-full">
                <div className="flex border-b border-border mb-6 overflow-x-auto">
                  <button
                    onClick={() => setMainTab("growth")}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      mainTab === "growth"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Your Talent
                  </button>
                  <button
                    onClick={() => setMainTab("legacy")}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      mainTab === "legacy"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Your Legacy
                  </button>
                  <button
                    onClick={() => setMainTab("organizations")}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      mainTab === "organizations"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Your organizations
                  </button>
                  <button
                    onClick={() => setMainTab("assets")}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      mainTab === "assets"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Your Assets
                  </button>
                </div>






                <TabsContent value="legacy">
                  <Tabs value={legacySubTab} onValueChange={(v) => setLegacySubTab(v as "initiated" | "joined" | "partnered")} className="w-full">
                    <div className="flex gap-1 p-1 bg-muted/60 rounded-lg mb-4 w-full sm:w-auto">
                      <button
                        onClick={() => setLegacySubTab("initiated")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          legacySubTab === "initiated"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Initiated
                      </button>
                      <button
                        onClick={() => setLegacySubTab("joined")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          legacySubTab === "joined"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Joined
                      </button>
                      <button
                        onClick={() => setLegacySubTab("partnered")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          legacySubTab === "partnered"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Partnered
                      </button>
                    </div>

                    <TabsContent value="initiated">
                      <NextGoalBanner pageStage="founder" className="mb-4" />
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                        <div className="min-w-0">
                          <h2 className="font-display text-xl font-bold text-foreground">Your Journey</h2>
                          <p className="text-sm text-muted-foreground">
                            Projects you started from scratch.
                          </p>
                        </div>
                      </div>
                      {loading ? (
                        <Skeleton className="h-24 w-full rounded-2xl" />
                      ) : (myProjects.length === 0) ? (
                        <div className="rounded-xl border border-dashed border-border p-12 text-center">
                          <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <p className="font-medium text-foreground">Nothing in your journey yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Add your first project to start the flow.
                          </p>
                          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Add First Project
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myProjects.map((project) => (
                            <MyProjectCard key={project.id} project={project} isOwner={true} />
                          ))}
                          <div
                            className="border border-dashed border-border rounded-2xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => setShowCreateDialog(true)}
                          >
                            <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="font-medium text-foreground">Add an Idea</p>
                            <p className="text-sm text-muted-foreground mt-1">Start a new venture and begin your journey.</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="joined">
                      <div className="mb-4">
                        <h2 className="font-display text-xl font-bold text-foreground">Projects You're Contributing To</h2>
                        <p className="text-sm text-muted-foreground">
                          Ventures you teamed up with.
                        </p>
                      </div>
                      {loading ? (
                        <Skeleton className="h-24 w-full rounded-2xl" />
                      ) : collaborations.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>You're not collaborating on any projects yet.</p>
                          <Button variant="outline" className="mt-3" onClick={() => navigate("/projects")}>
                            Explore Ecosystem
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {collaborations.map((project) => (
                            <MyProjectCard key={project.id} project={project} isOwner={false} />
                          ))}
                          <div
                            className="border border-dashed border-border rounded-2xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => navigate("/projects")}
                          >
                            <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="font-medium text-foreground">Join an Idea</p>
                            <p className="text-sm text-muted-foreground mt-1">Explore projects seeking co-builders.</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="partnered">
                      <div className="mb-4">
                        <h2 className="font-display text-xl font-bold text-foreground">Equity Partnerships</h2>
                        <p className="text-sm text-muted-foreground">
                          Skills traded for equity and long-term shares.
                        </p>
                      </div>
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No partnerships recorded yet.</p>
                        <p className="text-sm mt-1">Join ventures where you trade skills for equity.</p>
                      </div>
                    </TabsContent>

                  </Tabs>
                </TabsContent>

                <TabsContent value="growth">
                  {ladderLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-9 w-full max-w-md rounded-lg" />
                      <Skeleton className="h-6 w-64 rounded" />
                      <Skeleton className="h-4 w-96 rounded" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-36 w-full rounded-2xl" />
                        <Skeleton className="h-36 w-full rounded-2xl" />
                        <Skeleton className="h-36 w-full rounded-2xl" />
                        <Skeleton className="h-36 w-full rounded-2xl" />
                      </div>
                    </div>
                  ) : (
                  <>
                  <div className="flex gap-1 p-1 bg-muted/60 rounded-lg mb-4 w-full sm:w-auto">

                    <button
                      onClick={() => setGrowthSubTab("developed")}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                        growthSubTab === "developed"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Developed
                    </button>
                    <button
                      onClick={() => setGrowthSubTab("monetized")}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                        growthSubTab === "monetized"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Validated
                    </button>
                    {advisorAchieved && (
                      <button
                        onClick={() => setGrowthSubTab("systematized")}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                          growthSubTab === "systematized"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Grown
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/40 text-primary">Advisor</Badge>
                      </button>
                    )}
                  </div>

                  {growthSubTab === "developed" && (
                    <div className="space-y-4">
                      <div className="mb-2">
                        <h2 className="font-display text-xl font-bold text-foreground">Your Talent, Developed</h2>
                        <p className="text-sm text-muted-foreground">
                          The foundation you'll grow: natural role, domain, resume, and public profile.
                        </p>
                      </div>

                      <NextGoalBanner pageStage="talent" />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="border border-border rounded-2xl p-5 bg-card">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Natural Role</p>
                          <p className="text-sm text-foreground min-h-[2.5rem]">
                            {naturalRoleDesc || "Not yet defined — decode it from your profile."}
                          </p>
                          <Button variant="outline" size="sm" className="mt-3" asChild>
                            <Link to="/nr-decoder">Decode / Update</Link>
                          </Button>
                        </div>

                        <div className="border border-border rounded-2xl p-5 bg-card">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Domain</p>
                          {profileTitle ? (
                            <p className="text-sm text-foreground min-h-[2.5rem]">{profileTitle}</p>
                          ) : (
                            <div className="min-h-[2.5rem]">
                              <p className="text-sm text-muted-foreground">Not set yet.</p>
                              {(naturalRoleDesc || profilePrimarySkills) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Suggested: {profilePrimarySkills || naturalRoleDesc}
                                </p>
                              )}
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => setSuggestDomainOpen(true)}>
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            Suggest domain based on my Natural Role
                          </Button>
                        </div>

                        <div className="border border-border rounded-2xl p-5 bg-card">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Resume</p>
                          <p className="text-sm text-muted-foreground min-h-[2.5rem]">
                            Sharpen the story employers and co-builders read first.
                          </p>
                          <Button variant="outline" size="sm" className="mt-3" asChild>
                            <Link to="/resume">Open Resume</Link>
                          </Button>
                        </div>

                        <div className="border border-border rounded-2xl p-5 bg-card">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Public Profile</p>
                          <p className="text-sm text-muted-foreground min-h-[2.5rem]">
                            How the ecosystem discovers you.
                          </p>
                          <Button variant="outline" size="sm" className="mt-3" asChild>
                            <Link to={profileUsername ? `/u/${profileUsername}` : "/profile"}>
                              View Public Profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {growthSubTab === "monetized" && (
                    <div className="space-y-4">
                      <div className="mb-2">
                        <h2 className="font-display text-xl font-bold text-foreground">Your Talent, Monetized</h2>
                        <p className="text-sm text-muted-foreground">
                          Paid consulting missions, delivered projects, and revenue that prove your expertise.
                        </p>
                      </div>
                      <ConsultingGrowthPage embedded />
                    </div>
                  )}
                  {growthSubTab === "systematized" && (
                    advisorAchieved ? (
                      <div>
                        <div className="mb-4">
                          <h2 className="font-display text-xl font-bold text-foreground">Your Talent, Grown</h2>
                          <p className="text-sm text-muted-foreground">
                            Methods, frameworks, and knowledge assets scaled through team and products for larger impact.
                          </p>
                        </div>
                        <ScaledCard
                          userId={user!.id}
                          title={profileStartupName || "Your Brand"}
                          tagline={
                            naturalRoleDesc ||
                            "Detached, systemized consulting practice ready to grow with the right co-builders."
                          }
                          onBrandNameSaved={(name) => setProfileStartupName(name)}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        Reach the Advisor stage to unlock Grown.
                      </div>
                    )
                  )}
                  </>
                  )}
                </TabsContent>

                <TabsContent value="organizations">
                  <MyOrganizationsSection />
                </TabsContent>

                <TabsContent value="assets">
                  <YourAssetsSection />
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
      <SuggestDomainDialog
        open={suggestDomainOpen}
        onOpenChange={setSuggestDomainOpen}
        naturalRole={naturalRoleDesc}
        currentTitle={profileTitle}
        primarySkills={profilePrimarySkills}
        onApply={(d) => setProfileTitle(d)}
      />
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

      <TransferInitiationDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        idea={transferIdea}
        onTransferred={() => {
          refreshMyAndCollabs();
          setTransferIdea(null);
        }}
      />

    </div>
  );
};

export default Entrepreneurship;

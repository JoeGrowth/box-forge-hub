import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useUserStatus } from "@/hooks/useUserStatus";
import { supabase } from "@/integrations/supabase/client";
import {
  Save,
  History,
  Edit2,
  X,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  Sparkles,
  Theater,
  Code2,
  Users,
  ArrowRight,
  Zap,
  Target,
  Lightbulb,
  Lock,
  TrendingUp,
  Pencil,
  Trash2,
  RotateCcw,
  Archive,
} from "lucide-react";
import { BookOpen, Rocket } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScaleStepDialog } from "@/components/scale/ScaleStepDialog";
import { IdeaDevelopDialog } from "@/components/idea/IdeaDevelopDialog";
import { IdeaValidationDialog } from "@/components/idea/IdeaValidationDialog";
import { IdeaGrowthDialog } from "@/components/idea/IdeaGrowthDialog";
import { IdeaEpisodesDialog } from "@/components/idea/IdeaEpisodesDialog";
import { TeamManagementDialog } from "@/components/idea/TeamManagementDialog";
import { CoBuilderApplicationsSection } from "@/components/scale/CoBuilderApplicationsSection";

import { format } from "date-fns";
import { Film, Shield } from "lucide-react";

interface AnswerVersion {
  id: string;
  version_number: number;
  description: string | null;
  practice_entities: string | null;
  practice_case_studies: number | null;
  training_contexts: string | null;
  training_count: number | null;
  consulting_with_whom: string | null;
  consulting_case_studies: string | null;
  promise_check: boolean | null;
  practice_check: boolean | null;
  training_check: boolean | null;
  consulting_check: boolean | null;
  wants_to_scale: boolean | null;
  created_at: string;
  change_notes: string | null;
}

interface StartupIdea {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  review_status: string | null;
  status: string | null;
  created_at: string;
  current_episode: string;
  development_completed_at: string | null;
  validation_completed_at: string | null;
  growth_completed_at: string | null;
}

const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Structure (Branding Phase)",
    subtitle: "Structured consultants",
    icon: Theater,
    description:
      "Create your Mask — the structured entity that represents your natural role. This is the gamified first step to scaling beyond yourself.",
    details: [
      "Define your Mask's identity and purpose",
      "Structure your natural role into an entity",
      "Ownership: 100% yours",
    ],
    color: "from-violet-500 to-purple-600",
  },
  {
    step: 2,
    title: "Detach (Systemization Phase)",
    subtitle: "Operational systems",
    icon: Code2,
    description:
      "Transform personal thinking into operational systems. Your Mask becomes coded through frameworks, processes, and methods.",
    details: [
      "Training programs & curricula",
      "Consulting frameworks & methodologies",
      "Operating principles & playbooks",
    ],
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: 3,
    title: "Scale (Asset Phase)",
    subtitle: "Clients ask for the brand",
    icon: Users,
    description:
      "Clients ask for the Mask, not you. Work becomes deliverable by others. Value becomes scalable, repeatable, and transferable.",
    details: [
      "Build delivery capacity beyond yourself",
      "Enable others to operate as the Mask",
      "Scale impact without being the bottleneck",
    ],
    color: "from-emerald-500 to-teal-500",
  },
];

const Scale = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { naturalRole, onboardingState, refetch } = useOnboarding();
  const { canAccessScaling, userStatus, getStatusLabel, loading: statusLoading, statusData } = useUserStatus();
  const { toast } = useToast();

  // Read section from URL query param
  const sectionFromUrl = searchParams.get("section");
  const getInitialSection = (): "scale" | "ideas" | "cobuilder" => {
    if (sectionFromUrl === "consultant" || sectionFromUrl === "scale") return "scale";
    if (sectionFromUrl === "cobuilder") return "cobuilder";
    if (sectionFromUrl === "initiator" || sectionFromUrl === "ideas") return "ideas";
    return "ideas";
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<AnswerVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [activeSection, setActiveSection] = useState<"scale" | "ideas" | "cobuilder">(getInitialSection());
  const [userIdeas, setUserIdeas] = useState<StartupIdea[]>([]);
  const [archivedIdeas, setArchivedIdeas] = useState<StartupIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [restoringIdeaId, setRestoringIdeaId] = useState<string | null>(null);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<number, boolean>>({});
  const [developDialogOpen, setDevelopDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [growthDialogOpen, setGrowthDialogOpen] = useState(false);
  const [episodesDialogOpen, setEpisodesDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<{ id: string; title: string; currentEpisode: string } | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamDialogIdea, setTeamDialogIdea] = useState<{ id: string; title: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteType, setDeleteType] = useState<"archive" | "permanent" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasConsultantCert, setHasConsultantCert] = useState(false);
  const [hasConsultantAccess, setHasConsultantAccess] = useState(false);
  const [hasTeamMemberships, setHasTeamMemberships] = useState<boolean | null>(null);
  const [showScaleExperience, setShowScaleExperience] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("showScaleExperience") === "true";
    }
    return false;
  });
  const [editData, setEditData] = useState({
    description: "",
    practice_entities: "",
    training_contexts: "",
    consulting_with_whom: "",
    consulting_case_studies: "",
  });

  // Check if user has team memberships or compensation offers (allows non-boosted users to access cobuilder section)
  useEffect(() => {
    const checkTeamMemberships = async () => {
      if (!user) {
        setHasTeamMemberships(false);
        return;
      }
      const { count } = await supabase
        .from("startup_team_members")
        .select("id", { count: "exact", head: true })
        .eq("member_user_id", user.id);
      setHasTeamMemberships((count || 0) > 0);
    };
    checkTeamMemberships();
  }, [user]);

  // Sync activeSection with URL query param
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "consultant" || section === "scale") {
      setActiveSection("scale");
    } else if (section === "cobuilder") {
      setActiveSection("cobuilder");
    } else if (section === "initiator" || section === "ideas") {
      setActiveSection("ideas");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if user doesn't have access to scaling AND has no team memberships
  // Wait for statusData and hasTeamMemberships to be loaded
  useEffect(() => {
    // Only check access after all data is fully loaded and user is authenticated
    if (
      !authLoading &&
      !statusLoading &&
      user &&
      statusData !== null &&
      hasTeamMemberships !== null &&
      !canAccessScaling &&
      !hasTeamMemberships
    ) {
      toast({
        title: "Access Restricted",
        description: "Complete a boosting journey to unlock the Scale page.",
        variant: "destructive",
      });
      navigate("/journey", { replace: true });
    }
    // If user has team memberships but no scaling access, force cobuilder section
    if (
      !authLoading &&
      !statusLoading &&
      user &&
      statusData !== null &&
      hasTeamMemberships !== null &&
      !canAccessScaling &&
      hasTeamMemberships
    ) {
      setActiveSection("cobuilder");
    }
  }, [authLoading, statusLoading, user, statusData, canAccessScaling, hasTeamMemberships, navigate, toast]);

  useEffect(() => {
    if (naturalRole) {
      setEditData({
        description: naturalRole.description || "",
        practice_entities: naturalRole.practice_entities || "",
        training_contexts: naturalRole.training_contexts || "",
        consulting_with_whom: naturalRole.consulting_with_whom || "",
        consulting_case_studies: naturalRole.consulting_case_studies || "",
      });
    }
  }, [naturalRole]);

  useEffect(() => {
    const fetchVersions = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("onboarding_answer_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version_number", { ascending: false });

      if (!error && data) {
        setVersions(data);
      }
    };

    fetchVersions();
  }, [user]);

  // Fetch user's startup ideas
  useEffect(() => {
    const fetchUserIdeas = async () => {
      if (!user) return;

      setLoadingIdeas(true);
      const { data, error } = await supabase
        .from("startup_ideas")
        .select(
          "id, title, description, sector, review_status, status, created_at, current_episode, development_completed_at, validation_completed_at, growth_completed_at",
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Separate active and archived ideas
        const active = data.filter((idea) => idea.status !== "archived");
        const archived = data.filter((idea) => idea.status === "archived");
        setUserIdeas(active);
        setArchivedIdeas(archived);
      }
      setLoadingIdeas(false);
    };

    fetchUserIdeas();
  }, [user]);

  // Fetch consultant certification and access
  useEffect(() => {
    const fetchConsultantData = async () => {
      if (!user) return;
      const [certResult, accessResult] = await Promise.all([
        supabase
          .from("user_certifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("certification_type", "consultant_b4")
          .maybeSingle(),
        supabase
          .from("onboarding_state")
          .select("consultant_access")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setHasConsultantCert(!!certResult.data);
      setHasConsultantAccess(!!accessResult.data?.consultant_access);
    };
    fetchConsultantData();
  }, [user]);

  // Handle idea deletion
  const handleDeleteIdea = async () => {
    if (!ideaToDelete || !user || !deleteType) return;

    setIsDeleting(true);
    try {
      if (deleteType === "archive") {
        // Soft delete: mark as inactive
        const { error } = await supabase
          .from("startup_ideas")
          .update({ status: "archived" })
          .eq("id", ideaToDelete.id)
          .eq("creator_id", user.id);

        if (error) {
          toast({
            title: "Archive Failed",
            description: "Could not archive the idea. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Idea Archived",
            description: `"${ideaToDelete.title}" has been archived. You can restore it later.`,
          });
          // Move to archived list
          const archivedIdea = userIdeas.find((idea) => idea.id === ideaToDelete.id);
          if (archivedIdea) {
            setUserIdeas((prev) => prev.filter((idea) => idea.id !== ideaToDelete.id));
            setArchivedIdeas((prev) => [{ ...archivedIdea, status: "archived" }, ...prev]);
          }
        }
      } else {
        // Hard delete: permanently remove
        const { error } = await supabase
          .from("startup_ideas")
          .delete()
          .eq("id", ideaToDelete.id)
          .eq("creator_id", user.id);

        if (error) {
          toast({
            title: "Delete Failed",
            description: "Could not delete the idea. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Idea Deleted",
            description: `"${ideaToDelete.title}" has been permanently deleted.`,
          });
          // Remove from local state
          setUserIdeas((prev) => prev.filter((idea) => idea.id !== ideaToDelete.id));
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setIdeaToDelete(null);
      setDeleteType(null);
    }
  };

  // Handle restoring an archived idea
  const handleRestoreIdea = async (idea: { id: string; title: string }) => {
    if (!user) return;

    setRestoringIdeaId(idea.id);
    try {
      const { error } = await supabase
        .from("startup_ideas")
        .update({ status: "active" })
        .eq("id", idea.id)
        .eq("creator_id", user.id);

      if (error) {
        toast({
          title: "Restore Failed",
          description: "Could not restore the idea. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Idea Restored",
          description: `"${idea.title}" has been restored successfully.`,
        });
        // Move from archived to active
        const restoredIdea = archivedIdeas.find((i) => i.id === idea.id);
        if (restoredIdea) {
          setArchivedIdeas((prev) => prev.filter((i) => i.id !== idea.id));
          setUserIdeas((prev) => [{ ...restoredIdea, status: "active" }, ...prev]);
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setRestoringIdeaId(null);
    }
  };

  // Fetch step completion status
  const fetchStepCompletionStatus = async () => {
    if (!user) return;

    const { data: journey } = await supabase
      .from("learning_journeys")
      .select("id")
      .eq("user_id", user.id)
      .eq("journey_type", "scaling_path")
      .maybeSingle();

    if (!journey) return;

    const { data: responses } = await supabase
      .from("journey_phase_responses")
      .select("phase_number, phase_name, is_completed")
      .eq("journey_id", journey.id);

    if (!responses) return;

    // Filter for Scale business task phases by phase_name (not Consultant quiz phases)
    const scalePhaseNames = [
      "Personal Entity",
      "Company Formation",
      "Process Implementation",
      "Autonomous Structure",
      "Decentralized Structure",
    ];
    const scaleResponses = responses.filter((r) => scalePhaseNames.includes(r.phase_name));
    const completedPhases = scaleResponses.filter((r) => r.is_completed).map((r) => r.phase_number);

    setStepCompletionStatus({
      1: completedPhases.includes(1),
      2: completedPhases.includes(2) && completedPhases.includes(3) && completedPhases.includes(4),
      3: completedPhases.includes(5),
    });
  };

  useEffect(() => {
    fetchStepCompletionStatus();
  }, [user]);

  // Auto-show experience if user has any completed steps, and persist to localStorage
  useEffect(() => {
    const hasCompletedAnyStep = Object.values(stepCompletionStatus).some(Boolean);
    if (hasCompletedAnyStep) {
      setShowScaleExperience(true);
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [stepCompletionStatus]);

  // Persist showScaleExperience to localStorage when it changes
  useEffect(() => {
    if (showScaleExperience) {
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [showScaleExperience]);

  const handleOpenStepDialog = (stepNum: 1 | 2 | 3) => {
    setActiveStep(stepNum);
    setStepDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !naturalRole) return;

    setIsSaving(true);
    try {
      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;

      const { error: versionError } = await supabase.from("onboarding_answer_versions").insert({
        user_id: user.id,
        version_number: nextVersion,
        description: editData.description,
        practice_entities: editData.practice_entities,
        practice_case_studies: naturalRole.practice_case_studies,
        training_contexts: editData.training_contexts,
        training_count: naturalRole.training_count,
        consulting_with_whom: editData.consulting_with_whom,
        consulting_case_studies: editData.consulting_case_studies,
        promise_check: naturalRole.promise_check,
        practice_check: naturalRole.practice_check,
        training_check: naturalRole.training_check,
        consulting_check: naturalRole.consulting_check,
        wants_to_scale: naturalRole.wants_to_scale,
        change_notes: changeNotes || null,
      });

      if (versionError) throw versionError;

      const { error: updateError } = await supabase.from("natural_roles").update(editData).eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Resume Updated",
        description: `Version ${nextVersion} saved successfully.`,
      });

      setIsEditing(false);
      setChangeNotes("");
      refetch();

      const { data } = await supabase
        .from("onboarding_answer_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version_number", { ascending: false });

      if (data) setVersions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const restoreVersion = async (version: AnswerVersion) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const nextVersionNum = versions.length > 0 ? versions[0].version_number + 1 : 1;

      const { error: versionError } = await supabase.from("onboarding_answer_versions").insert({
        user_id: user.id,
        version_number: nextVersionNum,
        description: version.description,
        practice_entities: version.practice_entities,
        practice_case_studies: version.practice_case_studies,
        training_contexts: version.training_contexts,
        training_count: version.training_count,
        consulting_with_whom: version.consulting_with_whom,
        consulting_case_studies: version.consulting_case_studies,
        promise_check: version.promise_check,
        practice_check: version.practice_check,
        training_check: version.training_check,
        consulting_check: version.consulting_check,
        wants_to_scale: version.wants_to_scale,
        change_notes: `Restored from version ${version.version_number}`,
      });

      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from("natural_roles")
        .update({
          description: version.description,
          practice_entities: version.practice_entities,
          training_contexts: version.training_contexts,
          consulting_with_whom: version.consulting_with_whom,
          consulting_case_studies: version.consulting_case_studies,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}.`,
      });

      refetch();

      const { data } = await supabase
        .from("onboarding_answer_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version_number", { ascending: false });

      if (data) setVersions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore version.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getReviewStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-b4-teal text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (authLoading || statusLoading || hasTeamMemberships === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Allow access if user can scale OR has team memberships
  const canAccessPage = canAccessScaling || hasTeamMemberships;

  if (!canAccessPage) {
    return null; // Will redirect via useEffect
  }

  // Non-boosted users with team memberships can only see cobuilder section
  const isTeamMemberOnly = !canAccessScaling && hasTeamMemberships;

  const StatusBadge = ({ checked }: { checked: boolean | null }) =>
    checked ? (
      <Badge variant="default" className="bg-b4-teal text-white">
        <CheckCircle className="w-3 h-3 mr-1" /> Complete
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
      </Badge>
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="py-12 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Scale</h1>
            </div>
            <p className="text-primary-foreground/80 max-w-2xl">
              Your scaling headquarters. Manage your Mask, track your ideas, and build beyond yourself.
            </p>
            <div className="mt-4">
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                {getStatusLabel()}
              </Badge>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-5xl mx-auto px-4">
            {/* Section Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border/50 flex-wrap justify-center">
                {!isTeamMemberOnly && (
                  <button
                    onClick={() => setActiveSection("ideas")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeSection === "ideas"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Scale as Initiator
                    {userIdeas.length > 0 && (
                      <Badge className="ml-2 bg-b4-teal text-white text-xs">{userIdeas.length}</Badge>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setActiveSection("cobuilder")}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === "cobuilder"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  {isTeamMemberOnly ? "My Teams" : "Scale as Co-Builder"}
                </button>
                {!isTeamMemberOnly && hasConsultantAccess && (
                  <button
                    onClick={() => setActiveSection("scale")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeSection === "scale"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Scale As Consultant
                  </button>
                )}
              </div>
            </div>

            {/* Scale Your NR Section */}
            <div className={`space-y-8 ${activeSection === "scale" ? "block" : "hidden"}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Your Consultant Journey</h2>
                  <p className="text-muted-foreground mt-1">
                    Build your Mask, scale your expertise, and operate beyond yourself
                  </p>
                </div>
                {hasConsultantCert ? (
                  <Button variant="outline" onClick={() => handleOpenStepDialog(1)}>
                    <Theater className="w-4 h-4 mr-2" />
                    Open Your Mask
                  </Button>
                ) : (
                  <Button variant="teal" onClick={() => navigate("/journey?section=consultant")}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Get Certified
                  </Button>
                )}
              </div>

              {!hasConsultantCert && (
                <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-2">Certification Required</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Complete the Consultant learning journey to unlock the full scaling experience and track your
                          consulting missions.
                        </p>
                      </div>
                      <Button variant="teal" onClick={() => navigate("/journey?section=consultant")} className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        Learn to be a Consultant
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Work as Consultant is now inside Step 1 dialog as Phase 0 */}
              {hasConsultantCert && !showScaleExperience && (
                <div className="text-center">
                  <Button variant="teal" onClick={() => setShowScaleExperience(true)} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Start The Experience
                  </Button>
                </div>
              )}

              {/* Journey Progress Header - Only show when experience is started */}
              {hasConsultantCert && showScaleExperience && (
                <div className="text-center animate-fade-in">
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Scale Your Natural Role</h2>
                  <p className="text-muted-foreground">A 3-step journey to build scalable impact</p>
                </div>
              )}

              {/* Journey Steps - Only show when experience is started */}
              {hasConsultantCert && showScaleExperience && (
                <div className="relative animate-fade-in">
                  {/* Connection Line */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 to-emerald-500 hidden md:block"
                    style={{ transform: "translateX(-50%)" }}
                  />

                  <div className="space-y-6">
                    {SCALE_NR_STEPS.map((step, index) => (
                      <div key={step.step} className={`relative ${index % 2 === 0 ? "md:pr-[52%]" : "md:pl-[52%]"}`}>
                        {/* Step Number Badge */}
                        <div
                          className={`hidden md:flex absolute left-1/2 top-6 w-10 h-10 rounded-full bg-gradient-to-r ${step.color} items-center justify-center text-white font-bold text-lg shadow-lg z-10`}
                          style={{ transform: "translateX(-50%)" }}
                        >
                          {step.step}
                        </div>

                        <Card className="border-border/50 hover:shadow-lg transition-shadow overflow-hidden">
                          <div className={`h-1 bg-gradient-to-r ${step.color}`} />
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className={`md:hidden p-3 rounded-xl bg-gradient-to-r ${step.color} shrink-0`}>
                                <step.icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="hidden md:block p-3 rounded-xl bg-muted shrink-0">
                                <step.icon className="w-6 h-6 text-foreground" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Step {step.step}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {step.subtitle}
                                      </Badge>
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                  </div>
                                  <Button
                                    variant={stepCompletionStatus[step.step] ? "outline" : "teal"}
                                    size="sm"
                                    onClick={() => handleOpenStepDialog(step.step as 1 | 2 | 3)}
                                    className="shrink-0"
                                  >
                                    {stepCompletionStatus[step.step] ? (
                                      <>
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Done
                                      </>
                                    ) : (
                                      "Fill it"
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                <ul className="space-y-2">
                                  {step.details.map((detail, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground">{detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcome Message - Only show when experience is started */}
              {hasConsultantCert && showScaleExperience && (
                <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 animate-fade-in">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-2">The Outcome</h3>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                          You scale your impact{" "}
                          <strong className="text-foreground">without being the bottleneck</strong>. Your Mask operates
                          independently — value becomes repeatable, transferable, and truly scalable.
                        </p>
                      </div>
                      {stepCompletionStatus[1] && stepCompletionStatus[2] && stepCompletionStatus[3] && (
                        <div className="pt-4">
                          <Button
                            variant="hero"
                            size="lg"
                            onClick={() => navigate("/entrepreneurial-onboarding")}
                            className="gap-2"
                          >
                            <Rocket className="w-5 h-5" />
                            Explore the Entrepreneurial Journey
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Your Ideas Section */}
            <div className={`space-y-6 ${activeSection === "ideas" ? "block" : "hidden"}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Your Ideas</h2>
                  <p className="text-muted-foreground mt-1">Startup ideas you initiated and their status</p>
                </div>
                <Button variant="teal" asChild>
                  <Link to="/create-idea">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Create New Idea
                  </Link>
                </Button>
              </div>

              {loadingIdeas ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : userIdeas.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="py-12 text-center">
                    <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Ideas Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by creating your first startup idea and get it reviewed.
                    </p>
                    <Button variant="teal" asChild>
                      <Link to="/create-idea">
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Create Your First Idea
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {userIdeas.map((idea) => (
                    <Card key={idea.id} className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-display font-bold text-foreground truncate">{idea.title}</h3>
                              {getReviewStatusBadge(idea.review_status)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{idea.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {idea.sector && (
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {idea.sector}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(idea.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setIdeaToDelete({ id: idea.id, title: idea.title });
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete idea"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/opportunities/${idea.id}`}>View</Link>
                            </Button>
                            {idea.review_status === "approved" && (
                              <>
                                {/* Team button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTeamDialogIdea({ id: idea.id, title: idea.title });
                                    setTeamDialogOpen(true);
                                  }}
                                >
                                  <Users className="w-4 h-4 mr-1" />
                                  Team
                                </Button>

                                {/* Episodes button - shows when development is completed */}
                                {idea.development_completed_at && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedIdea({
                                        id: idea.id,
                                        title: idea.title,
                                        currentEpisode: idea.current_episode,
                                      });
                                      setEpisodesDialogOpen(true);
                                    }}
                                  >
                                    <Film className="w-4 h-4 mr-1" />
                                    Episodes
                                  </Button>
                                )}

                                {/* Dynamic action button based on current episode */}
                                {idea.current_episode === "development" && (
                                  <Button
                                    variant="teal"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedIdea({
                                        id: idea.id,
                                        title: idea.title,
                                        currentEpisode: idea.current_episode,
                                      });
                                      setDevelopDialogOpen(true);
                                    }}
                                  >
                                    Develop
                                  </Button>
                                )}
                                {idea.current_episode === "validation" && (
                                  <Button
                                    variant="teal"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedIdea({
                                        id: idea.id,
                                        title: idea.title,
                                        currentEpisode: idea.current_episode,
                                      });
                                      setValidationDialogOpen(true);
                                    }}
                                  >
                                    <Shield className="w-4 h-4 mr-1" />
                                    Validate
                                  </Button>
                                )}
                                {idea.current_episode === "growth" && (
                                  <Button
                                    variant="teal"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedIdea({
                                        id: idea.id,
                                        title: idea.title,
                                        currentEpisode: idea.current_episode,
                                      });
                                      setGrowthDialogOpen(true);
                                    }}
                                  >
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    Grow
                                  </Button>
                                )}
                                {idea.current_episode === "completed" && (
                                  <Badge className="bg-b4-teal text-white">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Journey Complete
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Archived Ideas Section */}
              {archivedIdeas.length > 0 && (
                <Collapsible open={showArchivedSection} onOpenChange={setShowArchivedSection} className="mt-8">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        <span>Archived Ideas</span>
                        <Badge variant="secondary" className="text-xs">
                          {archivedIdeas.length}
                        </Badge>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          showArchivedSection ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    {archivedIdeas.map((idea) => (
                      <Card key={idea.id} className="border-border/50 bg-muted/30 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-display font-bold text-muted-foreground truncate">
                                  {idea.title}
                                </h3>
                                <Badge variant="secondary" className="opacity-70">
                                  <Archive className="w-3 h-3 mr-1" />
                                  Archived
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-3">{idea.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                                {idea.sector && (
                                  <span className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    {idea.sector}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(idea.created_at), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreIdea({ id: idea.id, title: idea.title })}
                                disabled={restoringIdeaId === idea.id}
                                className="text-b4-teal hover:text-b4-teal hover:bg-b4-teal/10 border-b4-teal/30"
                              >
                                {restoringIdeaId === idea.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Restore
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setIdeaToDelete({ id: idea.id, title: idea.title });
                                  setDeleteType("permanent");
                                  setDeleteDialogOpen(true);
                                }}
                                title="Delete permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Scale as Co-Builder Section */}
            <div className={`${activeSection === "cobuilder" && user ? "block" : "hidden"}`}>
              {user && <CoBuilderApplicationsSection userId={user.id} />}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ScaleStepDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        stepNumber={activeStep}
        onComplete={() => fetchStepCompletionStatus()}
      />
      {selectedIdea && (
        <>
          <IdeaDevelopDialog
            open={developDialogOpen}
            onOpenChange={setDevelopDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            onEpisodeComplete={async () => {
              // Refresh ideas to get updated episode status
              const { data } = await supabase
                .from("startup_ideas")
                .select(
                  "id, title, description, sector, review_status, status, created_at, current_episode, development_completed_at, validation_completed_at, growth_completed_at",
                )
                .eq("creator_id", user?.id)
                .order("created_at", { ascending: false });
              if (data) {
                const active = data.filter((idea) => idea.status !== "archived");
                const archived = data.filter((idea) => idea.status === "archived");
                setUserIdeas(active);
                setArchivedIdeas(archived);
              }
            }}
          />
          <IdeaValidationDialog
            open={validationDialogOpen}
            onOpenChange={setValidationDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            onEpisodeComplete={async () => {
              const { data } = await supabase
                .from("startup_ideas")
                .select(
                  "id, title, description, sector, review_status, status, created_at, current_episode, development_completed_at, validation_completed_at, growth_completed_at",
                )
                .eq("creator_id", user?.id)
                .order("created_at", { ascending: false });
              if (data) {
                const active = data.filter((idea) => idea.status !== "archived");
                const archived = data.filter((idea) => idea.status === "archived");
                setUserIdeas(active);
                setArchivedIdeas(archived);
              }
            }}
          />
          <IdeaGrowthDialog
            open={growthDialogOpen}
            onOpenChange={setGrowthDialogOpen}
            ideaId={selectedIdea.id}
            ideaTitle={selectedIdea.title}
            onEpisodeComplete={async () => {
              const { data } = await supabase
                .from("startup_ideas")
                .select(
                  "id, title, description, sector, review_status, status, created_at, current_episode, development_completed_at, validation_completed_at, growth_completed_at",
                )
                .eq("creator_id", user?.id)
                .order("created_at", { ascending: false });
              if (data) {
                const active = data.filter((idea) => idea.status !== "archived");
                const archived = data.filter((idea) => idea.status === "archived");
                setUserIdeas(active);
                setArchivedIdeas(archived);
              }
            }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteType(null);
          }
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
            {/* Archive Option */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                deleteType === "archive"
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-border hover:border-amber-500/50"
              }`}
              onClick={() => setDeleteType("archive")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    deleteType === "archive" ? "border-amber-500" : "border-muted-foreground"
                  }`}
                >
                  {deleteType === "archive" && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Archive Idea (Recommended)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The idea will be hidden from public view but can be restored later.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">Recoverable</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">Data preserved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permanent Delete Option */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                deleteType === "permanent"
                  ? "border-destructive bg-destructive/10"
                  : "border-border hover:border-destructive/50"
              }`}
              onClick={() => setDeleteType("permanent")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    deleteType === "permanent" ? "border-destructive" : "border-muted-foreground"
                  }`}
                >
                  {deleteType === "permanent" && <div className="w-2.5 h-2.5 rounded-full bg-destructive" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Delete Permanently</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The idea and all associated data will be permanently removed. This cannot be undone.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                      Cannot be undone
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                      All data removed
                    </span>
                  </div>
                </div>
              </div>
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
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {deleteType === "permanent" ? "Deleting..." : "Archiving..."}
                </>
              ) : deleteType === "permanent" ? (
                "Delete Permanently"
              ) : (
                "Archive Idea"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Management Dialog */}
      {teamDialogIdea && (
        <TeamManagementDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          startupId={teamDialogIdea.id}
          startupTitle={teamDialogIdea.title}
          currentUserId={user?.id || ""}
        />
      )}
    </div>
  );
};

export default Scale;

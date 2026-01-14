import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import { format } from "date-fns";

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
}

const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Create the Mask",
    subtitle: "Entity Creation",
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
    title: "Code the Mask",
    subtitle: "Structure the Entity",
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
    title: "Detach & Scale",
    subtitle: "Person → Entity Separation",
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
  const { user, loading: authLoading } = useAuth();
  const { naturalRole, onboardingState, refetch } = useOnboarding();
  const { canAccessScaling, userStatus, getStatusLabel, loading: statusLoading } = useUserStatus();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<AnswerVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [activeSection, setActiveSection] = useState<"scale" | "ideas">("scale");
  const [userIdeas, setUserIdeas] = useState<StartupIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [editData, setEditData] = useState({
    description: "",
    practice_entities: "",
    training_contexts: "",
    consulting_with_whom: "",
    consulting_case_studies: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if user doesn't have access to scaling
  useEffect(() => {
    if (!authLoading && !statusLoading && user && !canAccessScaling) {
      toast({
        title: "Access Restricted",
        description: "Complete a boosting journey to unlock the Scale page.",
        variant: "destructive",
      });
      navigate("/journey", { replace: true });
    }
  }, [authLoading, statusLoading, user, canAccessScaling, navigate, toast]);

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
        .select("id, title, description, sector, review_status, status, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUserIdeas(data);
      }
      setLoadingIdeas(false);
    };

    fetchUserIdeas();
  }, [user]);

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

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessScaling) {
    return null; // Will redirect via useEffect
  }

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
              <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border/50">
                <button
                  onClick={() => setActiveSection("scale")}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === "scale"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Scale Your Personal Promise
                </button>
                <button
                  onClick={() => setActiveSection("ideas")}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === "ideas"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Lightbulb className="w-4 h-4 inline mr-2" />
                  Scale your venture ideas
                  {userIdeas.length > 0 && (
                    <Badge className="ml-2 bg-b4-teal text-white text-xs">{userIdeas.length}</Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Scale Your NR Section */}
            {activeSection === "scale" && (
              <div className="space-y-8 animate-fade-in">
                {/* Concept Explanation */}
                <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
                        <Theater className="w-8 h-8 text-white" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-display font-bold text-foreground">What is a Mask?</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          A <strong className="text-foreground">Mask</strong> is an entity you create and fully own. It
                          represents a structured version of your natural role — allowing you to operate beyond
                          yourself.
                        </p>
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">Person:</strong> Youssef Ben Younes
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">Mask:</strong> Hackit
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Journey Progress Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Scale Your Natural Role</h2>
                  <p className="text-muted-foreground">A 3-step journey to build scalable impact</p>
                </div>

                {/* Journey Steps */}
                <div className="relative">
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

                {/* Outcome Message */}
                <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
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
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Your Ideas Section */}
            {activeSection === "ideas" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-foreground">Your Ideas</h2>
                    <p className="text-muted-foreground mt-1">Startup ideas you've created and their status</p>
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
                                <h3 className="text-lg font-display font-bold text-foreground truncate">
                                  {idea.title}
                                </h3>
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
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/opportunities/${idea.id}`}>View</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Scale;

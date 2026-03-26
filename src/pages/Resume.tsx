import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useUserStatus } from "@/hooks/useUserStatus";
import { supabase } from "@/integrations/supabase/client";
import ResumeEditBar from "@/components/resume/ResumeEditBar";
import SectionActions from "@/components/resume/SectionActions";
import { 
  History, 
  ChevronDown, 
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  ArrowRight,
  Plus,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Users,
  Target,
  Sparkles,
  Lock,
  Download,
  User,
  FolderOpen,
  Award,
  Lightbulb,
  BookOpen
} from "lucide-react";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { exportResumeToPdf } from "@/lib/resumePdfExport";
import { Progress } from "@/components/ui/progress";
import { TrainTeamDialog } from "@/components/resume/TrainTeamDialog";
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

const Resume = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { naturalRole, onboardingState, refetch } = useOnboarding();
  const { canAccessBoosting, loading: statusLoading } = useUserStatus();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [versions, setVersions] = useState<AnswerVersion[]>([]);
  const [showGlobalHistory, setShowGlobalHistory] = useState(false);
  const [sectionHistory, setSectionHistory] = useState<string | null>(null);
  const [isTogglingPromise, setIsTogglingPromise] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showTrainDialog, setShowTrainDialog] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    bio: string | null;
    primary_skills: string | null;
    years_of_experience: number | null;
    professional_title: string | null;
    key_projects: string | null;
    education_certifications: string | null;
    summary_statement: string | null;
  } | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [profileEditData, setProfileEditData] = useState({
    professional_title: "",
    bio: "",
    primary_skills: "",
    years_of_experience: "",
    key_projects: "",
    education_certifications: "",
    summary_statement: "",
  });
  const [editData, setEditData] = useState({
    description: "",
    services_description: "",
    practice_entities: "",
    training_contexts: "",
    consulting_with_whom: "",
    consulting_case_studies: "",
  });

  // Helper to start editing a specific section with smooth scroll
  const startEditing = (sectionId?: string) => {
    setIsEditing(true);
    setActiveSection(sectionId || null);
    setSectionHistory(null); // Close any open section history

    // Single smooth scroll: go straight where the user clicked.
    setTimeout(() => {
      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        const section = document.getElementById(sectionId);
        const textarea = section?.querySelector("textarea") as HTMLTextAreaElement | null;
        textarea?.focus();
      }
    }, 50);
  };

  // Toggle section-specific history panel
  const toggleSectionHistory = (sectionId: string) => {
    setSectionHistory(prev => prev === sectionId ? null : sectionId);
  };

  // Get version history for a specific field
  const getFieldHistory = (fieldName: keyof AnswerVersion) => {
    return versions.filter(v => v[fieldName] !== null && v[fieldName] !== "");
  };

  const togglePromiseCheck = async () => {
    if (!user || !naturalRole || isTogglingPromise) return;
    
    setIsTogglingPromise(true);
    try {
      const newValue = !naturalRole.promise_check;
      const { error } = await supabase
        .from("natural_roles")
        .update({ promise_check: newValue })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast({
        title: newValue ? "Promise Activated" : "Promise Deactivated",
        description: newValue 
          ? "You can now add Practice, Training, and Consulting experience." 
          : "Practice, Training, and Consulting sections are now hidden.",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update promise status.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingPromise(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Resume is now accessible to all authenticated users

  useEffect(() => {
    if (naturalRole) {
      setEditData({
        description: naturalRole.description || "",
        services_description: (naturalRole as any).services_description || "",
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

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, bio, primary_skills, years_of_experience, professional_title, key_projects, education_certifications, summary_statement")
        .eq("user_id", user.id)
        .single();
      
      if (!error && data) {
        setProfile(data as any);
        setProfileEditData({
          professional_title: (data as any).professional_title || "",
          bio: data.bio || "",
          primary_skills: data.primary_skills || "",
          years_of_experience: data.years_of_experience?.toString() || "",
          key_projects: (data as any).key_projects || "",
          education_certifications: (data as any).education_certifications || "",
          summary_statement: (data as any).summary_statement || "",
        });
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleGenerateTitle = async () => {
    if (!user) return;
    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-title", {
        body: {
          profileData: {
            full_name: profile?.full_name,
            bio: profileEditData.bio || profile?.bio,
            primary_skills: profileEditData.primary_skills || profile?.primary_skills,
            years_of_experience: profileEditData.years_of_experience || profile?.years_of_experience,
            key_projects: profileEditData.key_projects || profile?.key_projects,
            education_certifications: profileEditData.education_certifications || profile?.education_certifications,
          },
          naturalRoleData: naturalRole ? {
            description: editData.description || naturalRole.description,
            practice_entities: editData.practice_entities || naturalRole.practice_entities,
            training_contexts: editData.training_contexts || naturalRole.training_contexts,
            consulting_with_whom: editData.consulting_with_whom || naturalRole.consulting_with_whom,
            services_description: editData.services_description || (naturalRole as any).services_description,
          } : null,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Cannot generate", description: data.error, variant: "destructive" });
      } else if (data?.title) {
        setProfileEditData(prev => ({ ...prev, professional_title: data.title }));
        toast({ title: "Title generated!", description: "Review and edit as needed, then save." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate title.", variant: "destructive" });
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleExportPdf = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      exportResumeToPdf({
        userName: profile?.full_name || undefined,
        professionalTitle: profile?.professional_title || undefined,
        bio: profile?.bio || undefined,
        primarySkills: profile?.primary_skills || undefined,
        yearsOfExperience: profile?.years_of_experience,
        keyProjects: profile?.key_projects || undefined,
        educationCertifications: profile?.education_certifications || undefined,
        summaryStatement: profile?.summary_statement || undefined,
        description: naturalRole?.description || undefined,
        servicesDescription: (naturalRole as any)?.services_description || undefined,
        promiseCheck: naturalRole?.promise_check || false,
        practiceCheck: naturalRole?.practice_check || false,
        practiceEntities: naturalRole?.practice_entities || undefined,
        practiceCaseStudies: naturalRole?.practice_case_studies,
        trainingCheck: naturalRole?.training_check || false,
        trainingContexts: naturalRole?.training_contexts || undefined,
        trainingCount: naturalRole?.training_count,
        consultingCheck: naturalRole?.consulting_check || false,
        consultingWithWhom: naturalRole?.consulting_with_whom || undefined,
        consultingCaseStudies: naturalRole?.consulting_case_studies || undefined,
        wantsToScale: naturalRole?.wants_to_scale ?? undefined,
      });
      
      toast({
        title: "Resume Exported",
        description: "Your resume has been downloaded as a PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export resume.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!user || !naturalRole) return;
    
    setIsSaving(true);
    try {
      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
      
      const { error: versionError } = await supabase
        .from("onboarding_answer_versions")
        .insert({
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
          change_notes: `Updated via Resume page`,
        });
      
      if (versionError) throw versionError;
      
      const { error: updateError } = await supabase
        .from("natural_roles")
        .update(editData)
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;

      // Save profile fields
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          professional_title: profileEditData.professional_title.trim() || null,
          bio: profileEditData.bio.trim() || null,
          primary_skills: profileEditData.primary_skills.trim() || null,
          years_of_experience: profileEditData.years_of_experience ? parseInt(profileEditData.years_of_experience, 10) : null,
          key_projects: profileEditData.key_projects.trim() || null,
          education_certifications: profileEditData.education_certifications.trim() || null,
          summary_statement: profileEditData.summary_statement.trim() || null,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Refresh profile state
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("full_name, bio, primary_skills, years_of_experience, professional_title, key_projects, education_certifications, summary_statement")
        .eq("user_id", user.id)
        .single();
      if (updatedProfile) setProfile(updatedProfile as any);
      
      toast({
        title: "Resume Updated",
        description: `Version ${nextVersion} saved successfully.`,
      });
      
      setIsEditing(false);
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
      
      const { error: versionError } = await supabase
        .from("onboarding_answer_versions")
        .insert({
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

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate progress
  const calculateProgress = () => {
    if (!naturalRole) return { completed: 0, total: 5, percentage: 0 };
    
    const sections = [
      !!naturalRole.description,
      naturalRole.promise_check,
      naturalRole.practice_check,
      naturalRole.training_check,
      naturalRole.consulting_check,
    ];
    
    const completed = sections.filter(Boolean).length;
    return { completed, total: 5, percentage: Math.round((completed / 5) * 100) };
  };
  
  const progress = calculateProgress();

  // Section history panel component
  const SectionHistoryPanel = ({ sectionId, fieldName, label }: { sectionId: string; fieldName: keyof AnswerVersion; label: string }) => {
    if (sectionHistory !== sectionId) return null;
    const fieldVersions = versions.filter(v => v[fieldName] !== null && v[fieldName] !== "");
    
    if (fieldVersions.length === 0) {
      return (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground text-center">No history available for this section yet.</p>
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 bg-muted/30 rounded-lg border animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label} History</span>
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {fieldVersions.slice(0, 5).map((v, idx) => (
              <div key={v.id} className={`p-3 rounded border text-sm ${idx === 0 ? 'border-b4-teal/30 bg-b4-teal/5' : 'border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={idx === 0 ? "default" : "outline"} className={idx === 0 ? "bg-b4-teal text-xs" : "text-xs"}>
                    v{v.version_number}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(v.created_at), "MMM d, yyyy")}
                  </span>
                  {idx === 0 && <Badge variant="secondary" className="text-xs">Current</Badge>}
                </div>
                <p className="text-muted-foreground line-clamp-2">{String(v[fieldName])}</p>
                {idx !== 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restoreVersion(v)}
                    disabled={isSaving}
                    className="mt-2 h-7 text-xs"
                  >
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Header with Progress */}
        <section className="py-12 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-8 h-8" />
                  <h1 className="font-display text-3xl font-bold">Profile Summary</h1>
                </div>
                <p className="text-primary-foreground/80 max-w-xl mb-4">
                  Track your journey progress and add new experiences as you grow. 
                  Each update is saved in your version history.
                </p>
                {naturalRole && (
                  <Button
                    variant="hero-outline"
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="gap-2"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export PDF
                  </Button>
                )}
              </div>
              
              {naturalRole && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Progress</span>
                  </div>
                  <div className="text-3xl font-bold mb-2">{progress.percentage}%</div>
                  <Progress value={progress.percentage} className="h-2 bg-white/20" />
                  <p className="text-xs text-primary-foreground/70 mt-2">
                    {progress.completed} of {progress.total} sections complete
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className={`container max-w-5xl mx-auto px-4 ${isEditing ? "pb-24" : ""}`}>

            {/* Support Needed Banner */}
            {naturalRole?.status === "assistance_requested" && (
              <Card className="mb-8 border-b4-coral/20 bg-b4-coral/5">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-b4-coral/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-b4-coral" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-foreground mb-1">Support Needed</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        You requested help defining your Natural Role. Once you define it, you can continue your 
                        onboarding journey and submit for approval.
                      </p>
                      <Button variant="teal" onClick={() => navigate("/onboarding")}>
                        Define My Natural Role
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State for users who haven't completed onboarding */}
            {!naturalRole && (
              <Card className="mb-8 border-b4-teal/20 bg-b4-teal/5">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-b4-teal/10 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-b4-teal" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-2">Build Your Resume</h3>
                      <p className="text-muted-foreground max-w-md mb-4">
                        Complete your onboarding journey to define your Natural Role and track your experience. 
                        Your resume will show your progress as you add new case studies and experiences.
                      </p>
                      <Button variant="teal" onClick={() => navigate("/onboarding")}>
                        Start Onboarding
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resume Content - Only show if user has natural role data */}
            {naturalRole && (
              <div className="space-y-6 animate-fade-in">
              
              {/* Quick Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <button
                  onClick={() => startEditing('section-natural-role')}
                  className={`rounded-xl p-4 text-center transition-all hover:scale-[1.02] ${naturalRole.description ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-muted/50 border border-dashed border-muted-foreground/20 hover:border-b4-teal/40 hover:bg-b4-teal/5'}`}
                >
                  <Target className={`w-5 h-5 mx-auto mb-1 ${naturalRole.description ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                  <p className="text-xs text-muted-foreground">Natural Role</p>
                  <p className={`text-sm font-medium ${naturalRole.description ? 'text-b4-teal' : 'text-muted-foreground'}`}>
                    {naturalRole.description ? '✓' : 'Add +'}
                  </p>
                </button>
                <button
                  onClick={togglePromiseCheck}
                  disabled={isTogglingPromise}
                  className={`rounded-xl p-4 text-center transition-all hover:scale-[1.02] ${naturalRole.promise_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-muted/50 border border-dashed border-muted-foreground/20 hover:border-b4-teal/40 hover:bg-b4-teal/5'}`}
                >
                  <Sparkles className={`w-5 h-5 mx-auto mb-1 ${naturalRole.promise_check ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                  <p className="text-xs text-muted-foreground">Promise</p>
                  <p className={`text-sm font-medium ${naturalRole.promise_check ? 'text-b4-teal' : 'text-muted-foreground'}`}>
                    {isTogglingPromise ? '...' : naturalRole.promise_check ? 'Yes' : 'No'}
                  </p>
                </button>
                {naturalRole.promise_check ? (
                  <>
                    <button
                      onClick={() => startEditing('section-practice')}
                      className={`rounded-xl p-4 text-center transition-all hover:scale-[1.02] ${naturalRole.practice_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-amber-500/10 border border-dashed border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/15'}`}
                    >
                      <Briefcase className={`w-5 h-5 mx-auto mb-1 ${naturalRole.practice_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                      <p className="text-xs text-muted-foreground">Practice</p>
                      <p className={`text-sm font-medium ${naturalRole.practice_check ? 'text-b4-teal' : 'text-amber-600'}`}>
                        {naturalRole.practice_check ? `${naturalRole.practice_case_studies || 0} cases` : 'Add +'}
                      </p>
                    </button>
                    <button
                      onClick={() => startEditing('section-training')}
                      className={`rounded-xl p-4 text-center transition-all hover:scale-[1.02] ${naturalRole.training_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-amber-500/10 border border-dashed border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/15'}`}
                    >
                      <GraduationCap className={`w-5 h-5 mx-auto mb-1 ${naturalRole.training_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                      <p className="text-xs text-muted-foreground">Training</p>
                      <p className={`text-sm font-medium ${naturalRole.training_check ? 'text-b4-teal' : 'text-amber-600'}`}>
                        {naturalRole.training_check ? `${naturalRole.training_count || 0} trained` : 'Add +'}
                      </p>
                    </button>
                    <button
                      onClick={() => startEditing('section-consulting')}
                      className={`rounded-xl p-4 text-center transition-all hover:scale-[1.02] ${naturalRole.consulting_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-amber-500/10 border border-dashed border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/15'}`}
                    >
                      <Users className={`w-5 h-5 mx-auto mb-1 ${naturalRole.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                      <p className="text-xs text-muted-foreground">Consulting</p>
                      <p className={`text-sm font-medium ${naturalRole.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`}>
                        {naturalRole.consulting_check ? '✓' : 'Add +'}
                      </p>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Locked placeholder slots */}
                    <div className="rounded-xl p-4 text-center bg-muted/30 border border-dashed border-muted-foreground/20 opacity-50">
                      <Lock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Practice</p>
                      <p className="text-sm font-medium text-muted-foreground">Locked</p>
                    </div>
                    <div className="rounded-xl p-4 text-center bg-muted/30 border border-dashed border-muted-foreground/20 opacity-50">
                      <Lock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Training</p>
                      <p className="text-sm font-medium text-muted-foreground">Locked</p>
                    </div>
                    <div className="rounded-xl p-4 text-center bg-muted/30 border border-dashed border-muted-foreground/20 opacity-50">
                      <Lock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Consulting</p>
                      <p className="text-sm font-medium text-muted-foreground">Locked</p>
                    </div>
                  </>
                )}
              </div>

              {/* Header Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Experience Details</h2>
                  <p className="text-muted-foreground mt-1">
                    Use the action buttons on each section to edit, add, or view history
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowGlobalHistory(!showGlobalHistory)}
                  className="gap-2"
                >
                  <History className="w-4 h-4" />
                  All History ({versions.length})
                </Button>
              </div>

              {/* Version History Panel */}
              {showGlobalHistory && versions.length > 0 && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Version History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {versions.map((version, idx) => (
                          <Collapsible key={version.id}>
                            <div className={`p-3 rounded-lg border ${idx === 0 ? 'border-b4-teal/30 bg-b4-teal/5' : 'border-border'}`}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant={idx === 0 ? "default" : "outline"} className={idx === 0 ? "bg-b4-teal" : ""}>
                                      v{version.version_number}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                    {idx === 0 && <Badge variant="secondary">Current</Badge>}
                                  </div>
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </div>
                                {version.change_notes && (
                                  <p className="text-sm text-left text-muted-foreground mt-1 italic">
                                    "{version.change_notes}"
                                  </p>
                                )}
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-3 mt-3 border-t border-border">
                                <div className="space-y-3 text-sm">
                                  {version.description && (
                                    <div>
                                      <span className="font-medium text-foreground">Natural Role:</span>
                                      <p className="text-muted-foreground mt-1">{version.description}</p>
                                    </div>
                                  )}
                                  {version.practice_entities && (
                                    <div>
                                      <span className="font-medium text-foreground">Practice Entities:</span>
                                      <p className="text-muted-foreground mt-1">{version.practice_entities}</p>
                                    </div>
                                  )}
                                  {version.training_contexts && (
                                    <div>
                                      <span className="font-medium text-foreground">Training Contexts:</span>
                                      <p className="text-muted-foreground mt-1">{version.training_contexts}</p>
                                    </div>
                                  )}
                                  {version.consulting_with_whom && (
                                    <div>
                                      <span className="font-medium text-foreground">Consulting With:</span>
                                      <p className="text-muted-foreground mt-1">{version.consulting_with_whom}</p>
                                    </div>
                                  )}
                                  {version.consulting_case_studies && (
                                    <div>
                                      <span className="font-medium text-foreground">Consulting Case Studies:</span>
                                      <p className="text-muted-foreground mt-1">{version.consulting_case_studies}</p>
                                    </div>
                                  )}
                                  {idx !== 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => restoreVersion(version)}
                                      disabled={isSaving}
                                      className="mt-2"
                                    >
                                      Restore This Version
                                    </Button>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
              {/* Resume Cards */}
              <div className="grid gap-6">
                {/* Natural Role */}
                <Card id="section-natural-role" className={`transition-all scroll-mt-24 ${!naturalRole?.description && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.description ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Target className={`w-4 h-4 ${naturalRole?.description ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Natural Role
                      </CardTitle>
                      <SectionActions
                        hasContent={!!naturalRole?.description}
                        isEditing={isEditing}
                        showHistory={sectionHistory === 'section-natural-role'}
                        onEdit={() => startEditing('section-natural-role')}
                        onToggleHistory={() => toggleSectionHistory('section-natural-role')}
                        onAdd={() => startEditing('section-natural-role')}
                      />
                    </div>
                    <CardDescription>
                      Your unique value proposition and expertise
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your natural role - what unique value do you bring?"
                        rows={4}
                      />
                    ) : naturalRole?.description ? (
                      <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                        "{naturalRole.description}"
                      </p>
                    ) : (
                      <button 
                        onClick={() => startEditing('section-natural-role')}
                        className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to add your natural role</p>
                      </button>
                    )}
                    <SectionHistoryPanel sectionId="section-natural-role" fieldName="description" label="Natural Role" />
                  </CardContent>
                </Card>

                {/* Professional Title */}
                <Card id="section-professional-title" className={`transition-all scroll-mt-24 ${!profile?.professional_title && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.professional_title ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Briefcase className={`w-4 h-4 ${profile?.professional_title ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Professional Title
                      </CardTitle>
                      <SectionActions
                        hasContent={!!profile?.professional_title}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-professional-title')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-professional-title')}
                      />
                    </div>
                    <CardDescription>
                      Your current professional title or headline
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={profileEditData.professional_title}
                          onChange={(e) => setProfileEditData(prev => ({ ...prev, professional_title: e.target.value }))}
                          placeholder="e.g., Senior Product Strategist, Full-Stack Developer, Business Consultant..."
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isGeneratingTitle}
                          onClick={handleGenerateTitle}
                          className="gap-2"
                        >
                          {isGeneratingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isGeneratingTitle ? "Generating..." : "Generate with AI"}
                        </Button>
                      </div>
                    ) : profile?.professional_title ? (
                      <p className="text-foreground font-medium text-lg bg-muted/30 rounded-lg p-4">{profile.professional_title}</p>
                    ) : (
                      <button onClick={() => startEditing('section-professional-title')} className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to add your professional title</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Profile Overview */}
                <Card id="section-profile-overview" className={`transition-all scroll-mt-24 ${!profile?.bio && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.bio ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <User className={`w-4 h-4 ${profile?.bio ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Profile Overview
                      </CardTitle>
                      <SectionActions
                        hasContent={!!(profile?.bio || profile?.primary_skills)}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-profile-overview')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-profile-overview')}
                      />
                    </div>
                    <CardDescription>
                      Your bio, skills, and years of experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Bio</Label>
                          <Textarea
                            value={profileEditData.bio}
                            onChange={(e) => setProfileEditData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="A brief description of who you are and what you do..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Years of Experience</Label>
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            value={profileEditData.years_of_experience}
                            onChange={(e) => setProfileEditData(prev => ({ ...prev, years_of_experience: e.target.value }))}
                            placeholder="e.g., 5"
                            className="mt-1 max-w-[150px]"
                          />
                        </div>
                      </div>
                    ) : (profile?.bio || profile?.years_of_experience != null) ? (
                      <div className="space-y-4">
                        {profile?.bio && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                            <p className="text-foreground whitespace-pre-wrap mt-1 bg-muted/30 rounded-lg p-3">{profile.bio}</p>
                          </div>
                        )}
                        {profile?.years_of_experience != null && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Years of Experience</Label>
                            <p className="text-foreground mt-1">{profile.years_of_experience} years</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => startEditing('section-profile-overview')} className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to add your profile overview</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Professional Experience (Practice + Training + Consulting) - unchanged, kept from above */}
                {naturalRole?.promise_check && (
                  <Card id="section-professional-experience" className="transition-all scroll-mt-24">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-b4-teal/10">
                          <FolderOpen className="w-4 h-4 text-b4-teal" />
                        </div>
                        Professional Experience
                      </CardTitle>
                      <CardDescription>
                        Your practice, training, and consulting experience
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* Practice Experience */}
                      <div id="section-practice" className="scroll-mt-24">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Briefcase className={`w-4 h-4 ${naturalRole?.practice_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                            Practice Experience
                            {naturalRole?.practice_case_studies ? (
                              <Badge variant="outline" className="ml-2 text-xs">{naturalRole.practice_case_studies} case studies</Badge>
                            ) : null}
                          </h4>
                          <SectionActions
                            hasContent={!!naturalRole?.practice_entities}
                            isEditing={isEditing}
                            showHistory={sectionHistory === 'section-practice'}
                            onEdit={() => startEditing('section-practice')}
                            onToggleHistory={() => toggleSectionHistory('section-practice')}
                            onAdd={() => startEditing('section-practice')}
                          />
                        </div>
                        {isEditing ? (
                          <Textarea
                            value={editData.practice_entities}
                            onChange={(e) => setEditData(prev => ({ ...prev, practice_entities: e.target.value }))}
                            placeholder="List the entities/companies you've worked with..."
                            rows={3}
                          />
                        ) : naturalRole?.practice_entities ? (
                          <p className="text-foreground whitespace-pre-wrap">{naturalRole.practice_entities}</p>
                        ) : (
                          <button onClick={() => startEditing('section-practice')} className="w-full text-center py-4 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:bg-muted/30 transition-all cursor-pointer">
                            <Plus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Add practice experience</p>
                          </button>
                        )}
                        {naturalRole?.practice_entities && !isEditing && (
                          <Button variant="outline" className="mt-3 gap-2" size="sm" onClick={() => navigate("/opportunities")}>
                            <Briefcase className="w-4 h-4" /> Expand Practice <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        <SectionHistoryPanel sectionId="section-practice" fieldName="practice_entities" label="Practice" />
                      </div>

                      <div className="border-t border-border" />

                      {/* Training Experience */}
                      <div id="section-training" className="scroll-mt-24">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <GraduationCap className={`w-4 h-4 ${naturalRole?.training_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                            Training Experience
                            {naturalRole?.training_count ? (
                              <Badge variant="outline" className="ml-2 text-xs">{naturalRole.training_count} trained</Badge>
                            ) : null}
                          </h4>
                          <SectionActions
                            hasContent={!!naturalRole?.training_contexts}
                            isEditing={isEditing}
                            showHistory={sectionHistory === 'section-training'}
                            onEdit={() => startEditing('section-training')}
                            onToggleHistory={() => toggleSectionHistory('section-training')}
                            onAdd={() => startEditing('section-training')}
                          />
                        </div>
                        {isEditing ? (
                          <Textarea
                            value={editData.training_contexts}
                            onChange={(e) => setEditData(prev => ({ ...prev, training_contexts: e.target.value }))}
                            placeholder="Describe the contexts where you've trained others..."
                            rows={3}
                          />
                        ) : naturalRole?.training_contexts ? (
                          <p className="text-foreground whitespace-pre-wrap">{naturalRole.training_contexts}</p>
                        ) : (
                          <button onClick={() => startEditing('section-training')} className="w-full text-center py-4 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:bg-muted/30 transition-all cursor-pointer">
                            <Plus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Add training experience</p>
                          </button>
                        )}
                        {naturalRole?.training_contexts && !isEditing && (
                          <Button variant="outline" className="mt-3 gap-2" size="sm" onClick={() => setShowTrainDialog(true)}>
                            <GraduationCap className="w-4 h-4" /> Train a Team <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        <SectionHistoryPanel sectionId="section-training" fieldName="training_contexts" label="Training" />
                      </div>

                      <div className="border-t border-border" />

                      {/* Consulting Experience */}
                      <div id="section-consulting" className="scroll-mt-24">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Users className={`w-4 h-4 ${naturalRole?.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                            Consulting Experience
                          </h4>
                          <SectionActions
                            hasContent={!!(naturalRole?.consulting_with_whom || naturalRole?.consulting_case_studies)}
                            isEditing={isEditing}
                            showHistory={sectionHistory === 'section-consulting'}
                            onEdit={() => startEditing('section-consulting')}
                            onToggleHistory={() => toggleSectionHistory('section-consulting')}
                            onAdd={() => startEditing('section-consulting')}
                          />
                        </div>
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-foreground">With Whom</Label>
                              <Textarea
                                value={editData.consulting_with_whom}
                                onChange={(e) => setEditData(prev => ({ ...prev, consulting_with_whom: e.target.value }))}
                                placeholder="List the organizations or individuals you've consulted..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-foreground">Case Studies</Label>
                              <Textarea
                                value={editData.consulting_case_studies}
                                onChange={(e) => setEditData(prev => ({ ...prev, consulting_case_studies: e.target.value }))}
                                placeholder="Describe specific consulting projects and outcomes..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        ) : (naturalRole?.consulting_with_whom || naturalRole?.consulting_case_studies) ? (
                          <div className="space-y-3">
                            {naturalRole?.consulting_with_whom && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">With Whom</Label>
                                <p className="text-foreground whitespace-pre-wrap mt-1">{naturalRole.consulting_with_whom}</p>
                              </div>
                            )}
                            {naturalRole?.consulting_case_studies && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Case Studies</Label>
                                <p className="text-foreground whitespace-pre-wrap mt-1">{naturalRole.consulting_case_studies}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => startEditing('section-consulting')} className="w-full text-center py-4 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:bg-muted/30 transition-all cursor-pointer">
                            <Plus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Add consulting experience</p>
                          </button>
                        )}
                        {(naturalRole?.consulting_with_whom || naturalRole?.consulting_case_studies) && !isEditing && (
                          <Button variant="outline" className="mt-3 gap-2" size="sm" onClick={() => navigate("/coming-soon")}>
                            <Users className="w-4 h-4" /> Offer Consulting <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        <SectionHistoryPanel sectionId="section-consulting" fieldName="consulting_with_whom" label="Consulting" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Projects & Solutions */}
                <Card id="section-projects" className={`transition-all scroll-mt-24 ${!profile?.key_projects && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.key_projects ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Lightbulb className={`w-4 h-4 ${profile?.key_projects ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Key Projects & Solutions
                      </CardTitle>
                      <SectionActions
                        hasContent={!!profile?.key_projects}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-projects')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-projects')}
                      />
                    </div>
                    <CardDescription>
                      Highlight your most impactful projects and solutions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={profileEditData.key_projects}
                        onChange={(e) => setProfileEditData(prev => ({ ...prev, key_projects: e.target.value }))}
                        placeholder="Describe your key projects, solutions delivered, and their impact..."
                        rows={4}
                      />
                    ) : profile?.key_projects ? (
                      <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">{profile.key_projects}</p>
                    ) : (
                      <button onClick={() => startEditing('section-projects')} className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to add your key projects</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Skills & Competencies */}
                <Card id="section-skills" className={`transition-all scroll-mt-24 ${!profile?.primary_skills && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.primary_skills ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Sparkles className={`w-4 h-4 ${profile?.primary_skills ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Skills & Competencies
                      </CardTitle>
                      <SectionActions
                        hasContent={!!profile?.primary_skills}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-skills')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-skills')}
                      />
                    </div>
                    <CardDescription>
                      Your core skills and areas of expertise
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={profileEditData.primary_skills}
                        onChange={(e) => setProfileEditData(prev => ({ ...prev, primary_skills: e.target.value }))}
                        placeholder="e.g., Product Strategy, UX Design, Full-Stack Development, Business Analysis..."
                        rows={3}
                      />
                    ) : profile?.primary_skills ? (
                      <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">{profile.primary_skills}</p>
                    ) : (
                      <button onClick={() => startEditing('section-skills')} className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to add your skills</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Education & Certifications */}
                <Card id="section-education" className={`transition-all scroll-mt-24 ${!profile?.education_certifications && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.education_certifications ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Award className={`w-4 h-4 ${profile?.education_certifications ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Education & Certifications
                      </CardTitle>
                      <SectionActions
                        hasContent={!!profile?.education_certifications}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-education')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-education')}
                      />
                    </div>
                    <CardDescription>
                      Your academic background and professional certifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={profileEditData.education_certifications}
                        onChange={(e) => setProfileEditData(prev => ({ ...prev, education_certifications: e.target.value }))}
                        placeholder="List your degrees, certifications, and relevant training programs..."
                        rows={4}
                      />
                    ) : profile?.education_certifications ? (
                      <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">{profile.education_certifications}</p>
                    ) : (
                      <button onClick={() => startEditing('section-education')} className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                        <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to add your education & certifications</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Services aligned to Your Natural Role */}
                <Card id="section-services" className={`transition-all scroll-mt-24 ${!(naturalRole as any)?.services_description && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(naturalRole as any)?.services_description ? 'bg-primary/10' : 'bg-muted'}`}>
                          <BookOpen className={`w-4 h-4 ${(naturalRole as any)?.services_description ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        Services Aligned to Your Natural Role
                      </CardTitle>
                      <SectionActions
                        hasContent={!!(naturalRole as any)?.services_description}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-services')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-services')}
                      />
                    </div>
                    <CardDescription>
                      Describe the services you offer based on your natural role expertise
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData.services_description}
                        onChange={(e) => setEditData(prev => ({ ...prev, services_description: e.target.value }))}
                        placeholder="Describe the services you can offer — consulting, training, practice expansion, etc."
                        rows={4}
                      />
                    ) : (naturalRole as any)?.services_description ? (
                      <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                        {(naturalRole as any).services_description}
                      </p>
                    ) : (
                      <button 
                        onClick={() => startEditing('section-services')}
                        className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to describe your services</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Statement - AI Generated + Editable */}
                <Card id="section-summary" className={`transition-all scroll-mt-24 ${!profile?.summary_statement && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.summary_statement ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <FileText className={`w-4 h-4 ${profile?.summary_statement ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Summary Statement
                      </CardTitle>
                      <SectionActions
                        hasContent={!!profile?.summary_statement}
                        isEditing={isEditing}
                        showHistory={false}
                        onEdit={() => startEditing('section-summary')}
                        onToggleHistory={() => {}}
                        onAdd={() => startEditing('section-summary')}
                      />
                    </div>
                    <CardDescription>
                      AI-generated professional summary based on your profile — feel free to edit it
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={profileEditData.summary_statement}
                          onChange={(e) => setProfileEditData(prev => ({ ...prev, summary_statement: e.target.value }))}
                          placeholder="Your professional summary will appear here. Click 'Generate with AI' to create one automatically."
                          rows={4}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isGeneratingSummary}
                          onClick={async () => {
                            setIsGeneratingSummary(true);
                            try {
                              const { data, error } = await supabase.functions.invoke('generate-summary', {
                                body: {
                                  profileData: {
                                    full_name: profile?.full_name,
                                    professional_title: profileEditData.professional_title || profile?.professional_title,
                                    bio: profileEditData.bio || profile?.bio,
                                    primary_skills: profileEditData.primary_skills || profile?.primary_skills,
                                    years_of_experience: profileEditData.years_of_experience || profile?.years_of_experience,
                                    key_projects: profileEditData.key_projects || profile?.key_projects,
                                    education_certifications: profileEditData.education_certifications || profile?.education_certifications,
                                  },
                                  naturalRoleData: naturalRole ? {
                                    description: editData.description || naturalRole.description,
                                    practice_entities: editData.practice_entities || naturalRole.practice_entities,
                                    training_contexts: editData.training_contexts || naturalRole.training_contexts,
                                    consulting_with_whom: editData.consulting_with_whom || naturalRole.consulting_with_whom,
                                    consulting_case_studies: editData.consulting_case_studies || naturalRole.consulting_case_studies,
                                    services_description: editData.services_description || (naturalRole as any).services_description,
                                  } : null,
                                },
                              });
                              if (error) throw error;
                              if (data?.error) {
                                toast({ title: "Cannot generate", description: data.error, variant: "destructive" });
                              } else if (data?.summary) {
                                setProfileEditData(prev => ({ ...prev, summary_statement: data.summary }));
                                toast({ title: "Summary generated!", description: "Review and edit as needed, then save." });
                              }
                            } catch (err: any) {
                              toast({ title: "Error", description: err.message || "Failed to generate summary.", variant: "destructive" });
                            } finally {
                              setIsGeneratingSummary(false);
                            }
                          }}
                          className="gap-2"
                        >
                          {isGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isGeneratingSummary ? "Generating..." : "Generate with AI"}
                        </Button>
                      </div>
                    ) : profile?.summary_statement ? (
                      <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">{profile.summary_statement}</p>
                    ) : (
                      <button onClick={() => startEditing('section-summary')} className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Click to generate your AI summary statement</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Scaling Interest */}
                <Card className="bg-gradient-to-br from-purple-500/5 to-b4-teal/5 border-purple-500/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                        </div>
                        Scaling Interest
                      </CardTitle>
                      <Badge variant={naturalRole?.wants_to_scale ? "default" : "secondary"} className={naturalRole?.wants_to_scale ? "bg-purple-600" : ""}>
                        {naturalRole?.wants_to_scale ? "🚀 Ready to Scale" : "Not Yet"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Your interest in building a decentralized company
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {naturalRole?.wants_to_scale 
                        ? "You're ready to scale your natural role into a decentralized company. Check out the Scale page to begin your journey!"
                        : "You haven't expressed interest in scaling your natural role yet. You can update this as your journey progresses."}
                    </p>
                    {naturalRole?.wants_to_scale && (
                      <Button variant="outline" className="mt-4" onClick={() => navigate("/start")}>
                        Go to Scale Page
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            )}

          </div>
        </section>

        <ResumeEditBar
          open={isEditing}
          isSaving={isSaving}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      </main>
      <Footer />
      <ScrollToTopButton />
      <TrainTeamDialog open={showTrainDialog} onOpenChange={setShowTrainDialog} />
    </div>
  );
};

export default Resume;

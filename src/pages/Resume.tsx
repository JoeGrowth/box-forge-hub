import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Lock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  const [versions, setVersions] = useState<AnswerVersion[]>([]);
  const [showGlobalHistory, setShowGlobalHistory] = useState(false);
  const [sectionHistory, setSectionHistory] = useState<string | null>(null);
  const [isTogglingPromise, setIsTogglingPromise] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    description: "",
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
                  <h1 className="font-display text-3xl font-bold">Your Resume</h1>
                </div>
                <p className="text-primary-foreground/80 max-w-xl">
                  Track your journey progress and add new experiences as you grow. 
                  Each update is saved in your version history.
                </p>
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
                {/* Natural Role Definition */}
                <Card id="section-natural-role" className={`transition-all scroll-mt-24 ${!naturalRole?.description && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.description ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Target className={`w-4 h-4 ${naturalRole?.description ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Natural Role Definition
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

                {/* Practice, Training, Consulting - Only show when Promise is Yes */}
                {naturalRole?.promise_check && (
                  <>
                {/* Practice Experience */}
                <Card id="section-practice" className={`transition-all scroll-mt-24 ${!naturalRole?.practice_check && !isEditing ? 'border-dashed border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.practice_check ? 'bg-b4-teal/10' : 'bg-amber-500/10'}`}>
                          <Briefcase className={`w-4 h-4 ${naturalRole?.practice_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                        </div>
                        Practice Experience
                      </CardTitle>
                      <SectionActions
                        hasContent={!!naturalRole?.practice_entities}
                        isEditing={isEditing}
                        showHistory={sectionHistory === 'section-practice'}
                        onEdit={() => startEditing('section-practice')}
                        onToggleHistory={() => toggleSectionHistory('section-practice')}
                        onAdd={() => startEditing('section-practice')}
                      />
                    </div>
                    <CardDescription>
                      {naturalRole?.practice_case_studies 
                        ? `${naturalRole.practice_case_studies} case studies completed`
                        : 'Add your practical experience and case studies'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData.practice_entities}
                        onChange={(e) => setEditData(prev => ({ ...prev, practice_entities: e.target.value }))}
                        placeholder="List the entities/companies you've worked with and describe your practical experience..."
                        rows={3}
                      />
                    ) : naturalRole?.practice_entities ? (
                      <p className="text-foreground whitespace-pre-wrap">
                        {naturalRole.practice_entities}
                      </p>
                    ) : (
                      <button 
                        onClick={() => startEditing('section-practice')}
                        className="w-full text-center py-6 border-2 border-dashed border-amber-500/20 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer"
                      >
                        <Plus className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-amber-700 font-medium mb-1">Add Your Practice Experience</p>
                        <p className="text-sm text-muted-foreground">
                          Click to add case studies and practical work
                        </p>
                      </button>
                    )}
                    <SectionHistoryPanel sectionId="section-practice" fieldName="practice_entities" label="Practice" />
                  </CardContent>
                </Card>

                {/* Training Experience */}
                <Card id="section-training" className={`transition-all scroll-mt-24 ${!naturalRole?.training_check && !isEditing ? 'border-dashed border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.training_check ? 'bg-b4-teal/10' : 'bg-amber-500/10'}`}>
                          <GraduationCap className={`w-4 h-4 ${naturalRole?.training_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                        </div>
                        Training Experience
                      </CardTitle>
                      <SectionActions
                        hasContent={!!naturalRole?.training_contexts}
                        isEditing={isEditing}
                        showHistory={sectionHistory === 'section-training'}
                        onEdit={() => startEditing('section-training')}
                        onToggleHistory={() => toggleSectionHistory('section-training')}
                        onAdd={() => startEditing('section-training')}
                      />
                    </div>
                    <CardDescription>
                      {naturalRole?.training_count 
                        ? `${naturalRole.training_count} people trained`
                        : 'Add your training and mentorship experience'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData.training_contexts}
                        onChange={(e) => setEditData(prev => ({ ...prev, training_contexts: e.target.value }))}
                        placeholder="Describe the contexts where you've trained others..."
                        rows={3}
                      />
                    ) : naturalRole?.training_contexts ? (
                      <p className="text-foreground whitespace-pre-wrap">
                        {naturalRole.training_contexts}
                      </p>
                    ) : (
                      <button 
                        onClick={() => startEditing('section-training')}
                        className="w-full text-center py-6 border-2 border-dashed border-amber-500/20 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer"
                      >
                        <Plus className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-amber-700 font-medium mb-1">Add Your Training Experience</p>
                        <p className="text-sm text-muted-foreground">
                          Click to add training contexts and people you've mentored
                        </p>
                      </button>
                    )}
                    <SectionHistoryPanel sectionId="section-training" fieldName="training_contexts" label="Training" />
                  </CardContent>
                </Card>

                {/* Consulting Experience */}
                <Card id="section-consulting" className={`transition-all scroll-mt-24 ${!naturalRole?.consulting_check && !isEditing ? 'border-dashed border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.consulting_check ? 'bg-b4-teal/10' : 'bg-amber-500/10'}`}>
                          <Users className={`w-4 h-4 ${naturalRole?.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                        </div>
                        Consulting Experience
                      </CardTitle>
                      <SectionActions
                        hasContent={!!(naturalRole?.consulting_with_whom || naturalRole?.consulting_case_studies)}
                        isEditing={isEditing}
                        showHistory={sectionHistory === 'section-consulting'}
                        onEdit={() => startEditing('section-consulting')}
                        onToggleHistory={() => toggleSectionHistory('section-consulting')}
                        onAdd={() => startEditing('section-consulting')}
                      />
                    </div>
                    <CardDescription>
                      Your advisory and consulting work
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                      <div className="space-y-4">
                        {naturalRole?.consulting_with_whom && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">With Whom</Label>
                            <p className="text-foreground whitespace-pre-wrap mt-1">
                              {naturalRole.consulting_with_whom}
                            </p>
                          </div>
                        )}
                        {naturalRole?.consulting_case_studies && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Case Studies</Label>
                            <p className="text-foreground whitespace-pre-wrap mt-1">
                              {naturalRole.consulting_case_studies}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEditing('section-consulting')}
                        className="w-full text-center py-6 border-2 border-dashed border-amber-500/20 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer"
                      >
                        <Plus className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-amber-700 font-medium mb-1">Add Your Consulting Experience</p>
                        <p className="text-sm text-muted-foreground">
                          Click to add consulting work and case studies
                        </p>
                      </button>
                    )}
                    <SectionHistoryPanel sectionId="section-consulting" fieldName="consulting_with_whom" label="Consulting" />
                  </CardContent>
                </Card>
                  </>
                )}

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
    </div>
  );
};

export default Resume;

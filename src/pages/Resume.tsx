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
  ArrowRight,
  Plus,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Users,
  Target,
  Sparkles
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
  const [showHistory, setShowHistory] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
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
          change_notes: changeNotes || null,
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

  const StatusBadge = ({ checked, canAdd }: { checked: boolean | null; canAdd?: boolean }) =>
    checked ? (
      <Badge variant="default" className="bg-b4-teal text-white">
        <CheckCircle className="w-3 h-3 mr-1" /> Complete
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10">
        <Plus className="w-3 h-3 mr-1" /> {canAdd ? "Add Experience" : "Incomplete"}
      </Badge>
    );

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
          <div className="container max-w-5xl mx-auto px-4">

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
                <div className={`rounded-xl p-4 text-center ${naturalRole.description ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-muted/50 border border-dashed border-muted-foreground/20'}`}>
                  <Target className={`w-5 h-5 mx-auto mb-1 ${naturalRole.description ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                  <p className="text-xs text-muted-foreground">Natural Role</p>
                  <p className={`text-sm font-medium ${naturalRole.description ? 'text-b4-teal' : 'text-muted-foreground'}`}>
                    {naturalRole.description ? '✓' : '—'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${naturalRole.promise_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-muted/50 border border-dashed border-muted-foreground/20'}`}>
                  <Sparkles className={`w-5 h-5 mx-auto mb-1 ${naturalRole.promise_check ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                  <p className="text-xs text-muted-foreground">Promise</p>
                  <p className={`text-sm font-medium ${naturalRole.promise_check ? 'text-b4-teal' : 'text-muted-foreground'}`}>
                    {naturalRole.promise_check ? '✓' : '—'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${naturalRole.practice_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-amber-500/10 border border-dashed border-amber-500/30'}`}>
                  <Briefcase className={`w-5 h-5 mx-auto mb-1 ${naturalRole.practice_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                  <p className="text-xs text-muted-foreground">Practice</p>
                  <p className={`text-sm font-medium ${naturalRole.practice_check ? 'text-b4-teal' : 'text-amber-600'}`}>
                    {naturalRole.practice_check ? `${naturalRole.practice_case_studies || 0} cases` : 'Add +'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${naturalRole.training_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-amber-500/10 border border-dashed border-amber-500/30'}`}>
                  <GraduationCap className={`w-5 h-5 mx-auto mb-1 ${naturalRole.training_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                  <p className="text-xs text-muted-foreground">Training</p>
                  <p className={`text-sm font-medium ${naturalRole.training_check ? 'text-b4-teal' : 'text-amber-600'}`}>
                    {naturalRole.training_check ? `${naturalRole.training_count || 0} trained` : 'Add +'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${naturalRole.consulting_check ? 'bg-b4-teal/10 border border-b4-teal/20' : 'bg-amber-500/10 border border-dashed border-amber-500/30'}`}>
                  <Users className={`w-5 h-5 mx-auto mb-1 ${naturalRole.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                  <p className="text-xs text-muted-foreground">Consulting</p>
                  <p className={`text-sm font-medium ${naturalRole.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`}>
                    {naturalRole.consulting_check ? '✓' : 'Add +'}
                  </p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Experience Details</h2>
                  <p className="text-muted-foreground mt-1">
                    Click "Edit Resume" to add new experiences and case studies
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowHistory(!showHistory)}
                    className="gap-2"
                  >
                    <History className="w-4 h-4" />
                    History ({versions.length})
                  </Button>
                  {!isEditing ? (
                    <Button variant="teal" onClick={() => setIsEditing(true)} className="gap-2">
                      <Edit2 className="w-4 h-4" />
                      Edit Resume
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button 
                        variant="teal" 
                        onClick={handleSave} 
                        disabled={isSaving || !changeNotes.trim()}
                        className="gap-2"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Version History Panel */}
              {showHistory && versions.length > 0 && (
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

              {/* Change Notes Input (when editing) */}
              {isEditing && (
                <Card className="border-b4-teal/30 bg-b4-teal/5">
                  <CardContent className="pt-4">
                    <Label htmlFor="changeNotes" className="text-foreground font-medium">
                      Change Notes <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="changeNotes"
                      value={changeNotes}
                      onChange={(e) => setChangeNotes(e.target.value)}
                      placeholder="Describe what you changed and why (required to save)..."
                      className="mt-2"
                      rows={2}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Resume Cards */}
              <div className="grid gap-6">
                {/* Natural Role Definition */}
                <Card className={`transition-all ${!naturalRole?.description && !isEditing ? 'border-dashed border-muted-foreground/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.description ? 'bg-b4-teal/10' : 'bg-muted'}`}>
                          <Target className={`w-4 h-4 ${naturalRole?.description ? 'text-b4-teal' : 'text-muted-foreground'}`} />
                        </div>
                        Natural Role Definition
                      </CardTitle>
                      <StatusBadge checked={!!naturalRole?.description} />
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
                      <div className="text-center py-4 text-muted-foreground">
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Not defined yet. Click "Edit Resume" to add your natural role.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Practice Experience */}
                <Card className={`transition-all ${!naturalRole?.practice_check && !isEditing ? 'border-dashed border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.practice_check ? 'bg-b4-teal/10' : 'bg-amber-500/10'}`}>
                          <Briefcase className={`w-4 h-4 ${naturalRole?.practice_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                        </div>
                        Practice Experience
                      </CardTitle>
                      <StatusBadge checked={naturalRole?.practice_check} canAdd={!naturalRole?.practice_check} />
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
                      <div className="text-center py-6 border-2 border-dashed border-amber-500/20 rounded-lg bg-amber-500/5">
                        <Plus className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-amber-700 font-medium mb-1">Add Your Practice Experience</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Edit Resume" to add case studies and practical work
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Training Experience */}
                <Card className={`transition-all ${!naturalRole?.training_check && !isEditing ? 'border-dashed border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.training_check ? 'bg-b4-teal/10' : 'bg-amber-500/10'}`}>
                          <GraduationCap className={`w-4 h-4 ${naturalRole?.training_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                        </div>
                        Training Experience
                      </CardTitle>
                      <StatusBadge checked={naturalRole?.training_check} canAdd={!naturalRole?.training_check} />
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
                      <div className="text-center py-6 border-2 border-dashed border-amber-500/20 rounded-lg bg-amber-500/5">
                        <Plus className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-amber-700 font-medium mb-1">Add Your Training Experience</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Edit Resume" to add training contexts and people you've mentored
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consulting Experience */}
                <Card className={`transition-all ${!naturalRole?.consulting_check && !isEditing ? 'border-dashed border-amber-500/30 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${naturalRole?.consulting_check ? 'bg-b4-teal/10' : 'bg-amber-500/10'}`}>
                          <Users className={`w-4 h-4 ${naturalRole?.consulting_check ? 'text-b4-teal' : 'text-amber-600'}`} />
                        </div>
                        Consulting Experience
                      </CardTitle>
                      <StatusBadge checked={naturalRole?.consulting_check} canAdd={!naturalRole?.consulting_check} />
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
                      <div className="text-center py-6 border-2 border-dashed border-amber-500/20 rounded-lg bg-amber-500/5">
                        <Plus className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-amber-700 font-medium mb-1">Add Your Consulting Experience</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Edit Resume" to add consulting work and case studies
                        </p>
                      </div>
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
      </main>
      <Footer />
    </div>
  );
};

export default Resume;

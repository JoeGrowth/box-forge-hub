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
  Target
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

const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Create the Mask",
    subtitle: "Entity Creation",
    icon: Theater,
    description: "Create your Mask — the structured entity that represents your natural role. This is the gamified first step to scaling beyond yourself.",
    details: [
      "Define your Mask's identity and purpose",
      "Structure your natural role into an entity",
      "Ownership: 100% yours"
    ],
    color: "from-violet-500 to-purple-600"
  },
  {
    step: 2,
    title: "Code the Mask",
    subtitle: "Structure the Entity",
    icon: Code2,
    description: "Transform personal thinking into operational systems. Your Mask becomes coded through frameworks, processes, and methods.",
    details: [
      "Training programs & curricula",
      "Consulting frameworks & methodologies",
      "Operating principles & playbooks"
    ],
    color: "from-blue-500 to-cyan-500"
  },
  {
    step: 3,
    title: "Detach & Scale",
    subtitle: "Person → Entity Separation",
    icon: Users,
    description: "Clients ask for the Mask, not you. Work becomes deliverable by others. Value becomes scalable, repeatable, and transferable.",
    details: [
      "Build delivery capacity beyond yourself",
      "Enable others to operate as the Mask",
      "Scale impact without being the bottleneck"
    ],
    color: "from-emerald-500 to-teal-500"
  }
];

const Mask = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { naturalRole, onboardingState, refetch } = useOnboarding();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<AnswerVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [activeSection, setActiveSection] = useState<"resume" | "scale">("resume");
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Hero Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-4">
              <Theater className="w-5 h-5 text-violet-500" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Your Mask Journey</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
              Your <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">Mask</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The gamified entry point to scaling your Natural Role. Create an entity you fully own — 
              and operate beyond yourself.
            </p>
          </div>

          {/* Section Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border/50">
              <button
                onClick={() => setActiveSection("resume")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeSection === "resume"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Your Resume
              </button>
              <button
                onClick={() => setActiveSection("scale")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeSection === "scale"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Scale Your NR
              </button>
            </div>
          </div>

          {/* Resume Section */}
          {activeSection === "resume" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Your Resume</h2>
                  <p className="text-muted-foreground mt-1">
                    Your onboarding journey answers with version history
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
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button variant="teal" onClick={handleSave} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Version History Panel */}
              {showHistory && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Version History
                    </CardTitle>
                    <CardDescription>
                      View and restore previous versions of your answers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {versions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No versions yet. Save your first edit to create a version.
                      </p>
                    ) : (
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                          {versions.map((version, index) => (
                            <Collapsible key={version.id}>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Version {version.version_number}</span>
                                      {index === 0 && (
                                        <Badge variant="outline" className="text-xs">Current</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </div>
                                    {version.change_notes && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        {version.change_notes}
                                      </p>
                                    )}
                                  </div>
                                </CollapsibleTrigger>
                                {index !== 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => restoreVersion(version)}
                                    disabled={isSaving}
                                  >
                                    Restore
                                  </Button>
                                )}
                              </div>
                              <CollapsibleContent className="pl-10 pr-4 pb-3">
                                <div className="space-y-2 text-sm mt-2">
                                  <div>
                                    <span className="text-muted-foreground">Description:</span>
                                    <p className="bg-background rounded p-2 mt-1">
                                      {version.description || "Not provided"}
                                    </p>
                                  </div>
                                  {version.practice_check && version.practice_entities && (
                                    <div>
                                      <span className="text-muted-foreground">Practice:</span>
                                      <p className="bg-background rounded p-2 mt-1">
                                        {version.practice_entities}
                                      </p>
                                    </div>
                                  )}
                                  {version.training_check && version.training_contexts && (
                                    <div>
                                      <span className="text-muted-foreground">Training:</span>
                                      <p className="bg-background rounded p-2 mt-1">
                                        {version.training_contexts}
                                      </p>
                                    </div>
                                  )}
                                  {version.consulting_check && (
                                    <div>
                                      <span className="text-muted-foreground">Consulting:</span>
                                      <p className="bg-background rounded p-2 mt-1">
                                        {version.consulting_with_whom || "Not provided"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Current Answers Card */}
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-b4-teal" />
                    <CardTitle className="text-xl">Your Onboarding Answers</CardTitle>
                  </div>
                  {onboardingState?.journey_status === "approved" && (
                    <Badge className="w-fit bg-b4-teal text-white">
                      <CheckCircle className="w-3 h-3 mr-1" /> Approved
                    </Badge>
                  )}
                  {onboardingState?.journey_status === "pending_approval" && (
                    <Badge className="w-fit" variant="secondary">
                      <Clock className="w-3 h-3 mr-1" /> Pending Approval
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditing && (
                    <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Label className="text-sm font-medium">Change Notes (optional)</Label>
                      <Textarea
                        value={changeNotes}
                        onChange={(e) => setChangeNotes(e.target.value)}
                        placeholder="Describe what you changed..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Natural Role Description</Label>
                    {isEditing ? (
                      <Textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="Your natural role description..."
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                        {naturalRole?.description || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Promise</p>
                      <StatusBadge checked={naturalRole?.promise_check ?? null} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Practice</p>
                      <StatusBadge checked={naturalRole?.practice_check ?? null} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Training</p>
                      <StatusBadge checked={naturalRole?.training_check ?? null} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Consulting</p>
                      <StatusBadge checked={naturalRole?.consulting_check ?? null} />
                    </div>
                  </div>

                  {naturalRole?.practice_check && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Practice Experience</Label>
                      {isEditing ? (
                        <Textarea
                          value={editData.practice_entities}
                          onChange={(e) => setEditData({ ...editData, practice_entities: e.target.value })}
                          placeholder="Your practice experience..."
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                          {naturalRole.practice_entities || "Not provided"}
                        </p>
                      )}
                      {naturalRole.practice_case_studies && (
                        <p className="text-xs text-muted-foreground">
                          Case studies: {naturalRole.practice_case_studies}
                        </p>
                      )}
                    </div>
                  )}

                  {naturalRole?.training_check && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Training Experience</Label>
                      {isEditing ? (
                        <Textarea
                          value={editData.training_contexts}
                          onChange={(e) => setEditData({ ...editData, training_contexts: e.target.value })}
                          placeholder="Your training contexts..."
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                          {naturalRole.training_contexts || "Not provided"}
                        </p>
                      )}
                      {naturalRole.training_count && (
                        <p className="text-xs text-muted-foreground">
                          Training count: {naturalRole.training_count}
                        </p>
                      )}
                    </div>
                  )}

                  {naturalRole?.consulting_check && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Consulting Experience</Label>
                      {isEditing ? (
                        <>
                          <Textarea
                            value={editData.consulting_with_whom}
                            onChange={(e) => setEditData({ ...editData, consulting_with_whom: e.target.value })}
                            placeholder="Who you consulted with..."
                            rows={2}
                          />
                          <Textarea
                            value={editData.consulting_case_studies}
                            onChange={(e) => setEditData({ ...editData, consulting_case_studies: e.target.value })}
                            placeholder="Case studies..."
                            rows={3}
                            className="mt-2"
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                            <strong>With whom:</strong> {naturalRole.consulting_with_whom || "Not provided"}
                          </p>
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 mt-2">
                            <strong>Case studies:</strong> {naturalRole.consulting_case_studies || "Not provided"}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Interested in Scaling:</span>
                      <Badge variant={naturalRole?.wants_to_scale ? "default" : "secondary"}>
                        {naturalRole?.wants_to_scale ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                        A <strong className="text-foreground">Mask</strong> is an entity you create and fully own. 
                        It represents a structured version of your natural role — allowing you to operate beyond yourself.
                      </p>
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                          <span className="text-muted-foreground"><strong className="text-foreground">Person:</strong> Youssef Ben Younes</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-muted-foreground"><strong className="text-foreground">Mask:</strong> Hackit</span>
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
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 to-emerald-500 hidden md:block" style={{ transform: 'translateX(-50%)' }} />
                
                <div className="space-y-6">
                  {SCALE_NR_STEPS.map((step, index) => (
                    <div 
                      key={step.step}
                      className={`relative ${index % 2 === 0 ? 'md:pr-[52%]' : 'md:pl-[52%]'}`}
                    >
                      {/* Step Number Badge (centered on line for desktop) */}
                      <div className={`hidden md:flex absolute left-1/2 top-6 w-10 h-10 rounded-full bg-gradient-to-r ${step.color} items-center justify-center text-white font-bold text-lg shadow-lg z-10`}
                        style={{ transform: 'translateX(-50%)' }}
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
                        You scale your impact <strong className="text-foreground">without being the bottleneck</strong>. 
                        Your Mask operates independently — value becomes repeatable, transferable, and truly scalable.
                      </p>
                    </div>
                    {!naturalRole?.wants_to_scale && (
                      <div className="pt-4">
                        <Button 
                          variant="teal" 
                          size="lg"
                          onClick={() => navigate("/profile")}
                          className="gap-2"
                        >
                          <Target className="w-4 h-4" />
                          Enable Scaling Journey
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Enable "Interested in Scaling" on your profile to begin
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Mask;

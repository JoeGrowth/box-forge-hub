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
  Lock,
  TrendingUp,
  MessageSquare
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
    title: "Structure",
    subtitle: "Branding Phase",
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
    title: "Detach",
    subtitle: "Systemization Phase",
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
    title: "Scale",
    subtitle: "Asset Phase",
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
  const [activeSection, setActiveSection] = useState<"scale">("scale");
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
      <main className="pt-20">
        {/* Header */}
        <section className="py-12 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-2">
              <Theater className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Mask</h1>
            </div>
            <p className="text-primary-foreground/80 max-w-2xl">
              The gamified entry point to scaling your Natural Role. Create an entity you fully own and operate beyond yourself.
            </p>
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
                    <Button variant="teal" onClick={() => navigate("/professional-onboarding")}>
                      Define My Natural Role
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scale Your NR Section */}
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
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Mask;

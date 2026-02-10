import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Save,
  Shield,
  Settings,
  RefreshCw,
} from "lucide-react";

interface IdeaValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: string;
  ideaTitle: string;
  onEpisodeComplete?: () => void;
}

interface PhaseProgress {
  phase_number: number;
  phase_name: string;
  responses: Record<string, string>;
  is_completed: boolean;
}

const VALIDATION_PHASES = [
  {
    number: 0,
    name: "Validation",
    description: "Validate your product-market fit and assumptions",
    icon: Shield,
    color: "from-amber-500 to-orange-500",
    tasks: [
      {
        id: "hypothesis_testing",
        label: "Hypothesis Testing",
        description:
          "What are the key assumptions you're testing? Document your hypotheses about customers, pricing, and value proposition. How will you validate them?",
      },
      {
        id: "customer_feedback",
        label: "Customer Feedback",
        description:
          "What feedback have you gathered from early customers or users? What patterns are emerging? What surprised you?",
      },
      {
        id: "pivot_decisions",
        label: "Pivot or Persevere",
        description:
          "Based on validation data, what changes are needed? Document any pivots in strategy, product, or target market.",
      },
    ],
  },
  {
    number: 1,
    name: "Execution & Operations",
    description: "Build operational excellence and delivery systems",
    icon: Settings,
    color: "from-blue-500 to-cyan-500",
    tasks: [
      {
        id: "operational_processes",
        label: "Operational Processes",
        description:
          "What are your core operational processes? Document workflows for delivery, support, and quality assurance.",
      },
      {
        id: "metrics_dashboard",
        label: "Key Metrics",
        description:
          "What metrics are you tracking? Document your KPIs for product, customer satisfaction, and business health.",
      },
      {
        id: "resource_allocation",
        label: "Resource Allocation",
        description:
          "How are you allocating resources (time, money, people)? What's your burn rate and runway?",
      },
    ],
  },
  {
    number: 2,
    name: "Iteration & Improvement",
    description: "Continuous improvement and product evolution",
    icon: RefreshCw,
    color: "from-rose-500 to-pink-500",
    tasks: [
      {
        id: "product_iterations",
        label: "Product Iterations",
        description:
          "What product improvements have you made? Document feature releases, bug fixes, and UX improvements.",
      },
      {
        id: "process_improvements",
        label: "Process Improvements",
        description:
          "How have you improved your internal processes? What inefficiencies have you eliminated?",
      },
      {
        id: "lessons_learned",
        label: "Lessons Learned",
        description:
          "What key lessons have you learned? Document insights that will guide future decisions.",
      },
    ],
  },
];

export const IdeaValidationDialog = ({
  open,
  onOpenChange,
  ideaId,
  ideaTitle,
  onEpisodeComplete,
}: IdeaValidationDialogProps) => {
  const { user } = useAuth();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState<Record<number, PhaseProgress>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const phase = VALIDATION_PHASES[currentPhase];
  const totalPhases = VALIDATION_PHASES.length;
  const isLastPhase = currentPhase === totalPhases - 1;

  const autoSaveProgress = useCallback(
    async (phaseNum: number, responsesToSave: Record<string, string>) => {
      if (!user) return;

      setIsAutoSaving(true);
      try {
        const currentPhaseName = VALIDATION_PHASES[phaseNum].name;
        const { data: existing } = await supabase
          .from("idea_journey_progress")
          .select("id")
          .eq("startup_id", ideaId)
          .eq("phase_number", phaseNum)
          .eq("episode", "validation")
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("idea_journey_progress")
            .update({
              responses: responsesToSave,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("idea_journey_progress").insert({
            startup_id: ideaId,
            user_id: user.id,
            phase_number: phaseNum,
            phase_name: currentPhaseName,
            episode: "validation",
            responses: responsesToSave,
          });
          if (error) throw error;
        }
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsAutoSaving(false);
      }
    },
    [user, ideaId]
  );

  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !open || hasLoadedInitial) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("idea_journey_progress")
          .select("*")
          .eq("startup_id", ideaId)
          .eq("episode", "validation");

        if (error) throw error;

        const progressMap: Record<number, PhaseProgress> = {};
        data?.forEach((p) => {
          progressMap[p.phase_number] = {
            phase_number: p.phase_number,
            phase_name: p.phase_name,
            responses: (p.responses as Record<string, string>) || {},
            is_completed: p.is_completed || false,
          };
        });

        setPhaseProgress(progressMap);

        if (progressMap[currentPhase]) {
          setResponses(progressMap[currentPhase].responses);
        } else {
          setResponses({});
        }

        setHasLoadedInitial(true);
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user, ideaId, open, hasLoadedInitial, currentPhase]);

  useEffect(() => {
    if (!open) {
      setHasLoadedInitial(false);
    }
  }, [open]);

  useEffect(() => {
    if (!hasLoadedInitial) return;

    if (phaseProgress[currentPhase]) {
      setResponses(phaseProgress[currentPhase].responses);
    } else {
      setResponses({});
    }
  }, [currentPhase, hasLoadedInitial, phaseProgress]);

  const handleResponseChange = (taskId: string, value: string) => {
    const newResponses = { ...responses, [taskId]: value };
    setResponses(newResponses);

    setPhaseProgress((prev) => ({
      ...prev,
      [currentPhase]: {
        phase_number: currentPhase,
        phase_name: phase.name,
        responses: newResponses,
        is_completed: prev[currentPhase]?.is_completed || false,
      },
    }));

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveProgress(currentPhase, newResponses);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveProgress = async () => {
    console.log("[Validation Save] user:", user?.id, "ideaId:", ideaId, "phase:", currentPhase, "responses:", responses);
    if (!user) { console.log("[Validation Save] No user, aborting"); return; }

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("idea_journey_progress")
        .select("id")
        .eq("startup_id", ideaId)
        .eq("phase_number", currentPhase)
        .eq("episode", "validation")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("idea_journey_progress")
          .update({
            responses,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("idea_journey_progress").insert({
          startup_id: ideaId,
          user_id: user.id,
          phase_number: currentPhase,
          phase_name: phase.name,
          episode: "validation",
          responses,
        });
        if (error) throw error;
      }

      setPhaseProgress((prev) => ({
        ...prev,
        [currentPhase]: {
          phase_number: currentPhase,
          phase_name: phase.name,
          responses,
          is_completed: prev[currentPhase]?.is_completed || false,
        },
      }));

      toast.success("Progress saved");
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Failed to save progress");
    } finally {
      setIsSaving(false);
    }
  };

  const isPhaseComplete = () => {
    return phase.tasks.every((task) => responses[task.id]?.trim().length > 0);
  };

  const handleCompletePhase = async () => {
    console.log("[Validation Complete] user:", user?.id, "ideaId:", ideaId, "phase:", currentPhase, "isPhaseComplete:", isPhaseComplete(), "responses:", responses);
    if (!user || !isPhaseComplete()) { console.log("[Validation Complete] Blocked - user:", !!user, "complete:", isPhaseComplete()); return; }

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("idea_journey_progress")
        .select("id")
        .eq("startup_id", ideaId)
        .eq("phase_number", currentPhase)
        .eq("episode", "validation")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("idea_journey_progress")
          .update({
            responses,
            is_completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("idea_journey_progress").insert({
          startup_id: ideaId,
          user_id: user.id,
          phase_number: currentPhase,
          phase_name: phase.name,
          episode: "validation",
          responses,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setPhaseProgress((prev) => ({
        ...prev,
        [currentPhase]: {
          phase_number: currentPhase,
          phase_name: phase.name,
          responses,
          is_completed: true,
        },
      }));

      toast.success(`${phase.name} phase completed!`);

      if (isLastPhase) {
        // Update startup to next episode
        await supabase
          .from("startup_ideas")
          .update({
            current_episode: "growth",
            validation_completed_at: new Date().toISOString(),
          })
          .eq("id", ideaId);

        toast.success("Validation episode completed! Moving to Growth phase.");
        onEpisodeComplete?.();
        onOpenChange(false);
      } else {
        setCurrentPhase((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error completing phase:", error);
      toast.error("Failed to complete phase");
    } finally {
      setIsSaving(false);
    }
  };

  const progress = ((currentPhase + 1) / totalPhases) * 100;

  const canAccessPhase = (phaseNum: number) => {
    if (phaseNum === 0) return true;
    return phaseProgress[phaseNum - 1]?.is_completed || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Validate: {ideaTitle}
          </DialogTitle>
          <DialogDescription>
            Episode 2: Validate your assumptions and build operational excellence
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  Episode 2 Progress
                  {isAutoSaving && (
                    <span className="flex items-center gap-1 text-xs text-b4-teal">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {VALIDATION_PHASES.map((p) => {
                const isCompleted = phaseProgress[p.number]?.is_completed;
                const isCurrent = p.number === currentPhase;
                const isAccessible = canAccessPhase(p.number);

                return (
                  <button
                    key={p.number}
                    onClick={() => isAccessible && setCurrentPhase(p.number)}
                    disabled={!isAccessible}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary"
                        : isCompleted
                        ? "bg-b4-teal/10 text-b4-teal border-b4-teal/30"
                        : isAccessible
                        ? "hover:bg-muted border-border"
                        : "opacity-50 cursor-not-allowed border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted && <CheckCircle className="w-4 h-4" />}
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${phase.color}`}>
                    <phase.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-lg">{phase.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <label className="text-sm font-medium">{task.label}</label>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <Textarea
                      value={responses[task.id] || ""}
                      onChange={(e) => handleResponseChange(task.id, e.target.value)}
                      placeholder="Enter your response..."
                      rows={4}
                    />
                  </div>
                ))}

                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleSaveProgress}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Progress
                  </Button>

                  <Button
                    onClick={handleCompletePhase}
                    disabled={!isPhaseComplete() || isSaving}
                    className="flex-1"
                  >
                    {isLastPhase ? "Complete Episode" : "Complete Phase"}
                    {!isLastPhase && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {phaseProgress[currentPhase]?.is_completed && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-b4-teal/10 border border-b4-teal/30">
                <CheckCircle className="w-5 h-5 text-b4-teal" />
                <div>
                  <p className="font-medium text-b4-teal">Phase Completed</p>
                  <p className="text-sm text-muted-foreground">
                    You can still update your responses or move to the next phase.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

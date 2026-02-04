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
  TrendingUp,
  Handshake,
  DollarSign,
  UsersRound,
} from "lucide-react";

interface IdeaGrowthDialogProps {
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

const GROWTH_PHASES = [
  {
    number: 0,
    name: "Customer Acquisition",
    description: "Scale your customer base and acquisition channels",
    icon: UsersRound,
    color: "from-emerald-500 to-teal-500",
    tasks: [
      {
        id: "acquisition_channels",
        label: "Acquisition Channels",
        description:
          "What are your primary customer acquisition channels? Document paid vs organic strategies and their performance metrics.",
      },
      {
        id: "customer_segmentation",
        label: "Customer Segmentation",
        description:
          "How are you segmenting your customers? Document different personas, their needs, and acquisition costs per segment.",
      },
      {
        id: "conversion_optimization",
        label: "Conversion Optimization",
        description:
          "What's your conversion funnel? Document conversion rates at each stage and optimization strategies.",
      },
    ],
  },
  {
    number: 1,
    name: "Partnerships",
    description: "Build strategic partnerships to accelerate growth",
    icon: Handshake,
    color: "from-blue-500 to-indigo-500",
    tasks: [
      {
        id: "partnership_strategy",
        label: "Partnership Strategy",
        description:
          "What types of partnerships are you pursuing? Document strategic, distribution, and technology partnerships.",
      },
      {
        id: "active_partnerships",
        label: "Active Partnerships",
        description:
          "List your current partnerships. Document terms, value exchange, and performance metrics for each.",
      },
      {
        id: "partnership_pipeline",
        label: "Partnership Pipeline",
        description:
          "What partnerships are in progress? Document potential partners and your outreach strategy.",
      },
    ],
  },
  {
    number: 2,
    name: "Revenue Growth",
    description: "Optimize revenue streams and profitability",
    icon: DollarSign,
    color: "from-amber-500 to-orange-500",
    tasks: [
      {
        id: "revenue_streams",
        label: "Revenue Streams",
        description:
          "What are your revenue streams? Document primary and secondary revenue sources and their contribution.",
      },
      {
        id: "pricing_strategy",
        label: "Pricing Strategy",
        description:
          "How is your pricing structured? Document pricing tiers, value metrics, and competitive positioning.",
      },
      {
        id: "unit_economics",
        label: "Unit Economics",
        description:
          "What are your unit economics? Document CAC, LTV, payback period, and margins.",
      },
    ],
  },
  {
    number: 3,
    name: "Team Scaling",
    description: "Scale your team and organizational structure",
    icon: UsersRound,
    color: "from-violet-500 to-purple-500",
    tasks: [
      {
        id: "org_structure",
        label: "Organization Structure",
        description:
          "What's your current org structure? Document team hierarchy, reporting lines, and key roles.",
      },
      {
        id: "hiring_plan",
        label: "Hiring Plan",
        description:
          "What positions do you need to fill? Document hiring priorities, timelines, and budget allocation.",
      },
      {
        id: "culture_values",
        label: "Culture & Values",
        description:
          "How are you building company culture? Document core values, rituals, and how you maintain culture at scale.",
      },
    ],
  },
];

export const IdeaGrowthDialog = ({
  open,
  onOpenChange,
  ideaId,
  ideaTitle,
  onEpisodeComplete,
}: IdeaGrowthDialogProps) => {
  const { user } = useAuth();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState<Record<number, PhaseProgress>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const phase = GROWTH_PHASES[currentPhase];
  const totalPhases = GROWTH_PHASES.length;
  const isLastPhase = currentPhase === totalPhases - 1;

  const autoSaveProgress = useCallback(
    async (phaseNum: number, responsesToSave: Record<string, string>) => {
      if (!user) return;

      setIsAutoSaving(true);
      try {
        const currentPhaseName = GROWTH_PHASES[phaseNum].name;
        const { data: existing } = await supabase
          .from("idea_journey_progress")
          .select("id")
          .eq("startup_id", ideaId)
          .eq("phase_number", phaseNum)
          .eq("episode", "growth")
          .maybeSingle();

        if (existing) {
          await supabase
            .from("idea_journey_progress")
            .update({
              responses: responsesToSave,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("idea_journey_progress").insert({
            startup_id: ideaId,
            user_id: user.id,
            phase_number: phaseNum,
            phase_name: currentPhaseName,
            episode: "growth",
            responses: responsesToSave,
          });
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
          .eq("episode", "growth");

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
    if (!user) return;

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("idea_journey_progress")
        .select("id")
        .eq("startup_id", ideaId)
        .eq("phase_number", currentPhase)
        .eq("episode", "growth")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("idea_journey_progress")
          .update({
            responses,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("idea_journey_progress").insert({
          startup_id: ideaId,
          user_id: user.id,
          phase_number: currentPhase,
          phase_name: phase.name,
          episode: "growth",
          responses,
        });
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
    if (!user || !isPhaseComplete()) return;

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("idea_journey_progress")
        .select("id")
        .eq("startup_id", ideaId)
        .eq("phase_number", currentPhase)
        .eq("episode", "growth")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("idea_journey_progress")
          .update({
            responses,
            is_completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("idea_journey_progress").insert({
          startup_id: ideaId,
          user_id: user.id,
          phase_number: currentPhase,
          phase_name: phase.name,
          episode: "growth",
          responses,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
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
        // Update startup to completed
        await supabase
          .from("startup_ideas")
          .update({
            current_episode: "completed",
            growth_completed_at: new Date().toISOString(),
          })
          .eq("id", ideaId);

        toast.success("🎉 Congratulations! Your startup journey is complete!");
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
            Grow: {ideaTitle}
          </DialogTitle>
          <DialogDescription>
            Episode 3: Scale your startup with strategic growth initiatives
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
                  Episode 3 Progress
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
              {GROWTH_PHASES.map((p) => {
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
                    {isLastPhase ? "Complete Journey 🎉" : "Complete Phase"}
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

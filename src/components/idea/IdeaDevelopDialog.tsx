import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  Lightbulb,
  Briefcase,
  Users,
  Rocket,
  Lock,
  Save,
  Target,
  Scale,
} from "lucide-react";
import { TeamMemberSearch } from "./TeamMemberSearch";
import { EquityResponsibilityEditor, type EquityResponsibilityData } from "./EquityResponsibilityEditor";

interface IdeaDevelopDialogProps {
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
  completed_tasks: string[];
  is_completed: boolean;
}

// Modified phases for idea development - 5 phases including Role Definition
const IDEA_DEVELOP_PHASES = [
  {
    number: 0,
    name: "Ideation",
    description: "Define your vision, problem, and market opportunity",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-500",
    tasks: [
      {
        id: "vision",
        label: "Define your vision",
        type: "question",
        description:
          "Paint a picture of the future you want to create. What does success look like in 5 years? How will the world be different because of your startup?",
      },
      {
        id: "problem",
        label: "Describe the problem you're solving",
        type: "question",
        description:
          "Clearly articulate the pain point or gap in the market. Who experiences this problem? How severe is it? What are the consequences of not solving it?",
      },
      {
        id: "market",
        label: "Identify your target market",
        type: "question",
        description:
          "Define your ideal customer profile. What are their demographics, behaviors, and needs? How large is this market segment and what's its growth potential?",
      },
    ],
  },
  {
    number: 1,
    name: "Structuring",
    description: "Build your business model and identify key roles",
    icon: Briefcase,
    color: "from-blue-500 to-cyan-500",
    tasks: [
      {
        id: "business_model",
        label: "Define your business model",
        type: "question",
        description:
          "How will your startup make money? Describe your revenue streams, pricing strategy, and cost structure. What makes your model sustainable and scalable?",
      },
      {
        id: "key_roles",
        label: "Identify key roles needed",
        type: "question",
        description:
          "What natural roles are essential to execute your vision? Consider technical, creative, operational, and strategic needs. Which roles are most critical in the early stages?",
      },
      {
        id: "value_proposition",
        label: "Articulate your value proposition",
        type: "question",
        description:
          "What unique value do you offer that competitors don't? Why should customers choose you? Craft a clear, compelling statement that resonates with your target market.",
      },
    ],
  },
  {
    number: 2,
    name: "1st Role",
    description: "Define the first critical role you need for your venture",
    icon: Target,
    color: "from-rose-500 to-pink-500",
    tasks: [
      {
        id: "role_name",
        label: "Role Name",
        type: "question",
        description:
          "What is the title of the first role you need to fill? Be specific about the function (e.g., 'Technical Co-Builder', 'Marketing Lead', 'Operations Manager').",
      },
      {
        id: "core_responsibilities",
        label: "Core Responsibilities",
        type: "question",
        description:
          "What are the main responsibilities this role will own? List the key tasks, decisions, and deliverables this person will be accountable for.",
      },
      {
        id: "success_metric_90_days",
        label: "Success Metric for the First 90 Days",
        type: "question",
        description:
          "How will you measure success for this role in the first 90 days? Define specific, measurable outcomes that indicate the person is performing well.",
      },
    ],
  },
  {
    number: 3,
    name: "E&R",
    description: "Define equity allocation and responsibility structure per startup stage",
    icon: Scale,
    color: "from-indigo-500 to-blue-500",
    tasks: [
      {
        id: "equity_responsibility",
        label: "Equity & Responsibility Matrix",
        type: "equity_editor",
        description:
          "Define 3 customizable stages of your startup lifecycle. For each stage, specify roles, responsibilities, equity ranges, and vesting triggers.",
      },
    ],
  },
  {
    number: 4,
    name: "Team Building",
    description: "Find and onboard the right co-builders from the directory",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    tasks: [
      {
        id: "team_search",
        label: "Search and add team members",
        type: "team_builder",
        description:
          "Use the search bar below to find co-builders from the directory. Add them to your team with the appropriate role (MVCB, MMCB, or MLCB).",
      },
    ],
  },
  {
    number: 5,
    name: "Launch",
    description: "Execute your plan with structured guidance",
    icon: Rocket,
    color: "from-violet-500 to-purple-500",
    tasks: [
      {
        id: "execution_plan",
        label: "Create execution plan",
        type: "question",
        description:
          "Develop a detailed roadmap for your first 90 days. Break down major milestones into actionable tasks. Assign owners and deadlines to maintain accountability.",
      },
      {
        id: "milestone_1",
        label: "First milestone achieved",
        type: "question",
        description:
          "Describe your first significant milestone—whether it's launching an MVP, acquiring initial customers, or securing funding. Document learnings and adjustments.",
      },
      {
        id: "launch_notes",
        label: "Launch readiness notes",
        type: "question",
        description:
          "Document your progress, team formation, and key achievements. What have you learned? What challenges remain? Demonstrate readiness for full execution.",
      },
    ],
  },
];

export const IdeaDevelopDialog = ({
  open,
  onOpenChange,
  ideaId,
  ideaTitle,
  onEpisodeComplete,
}: IdeaDevelopDialogProps) => {
  const { user } = useAuth();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState<Record<number, PhaseProgress>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTeamMembers, setHasTeamMembers] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const phase = IDEA_DEVELOP_PHASES[currentPhase];
  const totalPhases = IDEA_DEVELOP_PHASES.length;
  const isLastPhase = currentPhase === totalPhases - 1;

  // Check if Team Building (phase 4) is complete
  const isTeamBuildingComplete = hasTeamMembers;

  // Check if Launch phase (phase 5) is locked
  const isLaunchLocked = currentPhase === 5 && !phaseProgress[4]?.is_completed;

  // Auto-save function with debounce
  const autoSaveProgress = useCallback(
    async (phaseNum: number, responsesToSave: Record<string, string>) => {
      if (!user) return;

      setIsAutoSaving(true);
      try {
        const currentPhaseName = IDEA_DEVELOP_PHASES[phaseNum].name;
        const { data: existing } = await supabase
          .from("idea_journey_progress")
          .select("id")
          .eq("startup_id", ideaId)
          .eq("phase_number", phaseNum)
          .eq("episode", "development")
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
            episode: "development",
            responses: responsesToSave,
          });
        }

        console.log("Auto-saved progress for phase", phaseNum);
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsAutoSaving(false);
      }
    },
    [user, ideaId],
  );

  // Load progress only once when dialog opens
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !open || hasLoadedInitial) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("idea_journey_progress")
          .select("*")
          .eq("startup_id", ideaId)
          .eq("episode", "development");

        if (error) throw error;

        const progressMap: Record<number, PhaseProgress> = {};
        data?.forEach((p) => {
          progressMap[p.phase_number] = {
            phase_number: p.phase_number,
            phase_name: p.phase_name,
            responses: (p.responses as Record<string, string>) || {},
            completed_tasks: (p.completed_tasks as string[]) || [],
            is_completed: p.is_completed || false,
          };
        });

        setPhaseProgress(progressMap);

        // Set current responses for the active phase
        if (progressMap[currentPhase]) {
          setResponses(progressMap[currentPhase].responses);
        } else {
          setResponses({});
        }

        // Check for team members
        const { count } = await supabase
          .from("startup_team_members")
          .select("*", { count: "exact", head: true })
          .eq("startup_id", ideaId);

        setHasTeamMembers((count || 0) > 0);
        setHasLoadedInitial(true);
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user, ideaId, open, hasLoadedInitial, currentPhase]);

  // Reset loaded flag when dialog closes
  useEffect(() => {
    if (!open) {
      setHasLoadedInitial(false);
    }
  }, [open]);

  // Update responses when phase changes - use cached data from phaseProgress
  useEffect(() => {
    if (!hasLoadedInitial) return;

    if (phaseProgress[currentPhase]) {
      setResponses(phaseProgress[currentPhase].responses);
    } else {
      setResponses({});
    }
  }, [currentPhase, hasLoadedInitial]);

  const handleResponseChange = (taskId: string, value: string) => {
    const newResponses = { ...responses, [taskId]: value };
    setResponses(newResponses);

    // Update phaseProgress immediately so it persists when switching tabs
    setPhaseProgress((prev) => ({
      ...prev,
      [currentPhase]: {
        phase_number: currentPhase,
        phase_name: phase.name,
        responses: newResponses,
        completed_tasks: prev[currentPhase]?.completed_tasks || [],
        is_completed: prev[currentPhase]?.is_completed || false,
      },
    }));

    // Auto-save with debounce (1 second delay)
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveProgress(currentPhase, newResponses);
    }, 1000);
  };

  // Cleanup timeout on unmount
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
        .eq("episode", "development")
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
          episode: "development",
          responses,
        });
      }

      // Update local state
      setPhaseProgress((prev) => ({
        ...prev,
        [currentPhase]: {
          phase_number: currentPhase,
          phase_name: phase.name,
          responses,
          completed_tasks: prev[currentPhase]?.completed_tasks || [],
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
    // For Team Building phase (now phase 4), check if there are team members
    if (currentPhase === 4) {
      return hasTeamMembers;
    }

    // For equity editor phase, check if data exists
    if (currentPhase === 3) {
      const eqData = responses["equity_responsibility"];
      if (!eqData) return false;
      try {
        const parsed: EquityResponsibilityData = JSON.parse(eqData);
        return parsed.stages?.some((s) => s.rows.some((r) => r.role.trim().length > 0));
      } catch {
        return false;
      }
    }

    // For other phases, check if all questions are answered
    return phase.tasks.every((task) => {
      if (task.type === "question") {
        return responses[task.id]?.trim().length > 0;
      }
      return true;
    });
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
        .eq("episode", "development")
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
          episode: "development",
          responses,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
      }

      // Update local state
      setPhaseProgress((prev) => ({
        ...prev,
        [currentPhase]: {
          phase_number: currentPhase,
          phase_name: phase.name,
          responses,
          completed_tasks: [],
          is_completed: true,
        },
      }));

      toast.success(`${phase.name} phase completed!`);

      // Move to next phase if not last
      if (!isLastPhase) {
        setCurrentPhase((prev) => prev + 1);
      } else {
        // Last phase completed - update startup to validation episode
        await supabase
          .from("startup_ideas")
          .update({
            current_episode: "validation",
            development_completed_at: new Date().toISOString(),
          })
          .eq("id", ideaId);

        toast.success("Development episode completed! Moving to Validation phase.");
        onEpisodeComplete?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error completing phase:", error);
      toast.error("Failed to complete phase");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTeamUpdated = async () => {
    // Re-check team members count
    const { count } = await supabase
      .from("startup_team_members")
      .select("*", { count: "exact", head: true })
      .eq("startup_id", ideaId);

    setHasTeamMembers((count || 0) > 0);
  };

  const progress = ((currentPhase + 1) / totalPhases) * 100;

  const canAccessPhase = (phaseNum: number) => {
    // Phase 0 is always accessible
    if (phaseNum === 0) return true;
    // Phase 5 (Launch) requires Phase 4 (Team Building) to be complete
    if (phaseNum === 5) return phaseProgress[4]?.is_completed || false;
    // Other phases require previous phase to be complete
    return phaseProgress[phaseNum - 1]?.is_completed || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Develop: {ideaTitle}</DialogTitle>
          <DialogDescription>Complete each phase to bring your startup idea to life</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  Overall Progress
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

            {/* Phase Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {IDEA_DEVELOP_PHASES.map((p) => {
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
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : !isAccessible ? (
                        <Lock className="w-4 h-4" />
                      ) : null}
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Phase Content */}
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
                {/* Locked state for Launch phase */}
                {currentPhase === 5 && !canAccessPhase(5) && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                    <Lock className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Complete Team Building First</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Add at least one team member in the Team Building phase to unlock Launch.
                      </p>
                    </div>
                  </div>
                )}

                {/* Phase Tasks */}
                {phase.tasks.map((task) => (
                  <div key={task.id} className="space-y-2">
                    {task.type === "team_builder" && user ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">{task.label}</label>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <TeamMemberSearch
                          startupId={ideaId}
                          currentUserId={user.id}
                          onTeamUpdated={handleTeamUpdated}
                        />
                      </div>
                    ) : task.type === "equity_editor" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">{task.label}</label>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <EquityResponsibilityEditor
                          value={
                            responses[task.id]
                              ? (() => {
                                  try {
                                    return JSON.parse(responses[task.id]);
                                  } catch {
                                    return null;
                                  }
                                })()
                              : null
                          }
                          onChange={(data) => handleResponseChange(task.id, JSON.stringify(data))}
                          disabled={!canAccessPhase(currentPhase)}
                        />
                      </div>
                    ) : task.type === "question" ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{task.label}</label>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <Textarea
                          value={responses[task.id] || ""}
                          onChange={(e) => handleResponseChange(task.id, e.target.value)}
                          placeholder="Enter your response..."
                          rows={4}
                          disabled={currentPhase === 5 && !canAccessPhase(5)}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleSaveProgress}
                    disabled={isSaving || (currentPhase === 5 && !canAccessPhase(5))}
                    className="flex-1"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Progress
                  </Button>

                  <Button
                    onClick={handleCompletePhase}
                    disabled={!isPhaseComplete() || isSaving || (currentPhase === 5 && !canAccessPhase(5))}
                    className="flex-1"
                  >
                    {isLastPhase ? "Complete Journey" : "Complete Phase"}
                    {!isLastPhase && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Phase Completion Status */}
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

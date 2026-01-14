import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { TeamMemberSearch } from "./TeamMemberSearch";

interface IdeaDevelopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: string;
  ideaTitle: string;
}

interface PhaseProgress {
  phase_number: number;
  phase_name: string;
  responses: Record<string, string>;
  completed_tasks: string[];
  is_completed: boolean;
}

// Modified phases for idea development (Team Building removes first 2 checks)
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
    number: 3,
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
}: IdeaDevelopDialogProps) => {
  const { user } = useAuth();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState<Record<number, PhaseProgress>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTeamMembers, setHasTeamMembers] = useState(false);

  const phase = IDEA_DEVELOP_PHASES[currentPhase];
  const totalPhases = IDEA_DEVELOP_PHASES.length;
  const isLastPhase = currentPhase === totalPhases - 1;

  // Check if Team Building (phase 2) is complete
  const isTeamBuildingComplete = hasTeamMembers;
  
  // Check if Launch phase is locked
  const isLaunchLocked = currentPhase === 3 && !phaseProgress[2]?.is_completed;

  // Load existing progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !open) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("idea_journey_progress")
          .select("*")
          .eq("startup_id", ideaId);

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
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user, ideaId, open, currentPhase]);

  // Update responses when phase changes
  useEffect(() => {
    if (phaseProgress[currentPhase]) {
      setResponses(phaseProgress[currentPhase].responses);
    } else {
      setResponses({});
    }
  }, [currentPhase, phaseProgress]);

  const handleResponseChange = (taskId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSaveProgress = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("idea_journey_progress")
        .select("id")
        .eq("startup_id", ideaId)
        .eq("phase_number", currentPhase)
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
    // For Team Building phase, check if there are team members
    if (currentPhase === 2) {
      return hasTeamMembers;
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
    // Phase 3 (Launch) requires Phase 2 (Team Building) to be complete
    if (phaseNum === 3) return phaseProgress[2]?.is_completed || false;
    // Other phases require previous phase to be complete
    return phaseProgress[phaseNum - 1]?.is_completed || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Develop: {ideaTitle}
          </DialogTitle>
          <DialogDescription>
            Complete each phase to bring your startup idea to life
          </DialogDescription>
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
                <span>Overall Progress</span>
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
                {currentPhase === 3 && !canAccessPhase(3) && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                    <Lock className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Complete Team Building First
                      </p>
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
                    ) : task.type === "question" ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{task.label}</label>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <Textarea
                          value={responses[task.id] || ""}
                          onChange={(e) => handleResponseChange(task.id, e.target.value)}
                          placeholder="Enter your response..."
                          rows={4}
                          disabled={currentPhase === 3 && !canAccessPhase(3)}
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
                    disabled={isSaving || (currentPhase === 3 && !canAccessPhase(3))}
                    className="flex-1"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Progress
                  </Button>

                  <Button
                    onClick={handleCompletePhase}
                    disabled={!isPhaseComplete() || isSaving || (currentPhase === 3 && !canAccessPhase(3))}
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

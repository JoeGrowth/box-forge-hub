import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  Clock,
  Loader2,
  Lightbulb,
  Briefcase,
  Users,
  Rocket,
  Target,
  AlertCircle,
} from "lucide-react";

interface IdeaProgressViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: string;
  startupTitle: string;
}

interface PhaseProgress {
  phase_number: number;
  phase_name: string;
  responses: Record<string, string>;
  is_completed: boolean;
  completed_at?: string;
}

const IDEA_PHASES = [
  {
    number: 0,
    name: "Ideation",
    description: "Vision, problem, and market opportunity",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-500",
    tasks: [
      { id: "vision", label: "Vision" },
      { id: "problem", label: "Problem" },
      { id: "market", label: "Target Market" },
    ],
  },
  {
    number: 1,
    name: "Structuring",
    description: "Business model and key roles",
    icon: Briefcase,
    color: "from-blue-500 to-cyan-500",
    tasks: [
      { id: "business_model", label: "Business Model" },
      { id: "key_roles", label: "Key Roles Needed" },
      { id: "value_proposition", label: "Value Proposition" },
    ],
  },
  {
    number: 2,
    name: "Role Definition",
    description: "First critical role for the venture",
    icon: Target,
    color: "from-rose-500 to-pink-500",
    tasks: [
      { id: "role_name", label: "Role Name" },
      { id: "core_responsibilities", label: "Core Responsibilities" },
      { id: "success_metric_90_days", label: "Success Metric (90 Days)" },
    ],
  },
  {
    number: 3,
    name: "Team Building",
    description: "Finding and onboarding co-builders",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    tasks: [{ id: "team_search", label: "Team Members Added" }],
  },
  {
    number: 4,
    name: "Launch",
    description: "Execution plan and milestones",
    icon: Rocket,
    color: "from-violet-500 to-purple-500",
    tasks: [
      { id: "execution_plan", label: "Execution Plan" },
      { id: "milestone_1", label: "First Milestone" },
      { id: "launch_notes", label: "Launch Readiness Notes" },
    ],
  },
];

export const IdeaProgressViewDialog = ({
  open,
  onOpenChange,
  startupId,
  startupTitle,
}: IdeaProgressViewDialogProps) => {
  const [phaseProgress, setPhaseProgress] = useState<Record<number, PhaseProgress>>({});
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      if (!open || !startupId) return;

      setIsLoading(true);
      try {
        // Load progress from idea_journey_progress
        const { data, error } = await supabase
          .from("idea_journey_progress")
          .select("*")
          .eq("startup_id", startupId);

        if (error) throw error;

        const progressMap: Record<number, PhaseProgress> = {};
        data?.forEach((p) => {
          progressMap[p.phase_number] = {
            phase_number: p.phase_number,
            phase_name: p.phase_name,
            responses: (p.responses as Record<string, string>) || {},
            is_completed: p.is_completed || false,
            completed_at: p.completed_at || undefined,
          };
        });

        setPhaseProgress(progressMap);

        // Check for team members
        const { count } = await supabase
          .from("startup_team_members")
          .select("*", { count: "exact", head: true })
          .eq("startup_id", startupId);

        setTeamMembersCount(count || 0);
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [open, startupId]);

  const getPhaseStatus = (phaseNum: number) => {
    const progress = phaseProgress[phaseNum];
    if (progress?.is_completed) return "completed";
    if (progress && Object.keys(progress.responses).length > 0) return "in_progress";
    return "not_started";
  };

  const completedPhases = Object.values(phaseProgress).filter((p) => p.is_completed).length;
  const overallProgress = (completedPhases / IDEA_PHASES.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            Idea Development Progress
          </DialogTitle>
          <DialogDescription>
            View the initiator's progress for "{startupTitle}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Overall Progress */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Overall Progress
                  </span>
                  <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
                    {completedPhases} / {IDEA_PHASES.length} phases
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-b4-teal to-b4-navy transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Phases */}
              <div className="space-y-4">
                {IDEA_PHASES.map((phase) => {
                  const Icon = phase.icon;
                  const status = getPhaseStatus(phase.number);
                  const progress = phaseProgress[phase.number];

                  return (
                    <Card key={phase.number} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-semibold">
                                {phase.name}
                              </CardTitle>
                              {status === "completed" && (
                                <Badge className="bg-b4-teal text-white text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {status === "in_progress" && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                              {status === "not_started" && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Not Started
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {phase.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {status === "not_started" ? (
                          <p className="text-sm text-muted-foreground italic">
                            No responses yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {phase.number === 3 ? (
                              <div className="p-3 rounded-lg bg-muted/30">
                                <span className="text-sm font-medium text-foreground">
                                  Team Members:
                                </span>{" "}
                                <span className="text-sm text-muted-foreground">
                                  {teamMembersCount > 0
                                    ? `${teamMembersCount} member${teamMembersCount > 1 ? "s" : ""} added`
                                    : "No team members added yet"}
                                </span>
                              </div>
                            ) : (
                              phase.tasks.map((task) => {
                                const response = progress?.responses[task.id];
                                return (
                                  <div
                                    key={task.id}
                                    className="p-3 rounded-lg bg-muted/30"
                                  >
                                    <div className="text-sm font-medium text-foreground mb-1">
                                      {task.label}
                                    </div>
                                    {response ? (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {response}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground/60 italic">
                                        Not answered
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

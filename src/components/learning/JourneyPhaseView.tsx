import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  useLearningJourneys,
  JourneyType,
  LearningJourney,
  SKILL_PTC_PHASES,
  IDEA_PTC_PHASES,
  SCALING_PATH_PHASES,
} from "@/hooks/useLearningJourneys";
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Send, Loader2 } from "lucide-react";

interface JourneyPhaseViewProps {
  journeyType: JourneyType;
  onBack: () => void;
}

export const JourneyPhaseView = ({ journeyType, onBack }: JourneyPhaseViewProps) => {
  const {
    getJourney,
    getPhaseResponse,
    updatePhaseResponse,
    completePhase,
    submitForApproval,
  } = useLearningJourneys();

  const journey = getJourney(journeyType);
  const [currentPhase, setCurrentPhase] = useState(journey?.current_phase || 0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phases =
    journeyType === "skill_ptc"
      ? SKILL_PTC_PHASES
      : journeyType === "idea_ptc"
      ? IDEA_PTC_PHASES
      : SCALING_PATH_PHASES;

  const phase = phases[currentPhase];
  const totalPhases = phases.length;
  const isLastPhase = currentPhase === totalPhases - 1;

  // Load existing responses
  useEffect(() => {
    if (journey) {
      const phaseResponse = getPhaseResponse(journey.id, currentPhase);
      if (phaseResponse) {
        setResponses(phaseResponse.responses || {});
        setCompletedTasks(phaseResponse.completed_tasks || []);
      } else {
        setResponses({});
        setCompletedTasks([]);
      }
    }
  }, [journey, currentPhase, getPhaseResponse]);

  if (!journey || !phase) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Journey not found. Please start a journey first.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const handleResponseChange = (taskId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleTaskToggle = (taskId: string) => {
    setCompletedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((t) => t !== taskId) : [...prev, taskId]
    );
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    await updatePhaseResponse(journey.id, currentPhase, phase.name, {
      responses,
      completed_tasks: completedTasks,
    });
    setIsSaving(false);
  };

  const isPhaseComplete = () => {
    return phase.tasks.every((task) => {
      if (task.type === "checklist") {
        return completedTasks.includes(task.id);
      }
      return responses[task.id]?.trim().length > 0;
    });
  };

  const handleCompletePhase = async () => {
    if (!isPhaseComplete()) return;

    setIsSaving(true);
    await updatePhaseResponse(journey.id, currentPhase, phase.name, {
      responses,
      completed_tasks: completedTasks,
      is_completed: true,
      completed_at: new Date().toISOString(),
    });
    await completePhase(journey.id, currentPhase);
    setIsSaving(false);

    if (!isLastPhase) {
      setCurrentPhase((prev) => prev + 1);
    }
  };

  const handleSubmitForApproval = async () => {
    setIsSubmitting(true);
    await submitForApproval(journey.id);
    setIsSubmitting(false);
    onBack();
  };

  const progress = ((currentPhase + 1) / totalPhases) * 100;

  const getJourneyTitle = () => {
    switch (journeyType) {
      case "skill_ptc":
        return "Skill PTC Journey";
      case "idea_ptc":
        return "Idea PTC Journey";
      case "scaling_path":
        return "Scaling Path Journey";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Selection
        </Button>
        <Badge variant="outline">
          Phase {currentPhase + 1} of {totalPhases}
        </Badge>
      </div>

      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {getJourneyTitle()}
        </h2>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{phase.duration}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Phase Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {phases.map((p, index) => {
          const phaseResponse = getPhaseResponse(journey.id, index);
          const isCompleted = phaseResponse?.is_completed;
          const isCurrent = index === currentPhase;
          const isAccessible = index <= journey.current_phase;

          return (
            <button
              key={p.number}
              onClick={() => isAccessible && setCurrentPhase(index)}
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
          <CardTitle className="font-display text-xl">{phase.name}</CardTitle>
          <CardDescription>{phase.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {phase.tasks.map((task) => (
            <div key={task.id} className="space-y-2">
              {task.type === "checklist" ? (
                <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={task.id}
                      checked={completedTasks.includes(task.id)}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={task.id}
                        className={`cursor-pointer font-medium ${
                          completedTasks.includes(task.id)
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.label}
                      </label>
                      {(task as any).description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {(task as any).description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{task.label}</label>
                  {(task as any).description && (
                    <p className="text-sm text-muted-foreground">
                      {(task as any).description}
                    </p>
                  )}
                  <Textarea
                    value={responses[task.id] || ""}
                    onChange={(e) => handleResponseChange(task.id, e.target.value)}
                    placeholder="Enter your response..."
                    rows={4}
                  />
                </div>
              )}
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
              ) : null}
              Save Progress
            </Button>

            {isLastPhase && journey.status !== "pending_approval" ? (
              <Button
                onClick={handleSubmitForApproval}
                disabled={!isPhaseComplete() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit for Approval
              </Button>
            ) : (
              <Button
                onClick={handleCompletePhase}
                disabled={!isPhaseComplete() || isSaving}
                className="flex-1"
              >
                Complete Phase
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {journey.status === "pending_approval" && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Awaiting Admin Approval
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Your journey has been submitted and is being reviewed by an admin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {journey.status === "rejected" && journey.admin_notes && (
        <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="font-medium text-red-800 dark:text-red-200">
                Revision Required
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {journey.admin_notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

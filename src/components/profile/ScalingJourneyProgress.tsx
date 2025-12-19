import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  Rocket, 
  Building2, 
  Settings, 
  Target, 
  Crown,
  Save,
  CheckCircle,
  Circle,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PhaseData {
  [key: string]: string | boolean | number;
}

interface ScalingJourneyProgressProps {
  onUpdate?: () => void;
}

const PHASES = [
  {
    id: 1,
    title: "Personal Entity",
    subtitle: "Personal journey towards structure and growth",
    icon: Rocket,
    description: "100% earned by the person. Build your foundation with your personal brand.",
    tasks: [
      { id: "logo_name", label: "Logo & Name for entity (based 100% on the person)", type: "text" },
      { id: "service_1", label: "Service 1", type: "text" },
      { id: "service_2", label: "Service 2", type: "text" },
      { id: "service_3", label: "Service 3", type: "text" },
      { id: "website_link", label: "Website Link", type: "url" },
      { id: "missions_delivered", label: "List 10 missions delivered alone", type: "textarea" },
    ],
  },
  {
    id: 2,
    title: "Company Formation",
    subtitle: "Collaborating and sharing value with external contributors",
    icon: Building2,
    description: "70% earned by the person. Main activities: consulting and training.",
    tasks: [
      { id: "company_logo_name_brand", label: "Logo + Name + Brand as company", type: "text" },
      { id: "company_services", label: "Services linked indirectly to natural role", type: "textarea" },
      { id: "company_website", label: "Company Website", type: "url" },
      { id: "proposal_template", label: "Technical & Financial Proposal template (adapted to services)", type: "textarea" },
      { id: "first_invoice_external", label: "First invoice for a mission with paying external people (as independent)", type: "checkbox" },
    ],
  },
  {
    id: 3,
    title: "Process Implementation",
    subtitle: "Applying and testing the process through successful missions",
    icon: Settings,
    description: "Define and implement your operational process.",
    tasks: [
      { id: "put_the_process", label: 'Put "the process"', type: "textarea" },
      { id: "implement_the_process", label: 'Implement "the process"', type: "checkbox" },
      { id: "review_the_process", label: 'Review "the process"', type: "textarea" },
      { id: "first_mission_mixed", label: "1st Mission delivered successfully (invoice) with paying external people (independent) and internal people (fees or salary)", type: "checkbox" },
    ],
  },
  {
    id: 4,
    title: "Autonomous Structure",
    subtitle: "Transition towards autonomous structure and operations",
    icon: Target,
    description: "Scale operations with a dedicated process manager.",
    tasks: [
      { id: "optimize_process_4", label: 'Optimize & enhance "The process"', type: "textarea" },
      { id: "optimize_implementation_4", label: 'Optimize & enhance "Implementation"', type: "textarea" },
      { id: "three_missions_delivered", label: "3 Missions delivered (invoice) successfully", type: "checkbox" },
      { id: "review_process_4", label: "Review the process", type: "textarea" },
      { id: "process_manager", label: "Process manager (as internal person)", type: "text" },
    ],
  },
  {
    id: 5,
    title: "Decentralized Structure",
    subtitle: "Shift of ownership and responsibility (successful scalability)",
    icon: Crown,
    description: "Achieve true scalability with decentralized operations.",
    tasks: [
      { id: "optimize_process_5", label: 'Optimize & enhance "The process"', type: "textarea" },
      { id: "optimize_implementation_5", label: 'Optimize & enhance "Implementation"', type: "textarea" },
      { id: "five_missions_delivered", label: "5 Missions delivered successfully", type: "checkbox" },
      { id: "review_process_5", label: "Review the process", type: "textarea" },
      { id: "structure_handler", label: "Structure handler (as internal person)", type: "text" },
    ],
  },
];

export const ScalingJourneyProgress = ({ onUpdate }: ScalingJourneyProgressProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [phaseData, setPhaseData] = useState<Record<number, PhaseData>>({});
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [openPhase, setOpenPhase] = useState<number | null>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrCreateJourney();
    }
  }, [user]);

  const fetchOrCreateJourney = async () => {
    if (!user) return;

    try {
      // Check for existing scaling journey
      const { data: existingJourney, error: fetchError } = await supabase
        .from("learning_journeys")
        .select("*")
        .eq("user_id", user.id)
        .eq("journey_type", "scaling_path")
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingJourney) {
        setJourneyId(existingJourney.id);
        await fetchPhaseResponses(existingJourney.id);
      } else {
        // Create new scaling journey
        const { data: newJourney, error: createError } = await supabase
          .from("learning_journeys")
          .insert({
            user_id: user.id,
            journey_type: "scaling_path",
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        setJourneyId(newJourney.id);
      }
    } catch (error) {
      console.error("Error fetching/creating journey:", error);
      toast({
        title: "Error",
        description: "Failed to load scaling journey",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhaseResponses = async (jId: string) => {
    const { data: responses, error } = await supabase
      .from("journey_phase_responses")
      .select("*")
      .eq("journey_id", jId);

    if (error) {
      console.error("Error fetching phase responses:", error);
      return;
    }

    const dataMap: Record<number, PhaseData> = {};
    const completed: number[] = [];

    responses?.forEach((response) => {
      const phaseResponses = response.responses as PhaseData || {};
      dataMap[response.phase_number] = phaseResponses;
      if (response.is_completed) {
        completed.push(response.phase_number);
      }
    });

    setPhaseData(dataMap);
    setCompletedPhases(completed);

    // Open first incomplete phase
    const firstIncomplete = PHASES.find(p => !completed.includes(p.id));
    if (firstIncomplete) {
      setOpenPhase(firstIncomplete.id);
    }
  };

  const handleInputChange = (phaseId: number, taskId: string, value: string | boolean) => {
    setPhaseData(prev => ({
      ...prev,
      [phaseId]: {
        ...(prev[phaseId] || {}),
        [taskId]: value,
      },
    }));
  };

  const savePhaseProgress = async (phaseId: number) => {
    if (!user || !journeyId) return;

    setIsSaving(true);
    try {
      const phase = PHASES.find(p => p.id === phaseId);
      if (!phase) return;

      const currentData = phaseData[phaseId] || {};
      
      // Check if all tasks are completed
      const allTasksComplete = phase.tasks.every(task => {
        const value = currentData[task.id];
        if (task.type === "checkbox") {
          return value === true;
        }
        return value && String(value).trim().length > 0;
      });

      // Check if phase response exists
      const { data: existingResponse } = await supabase
        .from("journey_phase_responses")
        .select("id")
        .eq("journey_id", journeyId)
        .eq("phase_number", phaseId)
        .maybeSingle();

      if (existingResponse) {
        // Update existing response
        const { error } = await supabase
          .from("journey_phase_responses")
          .update({
            responses: currentData,
            is_completed: allTasksComplete,
            completed_at: allTasksComplete ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id);

        if (error) throw error;
      } else {
        // Insert new response
        const { error } = await supabase
          .from("journey_phase_responses")
          .insert({
            user_id: user.id,
            journey_id: journeyId,
            phase_number: phaseId,
            phase_name: phase.title,
            responses: currentData,
            is_completed: allTasksComplete,
            completed_at: allTasksComplete ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }

      if (allTasksComplete && !completedPhases.includes(phaseId)) {
        setCompletedPhases(prev => [...prev, phaseId]);
        toast({
          title: "Phase Completed!",
          description: `${phase.title} has been marked as complete.`,
        });
        // Open next phase
        const nextPhase = PHASES.find(p => p.id === phaseId + 1);
        if (nextPhase) {
          setOpenPhase(nextPhase.id);
        }
      } else {
        toast({
          title: "Progress Saved",
          description: "Your progress has been saved. You can continue later.",
        });
      }

      onUpdate?.();
    } catch (error) {
      console.error("Error saving phase:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPhaseProgress = (phaseId: number) => {
    const phase = PHASES.find(p => p.id === phaseId);
    if (!phase) return 0;

    const data = phaseData[phaseId] || {};
    const completedTasks = phase.tasks.filter(task => {
      const value = data[task.id];
      if (task.type === "checkbox") return value === true;
      return value && String(value).trim().length > 0;
    }).length;

    return Math.round((completedTasks / phase.tasks.length) * 100);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-b4-teal to-b4-coral flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Scaling Journey</CardTitle>
            <p className="text-sm text-muted-foreground">
              Personal journey towards structure and growth
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-b4-teal to-b4-coral transition-all duration-300"
              style={{ width: `${(completedPhases.length / PHASES.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {completedPhases.length}/{PHASES.length} phases
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {PHASES.map((phase) => {
          const Icon = phase.icon;
          const isCompleted = completedPhases.includes(phase.id);
          const progress = getPhaseProgress(phase.id);
          const isOpen = openPhase === phase.id;
          const data = phaseData[phase.id] || {};

          return (
            <Collapsible
              key={phase.id}
              open={isOpen}
              onOpenChange={(open) => setOpenPhase(open ? phase.id : null)}
            >
              <CollapsibleTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors",
                    isCompleted 
                      ? "bg-b4-teal/10 border border-b4-teal/20" 
                      : "bg-muted/50 border border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isCompleted ? "bg-b4-teal text-white" : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          Phase {phase.id}: {phase.title}
                        </span>
                        {isCompleted && (
                          <Badge variant="default" className="bg-b4-teal text-white text-xs">
                            Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{phase.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isCompleted && progress > 0 && (
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    )}
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 space-y-4 bg-card border border-t-0 border-border rounded-b-lg">
                  <p className="text-sm text-muted-foreground italic">{phase.description}</p>
                  
                  {phase.tasks.map((task) => (
                    <div key={task.id} className="space-y-2">
                      <Label className="text-sm font-medium">{task.label}</Label>
                      {task.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${phase.id}-${task.id}`}
                            checked={data[task.id] === true}
                            onCheckedChange={(checked) => handleInputChange(phase.id, task.id, !!checked)}
                          />
                          <label 
                            htmlFor={`${phase.id}-${task.id}`}
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Mark as completed
                          </label>
                        </div>
                      ) : task.type === "textarea" ? (
                        <Textarea
                          value={String(data[task.id] || "")}
                          onChange={(e) => handleInputChange(phase.id, task.id, e.target.value)}
                          placeholder={`Enter ${task.label.toLowerCase()}...`}
                          rows={3}
                        />
                      ) : (
                        <Input
                          type={task.type === "url" ? "url" : "text"}
                          value={String(data[task.id] || "")}
                          onChange={(e) => handleInputChange(phase.id, task.id, e.target.value)}
                          placeholder={task.type === "url" ? "https://..." : `Enter ${task.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}

                  <Button 
                    variant="teal" 
                    className="w-full mt-4"
                    onClick={() => savePhaseProgress(phase.id)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Progress
                      </>
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  Loader2, 
  CheckCircle, 
  Rocket, 
  Building2, 
  Settings, 
  Target, 
  Crown 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PhaseData {
  [key: string]: string | boolean | number;
}

interface PhaseConfig {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tasks: {
    id: string;
    label: string;
    type: "text" | "url" | "textarea" | "checkbox";
  }[];
}

const PHASES: PhaseConfig[] = [
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

interface ScaleStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: 1 | 2 | 3;
  onComplete: () => void;
}

// Map step numbers to phases
const STEP_TO_PHASES: Record<1 | 2 | 3, number[]> = {
  1: [1],        // Step 1: Create the Mask → Phase 1
  2: [2, 3, 4],  // Step 2: Code the Mask → Phases 2, 3, 4
  3: [5],        // Step 3: Detach & Scale → Phase 5
};

const STEP_TITLES: Record<1 | 2 | 3, { title: string; description: string }> = {
  1: { 
    title: "Create the Mask", 
    description: "Build your personal entity foundation" 
  },
  2: { 
    title: "Code the Mask", 
    description: "Structure your entity with processes and systems" 
  },
  3: { 
    title: "Detach & Scale", 
    description: "Achieve decentralized scalability" 
  },
};

export const ScaleStepDialog = ({ 
  open, 
  onOpenChange, 
  stepNumber, 
  onComplete 
}: ScaleStepDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [phaseData, setPhaseData] = useState<Record<number, PhaseData>>({});
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");

  const relevantPhases = STEP_TO_PHASES[stepNumber];
  const phasesConfig = PHASES.filter(p => relevantPhases.includes(p.id));
  const stepInfo = STEP_TITLES[stepNumber];

  useEffect(() => {
    if (open && user) {
      fetchOrCreateJourney();
      setActiveTab(`phase-${relevantPhases[0]}`);
    }
  }, [open, user, stepNumber]);

  const fetchOrCreateJourney = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
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

  const isPhaseComplete = (phaseId: number) => {
    const phase = PHASES.find(p => p.id === phaseId);
    if (!phase) return false;
    
    const data = phaseData[phaseId] || {};
    return phase.tasks.every(task => {
      const value = data[task.id];
      if (task.type === "checkbox") return value === true;
      return value && String(value).trim().length > 0;
    });
  };

  const saveAllProgress = async () => {
    if (!user || !journeyId) return;

    setIsSaving(true);
    try {
      for (const phase of phasesConfig) {
        const currentData = phaseData[phase.id] || {};
        const allTasksComplete = isPhaseComplete(phase.id);

        const { data: existingResponse } = await supabase
          .from("journey_phase_responses")
          .select("id")
          .eq("journey_id", journeyId)
          .eq("phase_number", phase.id)
          .maybeSingle();

        if (existingResponse) {
          await supabase
            .from("journey_phase_responses")
            .update({
              responses: currentData,
              is_completed: allTasksComplete,
              completed_at: allTasksComplete ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingResponse.id);
        } else {
          await supabase
            .from("journey_phase_responses")
            .insert({
              user_id: user.id,
              journey_id: journeyId,
              phase_number: phase.id,
              phase_name: phase.title,
              responses: currentData,
              is_completed: allTasksComplete,
              completed_at: allTasksComplete ? new Date().toISOString() : null,
            });
        }

        if (allTasksComplete && !completedPhases.includes(phase.id)) {
          setCompletedPhases(prev => [...prev, phase.id]);
        }
      }

      toast({
        title: "Progress Saved",
        description: "Your progress has been saved successfully.",
      });

      onComplete();
    } catch (error) {
      console.error("Error saving progress:", error);
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

  const allPhasesComplete = relevantPhases.every(phaseId => 
    completedPhases.includes(phaseId) || isPhaseComplete(phaseId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-display">
            Step {stepNumber}: {stepInfo.title}
          </DialogTitle>
          <DialogDescription>
            {stepInfo.description}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 max-h-[calc(85vh-180px)]">
              <div className="p-6">
                {phasesConfig.length === 1 ? (
                  // Single phase - no tabs needed
                  <PhaseContent
                    phase={phasesConfig[0]}
                    data={phaseData[phasesConfig[0].id] || {}}
                    isComplete={completedPhases.includes(phasesConfig[0].id)}
                    progress={getPhaseProgress(phasesConfig[0].id)}
                    onInputChange={(taskId, value) => 
                      handleInputChange(phasesConfig[0].id, taskId, value)
                    }
                  />
                ) : (
                  // Multiple phases - use tabs
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start mb-6 bg-muted/50">
                      {phasesConfig.map((phase) => {
                        const Icon = phase.icon;
                        const isComplete = completedPhases.includes(phase.id) || isPhaseComplete(phase.id);
                        return (
                          <TabsTrigger 
                            key={phase.id} 
                            value={`phase-${phase.id}`}
                            className="flex items-center gap-2"
                          >
                            {isComplete ? (
                              <CheckCircle className="w-4 h-4 text-b4-teal" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Phase {phase.id}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {phasesConfig.map((phase) => (
                      <TabsContent key={phase.id} value={`phase-${phase.id}`} className="mt-0">
                        <PhaseContent
                          phase={phase}
                          data={phaseData[phase.id] || {}}
                          isComplete={completedPhases.includes(phase.id)}
                          progress={getPhaseProgress(phase.id)}
                          onInputChange={(taskId, value) => 
                            handleInputChange(phase.id, taskId, value)
                          }
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 pt-4 border-t bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {relevantPhases.map(phaseId => {
                    const isComplete = completedPhases.includes(phaseId) || isPhaseComplete(phaseId);
                    return (
                      <div
                        key={phaseId}
                        className={cn(
                          "w-3 h-3 rounded-full transition-colors",
                          isComplete ? "bg-b4-teal" : "bg-muted-foreground/30"
                        )}
                      />
                    );
                  })}
                  {allPhasesComplete && (
                    <Badge className="bg-b4-teal text-white ml-2">All Complete</Badge>
                  )}
                </div>
                <Button 
                  variant="teal" 
                  onClick={saveAllProgress} 
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Separate component for phase content
interface PhaseContentProps {
  phase: PhaseConfig;
  data: PhaseData;
  isComplete: boolean;
  progress: number;
  onInputChange: (taskId: string, value: string | boolean) => void;
}

const PhaseContent = ({ phase, data, isComplete, progress, onInputChange }: PhaseContentProps) => {
  const Icon = phase.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-xl shrink-0",
          isComplete ? "bg-b4-teal/10" : "bg-muted"
        )}>
          {isComplete ? (
            <CheckCircle className="w-6 h-6 text-b4-teal" />
          ) : (
            <Icon className="w-6 h-6 text-foreground" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">Phase {phase.id}: {phase.title}</h3>
            {isComplete && (
              <Badge className="bg-b4-teal text-white">Complete</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{phase.subtitle}</p>
          <p className="text-sm text-muted-foreground italic">{phase.description}</p>
          
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-b4-teal transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {phase.tasks.map((task) => (
          <div key={task.id} className="space-y-2">
            <Label className="text-sm font-medium">{task.label}</Label>
            {task.type === "checkbox" ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${phase.id}-${task.id}`}
                  checked={data[task.id] === true}
                  onCheckedChange={(checked) => onInputChange(task.id, !!checked)}
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
                onChange={(e) => onInputChange(task.id, e.target.value)}
                placeholder={`Enter ${task.label.toLowerCase()}...`}
                rows={3}
              />
            ) : (
              <Input
                type={task.type === "url" ? "url" : "text"}
                value={String(data[task.id] || "")}
                onChange={(e) => onInputChange(task.id, e.target.value)}
                placeholder={task.type === "url" ? "https://..." : `Enter ${task.label.toLowerCase()}...`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScaleStepDialog;

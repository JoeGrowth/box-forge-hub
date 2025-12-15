import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendNotificationEmail } from "@/lib/emailNotifications";
import { exportJourneyToPdf } from "@/lib/journeyPdfExport";
import {
  Target,
  Lightbulb,
  Users,
  Rocket,
  Check,
  ChevronRight,
  ArrowRight,
  Edit3,
  Save,
  Loader2,
  Download,
} from "lucide-react";

interface EntrepreneurJourneyProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  ideaId?: string;
}

interface JourneyResponses {
  vision: string;
  problem: string;
  market: string;
  business_model: string;
  roles_needed: string;
  cobuilder_plan: string;
  execution_plan: string;
}

const STEPS = [
  {
    id: 1,
    title: "Define Your Vision",
    description: "Clarify your vision, problem, and market opportunity",
    icon: Target,
  },
  {
    id: 2,
    title: "Business Model",
    description: "Build your business model and identify key roles needed",
    icon: Lightbulb,
  },
  {
    id: 3,
    title: "Find Co-Builders",
    description: "Onboard the right co-builders to your venture",
    icon: Users,
  },
  {
    id: 4,
    title: "Execute",
    description: "Execute your plan with structured guidance",
    icon: Rocket,
  },
];

export function EntrepreneurJourney({
  currentStep,
  onStepComplete,
  ideaId,
}: EntrepreneurJourneyProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Form state
  const [responses, setResponses] = useState<JourneyResponses>({
    vision: "",
    problem: "",
    market: "",
    business_model: "",
    roles_needed: "",
    cobuilder_plan: "",
    execution_plan: "",
  });

  // Load saved responses on mount
  useEffect(() => {
    const loadResponses = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("entrepreneur_journey_responses")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading responses:", error);
        }

        if (data) {
          setResponses({
            vision: data.vision || "",
            problem: data.problem || "",
            market: data.market || "",
            business_model: data.business_model || "",
            roles_needed: data.roles_needed || "",
            cobuilder_plan: data.cobuilder_plan || "",
            execution_plan: data.execution_plan || "",
          });
        }
      } catch (error) {
        console.error("Error loading journey responses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [user]);

  // Auto-save responses with debounce
  const saveResponses = useCallback(async (updatedResponses: JourneyResponses) => {
    if (!user) return;

    setAutoSaving(true);
    try {
      const { data: existing } = await supabase
        .from("entrepreneur_journey_responses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("entrepreneur_journey_responses")
          .update({
            ...updatedResponses,
            idea_id: ideaId || null,
          })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("entrepreneur_journey_responses")
          .insert({
            user_id: user.id,
            idea_id: ideaId || null,
            ...updatedResponses,
          });
      }
    } catch (error) {
      console.error("Error auto-saving:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [user, ideaId]);

  // Debounced auto-save effect
  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      saveResponses(responses);
    }, 1000);

    return () => clearTimeout(timer);
  }, [responses, saveResponses, loading]);

  const updateResponse = (field: keyof JourneyResponses, value: string) => {
    setResponses(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveStep = async (step: number) => {
    if (!user) return;

    setSaving(true);
    try {
      // Save responses first
      await saveResponses(responses);

      // Update onboarding state with next step
      const { error } = await supabase
        .from("onboarding_state")
        .update({ entrepreneur_step: step + 1 })
        .eq("user_id", user.id);

      if (error) throw error;

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Send email notification for step completion
      if (user.email) {
        // If completing final step (step 4), send journey complete email
        if (step === 4) {
          sendNotificationEmail({
            to: user.email,
            userName: profile?.full_name || "Entrepreneur",
            userId: user.id,
            type: "entrepreneur_journey_complete",
          });
        } else {
          sendNotificationEmail({
            to: user.email,
            userName: profile?.full_name || "Entrepreneur",
            type: "entrepreneur_step_complete",
            data: {
              stepNumber: step,
              stepName: STEPS[step - 1]?.title,
            },
          });
        }
      }

      onStepComplete(step + 1);
      toast({
        title: "Progress Saved",
        description: `Step ${step} completed successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      await saveResponses(responses);
      setIsEditMode(false);
      toast({
        title: "Changes Saved",
        description: "Your journey responses have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-3xl border border-border p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
      </div>
    );
  }

  const isJourneyComplete = currentStep > 4;
  const isViewMode = isJourneyComplete && !isEditMode;

  const renderStepContent = () => {
    // Completed journey - show summary view
    if (isJourneyComplete) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-b4-teal/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-b4-teal" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Journey Complete!
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEditMode ? "Edit your responses below" : "View and edit your journey responses"}
                </p>
              </div>
            </div>
            {!isEditMode ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Responses
              </Button>
            ) : (
              <Button variant="teal" size="sm" onClick={handleSaveEdits} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            )}
          </div>

          {/* Step 1 Summary */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-b4-teal" />
              Step 1: Vision
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Vision</Label>
                {isViewMode ? (
                  <p className="text-sm text-foreground mt-1">{responses.vision || "Not provided"}</p>
                ) : (
                  <Textarea
                    value={responses.vision}
                    onChange={(e) => updateResponse("vision", e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Problem</Label>
                {isViewMode ? (
                  <p className="text-sm text-foreground mt-1">{responses.problem || "Not provided"}</p>
                ) : (
                  <Textarea
                    value={responses.problem}
                    onChange={(e) => updateResponse("problem", e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Market</Label>
                {isViewMode ? (
                  <p className="text-sm text-foreground mt-1">{responses.market || "Not provided"}</p>
                ) : (
                  <Textarea
                    value={responses.market}
                    onChange={(e) => updateResponse("market", e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Step 2 Summary */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-b4-teal" />
              Step 2: Business Model
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Business Model</Label>
                {isViewMode ? (
                  <p className="text-sm text-foreground mt-1">{responses.business_model || "Not provided"}</p>
                ) : (
                  <Textarea
                    value={responses.business_model}
                    onChange={(e) => updateResponse("business_model", e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Key Roles Needed</Label>
                {isViewMode ? (
                  <p className="text-sm text-foreground mt-1">{responses.roles_needed || "Not provided"}</p>
                ) : (
                  <Textarea
                    value={responses.roles_needed}
                    onChange={(e) => updateResponse("roles_needed", e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Step 3 Summary */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-b4-teal" />
              Step 3: Co-Builders
            </h4>
            <div>
              <Label className="text-xs text-muted-foreground">Co-Builder Plan</Label>
              {isViewMode ? (
                <p className="text-sm text-foreground mt-1">{responses.cobuilder_plan || "Not provided"}</p>
              ) : (
                <Textarea
                  value={responses.cobuilder_plan}
                  onChange={(e) => updateResponse("cobuilder_plan", e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              )}
            </div>
          </div>

          {/* Step 4 Summary */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-b4-teal" />
              Step 4: Execution
            </h4>
            <div>
              <Label className="text-xs text-muted-foreground">Execution Plan</Label>
              {isViewMode ? (
                <p className="text-sm text-foreground mt-1">{responses.execution_plan || "Not provided"}</p>
              ) : (
                <Textarea
                  value={responses.execution_plan}
                  onChange={(e) => updateResponse("execution_plan", e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              )}
            </div>
          </div>

          {isViewMode && (
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => exportJourneyToPdf({
                  vision: responses.vision,
                  problem: responses.problem,
                  market: responses.market,
                  business_model: responses.business_model,
                  roles_needed: responses.roles_needed,
                  cobuilder_plan: responses.cobuilder_plan,
                  execution_plan: responses.execution_plan,
                })}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="teal" onClick={() => window.location.href = "/opportunities"} className="flex-1">
                View Your Startup
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Active journey steps
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="vision">What is your vision?</Label>
              <Textarea
                id="vision"
                placeholder="Describe the future you want to create..."
                value={responses.vision}
                onChange={(e) => updateResponse("vision", e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="problem">What problem are you solving?</Label>
              <Textarea
                id="problem"
                placeholder="Describe the pain point or gap in the market..."
                value={responses.problem}
                onChange={(e) => updateResponse("problem", e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="market">What is your target market?</Label>
              <Textarea
                id="market"
                placeholder="Who are your ideal customers? What's the market size?"
                value={responses.market}
                onChange={(e) => updateResponse("market", e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            {autoSaving && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </p>
            )}
            <Button
              variant="teal"
              onClick={() => handleSaveStep(1)}
              disabled={saving || !responses.vision || !responses.problem || !responses.market}
              className="w-full"
            >
              {saving ? "Saving..." : "Complete Step 1"}
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="businessModel">Describe your business model</Label>
              <Textarea
                id="businessModel"
                placeholder="How will you generate revenue? What's your value proposition?"
                value={responses.business_model}
                onChange={(e) => updateResponse("business_model", e.target.value)}
                className="mt-2"
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="rolesNeeded">What key roles do you need?</Label>
              <Textarea
                id="rolesNeeded"
                placeholder="List the co-builder roles essential to your startup (e.g., CTO, Marketing Lead, Product Designer)..."
                value={responses.roles_needed}
                onChange={(e) => updateResponse("roles_needed", e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            {autoSaving && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </p>
            )}
            <Button
              variant="teal"
              onClick={() => handleSaveStep(2)}
              disabled={saving || !responses.business_model || !responses.roles_needed}
              className="w-full"
            >
              {saving ? "Saving..." : "Complete Step 2"}
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="cobuilderPlan">Your co-builder onboarding plan</Label>
              <Textarea
                id="cobuilderPlan"
                placeholder="How will you attract, evaluate, and onboard co-builders? What equity structure will you offer?"
                value={responses.cobuilder_plan}
                onChange={(e) => updateResponse("cobuilder_plan", e.target.value)}
                className="mt-2"
                rows={6}
              />
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <h4 className="font-medium text-foreground mb-2">Tips for finding co-builders:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Post your opportunity on the platform</li>
                <li>• Look for skills that complement yours</li>
                <li>• Consider offering equity to align incentives</li>
                <li>• Start with 1-2 key roles before expanding</li>
              </ul>
            </div>
            {autoSaving && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </p>
            )}
            <Button
              variant="teal"
              onClick={() => handleSaveStep(3)}
              disabled={saving || !responses.cobuilder_plan}
              className="w-full"
            >
              {saving ? "Saving..." : "Complete Step 3"}
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="executionPlan">Your execution roadmap</Label>
              <Textarea
                id="executionPlan"
                placeholder="What are your key milestones? What's your timeline for the next 3-6 months?"
                value={responses.execution_plan}
                onChange={(e) => updateResponse("execution_plan", e.target.value)}
                className="mt-2"
                rows={6}
              />
            </div>
            <div className="bg-b4-teal/10 rounded-xl p-4 border border-b4-teal/20">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-b4-teal" />
                You're almost there!
              </h4>
              <p className="text-sm text-muted-foreground">
                Completing this step will finalize your entrepreneur journey. You'll have full access to manage your startup and attract co-builders.
              </p>
            </div>
            {autoSaving && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </p>
            )}
            <Button
              variant="teal"
              onClick={() => handleSaveStep(4)}
              disabled={saving || !responses.execution_plan}
              className="w-full"
            >
              {saving ? "Saving..." : "Complete Entrepreneur Journey"}
              <Check className="ml-2 w-4 h-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-2">
        🚀 Entrepreneur Journey
      </h2>
      <p className="text-muted-foreground mb-6">
        {isJourneyComplete 
          ? "Review and update your startup journey responses."
          : "Follow these guided steps to launch your startup successfully."}
      </p>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-b4-teal text-primary-foreground"
                      : isCurrent
                      ? "bg-b4-teal/20 text-b4-teal border-2 border-b4-teal"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center max-w-[80px] ${
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    isCompleted ? "bg-b4-teal" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      {currentStep <= 4 && (
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-1">
            Step {currentStep}: {STEPS[currentStep - 1]?.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1]?.description}
          </p>
        </div>
      )}

      {renderStepContent()}
    </div>
  );
}

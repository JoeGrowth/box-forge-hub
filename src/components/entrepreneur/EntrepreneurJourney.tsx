import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Target,
  Lightbulb,
  Users,
  Rocket,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";

interface EntrepreneurJourneyProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  ideaId?: string;
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

  // Step 1: Vision
  const [vision, setVision] = useState("");
  const [problem, setProblem] = useState("");
  const [market, setMarket] = useState("");

  // Step 2: Business Model
  const [businessModel, setBusinessModel] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState("");

  // Step 3: Co-Builders
  const [cobuilderPlan, setCobuilderPlan] = useState("");

  // Step 4: Execution
  const [executionPlan, setExecutionPlan] = useState("");

  const handleSaveStep = async (step: number) => {
    if (!user) return;

    setSaving(true);
    try {
      // Update onboarding state with next step
      const { error } = await supabase
        .from("onboarding_state")
        .update({ entrepreneur_step: step + 1 })
        .eq("user_id", user.id);

      if (error) throw error;

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="vision">What is your vision?</Label>
              <Textarea
                id="vision"
                placeholder="Describe the future you want to create..."
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="problem">What problem are you solving?</Label>
              <Textarea
                id="problem"
                placeholder="Describe the pain point or gap in the market..."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="market">What is your target market?</Label>
              <Textarea
                id="market"
                placeholder="Who are your ideal customers? What's the market size?"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <Button
              variant="teal"
              onClick={() => handleSaveStep(1)}
              disabled={saving || !vision || !problem || !market}
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
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                className="mt-2"
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="rolesNeeded">What key roles do you need?</Label>
              <Textarea
                id="rolesNeeded"
                placeholder="List the co-builder roles essential to your startup (e.g., CTO, Marketing Lead, Product Designer)..."
                value={rolesNeeded}
                onChange={(e) => setRolesNeeded(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <Button
              variant="teal"
              onClick={() => handleSaveStep(2)}
              disabled={saving || !businessModel || !rolesNeeded}
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
                value={cobuilderPlan}
                onChange={(e) => setCobuilderPlan(e.target.value)}
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
            <Button
              variant="teal"
              onClick={() => handleSaveStep(3)}
              disabled={saving || !cobuilderPlan}
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
                value={executionPlan}
                onChange={(e) => setExecutionPlan(e.target.value)}
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
            <Button
              variant="teal"
              onClick={() => handleSaveStep(4)}
              disabled={saving || !executionPlan}
              className="w-full"
            >
              {saving ? "Saving..." : "Complete Entrepreneur Journey"}
              <Check className="ml-2 w-4 h-4" />
            </Button>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-b4-teal/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-b4-teal" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              🎉 Entrepreneur Journey Complete!
            </h3>
            <p className="text-muted-foreground mb-6">
              You've completed all steps. Now it's time to build your venture!
            </p>
            <Button variant="teal" onClick={() => window.location.href = "/opportunities"}>
              View Your Startup
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-2">
        🚀 Entrepreneur Journey
      </h2>
      <p className="text-muted-foreground mb-6">
        Follow these guided steps to launch your startup successfully.
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
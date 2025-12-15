import { CheckCircle, Circle, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface EntrepreneurProgressCardProps {
  currentStep: number;
  onContinue: () => void;
}

const entrepreneurSteps = [
  { step: 1, title: "Define Vision", description: "Articulate your business vision and mission" },
  { step: 2, title: "Business Model", description: "Develop your business model and value proposition" },
  { step: 3, title: "Co-builder Roles", description: "Identify critical roles needed for execution" },
  { step: 4, title: "Execution", description: "Build your business with co-builders" },
];

export function EntrepreneurProgressCard({
  currentStep,
  onContinue,
}: EntrepreneurProgressCardProps) {
  const completedSteps = currentStep - 1;
  const progress = (completedSteps / entrepreneurSteps.length) * 100;
  const isComplete = currentStep > entrepreneurSteps.length;

  return (
    <div className="bg-gradient-to-br from-b4-coral/10 to-amber-500/10 rounded-3xl border border-b4-coral/20 p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-b4-coral/10 flex items-center justify-center">
          <Rocket className="w-6 h-6 text-b4-coral" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Entrepreneur Journey
          </h2>
          <p className="text-sm text-muted-foreground">
            {isComplete
              ? "Congratulations! You've completed all steps."
              : `Step ${currentStep} of ${entrepreneurSteps.length}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps list */}
      <div className="space-y-3 mb-6">
        {entrepreneurSteps.map((step) => {
          const isCompleted = step.step < currentStep;
          const isCurrent = step.step === currentStep;

          return (
            <div
              key={step.step}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isCurrent
                  ? "bg-card border border-b4-coral/30"
                  : isCompleted
                  ? "bg-b4-coral/5"
                  : "opacity-60"
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-b4-coral flex-shrink-0" />
              ) : (
                <Circle
                  className={`w-5 h-5 flex-shrink-0 ${
                    isCurrent ? "text-b4-coral" : "text-muted-foreground"
                  }`}
                />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium text-sm ${
                    isCompleted || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              {isCurrent && (
                <span className="text-xs bg-b4-coral/10 text-b4-coral px-2 py-1 rounded-full">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!isComplete && (
        <Button variant="teal" className="w-full" onClick={onContinue}>
          Continue Journey
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
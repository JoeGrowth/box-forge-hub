import { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const OnboardingLayout = ({ 
  children, 
  currentStep, 
  totalSteps,
  stepLabel,
  onBack,
  canGoBack = false
}: OnboardingLayoutProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {canGoBack && onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="h-10 w-10 rounded-xl"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B4</span>
              </div>
              <span className="font-display font-semibold text-foreground">Onboarding</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {stepLabel && (
            <p className="text-xs text-muted-foreground mt-2">{stepLabel}</p>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {children}
        </div>
      </main>
    </div>
  );
};

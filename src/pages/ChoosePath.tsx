import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding, PrimaryRole } from "@/hooks/useOnboarding";
import { Lightbulb, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";

const ChoosePath = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, updateOnboardingState, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<PrimaryRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!onboardingLoading && onboardingState) {
      if (onboardingState.onboarding_completed && onboardingState.primary_role) {
        navigate("/", { replace: true });
      }
      if (onboardingState.primary_role === "entrepreneur" && onboardingState.current_step > 1) {
        navigate("/entrepreneurial-onboarding", { replace: true });
      }
      if (onboardingState.primary_role === "cobuilder" && onboardingState.current_step > 1) {
        navigate("/professional-onboarding", { replace: true });
      }
    }
  }, [onboardingState, onboardingLoading, navigate]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleContinue = async () => {
    if (!selectedRole || isLoading) return;

    setIsLoading(true);
    try {
      const potentialRole = selectedRole === "entrepreneur" ? "potential_entrepreneur" : "potential_co_builder";

      await updateOnboardingState({
        primary_role: selectedRole,
        potential_role: potentialRole,
        current_step: 2,
      });

      if (selectedRole === "entrepreneur") {
        navigate("/entrepreneurial-onboarding");
      } else {
        navigate("/professional-onboarding");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={9}
      stepLabel="What's your vision?"
    >
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          What's your vision?
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Choose your path at Box4Solutions
        </p>

        <div className="grid gap-4 mb-8">
          <button
            type="button"
            onClick={() => setSelectedRole("entrepreneur")}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${
              selectedRole === "entrepreneur"
                ? "border-b4-teal bg-b4-teal/5 shadow-lg"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedRole === "entrepreneur" ? "bg-b4-teal text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg text-foreground">Initiator</div>
              <p className="text-muted-foreground text-sm mt-1">
                I have a startup idea and want to build my venture with equity-based co-builders
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("cobuilder")}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${
              selectedRole === "cobuilder"
                ? "border-b4-teal bg-b4-teal/5 shadow-lg"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedRole === "cobuilder" ? "bg-b4-teal text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg text-foreground">Co-Builder</div>
              <p className="text-muted-foreground text-sm mt-1">
                I want to earn equity by contributing my Natural Role expertise to startups
              </p>
            </div>
          </button>
        </div>

        <Button
          variant="teal"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedRole || isLoading}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </OnboardingLayout>
  );
};

export default ChoosePath;

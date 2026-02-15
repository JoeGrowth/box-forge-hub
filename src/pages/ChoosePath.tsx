import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding, PrimaryRole } from "@/hooks/useOnboarding";
import { Lightbulb, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      // If onboarding is already completed and they have a role, redirect to home
      if (onboardingState.onboarding_completed && onboardingState.primary_role) {
        navigate("/", { replace: true });
      }
      // If they already chose a path and started, redirect accordingly
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B4</span>
            </div>
            <span className="font-display font-semibold text-foreground">What's your vision?</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              What's your vision?
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose your path at Box4Solutions
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              type="button"
              onClick={() => setSelectedRole("entrepreneur")}
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${
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
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${
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
      </main>
    </div>
  );
};

export default ChoosePath;

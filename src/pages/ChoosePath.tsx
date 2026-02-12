import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Briefcase, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChoosePath = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!onboardingLoading && onboardingState) {
      // If onboarding is already completed, redirect to home
      if (onboardingState.onboarding_completed) {
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

  const paths = [
    {
      id: "professional",
      icon: Briefcase,
      title: "Professional Journey",
      description: "Structure and grow your natural role through practice, training, and consulting experience.",
      route: "/professional-onboarding",
    },
    {
      id: "entrepreneurial",
      icon: Rocket,
      title: "Entrepreneurial Journey",
      description: "Share your entrepreneurial experience in projects, products, business, and board service.",
      route: "/entrepreneurial-onboarding",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B4</span>
            </div>
            <span className="font-display font-semibold text-foreground">Choose Your Path</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choose Your Path
            </h1>
            <p className="text-muted-foreground text-lg">
              Select the journey that best matches your goals and experience.
            </p>
          </div>

          <div className="space-y-4">
            {paths.map((path) => (
              <button
                key={path.id}
                onClick={() => navigate(path.route)}
                className="w-full group bg-card hover:bg-accent/50 border-2 border-border hover:border-b4-teal rounded-2xl p-6 text-left transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-b4-teal/10 text-b4-teal flex items-center justify-center flex-shrink-0 group-hover:bg-b4-teal group-hover:text-primary-foreground transition-colors">
                    <path.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {path.title}
                      </h3>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-b4-teal transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {path.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChoosePath;

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { LearningJourneyDashboard } from "@/components/learning/LearningJourneyDashboard";
import { ScalingJourneyProgress } from "@/components/profile/ScalingJourneyProgress";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { BookOpen, Loader2, Users, Lightbulb, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const Journey = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, loading: onboardingLoading } = useOnboarding();

  // Check if user opted into scaling
  const wantsToScale = naturalRole?.wants_to_scale === true;

  // Show loading until auth AND onboarding state are both loaded
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Learning Journeys</h1>
                <p className="text-muted-foreground mb-8">Please log in to access your learning journeys.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold">Learning Journeys</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl mb-6">
                Continue your development with structured learning paths designed to help you grow as a co-builder.
              </p>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => {
                    const element = document.getElementById("skill-ptc-section");
                    element?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Co-Build a Startup
                </Button>
                <Button
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => {
                    const element = document.getElementById("idea-ptc-section");
                    element?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Be an Initiator
                </Button>
                {wantsToScale && (
                  <Button
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => {
                      const element = document.getElementById("scaling-section");
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Scale Your Role
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Learning Journeys Content */}
          <section className="py-12">
            <div className="container mx-auto px-4 space-y-8">
              <div id="skill-ptc-section">
                <LearningJourneyDashboard />
              </div>

              {/* Scaling Path - only shown if user opted in */}
              {wantsToScale && (
                <div id="scaling-section" className="mt-8">
                  <h2 className="font-display text-xl font-bold text-foreground mb-4">Scale Your Natural Role</h2>
                  <ScalingJourneyProgress />
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Journey;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Rocket, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

export function HeroSection() {
  const { user } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();

  // Determine button text and link based on auth and onboarding status
  const getButtonConfig = () => {
    if (!user) {
      return { text: "Start Building", link: "/auth?mode=signup" };
    }

    // User is logged in - check onboarding status
    if (onboardingState?.onboarding_completed) {
      return { text: "Go to Dashboard", link: "/dashboard" };
    }

    return { text: "Continue Your Journey", link: "/professional-onboarding" };
  };

  const { text: buttonText, link: buttonLink } = getButtonConfig();

  return (
    <section className="relative min-h-screen flex items-center gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-b4-teal/20 rounded-full blur-3xl animate-pulse-soft" />
        <div
          className="absolute bottom-1/4 -left-32 w-80 h-80 bg-b4-coral/10 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-primary-foreground">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-b4-teal animate-pulse" />
              <span className="text-sm font-medium">Revolutionizing Startup Building</span>
            </div>

            <h1
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Build Startups.
              <br />
              <span className="text-gradient">Earn Equity.</span>
              <br />
              Shape The Future.
            </h1>

            <p
              className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-lg animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              B4 Platform connects visionary entrepreneurs with skilled co-builders. Together, we create impactful
              startups across health, agriculture, education, and more.
            </p>

            <div className="flex flex-wrap gap-4 mb-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button variant="hero" size="xl" asChild>
                <Link to={buttonLink}>
                  {buttonText} <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/about">Learn More</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-b4-teal">50+</div>
                <div className="text-sm text-primary-foreground/60">Startups Launched</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-b4-teal">200+</div>
                <div className="text-sm text-primary-foreground/60">Co-Builders</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-b4-teal">6</div>
                <div className="text-sm text-primary-foreground/60">Box For Units</div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="hidden md:block relative">
            <div className="relative animate-float">
              {/* Main card */}
              <div className="glass rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-b4-teal/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-b4-teal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Your Startup Journey</h3>
                    <p className="text-sm text-muted-foreground">From idea to impact</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: Target, label: "Discover Your Role", desc: "Natural Role Decoder" },
                    { icon: Users, label: "Build Your Team", desc: "Co-Builder Marketplace" },
                    { icon: Rocket, label: "Launch & Scale", desc: "Equity-Based Growth" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-b4-navy/10 flex items-center justify-center flex-shrink-0">
                        <step.icon className="w-5 h-5 text-b4-navy" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{step.label}</div>
                        <div className="text-xs text-muted-foreground">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div
                className="absolute -top-4 -right-4 glass rounded-2xl p-4 shadow-xl animate-float"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="text-2xl font-bold text-b4-teal">$2.5M</div>
                <div className="text-xs text-muted-foreground">Equity Distributed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

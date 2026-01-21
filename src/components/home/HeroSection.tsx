import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Rocket, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

export function HeroSection() {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();

  // Determine button text and link based on auth and onboarding status
  const getButtonConfig = () => {
    if (!user) {
      return { text: "Get Started", link: "/auth?mode=signup" };
    }
    
    // User is logged in - check onboarding status
    if (onboardingState?.onboarding_completed) {
      return { text: "Go to Dashboard", link: "/profile" };
    }
    
    return { text: "Continue Your Journey", link: "/onboarding" };
  };

  const { text: buttonText, link: buttonLink } = getButtonConfig();

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Equity-based collaboration platform
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-foreground mb-6 text-balance">
            Build startups.
            <br />
            Earn equity.
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            B4 Platform connects visionary entrepreneurs with skilled co-builders. 
            Together, we create impactful startups across health, agriculture, education, and more.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            <Button size="lg" asChild>
              <Link to={buttonLink}>
                {buttonText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/about">Learn More</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-3xl font-semibold text-foreground">50+</div>
              <div className="text-sm text-muted-foreground">Startups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-foreground">200+</div>
              <div className="text-sm text-muted-foreground">Co-Builders</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-foreground">6</div>
              <div className="text-sm text-muted-foreground">Sectors</div>
            </div>
          </div>
        </div>

        {/* Visual Card */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Your Startup Journey</h3>
                <p className="text-sm text-muted-foreground">From idea to impact</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { icon: Target, label: "Discover Your Role", desc: "Natural Role Decoder" },
                { icon: Users, label: "Build Your Team", desc: "Co-Builder Marketplace" },
                { icon: Rocket, label: "Launch & Scale", desc: "Equity-Based Growth" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center flex-shrink-0 border">
                    <step.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

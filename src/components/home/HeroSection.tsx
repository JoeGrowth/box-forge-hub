import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Rocket, Target, Sparkles } from "lucide-react";
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
    <section className="relative min-h-[90vh] flex items-center bg-gradient-hero overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-b4-teal/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-b4-coral/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-b4-coral" />
              Equity-based collaboration platform
            </div>
            
            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6 animate-fade-in text-balance" style={{ animationDelay: "0.1s" }}>
              Build startups.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-b4-teal to-b4-teal-light">
                Earn equity.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-lg mx-auto lg:mx-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              B4 Platform connects visionary entrepreneurs with skilled co-builders. 
              Together, we create impactful startups across health, agriculture, education, and more.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button size="xl" variant="hero" asChild>
                <Link to={buttonLink}>
                  {buttonText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="hero-outline" asChild>
                <Link to="/about">Learn More</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-white">50+</div>
                <div className="text-sm text-white/60">Startups</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-white">200+</div>
                <div className="text-sm text-white/60">Co-Builders</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-white">6</div>
                <div className="text-sm text-white/60">Sectors</div>
              </div>
            </div>
          </div>

          {/* Right visual */}
          <div className="hidden lg:block animate-slide-in-right" style={{ animationDelay: "0.3s" }}>
            <div className="relative">
              {/* Main card */}
              <div className="glass rounded-2xl p-8 shadow-elevated">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-xl bg-gradient-teal flex items-center justify-center shadow-glow-teal">
                    <Rocket className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl text-foreground">Your Startup Journey</h3>
                    <p className="text-muted-foreground">From idea to impact</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { icon: Target, label: "Discover Your Role", desc: "Natural Role Decoder", color: "bg-b4-teal" },
                    { icon: Users, label: "Build Your Team", desc: "Co-Builder Marketplace", color: "bg-b4-coral" },
                    { icon: Rocket, label: "Launch & Scale", desc: "Equity-Based Growth", color: "bg-b4-navy" },
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-all duration-300"
                    >
                      <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0`}>
                        <step.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{step.label}</div>
                        <div className="text-sm text-muted-foreground">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-xl bg-gradient-coral shadow-glow-coral animate-float flex items-center justify-center">
                <span className="text-white font-bold text-2xl">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

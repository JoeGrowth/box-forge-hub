import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/90" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-b4-teal/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-b4-coral/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-b4-teal/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "0.8s" }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-8 animate-fade-in border border-white/10">
            <Sparkles className="w-4 h-4 text-b4-teal" />
            <span className="text-sm font-medium text-white/90">The Future of Startup Building</span>
          </div>
          
          {/* Main headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Turn Your Skills Into
            <span className="block mt-2 bg-gradient-to-r from-b4-teal via-b4-teal to-emerald-400 bg-clip-text text-transparent">
              Startup Equity
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: "0.2s" }}>
            Join a revolutionary platform where entrepreneurs and skilled professionals 
            co-build startups together. No capital required — your expertise is your investment.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="xl" className="bg-b4-teal hover:bg-b4-teal/90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-b4-teal/25 transition-all hover:shadow-xl hover:shadow-b4-teal/30 hover:-translate-y-0.5" asChild>
              <Link to="/auth?mode=signup">
                Start Building Today <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg rounded-xl" asChild>
              <Link to="/about">
                <Play className="mr-2 w-5 h-5" /> See How It Works
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/50 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-b4-teal/40 to-b4-coral/40 border-2 border-b4-navy flex items-center justify-center text-xs font-medium text-white">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm">200+ Co-Builders</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="text-sm">50+ Startups Launched</div>
            <div className="h-4 w-px bg-white/20" />
            <div className="text-sm">$2.5M+ Equity Distributed</div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

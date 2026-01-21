import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-hero relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-b4-teal/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-b4-coral/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 text-b4-coral" />
            Start your journey today
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Build Something{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-b4-teal to-b4-coral">
              Extraordinary?
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Whether you have a startup idea or skills to contribute, B4 Platform is your 
            launchpad to meaningful equity-based collaboration.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button size="xl" variant="hero" asChild>
              <Link to="/join?role=entrepreneur">
                I Have an Idea
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="hero-outline" asChild>
              <Link to="/join?role=cobuilder">
                I Want to Co-Build
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/50 mb-4">Trusted by innovators from</p>
            <div className="flex flex-wrap justify-center items-center gap-8 text-white/40">
              {["Stanford", "MIT", "Y Combinator", "Techstars", "500 Global"].map((name) => (
                <span key={name} className="text-sm font-medium hover:text-white/60 transition-colors">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

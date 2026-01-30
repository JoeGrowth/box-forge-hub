import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function LandingCTA() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Decorative element */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-b4-teal to-emerald-400 mb-8">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to Build Your Future?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join hundreds of entrepreneurs and co-builders who are redefining 
            how startups are built. Your skills are your ticket in.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="xl" className="bg-b4-teal hover:bg-b4-teal/90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-b4-teal/25" asChild>
              <Link to="/auth?mode=signup">
                Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="font-semibold px-8 py-6 text-lg rounded-xl" asChild>
              <Link to="/decoder">
                Take the Role Decoder
              </Link>
            </Button>
          </div>
          
          {/* Trust text */}
          <p className="text-sm text-muted-foreground">
            No credit card required · Free to join · Start building today
          </p>
        </div>
      </div>
    </section>
  );
}

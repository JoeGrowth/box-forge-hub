import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-background mb-4">
            Ready to Build Something Extraordinary?
          </h2>
          
          <p className="text-lg text-background/70 mb-8 max-w-xl mx-auto">
            Whether you have a startup idea or skills to contribute, B4 Platform is your 
            launchpad to meaningful equity-based collaboration.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
              <Link to="/join?role=entrepreneur">
                I Have an Idea
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10" asChild>
              <Link to="/join?role=cobuilder">
                I Want to Co-Build
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-8 border-t border-background/10">
            <p className="text-sm text-background/50 mb-3">Trusted by innovators from</p>
            <div className="flex flex-wrap justify-center items-center gap-6 text-background/40">
              {["Stanford", "MIT", "Y Combinator", "Techstars", "500 Global"].map((name) => (
                <span key={name} className="text-sm font-medium">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

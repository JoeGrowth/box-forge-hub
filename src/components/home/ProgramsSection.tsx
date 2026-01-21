import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Award, Users2, ArrowRight, Check } from "lucide-react";

const programs = [
  {
    id: "decoder",
    icon: Brain,
    title: "Natural Role Decoder",
    description: "A 7-question assessment that reveals your natural role in business—whether you're a Strategist, Executor, Connector, or Creator.",
    features: ["7 strategic questions", "Personalized blueprint", "Role matching"],
    cta: "Take the Test",
  },
  {
    id: "earning",
    icon: Award,
    title: "Earning by Building",
    description: "A structured journey from learner to expert. Practice, train, and consult your way to becoming a certified co-builder.",
    features: ["3-phase journey", "Case study projects", "Certification"],
    cta: "Start Journey",
  },
  {
    id: "cobuilders",
    icon: Users2,
    title: "Co-Builder Marketplace",
    description: "A talent pool of certified co-builders ready to join startups. Find the perfect team members for your venture.",
    features: ["Verified profiles", "Role-based matching", "Equity agreements"],
    cta: "Browse Talent",
  },
];

export function ProgramsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Our Programs
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Programs That Transform
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you're an entrepreneur with an idea or a skilled professional looking to build equity, 
            our programs guide you every step of the way.
          </p>
        </div>

        {/* Programs */}
        <div className="grid lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div
              key={program.id}
              className="group bg-card rounded-lg border overflow-hidden hover:shadow-elevated transition-all"
            >
              {/* Accent bar */}
              <div className="h-1 bg-primary" />
              
              <div className="p-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <program.icon className="w-5 h-5 text-primary" />
                </div>
                
                <h3 className="font-semibold text-xl text-foreground mb-3">
                  {program.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  {program.description}
                </p>
                
                <ul className="space-y-2 mb-6">
                  {program.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/programs#${program.id}`}>
                    {program.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

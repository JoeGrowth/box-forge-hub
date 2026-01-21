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
    gradient: "from-b4-teal to-b4-teal-light",
  },
  {
    id: "earning",
    icon: Award,
    title: "Earning by Building",
    description: "A structured journey from learner to expert. Practice, train, and consult your way to becoming a certified co-builder.",
    features: ["3-phase journey", "Case study projects", "Certification"],
    cta: "Start Journey",
    gradient: "from-b4-coral to-b4-coral-light",
  },
  {
    id: "cobuilders",
    icon: Users2,
    title: "Co-Builder Marketplace",
    description: "A talent pool of certified co-builders ready to join startups. Find the perfect team members for your venture.",
    features: ["Verified profiles", "Role-based matching", "Equity agreements"],
    cta: "Browse Talent",
    gradient: "from-b4-navy to-b4-navy-light",
  },
];

export function ProgramsSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            Our Programs
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Programs That Transform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're an entrepreneur with an idea or a skilled professional looking to build equity, 
            our programs guide you every step of the way.
          </p>
        </div>

        {/* Programs */}
        <div className="grid lg:grid-cols-3 gap-8">
          {programs.map((program) => (
            <div
              key={program.id}
              className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-elevated transition-all duration-300"
            >
              {/* Accent bar */}
              <div className={`h-2 bg-gradient-to-r ${program.gradient}`} />
              
              <div className="p-8">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${program.gradient} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-soft`}>
                  <program.icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="font-bold text-xl text-foreground mb-4">
                  {program.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {program.description}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {program.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button variant="outline" className="w-full group-hover:border-primary/50" asChild>
                  <Link to={`/programs#${program.id}`}>
                    {program.cta}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

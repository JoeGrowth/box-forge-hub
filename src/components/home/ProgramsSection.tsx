import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Award, Users2, ArrowRight } from "lucide-react";

const programs = [
  {
    id: "decoder",
    icon: Brain,
    title: "Natural Role Decoder",
    description: "A 7-question assessment that reveals your natural role in business—whether you're a Strategist, Executor, Connector, or Creator.",
    features: ["7 strategic questions", "Personalized blueprint", "Role matching"],
    cta: "Take the Test",
    color: "from-b4-teal to-emerald-500",
  },
  {
    id: "earning",
    icon: Award,
    title: "Earning by Building",
    description: "A structured journey from learner to expert. Practice, train, and consult your way to becoming a certified co-builder.",
    features: ["3-phase journey", "Case study projects", "Certification"],
    cta: "Start Journey",
    color: "from-b4-coral to-orange-500",
  },
  {
    id: "cobuilders",
    icon: Users2,
    title: "Co-Builder Marketplace",
    description: "A talent pool of certified co-builders ready to join startups. Find the perfect team members for your venture.",
    features: ["Verified profiles", "Role-based matching", "Equity agreements"],
    cta: "Browse Talent",
    color: "from-b4-navy to-indigo-600",
  },
];

export function ProgramsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-b4-navy/10 text-b4-navy text-sm font-medium mb-4">
            Our Programs
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Programs That Transform
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're an entrepreneur with an idea or a skilled professional looking to build equity, 
            our programs guide you every step of the way.
          </p>
        </div>

        {/* Programs */}
        <div className="grid lg:grid-cols-3 gap-8">
          {programs.map((program, i) => (
            <div
              key={program.id}
              className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-2xl transition-all duration-500 animate-fade-in"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* Gradient header */}
              <div className={`h-2 bg-gradient-to-r ${program.color}`} />
              
              <div className="p-8">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${program.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <program.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                
                <h3 className="font-display font-bold text-2xl text-foreground mb-3">
                  {program.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {program.description}
                </p>
                
                <ul className="space-y-2 mb-8">
                  {program.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-b4-teal" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" asChild>
                  <Link to={`/programs#${program.id}`}>
                    {program.cta} <ArrowRight className="ml-2 w-4 h-4" />
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

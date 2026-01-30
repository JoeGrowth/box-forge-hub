import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Wrench, Building2 } from "lucide-react";

const paths = [
  {
    icon: Wrench,
    title: "Co-Builder",
    subtitle: "Build with your skills",
    description: "Apply your expertise to exciting startups. Developers, designers, marketers, strategists — your skills are in demand.",
    features: [
      "Browse startup opportunities",
      "Apply for equity-based roles",
      "Build your portfolio",
      "Earn ownership stake",
    ],
    cta: "Find Opportunities",
    link: "/opportunities",
    gradient: "from-blue-500/20 to-cyan-500/10",
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    icon: Lightbulb,
    title: "Initiator",
    subtitle: "Launch your vision",
    description: "Have an idea? We'll help you build the team and structure to make it reality. Lead your startup with B4's proven framework.",
    features: [
      "Structured idea development",
      "Access to co-builder talent",
      "Fair equity distribution",
      "Launch support",
    ],
    cta: "Start Your Idea",
    link: "/journey?section=initiator",
    gradient: "from-purple-500/20 to-pink-500/10",
    iconBg: "from-purple-500 to-pink-500",
    featured: true,
  },
  {
    icon: Building2,
    title: "Consultant",
    subtitle: "Scale your expertise",
    description: "Turn your natural role into a consulting practice. Help others while building your own decentralized business.",
    features: [
      "Monetize your expertise",
      "Build a consulting brand",
      "Flexible engagement",
      "Scale your impact",
    ],
    cta: "Learn More",
    link: "/programs",
    gradient: "from-b4-coral/20 to-orange-500/10",
    iconBg: "from-b4-coral to-orange-500",
  },
];

export function LandingPaths() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-b4-teal font-semibold text-sm uppercase tracking-wide mb-4">
            Choose Your Path
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Three Ways to Build Wealth
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you want to join a team, lead one, or consult — there's a path for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {paths.map((path, i) => (
            <div 
              key={i} 
              className={`relative rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 ${
                path.featured 
                  ? "bg-gradient-to-br from-b4-navy to-b4-navy/90 border-b4-teal/30 shadow-xl shadow-b4-teal/10" 
                  : "bg-muted/30 border-border hover:border-b4-teal/20"
              }`}
            >
              {path.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-b4-teal text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${path.iconBg} flex items-center justify-center mb-6`}>
                <path.icon className="w-7 h-7 text-white" />
              </div>
              
              {/* Content */}
              <h3 className={`font-display text-2xl font-bold mb-1 ${path.featured ? "text-white" : "text-foreground"}`}>
                {path.title}
              </h3>
              <p className={`text-sm mb-4 ${path.featured ? "text-b4-teal" : "text-b4-teal"}`}>
                {path.subtitle}
              </p>
              <p className={`mb-6 text-sm leading-relaxed ${path.featured ? "text-white/70" : "text-muted-foreground"}`}>
                {path.description}
              </p>
              
              {/* Features */}
              <ul className="space-y-2 mb-8">
                {path.features.map((feature, j) => (
                  <li key={j} className={`flex items-center gap-2 text-sm ${path.featured ? "text-white/80" : "text-foreground/80"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${path.featured ? "bg-b4-teal" : "bg-b4-teal"}`} />
                    {feature}
                  </li>
                ))}
              </ul>
              
              {/* CTA */}
              <Button 
                className={`w-full ${
                  path.featured 
                    ? "bg-b4-teal hover:bg-b4-teal/90 text-white" 
                    : "bg-foreground hover:bg-foreground/90 text-background"
                }`}
                asChild
              >
                <Link to={path.link}>
                  {path.cta} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

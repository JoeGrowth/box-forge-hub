import { TrendingUp, Users, Rocket, DollarSign } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "200+",
    label: "Active Co-Builders",
    description: "Skilled professionals ready to build",
  },
  {
    icon: Rocket,
    value: "50+",
    label: "Startups Launched",
    description: "Across 6 industry verticals",
  },
  {
    icon: DollarSign,
    value: "$2.5M+",
    label: "Equity Distributed",
    description: "To our community members",
  },
  {
    icon: TrendingUp,
    value: "85%",
    label: "Success Rate",
    description: "Startups still active after 1 year",
  },
];

export function LandingStats() {
  return (
    <section className="py-20 bg-background border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-b4-teal/10 mb-4">
                <stat.icon className="w-6 h-6 text-b4-teal" />
              </div>
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

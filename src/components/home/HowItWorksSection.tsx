import { Compass, Users, Rocket, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Compass,
    title: "Discover Your Role",
    description: "Take the Natural Role Decoder to understand your strengths and find your perfect fit in the startup ecosystem.",
    color: "bg-b4-teal",
  },
  {
    number: "02",
    icon: Users,
    title: "Join as Entrepreneur or Co-Builder",
    description: "Entrepreneurs bring ideas, Co-Builders bring skills. Both earn equity based on their contributions.",
    color: "bg-b4-coral",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Build Together",
    description: "Work within specialized Box For units. Get guidance, mentorship, and access to our structured startup creation process.",
    color: "bg-b4-navy",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Earn Equity & Grow",
    description: "No salaries—just equity. As the startup grows, so does your stake. Building wealth through building businesses.",
    color: "bg-b4-teal",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-b4-coral/10 text-b4-coral text-sm font-medium mb-4">
            The Process
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            How Earning by Building Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A revolutionary model where talent meets opportunity. No upfront capital needed—just skills, commitment, and vision.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative animate-fade-in"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}
              
              <div className="relative bg-card rounded-2xl p-6 border border-border hover:border-b4-teal/30 transition-all group">
                {/* Number badge */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center text-xs font-bold">
                  {step.number}
                </div>
                
                <div className={`w-14 h-14 rounded-xl ${step.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Compass, Users, Rocket, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Compass,
    title: "Discover Your Role",
    description: "Take the Natural Role Decoder to understand your strengths and find your perfect fit in the startup ecosystem.",
  },
  {
    number: "02",
    icon: Users,
    title: "Join as Entrepreneur or Co-Builder",
    description: "Entrepreneurs bring ideas, Co-Builders bring skills. Both earn equity based on their contributions.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Build Together",
    description: "Work within specialized Box For units. Get guidance, mentorship, and access to our structured startup creation process.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Earn Equity & Grow",
    description: "No salaries—just equity. As the startup grows, so does your stake. Building wealth through building businesses.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            The Process
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            How Earning by Building Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A revolutionary model where talent meets opportunity. No upfront capital needed—just skills, commitment, and vision.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative bg-card rounded-lg p-5 border hover:border-primary/30 transition-all"
            >
              {/* Number badge */}
              <div className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                {step.number}
              </div>
              
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4 mt-2">
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              
              <h3 className="font-medium text-foreground mb-2">
                {step.title}
              </h3>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

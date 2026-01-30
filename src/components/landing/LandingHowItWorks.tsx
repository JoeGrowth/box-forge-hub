import { Target, Users, Rocket, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Target,
    number: "01",
    title: "Discover Your Role",
    description: "Take the Natural Role Decoder to uncover your unique strengths and find your perfect position in the startup ecosystem.",
    color: "from-b4-teal to-emerald-400",
  },
  {
    icon: Users,
    number: "02",
    title: "Join or Create",
    description: "Apply to exciting startups as a Co-Builder, or become an Initiator and bring your own ideas to life with a skilled team.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Build Together",
    description: "Collaborate with your team, contribute your expertise, and watch your startup grow from concept to reality.",
    color: "from-purple-500 to-pink-400",
  },
  {
    icon: TrendingUp,
    number: "04",
    title: "Earn Equity",
    description: "Your contributions translate directly into ownership. Build wealth through the value you create, not the capital you invest.",
    color: "from-b4-coral to-orange-400",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-b4-teal font-semibold text-sm uppercase tracking-wide mb-4">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Your Path to Startup Ownership
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps from where you are today to becoming a startup co-owner.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {steps.map((step, i) => (
            <div 
              key={i} 
              className="relative group"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
              )}
              
              <div className="bg-background rounded-2xl p-6 border border-border hover:border-b4-teal/30 transition-all duration-300 hover:shadow-lg hover:shadow-b4-teal/5 h-full">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Number */}
                <span className="text-5xl font-bold text-muted/30 absolute top-4 right-4">
                  {step.number}
                </span>
                
                {/* Content */}
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
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

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Brain, 
  Award, 
  Users2, 
  Rocket,
  ArrowRight,
  CheckCircle,
  Zap,
  Target,
  BookOpen,
  MessageSquare,
  Trophy
} from "lucide-react";

const Programs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="py-24 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
                Our Programs
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Programs That
                <br />
                <span className="text-gradient">Transform Careers</span>
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
                From discovering your natural role to becoming a certified co-builder, 
                our programs guide your journey in the startup ecosystem.
              </p>
            </div>
          </div>
        </section>

        {/* Natural Role Decoder */}
        <section id="decoder" className="py-24 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-6">
                  <Brain className="w-4 h-4" />
                  Natural Role Decoder
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Discover Your Business DNA
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  A strategic 7-question assessment that reveals your natural role in business. 
                  Understanding your strengths is the first step to finding your perfect fit in startups.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "7 carefully crafted strategic questions",
                    "Personalized business blueprint",
                    "Natural role identification",
                    "Method and approach recommendations",
                    "Ideal startup role matching",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                <Button variant="teal" size="lg" asChild>
                  <Link to="/decoder">
                    Take the Test <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className="bg-card rounded-3xl p-8 border border-border shadow-xl">
                <h3 className="font-semibold text-xl text-foreground mb-6">Possible Roles</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Target, role: "Strategist", desc: "Vision & planning" },
                    { icon: Zap, role: "Executor", desc: "Action & delivery" },
                    { icon: Users2, role: "Connector", desc: "Networks & relationships" },
                    { icon: Brain, role: "Creator", desc: "Innovation & design" },
                  ].map((item) => (
                    <div key={item.role} className="bg-muted/50 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center mb-3">
                        <item.icon className="w-5 h-5 text-b4-teal" />
                      </div>
                      <div className="font-semibold text-foreground">{item.role}</div>
                      <div className="text-sm text-muted-foreground">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Earning by Building */}
        <section id="earning" className="py-24 bg-muted/50 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-b4-coral/10 text-b4-coral text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                Earning by Building
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                The Co-Builder Journey
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A structured 3-phase program that transforms skilled professionals into 
                certified co-builders ready to earn equity in startups.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  phase: "Phase 1",
                  title: "Practice",
                  icon: BookOpen,
                  description: "Learn the fundamentals of startup building. Complete foundational courses and understand the B4 methodology.",
                  duration: "4-6 weeks",
                  outcomes: ["Core methodology", "Framework basics", "Self-assessment"],
                },
                {
                  phase: "Phase 2",
                  title: "Train",
                  icon: Target,
                  description: "Apply your learning through real case studies. Work on simulated startup challenges and build your portfolio.",
                  duration: "6-8 weeks",
                  outcomes: ["Case study projects", "Portfolio building", "Peer reviews"],
                },
                {
                  phase: "Phase 3",
                  title: "Consult",
                  icon: MessageSquare,
                  description: "Mentor others and take on advisory roles. Get certified and join the Co-Builder directory.",
                  duration: "Ongoing",
                  outcomes: ["Certification", "Directory listing", "Startup matching"],
                },
              ].map((phase, i) => (
                <div 
                  key={phase.phase}
                  className="relative bg-card rounded-2xl p-8 border border-border animate-fade-in"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {/* Connector */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
                  )}
                  
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-lg bg-b4-coral text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  
                  <div className="w-14 h-14 rounded-xl bg-b4-coral/10 flex items-center justify-center mb-4">
                    <phase.icon className="w-7 h-7 text-b4-coral" />
                  </div>
                  
                  <span className="text-sm text-muted-foreground">{phase.phase}</span>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">{phase.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{phase.description}</p>
                  
                  <div className="text-xs text-b4-coral font-medium mb-4">{phase.duration}</div>
                  
                  <ul className="space-y-2">
                    {phase.outcomes.map((outcome) => (
                      <li key={outcome} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-b4-coral" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button variant="accent" size="lg" asChild>
                <Link to="/join?role=cobuilder">
                  Start Your Journey <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Co-Builder Marketplace */}
        <section id="cobuilders" className="py-24 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-card rounded-3xl p-8 border border-border shadow-xl">
                  <h3 className="font-semibold text-lg text-foreground mb-6">Featured Co-Builders</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Sarah Chen", role: "Product Strategist", projects: 5, rating: 4.9 },
                      { name: "Marcus Johnson", role: "Growth Expert", projects: 8, rating: 4.8 },
                      { name: "Elena Rodriguez", role: "Tech Lead", projects: 6, rating: 4.9 },
                    ].map((builder) => (
                      <div key={builder.name} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-b4-navy to-b4-teal flex items-center justify-center text-primary-foreground font-bold">
                          {builder.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{builder.name}</div>
                          <div className="text-sm text-muted-foreground">{builder.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            {builder.rating}
                          </div>
                          <div className="text-xs text-muted-foreground">{builder.projects} projects</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-b4-navy/10 text-b4-navy text-sm font-medium mb-6">
                  <Users2 className="w-4 h-4" />
                  Co-Builder Marketplace
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Find Your Dream Team
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Browse our directory of certified co-builders. Each profile showcases their 
                  natural role, expertise, and track record in building successful startups.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "Verified profiles with track records",
                    "Role-based matching algorithm",
                    "Transparent equity agreements",
                    "Reviews from past collaborations",
                    "Skill verification and certifications",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-b4-navy flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button variant="default" size="lg" asChild>
                    <Link to="/cobuilders">
                      Browse Directory <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/join?role=cobuilder">
                      Join as Co-Builder
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Startup Creation */}
        <section id="startup" className="py-24 bg-muted/50 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-6">
                <Rocket className="w-4 h-4" />
                Startup Creation Pathway
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                From Idea to Impact
              </h2>
              <p className="text-muted-foreground text-lg">
                Our structured process guides entrepreneurs from initial concept to 
                a fully structured startup with the right team and equity distribution.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { step: "01", title: "Ideation", desc: "Define your vision, problem, and market opportunity" },
                { step: "02", title: "Structuring", desc: "Build your business model and identify key roles" },
                { step: "03", title: "Team Building", desc: "Find and onboard the right co-builders" },
                { step: "04", title: "Launch", desc: "Execute your plan with structured guidance" },
              ].map((item, i) => (
                <div 
                  key={item.step}
                  className="relative bg-card rounded-2xl p-6 border border-border animate-fade-in text-center"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="text-4xl font-bold text-b4-teal/20 mb-2">{item.step}</div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button variant="teal" size="lg" asChild>
                <Link to="/join?role=entrepreneur">
                  Start Your Startup <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Programs;

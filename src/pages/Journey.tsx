import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { 
  BookOpen, 
  Loader2, 
  Users, 
  Lightbulb, 
  Briefcase, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Target,
  Rocket,
  GraduationCap,
  Handshake,
  TrendingUp,
  Pencil
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface JourneyStep {
  step: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  details: string[];
  color: string;
}

const INITIATOR_STEPS: JourneyStep[] = [
  {
    step: 1,
    title: "Ideation",
    subtitle: "Vision & Market",
    icon: Lightbulb,
    description: "Transform your idea into a clear vision. Define your target market and validate the problem you're solving.",
    details: [
      "Define your startup vision and mission",
      "Identify target market and customer segments",
      "Validate problem-solution fit",
    ],
    color: "from-amber-500 to-orange-600",
  },
  {
    step: 2,
    title: "Structuring",
    subtitle: "Business Model",
    icon: Target,
    description: "Build the foundation of your business model. Define value proposition, revenue streams, and key resources.",
    details: [
      "Develop your business model canvas",
      "Define value proposition",
      "Plan revenue streams and pricing",
    ],
    color: "from-orange-500 to-red-500",
  },
  {
    step: 3,
    title: "Team Building",
    subtitle: "Co-Builder Recruitment",
    icon: Users,
    description: "Identify the roles you need and learn how to attract and onboard co-builders for your venture.",
    details: [
      "Define critical roles needed",
      "Create compelling role descriptions",
      "Master co-builder onboarding",
    ],
    color: "from-red-500 to-pink-500",
  },
  {
    step: 4,
    title: "Launch",
    subtitle: "Execution",
    icon: Rocket,
    description: "Execute your plan and launch your venture. Learn how to iterate based on feedback and scale.",
    details: [
      "Create execution roadmap",
      "Launch and gather feedback",
      "Iterate and improve",
    ],
    color: "from-pink-500 to-purple-500",
  },
];

const COBUILDER_STEPS: JourneyStep[] = [
  {
    step: 1,
    title: "Practice",
    subtitle: "Fundamentals",
    icon: BookOpen,
    description: "Master the B4 methodology and core practices. Build your foundation as a valuable team contributor.",
    details: [
      "Learn core B4 methodology",
      "Complete self-assessment",
      "Practice fundamental skills",
    ],
    color: "from-teal-500 to-cyan-500",
  },
  {
    step: 2,
    title: "Train",
    subtitle: "Portfolio Building",
    icon: GraduationCap,
    description: "Develop your skills through case studies and real-world projects. Build a portfolio that showcases your expertise.",
    details: [
      "Complete case study exercises",
      "Build your project portfolio",
      "Receive peer reviews",
    ],
    color: "from-cyan-500 to-blue-500",
  },
  {
    step: 3,
    title: "Consult",
    subtitle: "Advisory Roles",
    icon: Handshake,
    description: "Elevate to advisory and mentoring roles. Guide other co-builders and contribute at a strategic level.",
    details: [
      "Mentor junior co-builders",
      "Provide strategic guidance",
      "Prepare for certification",
    ],
    color: "from-blue-500 to-indigo-500",
  },
];

const CONSULTANT_STEPS: JourneyStep[] = [
  {
    step: 1,
    title: "Foundations",
    subtitle: "Consulting Basics",
    icon: BookOpen,
    description: "Learn the fundamentals of consulting. Understand client needs, project scoping, and engagement models.",
    details: [
      "Master consulting frameworks",
      "Learn client engagement",
      "Understand project scoping",
    ],
    color: "from-purple-500 to-violet-500",
  },
  {
    step: 2,
    title: "Strategy",
    subtitle: "Strategic Thinking",
    icon: Target,
    description: "Develop strategic thinking capabilities. Learn to analyze complex problems and create actionable solutions.",
    details: [
      "Strategic analysis methods",
      "Problem-solving frameworks",
      "Solution development",
    ],
    color: "from-violet-500 to-purple-600",
  },
  {
    step: 3,
    title: "Advisory",
    subtitle: "Client Relations",
    icon: Handshake,
    description: "Build strong client relationships. Learn to communicate effectively and manage stakeholder expectations.",
    details: [
      "Client relationship management",
      "Stakeholder communication",
      "Expectation management",
    ],
    color: "from-purple-600 to-fuchsia-500",
  },
  {
    step: 4,
    title: "Leadership",
    subtitle: "Thought Leadership",
    icon: TrendingUp,
    description: "Establish yourself as a thought leader. Create content, speak at events, and build your personal brand.",
    details: [
      "Develop thought leadership",
      "Build personal brand",
      "Lead consulting engagements",
    ],
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    step: 5,
    title: "Mastery",
    subtitle: "Expert Consultant",
    icon: GraduationCap,
    description: "Achieve mastery as a consultant. Lead complex engagements and mentor the next generation.",
    details: [
      "Lead complex projects",
      "Mentor other consultants",
      "Achieve expert certification",
    ],
    color: "from-pink-500 to-rose-500",
  },
];

type ActiveSection = "initiator" | "cobuilder" | "consultant";

const Journey = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading } = useOnboarding();
  const [activeSection, setActiveSection] = useState<ActiveSection>("initiator");
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<string, Record<number, boolean>>>({
    initiator: {},
    cobuilder: {},
    consultant: {},
  });

  const handleOpenStep = (section: string, stepNum: number) => {
    // TODO: Open step dialog similar to Scale page
    console.log(`Opening ${section} step ${stepNum}`);
  };

  // Show loading until auth AND onboarding state are both loaded
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Learning Journeys</h1>
                <p className="text-muted-foreground mb-8">Please log in to access your learning journeys.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  const getActiveSteps = (): JourneyStep[] => {
    switch (activeSection) {
      case "initiator":
        return INITIATOR_STEPS;
      case "cobuilder":
        return COBUILDER_STEPS;
      case "consultant":
        return CONSULTANT_STEPS;
    }
  };

  const getSectionInfo = () => {
    switch (activeSection) {
      case "initiator":
        return {
          title: "Learn to be an Initiator",
          description: "A 4-step journey to transform ideas into successful ventures",
          icon: Lightbulb,
          color: "from-amber-500 to-orange-600",
          outcome: "You become a certified Initiator — ready to lead ventures, build teams, and turn ideas into reality.",
        };
      case "cobuilder":
        return {
          title: "Learn to be a Co-Builder",
          description: "A 3-step journey to master the skills of startup collaboration",
          icon: Users,
          color: "from-teal-500 to-cyan-500",
          outcome: "You become a certified Co-Builder — ready to contribute meaningfully to startups and build your portfolio.",
        };
      case "consultant":
        return {
          title: "Learn to be a Consultant",
          description: "A 5-step journey to achieve advisory excellence",
          icon: Briefcase,
          color: "from-purple-500 to-violet-500",
          outcome: "You become a certified Consultant — ready to guide startups strategically and lead engagements.",
        };
    }
  };

  const activeSteps = getActiveSteps();
  const sectionInfo = getSectionInfo();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold">Boosting Journeys</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                Choose your learning path and master the skills needed to succeed in the startup ecosystem.
              </p>
            </div>
          </section>

          <section className="py-12">
            <div className="container max-w-5xl mx-auto px-4">
              {/* Section Toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border/50 flex-wrap justify-center gap-1">
                  <button
                    onClick={() => setActiveSection("initiator")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeSection === "initiator"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Learn to be an Initiator
                  </button>
                  <button
                    onClick={() => setActiveSection("cobuilder")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeSection === "cobuilder"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Learn to be a Co-Builder
                  </button>
                  <button
                    onClick={() => setActiveSection("consultant")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeSection === "consultant"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Briefcase className="w-4 h-4 inline mr-2" />
                    Learn to be a Consultant
                  </button>
                </div>
              </div>

              {/* Active Section Content */}
              <div className="space-y-8 animate-fade-in" key={activeSection}>
                {/* Concept Explanation */}
                <Card className={`border-${activeSection === 'initiator' ? 'amber' : activeSection === 'cobuilder' ? 'teal' : 'purple'}-500/20 bg-gradient-to-br ${
                  activeSection === 'initiator' ? 'from-amber-500/5 to-orange-500/5' :
                  activeSection === 'cobuilder' ? 'from-teal-500/5 to-cyan-500/5' :
                  'from-purple-500/5 to-violet-500/5'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${sectionInfo.color} shrink-0`}>
                        <sectionInfo.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-display font-bold text-foreground">{sectionInfo.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {sectionInfo.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${sectionInfo.color}`} />
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">{activeSteps.length} Steps</strong> to certification
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Journey Progress Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Your Learning Journey</h2>
                  <p className="text-muted-foreground">{sectionInfo.description}</p>
                </div>

                {/* Journey Steps */}
                <div className="relative">
                  {/* Connection Line */}
                  <div
                    className={`absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b ${
                      activeSection === 'initiator' ? 'from-amber-500 via-orange-500 to-purple-500' :
                      activeSection === 'cobuilder' ? 'from-teal-500 via-cyan-500 to-indigo-500' :
                      'from-purple-500 via-fuchsia-500 to-rose-500'
                    } hidden md:block`}
                    style={{ transform: "translateX(-50%)" }}
                  />

                  <div className="space-y-6">
                    {activeSteps.map((step, index) => (
                      <div key={step.step} className={`relative ${index % 2 === 0 ? "md:pr-[52%]" : "md:pl-[52%]"}`}>
                        {/* Step Number Badge */}
                        <div
                          className={`hidden md:flex absolute left-1/2 top-6 w-10 h-10 rounded-full bg-gradient-to-r ${step.color} items-center justify-center text-white font-bold text-lg shadow-lg z-10`}
                          style={{ transform: "translateX(-50%)" }}
                        >
                          {step.step}
                        </div>

                        <Card className="border-border/50 hover:shadow-lg transition-shadow overflow-hidden">
                          <div className={`h-1 bg-gradient-to-r ${step.color}`} />
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className={`md:hidden p-3 rounded-xl bg-gradient-to-r ${step.color} shrink-0`}>
                                <step.icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="hidden md:block p-3 rounded-xl bg-muted shrink-0">
                                <step.icon className="w-6 h-6 text-foreground" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Step {step.step}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {step.subtitle}
                                      </Badge>
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                  </div>
                                  <Button
                                    variant={stepCompletionStatus[activeSection]?.[step.step] ? "outline" : "teal"}
                                    size="sm"
                                    onClick={() => handleOpenStep(activeSection, step.step)}
                                    className="shrink-0"
                                  >
                                    {stepCompletionStatus[activeSection]?.[step.step] ? (
                                      <>
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Done
                                      </>
                                    ) : (
                                      "Fill it"
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                <ul className="space-y-2">
                                  {step.details.map((detail, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground">{detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outcome Message */}
                <Card className={`border-${activeSection === 'initiator' ? 'orange' : activeSection === 'cobuilder' ? 'cyan' : 'violet'}-500/20 bg-gradient-to-br ${
                  activeSection === 'initiator' ? 'from-orange-500/5 to-red-500/5' :
                  activeSection === 'cobuilder' ? 'from-cyan-500/5 to-blue-500/5' :
                  'from-violet-500/5 to-purple-500/5'
                }`}>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${sectionInfo.color}`}>
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-2">The Outcome</h3>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                          {sectionInfo.outcome}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Journey;

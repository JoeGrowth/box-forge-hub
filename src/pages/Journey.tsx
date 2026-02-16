import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useLearningJourneys } from "@/hooks/useLearningJourneys";
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
  Pencil,
  Play,
  Clock,
  AlertCircle,
  Award
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InitiatorQuizDialog } from "@/components/learning/InitiatorQuizDialog";
import { CoBuilderQuizDialog } from "@/components/learning/CoBuilderQuizDialog";


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

type ActiveSection = "initiator" | "cobuilder";

const Journey = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const { journeys, phaseResponses, certifications } = useLearningJourneys();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    const section = searchParams.get("section");
    if (section === "initiator" || section === "cobuilder") {
      return section;
    }
    return "initiator";
  });
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<string, Record<number, boolean>>>({
    initiator: {},
    cobuilder: {},
  });
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);

  // Check if user is approved
  const isApproved = onboardingState?.journey_status === "approved" || 
    onboardingState?.journey_status === "entrepreneur_approved";

  // Redirect logic removed to make journey accessible for all authenticated users

  const [cobuilderQuizOpen, setCobuilderQuizOpen] = useState(false);
  

  // Map journey types to section names
  const getJourneyTypeForSection = (section: ActiveSection): string => {
    switch (section) {
      case "initiator":
        return "idea_ptc";
      case "cobuilder":
        return "skill_ptc";
      default:
        return "";
    }
  };

  // Get the total steps for each section
  const getTotalStepsForSection = (section: ActiveSection): number => {
    switch (section) {
      case "initiator":
        return INITIATOR_STEPS.length;
      case "cobuilder":
        return COBUILDER_STEPS.length;
      default:
        return 0;
    }
  };

  // Check if all steps for a section are completed
  const isAllStepsCompleted = (section: ActiveSection): boolean => {
    const journeyType = getJourneyTypeForSection(section);
    const journey = journeys.find(j => j.journey_type === journeyType);
    
    if (!journey) return false;
    
    const totalSteps = getTotalStepsForSection(section);
    const completedPhases = phaseResponses.filter(
      pr => pr.journey_id === journey.id && pr.is_completed
    );
    
    return completedPhases.length >= totalSteps;
  };

  // Check if journey is pending approval
  const isJourneyPendingApproval = (section: ActiveSection): boolean => {
    const journeyType = getJourneyTypeForSection(section);
    const journey = journeys.find(j => j.journey_type === journeyType);
    
    return journey?.status === "pending_approval";
  };

  // Check if all steps are done OR pending approval
  const shouldShowPendingBanner = (section: ActiveSection): boolean => {
    return isAllStepsCompleted(section) || isJourneyPendingApproval(section);
  };

  // Check if a specific step is completed from the database
  const isStepCompletedFromDB = (section: ActiveSection, stepNumber: number): boolean => {
    const journeyType = getJourneyTypeForSection(section);
    const journey = journeys.find(j => j.journey_type === journeyType);
    
    if (!journey) return false;
    
    // Phase numbers in DB are 0-indexed, step numbers are 1-indexed
    const phaseNumber = stepNumber - 1;
    const phaseResponse = phaseResponses.find(
      pr => pr.journey_id === journey.id && pr.phase_number === phaseNumber && pr.is_completed
    );
    
    return !!phaseResponse;
  };

  // Combined check: local state OR database state
  const isStepCompleted = (section: ActiveSection, stepNumber: number): boolean => {
    return stepCompletionStatus[section]?.[stepNumber] || isStepCompletedFromDB(section, stepNumber);
  };

  // Check if a section is certified
  const isSectionCertified = (section: ActiveSection): boolean => {
    switch (section) {
      case "initiator":
        return certifications.some(c => c.certification_type === "initiator_b4");
      case "cobuilder":
        return certifications.some(c => c.certification_type === "cobuilder_b4");
      default:
        return false;
    }
  };

  // Get the responses for a specific step
  const getStepResponses = (section: ActiveSection, stepNumber: number): Record<string, any> | null => {
    const journeyType = getJourneyTypeForSection(section);
    const journey = journeys.find(j => j.journey_type === journeyType);
    
    if (!journey) return null;
    
    // Phase numbers in DB are 0-indexed, step numbers are 1-indexed
    const phaseNumber = stepNumber - 1;
    const phaseResponse = phaseResponses.find(
      pr => pr.journey_id === journey.id && pr.phase_number === phaseNumber
    );
    
    return phaseResponse?.responses || null;
  };

  const handleOpenStep = (section: string, stepNum: number) => {
    // Don't open dialog if certified - show read-only
    if (isSectionCertified(section as ActiveSection)) {
      return;
    }
    
    setSelectedStep(stepNum);
    if (section === "initiator") {
      setQuizDialogOpen(true);
    } else if (section === "cobuilder") {
      setCobuilderQuizOpen(true);
    }
  };

  const handleStepComplete = (stepNumber: number) => {
    setStepCompletionStatus((prev) => ({
      ...prev,
      [activeSection]: {
        ...prev[activeSection],
        [stepNumber]: true,
      },
    }));
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
                </div>
              </div>

              {/* Active Section Content */}
              <div className="space-y-8 animate-fade-in" key={activeSection}>
                {/* Certified Banner */}
                {isSectionCertified(activeSection) && (
                  <Alert className="border-b4-teal/50 bg-teal-50 dark:bg-teal-950/30">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-b4-teal mt-0.5" />
                        <div>
                          <AlertTitle className="text-teal-800 dark:text-teal-200 font-semibold">
                            Certified - Journey Complete
                          </AlertTitle>
                          <AlertDescription className="text-teal-700 dark:text-teal-300">
                            Congratulations! You have been certified for this journey. Below you can review your submitted answers.
                          </AlertDescription>
                        </div>
                      </div>
                      {activeSection === 'initiator' && (
                        <Button 
                          onClick={() => navigate('/create-idea')}
                          className="bg-b4-teal hover:bg-b4-teal/90 text-white shrink-0 ml-4"
                        >
                          Add Idea
                        </Button>
                      )}
                      {activeSection === 'cobuilder' && (
                        <Button 
                          onClick={() => navigate('/opportunities')}
                          className="bg-b4-teal hover:bg-b4-teal/90 text-white shrink-0 ml-4"
                        >
                          Co Build a Venture
                        </Button>
                      )}
                    </div>
                  </Alert>
                )}

                {/* Pending Review Banner */}
                {!isSectionCertified(activeSection) && shouldShowPendingBanner(activeSection) && (
                  <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
                      Journey Completed - Pending Review
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      Congratulations! You have completed all the steps for this journey. 
                      An admin will review your answers and approve your certification, or get back to you with feedback.
                    </AlertDescription>
                  </Alert>
                )}

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
                                      {isSectionCertified(activeSection) && (
                                        <Badge className="bg-b4-teal text-white text-xs">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Certified
                                        </Badge>
                                      )}
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                  </div>
                                  {!isSectionCertified(activeSection) && (
                                    <Button
                                      variant={isStepCompleted(activeSection, step.step) ? "outline" : "teal"}
                                      size="sm"
                                      onClick={() => handleOpenStep(activeSection, step.step)}
                                      className="shrink-0"
                                      disabled={isStepCompleted(activeSection, step.step)}
                                    >
                                      {isStepCompleted(activeSection, step.step) ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Done
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-4 h-4 mr-1" />
                                          Begin
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                
                                {/* Show read-only answers when certified */}
                                {isSectionCertified(activeSection) && getStepResponses(activeSection, step.step) && (
                                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <h4 className="text-sm font-semibold text-foreground mb-3">Your Submitted Answers</h4>
                                    <div className="space-y-4">
                                      {Object.entries(getStepResponses(activeSection, step.step) || {}).map(([key, value]) => {
                                        // Parse quiz response objects
                                        const quizData = typeof value === 'object' && value !== null ? value as Record<string, any> : null;
                                        const question = quizData?.question || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                                        const answer = quizData?.answer;
                                        const isCorrect = quizData?.isCorrect;
                                        
                                        // Format the answer based on type
                                        const formatAnswer = (ans: any): string => {
                                          if (Array.isArray(ans)) {
                                            return ans.join(' → ');
                                          }
                                          if (typeof ans === 'string') {
                                            return ans;
                                          }
                                          return String(ans);
                                        };
                                        
                                        const displayAnswer = quizData ? formatAnswer(answer) : (typeof value === 'string' ? value : JSON.stringify(value));
                                        
                                        return (
                                          <div key={key} className="text-sm border-b border-border/30 pb-3 last:border-0 last:pb-0">
                                            <p className="text-foreground font-medium mb-2">
                                              {question}
                                            </p>
                                            <div className="flex items-start gap-2">
                                              <p className="text-muted-foreground bg-background p-2 rounded border border-border/30 flex-1">
                                                {displayAnswer}
                                              </p>
                                              {isCorrect !== null && isCorrect !== undefined && (
                                                <Badge variant={isCorrect ? "default" : "secondary"} className={isCorrect ? "bg-green-500 text-white" : ""}>
                                                  {isCorrect ? "✓" : "—"}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                
                                {!isSectionCertified(activeSection) && (
                                  <ul className="space-y-2">
                                    {step.details.map((detail, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <span className="text-muted-foreground">{detail}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
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

      {/* Quiz Dialog for Initiator */}
      <InitiatorQuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        stepNumber={selectedStep}
        onComplete={handleStepComplete}
      />

      {/* Quiz Dialog for Co-Builder */}
      <CoBuilderQuizDialog
        open={cobuilderQuizOpen}
        onOpenChange={setCobuilderQuizOpen}
        stepNumber={selectedStep}
        onComplete={handleStepComplete}
      />

    </div>
  );
};

export default Journey;

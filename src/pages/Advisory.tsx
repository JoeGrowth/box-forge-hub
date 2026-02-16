import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useLearningJourneys } from "@/hooks/useLearningJourneys";
import { supabase } from "@/integrations/supabase/client";
import {
  Theater,
  Code2,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Zap,
  Pencil,
  Rocket,
  Award,
  Briefcase,
  Target,
  Handshake,
  TrendingUp,
  GraduationCap,
  Play,
  Clock,
} from "lucide-react";
import { ScaleStepDialog } from "@/components/scale/ScaleStepDialog";
import { ConsultantQuizDialog } from "@/components/learning/ConsultantQuizDialog";

// Learning steps for consultant certification
const CONSULTANT_LEARNING_STEPS = [
  {
    step: 1,
    title: "Foundations",
    subtitle: "Consulting Basics",
    icon: BookOpen,
    description: "Learn the fundamentals of consulting. Understand client needs, project scoping, and engagement models.",
    details: ["Master consulting frameworks", "Learn client engagement", "Understand project scoping"],
    color: "from-purple-500 to-violet-500",
  },
  {
    step: 2,
    title: "Strategy",
    subtitle: "Strategic Thinking",
    icon: Target,
    description: "Develop strategic thinking capabilities. Learn to analyze complex problems and create actionable solutions.",
    details: ["Strategic analysis methods", "Problem-solving frameworks", "Solution development"],
    color: "from-violet-500 to-purple-600",
  },
  {
    step: 3,
    title: "Advisory",
    subtitle: "Client Relations",
    icon: Handshake,
    description: "Build strong client relationships. Learn to communicate effectively and manage stakeholder expectations.",
    details: ["Client relationship management", "Stakeholder communication", "Expectation management"],
    color: "from-purple-600 to-fuchsia-500",
  },
  {
    step: 4,
    title: "Leadership",
    subtitle: "Thought Leadership",
    icon: TrendingUp,
    description: "Establish yourself as a thought leader. Create content, speak at events, and build your personal brand.",
    details: ["Develop thought leadership", "Build personal brand", "Lead consulting engagements"],
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    step: 5,
    title: "Mastery",
    subtitle: "Expert Consultant",
    icon: GraduationCap,
    description: "Achieve mastery as a consultant. Lead complex engagements and mentor the next generation.",
    details: ["Lead complex projects", "Mentor other consultants", "Achieve expert certification"],
    color: "from-pink-500 to-rose-500",
  },
];

// Scaling steps after certification
const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Structure (Branding Phase)",
    subtitle: "Structured consultants",
    icon: Theater,
    description: "Create your Mask — the structured entity that represents your natural role.",
    details: ["Define your Mask's identity and purpose", "Structure your natural role into an entity", "Ownership: 100% yours"],
    color: "from-violet-500 to-purple-600",
  },
  {
    step: 2,
    title: "Detach (Systemization Phase)",
    subtitle: "Operational systems",
    icon: Code2,
    description: "Transform personal thinking into operational systems.",
    details: ["Training programs & curricula", "Consulting frameworks & methodologies", "Operating principles & playbooks"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: 3,
    title: "Scale (Asset Phase)",
    subtitle: "Clients ask for the brand",
    icon: Users,
    description: "Clients ask for the Mask, not you. Work becomes deliverable by others.",
    details: ["Build delivery capacity beyond yourself", "Enable others to operate as the Mask", "Scale impact without being the bottleneck"],
    color: "from-emerald-500 to-teal-500",
  },
];

const Advisory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const { journeys, phaseResponses, certifications } = useLearningJourneys();

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [scaleCompletionStatus, setScaleCompletionStatus] = useState<Record<number, boolean>>({});
  const [showScaleExperience, setShowScaleExperience] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("showScaleExperience") === "true";
    }
    return false;
  });

  // Learning journey state
  const [consultantQuizOpen, setConsultantQuizOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [learningCompletionStatus, setLearningCompletionStatus] = useState<Record<number, boolean>>({});

  const isApproved = onboardingState?.journey_status === "approved" || 
    onboardingState?.journey_status === "entrepreneur_approved";

  const hasConsultantCert = certifications.some(c => c.certification_type === "consultant_b4");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if not approved
  useEffect(() => {
    if (!authLoading && !onboardingLoading && user && !isApproved) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, onboardingLoading, user, isApproved, navigate]);

  // Fetch scale step completion status
  useEffect(() => {
    const fetchStepCompletionStatus = async () => {
      if (!user) return;

      const { data: journey } = await supabase
        .from("learning_journeys")
        .select("id")
        .eq("user_id", user.id)
        .eq("journey_type", "scaling_path")
        .maybeSingle();

      if (!journey) return;

      const { data: responses } = await supabase
        .from("journey_phase_responses")
        .select("phase_number, phase_name, is_completed")
        .eq("journey_id", journey.id);

      if (!responses) return;

      const scalePhaseNames = [
        "Personal Entity",
        "Company Formation",
        "Process Implementation",
        "Autonomous Structure",
        "Decentralized Structure",
      ];
      const scaleResponses = responses.filter((r) => scalePhaseNames.includes(r.phase_name));
      const completedPhases = scaleResponses.filter((r) => r.is_completed).map((r) => r.phase_number);

      setScaleCompletionStatus({
        1: completedPhases.includes(1),
        2: completedPhases.includes(2) && completedPhases.includes(3) && completedPhases.includes(4),
        3: completedPhases.includes(5),
      });
    };
    fetchStepCompletionStatus();
  }, [user]);

  // Auto-show experience if user has any completed steps
  useEffect(() => {
    const hasCompletedAnyStep = Object.values(scaleCompletionStatus).some(Boolean);
    if (hasCompletedAnyStep) {
      setShowScaleExperience(true);
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [scaleCompletionStatus]);

  useEffect(() => {
    if (showScaleExperience) {
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [showScaleExperience]);

  // Check learning step completion from DB
  const isLearningStepCompletedFromDB = (stepNumber: number): boolean => {
    const journey = journeys.find(j => j.journey_type === "scaling_path");
    if (!journey) return false;
    const phaseNumber = stepNumber - 1;
    return !!phaseResponses.find(
      pr => pr.journey_id === journey.id && pr.phase_number === phaseNumber && pr.is_completed
    );
  };

  const isLearningStepCompleted = (stepNumber: number): boolean => {
    return learningCompletionStatus[stepNumber] || isLearningStepCompletedFromDB(stepNumber);
  };

  // Check if learning journey is pending approval
  const isJourneyPendingApproval = (): boolean => {
    const journey = journeys.find(j => j.journey_type === "scaling_path");
    return journey?.status === "pending_approval";
  };

  const isAllLearningStepsCompleted = (): boolean => {
    const journey = journeys.find(j => j.journey_type === "scaling_path");
    if (!journey) return false;
    const completedPhases = phaseResponses.filter(
      pr => pr.journey_id === journey.id && pr.is_completed
    );
    return completedPhases.length >= CONSULTANT_LEARNING_STEPS.length;
  };

  const shouldShowPendingBanner = (): boolean => {
    return isAllLearningStepsCompleted() || isJourneyPendingApproval();
  };

  // Get step responses for read-only view
  const getStepResponses = (stepNumber: number): Record<string, any> | null => {
    const journey = journeys.find(j => j.journey_type === "scaling_path");
    if (!journey) return null;
    const phaseNumber = stepNumber - 1;
    const phaseResponse = phaseResponses.find(
      pr => pr.journey_id === journey.id && pr.phase_number === phaseNumber
    );
    return phaseResponse?.responses || null;
  };

  const handleOpenLearningStep = (stepNum: number) => {
    if (hasConsultantCert) return;
    setSelectedStep(stepNum);
    setConsultantQuizOpen(true);
  };

  const handleLearningStepComplete = (stepNumber: number) => {
    setLearningCompletionStatus((prev) => ({ ...prev, [stepNumber]: true }));
  };

  const handleOpenScaleStepDialog = (stepNum: 1 | 2 | 3) => {
    setActiveStep(stepNum);
    setStepDialogOpen(true);
  };

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isApproved) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold">Advisory</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                {hasConsultantCert
                  ? "Scale your expertise as a certified consultant. Build your Mask and operate beyond yourself."
                  : "Master the art of consulting. Complete your learning journey to earn your certification."}
              </p>
            </div>
          </section>

          <section className="py-12">
            <div className="container max-w-5xl mx-auto px-4">
              <div className="space-y-8">
                {/* === LEARNING FLOW (uncertified) === */}
                {!hasConsultantCert && (
                  <>
                    {/* Pending Review Banner */}
                    {shouldShowPendingBanner() && (
                      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
                          Journey Completed - Pending Review
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                          Congratulations! You have completed all the steps. An admin will review your answers and approve your certification.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Concept Card */}
                    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row items-start gap-6">
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 shrink-0">
                            <Briefcase className="w-8 h-8 text-white" />
                          </div>
                          <div className="space-y-3">
                            <h3 className="text-xl font-display font-bold text-foreground">Learn to be a Consultant</h3>
                            <p className="text-muted-foreground leading-relaxed">
                              A 5-step journey to achieve advisory excellence
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-violet-500" />
                              <span className="text-muted-foreground">
                                <strong className="text-foreground">5 Steps</strong> to certification
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Learning Journey Header */}
                    <div className="text-center">
                      <h2 className="text-2xl font-display font-bold text-foreground mb-2">Your Learning Journey</h2>
                      <p className="text-muted-foreground">A 5-step journey to achieve advisory excellence</p>
                    </div>

                    {/* Learning Steps */}
                    <div className="relative">
                      <div
                        className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-fuchsia-500 to-rose-500 hidden md:block"
                        style={{ transform: "translateX(-50%)" }}
                      />

                      <div className="space-y-6">
                        {CONSULTANT_LEARNING_STEPS.map((step, index) => (
                          <div key={step.step} className={`relative ${index % 2 === 0 ? "md:pr-[52%]" : "md:pl-[52%]"}`}>
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
                                        variant={isLearningStepCompleted(step.step) ? "outline" : "teal"}
                                        size="sm"
                                        onClick={() => handleOpenLearningStep(step.step)}
                                        className="shrink-0"
                                        disabled={isLearningStepCompleted(step.step)}
                                      >
                                        {isLearningStepCompleted(step.step) ? (
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

                    {/* Outcome */}
                    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-display font-bold text-foreground mb-2">The Outcome</h3>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                              You become a certified Consultant — ready to guide startups strategically and lead engagements.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* === SCALING FLOW (certified) === */}
                {hasConsultantCert && (
                  <>
                    {/* Certified Banner */}
                    <Alert className="border-b4-teal/50 bg-teal-50 dark:bg-teal-950/30">
                      <div className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-b4-teal mt-0.5" />
                        <div>
                          <AlertTitle className="text-teal-800 dark:text-teal-200 font-semibold">
                            Certified Consultant
                          </AlertTitle>
                          <AlertDescription className="text-teal-700 dark:text-teal-300">
                            Congratulations! You are a certified consultant. Now scale your expertise with the journey below.
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-foreground">Your Consultant Journey</h2>
                        <p className="text-muted-foreground mt-1">
                          Build your Mask, scale your expertise, and operate beyond yourself
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => handleOpenScaleStepDialog(1)}>
                        <Theater className="w-4 h-4 mr-2" />
                        Open Your Mask
                      </Button>
                    </div>

                    {!showScaleExperience && (
                      <div className="text-center">
                        <Button variant="teal" onClick={() => setShowScaleExperience(true)} className="gap-2">
                          <Sparkles className="w-4 h-4" />
                          Start The Experience
                        </Button>
                      </div>
                    )}

                    {showScaleExperience && (
                      <div className="text-center animate-fade-in">
                        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Scale Your Natural Role</h2>
                        <p className="text-muted-foreground">A 3-step journey to build scalable impact</p>
                      </div>
                    )}

                    {showScaleExperience && (
                      <div className="relative animate-fade-in">
                        <div
                          className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 to-emerald-500 hidden md:block"
                          style={{ transform: "translateX(-50%)" }}
                        />

                        <div className="space-y-6">
                          {SCALE_NR_STEPS.map((step, index) => (
                            <div key={step.step} className={`relative ${index % 2 === 0 ? "md:pr-[52%]" : "md:pl-[52%]"}`}>
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
                                          variant={scaleCompletionStatus[step.step] ? "outline" : "teal"}
                                          size="sm"
                                          onClick={() => handleOpenScaleStepDialog(step.step as 1 | 2 | 3)}
                                          className="shrink-0"
                                        >
                                          {scaleCompletionStatus[step.step] ? (
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
                    )}

                    {showScaleExperience && (
                      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 animate-fade-in">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-4">
                            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500">
                              <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-display font-bold text-foreground mb-2">The Outcome</h3>
                              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                You scale your impact{" "}
                                <strong className="text-foreground">without being the bottleneck</strong>. Your Mask operates
                                independently — value becomes repeatable, transferable, and truly scalable.
                              </p>
                            </div>
                            {scaleCompletionStatus[1] && scaleCompletionStatus[2] && scaleCompletionStatus[3] && (
                              <div className="pt-4">
                                <Button
                                  variant="hero"
                                  size="lg"
                                  onClick={() => navigate("/entrepreneurial-onboarding")}
                                  className="gap-2"
                                >
                                  <Rocket className="w-5 h-5" />
                                  Explore the Entrepreneurial Journey
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />

      {/* Scale Step Dialog */}
      <ScaleStepDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        stepNumber={activeStep}
        onComplete={() => {
          setScaleCompletionStatus((prev) => ({ ...prev, [activeStep]: true }));
        }}
      />

      {/* Consultant Learning Quiz Dialog */}
      <ConsultantQuizDialog
        open={consultantQuizOpen}
        onOpenChange={setConsultantQuizOpen}
        stepNumber={selectedStep}
        onComplete={handleLearningStepComplete}
      />
    </div>
  );
};

export default Advisory;

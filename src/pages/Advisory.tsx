import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  Target,
  Handshake,
  TrendingUp,
  GraduationCap,
  Play,
  Clock,
  Lock,
  ChevronRight,
  ArrowRight,
  CircleDot,
  Trophy,
} from "lucide-react";
import { ScaleStepDialog } from "@/components/scale/ScaleStepDialog";
import { ConsultantQuizDialog } from "@/components/learning/ConsultantQuizDialog";

const CONSULTANT_LEARNING_STEPS = [
  {
    step: 1,
    title: "Foundations",
    subtitle: "Consulting Basics",
    icon: BookOpen,
    description: "Learn the fundamentals of consulting. Understand client needs, project scoping, and engagement models.",
    details: ["Master consulting frameworks", "Learn client engagement", "Understand project scoping"],
    color: "from-purple-500 to-violet-500",
    bgLight: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800/50",
  },
  {
    step: 2,
    title: "Strategy",
    subtitle: "Strategic Thinking",
    icon: Target,
    description: "Develop strategic thinking capabilities. Learn to analyze complex problems and create actionable solutions.",
    details: ["Strategic analysis methods", "Problem-solving frameworks", "Solution development"],
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-950/20",
    borderColor: "border-violet-200 dark:border-violet-800/50",
  },
  {
    step: 3,
    title: "Advisory",
    subtitle: "Client Relations",
    icon: Handshake,
    description: "Build strong client relationships. Learn to communicate effectively and manage stakeholder expectations.",
    details: ["Client relationship management", "Stakeholder communication", "Expectation management"],
    color: "from-purple-600 to-fuchsia-500",
    bgLight: "bg-fuchsia-50 dark:bg-fuchsia-950/20",
    borderColor: "border-fuchsia-200 dark:border-fuchsia-800/50",
  },
  {
    step: 4,
    title: "Leadership",
    subtitle: "Thought Leadership",
    icon: TrendingUp,
    description: "Establish yourself as a thought leader. Create content, speak at events, and build your personal brand.",
    details: ["Develop thought leadership", "Build personal brand", "Lead consulting engagements"],
    color: "from-fuchsia-500 to-pink-500",
    bgLight: "bg-pink-50 dark:bg-pink-950/20",
    borderColor: "border-pink-200 dark:border-pink-800/50",
  },
  {
    step: 5,
    title: "Mastery",
    subtitle: "Expert Consultant",
    icon: GraduationCap,
    description: "Achieve mastery as a consultant. Lead complex engagements and mentor the next generation.",
    details: ["Lead complex projects", "Mentor other consultants", "Achieve expert certification"],
    color: "from-pink-500 to-rose-500",
    bgLight: "bg-rose-50 dark:bg-rose-950/20",
    borderColor: "border-rose-200 dark:border-rose-800/50",
  },
];

const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Structure (Branding Phase)",
    subtitle: "Structured consultants",
    icon: Theater,
    description: "Create your Brand — the structured entity that represents your natural role.",
    details: ["Define your Brand's identity and purpose", "Structure your natural role into an entity", "Ownership: 100% yours"],
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-950/20",
    borderColor: "border-violet-200 dark:border-violet-800/50",
  },
  {
    step: 2,
    title: "Detach (Systemization Phase)",
    subtitle: "Operational systems",
    icon: Code2,
    description: "Transform personal thinking into operational systems.",
    details: ["Training programs & curricula", "Consulting frameworks & methodologies", "Operating principles & playbooks"],
    color: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800/50",
  },
  {
    step: 3,
    title: "Scale (Asset Phase)",
    subtitle: "Clients ask for the brand",
    icon: Users,
    description: "Clients ask for the Brand, not you. Work becomes deliverable by others.",
    details: ["Build delivery capacity beyond yourself", "Enable others to operate as the Brand", "Scale impact without being the bottleneck"],
    color: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800/50",
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

  const [consultantQuizOpen, setConsultantQuizOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [learningCompletionStatus, setLearningCompletionStatus] = useState<Record<number, boolean>>({});

  const isApproved =
    onboardingState?.journey_status === "approved" || onboardingState?.journey_status === "entrepreneur_approved";

  const hasConsultantCert = certifications.some((c) => c.certification_type === "consultant_b4");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !onboardingLoading && user && !isApproved) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, onboardingLoading, user, isApproved, navigate]);

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
      const scalePhaseNames = ["Personal Entity", "Company Formation", "Process Implementation", "Autonomous Structure", "Decentralized Structure"];
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

  const isLearningStepCompletedFromDB = (stepNumber: number): boolean => {
    const journey = journeys.find((j) => j.journey_type === "scaling_path");
    if (!journey) return false;
    const phaseNumber = stepNumber - 1;
    return !!phaseResponses.find((pr) => pr.journey_id === journey.id && pr.phase_number === phaseNumber && pr.is_completed);
  };

  const isLearningStepCompleted = (stepNumber: number): boolean => {
    return learningCompletionStatus[stepNumber] || isLearningStepCompletedFromDB(stepNumber);
  };

  const isJourneyPendingApproval = (): boolean => {
    const journey = journeys.find((j) => j.journey_type === "scaling_path");
    return journey?.status === "pending_approval";
  };

  const isAllLearningStepsCompleted = (): boolean => {
    const journey = journeys.find((j) => j.journey_type === "scaling_path");
    if (!journey) return false;
    const completedPhases = phaseResponses.filter((pr) => pr.journey_id === journey.id && pr.is_completed);
    return completedPhases.length >= CONSULTANT_LEARNING_STEPS.length;
  };

  const shouldShowPendingBanner = (): boolean => {
    return isAllLearningStepsCompleted() || isJourneyPendingApproval();
  };

  // Progress calculations
  const learningProgress = useMemo(() => {
    const completed = CONSULTANT_LEARNING_STEPS.filter((s) => isLearningStepCompleted(s.step)).length;
    return Math.round((completed / CONSULTANT_LEARNING_STEPS.length) * 100);
  }, [learningCompletionStatus, journeys, phaseResponses]);

  const scaleProgress = useMemo(() => {
    const completed = SCALE_NR_STEPS.filter((s) => scaleCompletionStatus[s.step]).length;
    return Math.round((completed / SCALE_NR_STEPS.length) * 100);
  }, [scaleCompletionStatus]);

  const completedLearningSteps = useMemo(() => {
    return CONSULTANT_LEARNING_STEPS.filter((s) => isLearningStepCompleted(s.step)).length;
  }, [learningCompletionStatus, journeys, phaseResponses]);

  const completedScaleSteps = useMemo(() => {
    return SCALE_NR_STEPS.filter((s) => scaleCompletionStatus[s.step]).length;
  }, [scaleCompletionStatus]);

  // Find current active step (first incomplete)
  const currentLearningStep = useMemo(() => {
    for (const step of CONSULTANT_LEARNING_STEPS) {
      if (!isLearningStepCompleted(step.step)) return step.step;
    }
    return CONSULTANT_LEARNING_STEPS.length + 1; // all done
  }, [learningCompletionStatus, journeys, phaseResponses]);

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
          {/* Hero Header */}
          <section className="relative py-16 md:py-20 overflow-hidden">
            <div className="absolute inset-0 gradient-hero opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  {hasConsultantCert ? (
                    <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                      <Trophy className="w-7 h-7 text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                      <Award className="w-7 h-7 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                      {hasConsultantCert ? "Scale Your Expertise" : "Advisory Journey"}
                    </h1>
                  </div>
                </div>
                <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl leading-relaxed">
                  {hasConsultantCert
                    ? "You're a certified consultant. Now build your Brand and scale your impact beyond yourself."
                    : "Follow this guided path to master consulting. Complete each step to unlock the next and earn your certification."}
                </p>

                {/* Progress Overview */}
                <div className="mt-8 p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-primary-foreground/90">
                      {hasConsultantCert ? "Scaling Progress" : "Your Progress"}
                    </span>
                    <span className="text-sm font-bold text-primary-foreground">
                      {hasConsultantCert
                        ? `${completedScaleSteps}/${SCALE_NR_STEPS.length} steps`
                        : `${completedLearningSteps}/${CONSULTANT_LEARNING_STEPS.length} steps`}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/90 transition-all duration-700 ease-out"
                      style={{ width: `${hasConsultantCert ? scaleProgress : learningProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <CircleDot className="w-4 h-4 text-primary-foreground/60" />
                    <span className="text-xs text-primary-foreground/70">
                      {hasConsultantCert
                        ? scaleProgress === 100
                          ? "All steps completed! You're ready to explore the entrepreneurial journey."
                          : "Complete each step to build your scalable consulting brand."
                        : learningProgress === 100
                        ? "All steps completed! Awaiting certification approval."
                        : `Next: Step ${currentLearningStep} — ${CONSULTANT_LEARNING_STEPS[currentLearningStep - 1]?.title || ""}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-10 md:py-14">
            <div className="container max-w-4xl mx-auto px-4">
              <div className="space-y-6">
                {/* === LEARNING FLOW (uncertified) === */}
                {!hasConsultantCert && (
                  <>
                    {shouldShowPendingBanner() && (
                      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 animate-fade-in">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
                          Journey Completed — Pending Review
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                          All steps are done! An admin will review your answers and approve your certification soon.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Steps List — Vertical Timeline */}
                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-border" />

                      <div className="space-y-4">
                        {CONSULTANT_LEARNING_STEPS.map((step) => {
                          const completed = isLearningStepCompleted(step.step);
                          const isCurrent = step.step === currentLearningStep;
                          const isLocked = step.step > currentLearningStep && !completed;

                          return (
                            <div key={step.step} className="relative pl-16 md:pl-20 animate-fade-in" style={{ animationDelay: `${step.step * 80}ms` }}>
                              {/* Timeline node */}
                              <div
                                className={`absolute left-3.5 md:left-5.5 top-6 w-5 h-5 md:w-5 md:h-5 rounded-full border-[3px] z-10 transition-all duration-300 ${
                                  completed
                                    ? "bg-primary border-primary shadow-md shadow-primary/30"
                                    : isCurrent
                                    ? "bg-background border-primary animate-pulse shadow-md shadow-primary/20"
                                    : "bg-muted border-muted-foreground/30"
                                }`}
                              >
                                {completed && <CheckCircle className="w-full h-full text-primary-foreground p-[1px]" />}
                              </div>

                              <Card
                                className={`transition-all duration-300 overflow-hidden ${
                                  completed
                                    ? `${step.bgLight} ${step.borderColor} shadow-sm`
                                    : isCurrent
                                    ? "border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                                    : isLocked
                                    ? "opacity-60 border-border/30"
                                    : "border-border/50"
                                }`}
                              >
                                {/* Top accent bar */}
                                <div className={`h-1 bg-gradient-to-r ${step.color} ${isLocked ? "opacity-30" : ""}`} />

                                <CardContent className="p-5 md:p-6">
                                  <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div
                                      className={`p-3 rounded-xl shrink-0 transition-all ${
                                        completed
                                          ? `bg-gradient-to-br ${step.color} shadow-md`
                                          : isCurrent
                                          ? `bg-gradient-to-br ${step.color} shadow-md animate-pulse`
                                          : "bg-muted"
                                      }`}
                                    >
                                      {isLocked ? (
                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                      ) : (
                                        <step.icon className={`w-5 h-5 ${completed || isCurrent ? "text-white" : "text-muted-foreground"}`} />
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                      <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                              Step {step.step}
                                            </span>
                                            <Badge variant={completed ? "default" : "outline"} className="text-xs">
                                              {step.subtitle}
                                            </Badge>
                                            {isCurrent && !completed && (
                                              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs animate-pulse">
                                                Current
                                              </Badge>
                                            )}
                                          </div>
                                          <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                        </div>

                                        {/* Action Button */}
                                        <Button
                                          variant={completed ? "outline" : isCurrent ? "default" : "ghost"}
                                          size="sm"
                                          onClick={() => handleOpenLearningStep(step.step)}
                                          className={`shrink-0 ${completed ? "pointer-events-none" : ""}`}
                                          disabled={isLocked || completed}
                                        >
                                          {completed ? (
                                            <>
                                              <CheckCircle className="w-4 h-4 mr-1 text-primary" />
                                              Completed
                                            </>
                                          ) : isCurrent ? (
                                            <>
                                              <Play className="w-4 h-4 mr-1" />
                                              Start Step
                                              <ArrowRight className="w-4 h-4 ml-1" />
                                            </>
                                          ) : (
                                            <>
                                              <Lock className="w-4 h-4 mr-1" />
                                              Locked
                                            </>
                                          )}
                                        </Button>
                                      </div>

                                      <p className={`text-sm leading-relaxed ${isLocked ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                                        {step.description}
                                      </p>

                                      {/* Details — show for current & completed */}
                                      {(isCurrent || completed) && (
                                        <ul className="space-y-1.5 pt-1">
                                          {step.details.map((detail, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${completed ? "text-primary" : "text-muted-foreground"}`} />
                                              <span className={completed ? "text-foreground" : "text-muted-foreground"}>{detail}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Outcome Card */}
                    <div className="pl-16 md:pl-20 relative">
                      <div className="absolute left-3.5 md:left-5.5 top-6 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 z-10 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                        <CardContent className="p-6 md:p-8">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 shrink-0">
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                                🎓 Certified Consultant
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">
                                Complete all 5 steps to become a certified consultant — ready to guide startups strategically and lead engagements on the B4 Platform.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* === SCALING FLOW (certified) === */}
                {hasConsultantCert && (
                  <>
                    <Alert className="border-b4-teal/50 bg-teal-50 dark:bg-teal-950/30">
                      <div className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-b4-teal mt-0.5" />
                        <div>
                          <AlertTitle className="text-teal-800 dark:text-teal-200 font-semibold">
                            ✅ Certified Consultant
                          </AlertTitle>
                          <AlertDescription className="text-teal-700 dark:text-teal-300">
                            You've earned your certification. Now scale your expertise with the journey below.
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>

                    {!showScaleExperience && (
                      <div className="text-center py-8">
                        <div className="inline-flex flex-col items-center gap-4">
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-teal-500/10">
                            <Rocket className="w-10 h-10 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Ready to Scale?</h2>
                            <p className="text-muted-foreground max-w-md mx-auto">
                              Build your consulting brand, systemize your expertise, and create scalable impact.
                            </p>
                          </div>
                          <Button variant="default" size="lg" onClick={() => setShowScaleExperience(true)} className="gap-2 mt-2">
                            <Sparkles className="w-5 h-5" />
                            Start The Experience
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {showScaleExperience && (
                      <>
                        <div className="text-center animate-fade-in mb-2">
                          <h2 className="text-2xl font-display font-bold text-foreground mb-1">Scale Your Natural Role</h2>
                          <p className="text-muted-foreground">A 3-step journey to build scalable impact</p>
                        </div>

                        {/* Scale Steps — Vertical Timeline */}
                        <div className="relative animate-fade-in">
                          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-border" />

                          <div className="space-y-4">
                            {SCALE_NR_STEPS.map((step) => {
                              const completed = scaleCompletionStatus[step.step];

                              return (
                                <div key={step.step} className="relative pl-16 md:pl-20" style={{ animationDelay: `${step.step * 100}ms` }}>
                                  <div
                                    className={`absolute left-3.5 md:left-5.5 top-6 w-5 h-5 rounded-full border-[3px] z-10 transition-all ${
                                      completed
                                        ? "bg-primary border-primary shadow-md shadow-primary/30"
                                        : "bg-background border-muted-foreground/30"
                                    }`}
                                  >
                                    {completed && <CheckCircle className="w-full h-full text-primary-foreground p-[1px]" />}
                                  </div>

                                  <Card className={`transition-all duration-300 overflow-hidden ${completed ? `${step.bgLight} ${step.borderColor}` : "border-border/50 hover:shadow-lg"}`}>
                                    <div className={`h-1 bg-gradient-to-r ${step.color}`} />
                                    <CardContent className="p-5 md:p-6">
                                      <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${completed ? `bg-gradient-to-br ${step.color}` : "bg-muted"}`}>
                                          <step.icon className={`w-5 h-5 ${completed ? "text-white" : "text-foreground"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                          <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                                  Step {step.step}
                                                </span>
                                                <Badge variant={completed ? "default" : "outline"} className="text-xs">
                                                  {step.subtitle}
                                                </Badge>
                                              </div>
                                              <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                            </div>
                                            <Button
                                              variant={completed ? "outline" : "default"}
                                              size="sm"
                                              onClick={() => handleOpenScaleStepDialog(step.step as 1 | 2 | 3)}
                                              className="shrink-0"
                                            >
                                              {completed ? (
                                                <>
                                                  <Pencil className="w-4 h-4 mr-1" />
                                                  Edit
                                                </>
                                              ) : (
                                                <>
                                                  <Play className="w-4 h-4 mr-1" />
                                                  Fill it
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                                          <ul className="space-y-1.5">
                                            {step.details.map((detail, i) => (
                                              <li key={i} className="flex items-center gap-2 text-sm">
                                                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${completed ? "text-primary" : "text-muted-foreground"}`} />
                                                <span className={completed ? "text-foreground" : "text-muted-foreground"}>{detail}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Scale Outcome */}
                        <div className="pl-16 md:pl-20 relative animate-fade-in">
                          <div className="absolute left-3.5 md:left-5.5 top-6 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 z-10 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white" />
                          </div>
                          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                            <CardContent className="p-6 md:p-8">
                              <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shrink-0">
                                    <Zap className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-display font-bold text-foreground mb-2">The Outcome</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                      You scale your impact <strong className="text-foreground">without being the bottleneck</strong>. Your Brand operates independently — value becomes repeatable, transferable, and truly scalable.
                                    </p>
                                  </div>
                                </div>
                                {scaleCompletionStatus[1] && scaleCompletionStatus[2] && scaleCompletionStatus[3] && (
                                  <div className="pt-2 ml-16">
                                    <Button variant="hero" size="lg" onClick={() => navigate("/entrepreneurial-onboarding")} className="gap-2">
                                      <Rocket className="w-5 h-5" />
                                      Explore the Entrepreneurial Journey
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />

      <ScaleStepDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        stepNumber={activeStep}
        onComplete={() => {
          setScaleCompletionStatus((prev) => ({ ...prev, [activeStep]: true }));
        }}
      />

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

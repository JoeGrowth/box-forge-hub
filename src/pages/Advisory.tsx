import { useState, useEffect, useMemo } from "react";
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
  Target,
  Handshake,
  TrendingUp,
  GraduationCap,
  Play,
  Clock,
  Lock,
  ArrowRight,
  Trophy,
  ChevronRight,
  Building2,
  Settings,
  Crown,
  Briefcase,
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

const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Structure",
    subtitle: "Branding Phase",
    icon: Theater,
    description: "Create your Brand — the structured entity that represents your natural role.",
    details: ["Define your Brand's identity and purpose", "Structure your natural role into an entity", "Ownership: 100% yours"],
    color: "from-violet-500 to-purple-600",
  },
  {
    step: 2,
    title: "Detach",
    subtitle: "Systemization Phase",
    icon: Code2,
    description: "Transform personal thinking into operational systems.",
    details: ["Training programs & curricula", "Consulting frameworks & methodologies", "Operating principles & playbooks"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: 3,
    title: "Scale",
    subtitle: "Asset Phase",
    icon: Users,
    description: "Clients ask for the Brand, not you. Work becomes deliverable by others.",
    details: ["Build delivery capacity beyond yourself", "Enable others to operate as the Brand", "Scale impact without being the bottleneck"],
    color: "from-emerald-500 to-teal-500",
  },
];

const Advisory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const { journeys, phaseResponses, certifications } = useLearningJourneys();

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [activeScaleStep, setActiveScaleStep] = useState<1 | 2 | 3>(1);
  const [scaleCompletionStatus, setScaleCompletionStatus] = useState<Record<number, boolean>>({});
  const [showScaleExperience, setShowScaleExperience] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("showScaleExperience") === "true";
    return false;
  });
  const [consultantQuizOpen, setConsultantQuizOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [learningCompletionStatus, setLearningCompletionStatus] = useState<Record<number, boolean>>({});
  const [viewingStep, setViewingStep] = useState<number | null>(null);
  const [activePhase, setActivePhase] = useState<number>(0);

  const isApproved = onboardingState?.journey_status === "approved" || onboardingState?.journey_status === "entrepreneur_approved";
  const hasConsultantCert = certifications.some((c) => c.certification_type === "consultant_b4");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !onboardingLoading && user && !isApproved) navigate("/dashboard", { replace: true });
  }, [authLoading, onboardingLoading, user, isApproved, navigate]);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data: journey } = await supabase.from("learning_journeys").select("id").eq("user_id", user.id).eq("journey_type", "scaling_path").maybeSingle();
      if (!journey) return;
      const { data: responses } = await supabase.from("journey_phase_responses").select("phase_number, phase_name, is_completed").eq("journey_id", journey.id);
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
    fetch();
  }, [user]);

  useEffect(() => {
    if (Object.values(scaleCompletionStatus).some(Boolean)) {
      setShowScaleExperience(true);
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [scaleCompletionStatus]);

  useEffect(() => {
    if (showScaleExperience) localStorage.setItem("showScaleExperience", "true");
  }, [showScaleExperience]);

  const isLearningStepCompletedFromDB = (stepNumber: number): boolean => {
    const journey = journeys.find((j) => j.journey_type === "scaling_path");
    if (!journey) return false;
    return !!phaseResponses.find((pr) => pr.journey_id === journey.id && pr.phase_number === stepNumber - 1 && pr.is_completed);
  };

  const isLearningStepCompleted = (stepNumber: number): boolean => learningCompletionStatus[stepNumber] || isLearningStepCompletedFromDB(stepNumber);

  const isJourneyPendingApproval = (): boolean => journeys.find((j) => j.journey_type === "scaling_path")?.status === "pending_approval";

  const isAllLearningStepsCompleted = (): boolean => {
    const journey = journeys.find((j) => j.journey_type === "scaling_path");
    if (!journey) return false;
    return phaseResponses.filter((pr) => pr.journey_id === journey.id && pr.is_completed).length >= CONSULTANT_LEARNING_STEPS.length;
  };

  const shouldShowPendingBanner = (): boolean => isAllLearningStepsCompleted() || isJourneyPendingApproval();

  const completedLearningCount = useMemo(() => CONSULTANT_LEARNING_STEPS.filter((s) => isLearningStepCompleted(s.step)).length, [learningCompletionStatus, journeys, phaseResponses]);
  const completedScaleCount = useMemo(() => SCALE_NR_STEPS.filter((s) => scaleCompletionStatus[s.step]).length, [scaleCompletionStatus]);

  const currentLearningStep = useMemo(() => {
    for (const step of CONSULTANT_LEARNING_STEPS) {
      if (!isLearningStepCompleted(step.step)) return step.step;
    }
    return CONSULTANT_LEARNING_STEPS.length + 1;
  }, [learningCompletionStatus, journeys, phaseResponses]);

  // Auto-select the current step for viewing
  useEffect(() => {
    if (!hasConsultantCert && viewingStep === null) {
      setViewingStep(currentLearningStep <= CONSULTANT_LEARNING_STEPS.length ? currentLearningStep : CONSULTANT_LEARNING_STEPS.length);
    }
  }, [currentLearningStep, hasConsultantCert, viewingStep]);

  const handleOpenLearningStep = (stepNum: number) => {
    if (hasConsultantCert) return;
    setSelectedStep(stepNum);
    setConsultantQuizOpen(true);
  };

  const handleLearningStepComplete = (stepNumber: number) => {
    setLearningCompletionStatus((prev) => ({ ...prev, [stepNumber]: true }));
  };

  const handleOpenScaleStepDialog = (stepNum: 1 | 2 | 3) => {
    setActiveScaleStep(stepNum);
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

  // The actively-viewed learning step details
  const activeViewStep = CONSULTANT_LEARNING_STEPS.find((s) => s.step === viewingStep);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Hero */}
          <section className="relative py-14 md:py-18 overflow-hidden">
            <div className="absolute inset-0 gradient-hero opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                    {hasConsultantCert ? <Trophy className="w-7 h-7 text-primary-foreground" /> : <Award className="w-7 h-7 text-primary-foreground" />}
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                    {hasConsultantCert ? "Scale Your Expertise" : "Advisory Journey"}
                  </h1>
                </div>
                <p className="text-primary-foreground/80 text-lg max-w-2xl leading-relaxed">
                  {hasConsultantCert
                    ? "You're a certified consultant. Build your Brand and scale your impact beyond yourself."
                    : "Follow this guided path to master consulting. Complete each step to earn your certification."}
                </p>
                {/* Mini progress */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-2 flex-1 max-w-xs rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/90 transition-all duration-700"
                      style={{
                        width: `${hasConsultantCert ? (completedScaleCount / SCALE_NR_STEPS.length) * 100 : (completedLearningCount / CONSULTANT_LEARNING_STEPS.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-primary-foreground/90">
                    {hasConsultantCert ? `${completedScaleCount}/${SCALE_NR_STEPS.length}` : `${completedLearningCount}/${CONSULTANT_LEARNING_STEPS.length}`} completed
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="py-10 md:py-14">
            <div className="container max-w-5xl mx-auto px-4">
              {/* === LEARNING FLOW === */}
              {!hasConsultantCert && (
                <div className="space-y-8">
                  {shouldShowPendingBanner() && (
                    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">Journey Completed — Pending Review</AlertTitle>
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        All steps done! An admin will review and approve your certification soon.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Horizontal Stepper */}
                  <div className="relative">
                    {/* Connector line */}
                    <div className="absolute top-7 left-0 right-0 h-0.5 bg-border hidden sm:block" />
                    <div className="grid grid-cols-5 gap-2 sm:gap-0">
                      {CONSULTANT_LEARNING_STEPS.map((step) => {
                        const completed = isLearningStepCompleted(step.step);
                        const isCurrent = step.step === currentLearningStep;
                        const isLocked = step.step > currentLearningStep && !completed;
                        const isViewing = viewingStep === step.step;

                        return (
                          <button
                            key={step.step}
                            onClick={() => !isLocked && setViewingStep(step.step)}
                            disabled={isLocked}
                            className={`relative flex flex-col items-center text-center group transition-all ${isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {/* Circle */}
                            <div
                              className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                                completed
                                  ? `bg-gradient-to-br ${step.color} shadow-lg`
                                  : isCurrent
                                  ? "bg-background border-[3px] border-primary shadow-lg shadow-primary/20"
                                  : isViewing
                                  ? "bg-muted border-2 border-foreground/20"
                                  : "bg-muted border-2 border-border"
                              }`}
                            >
                              {completed ? (
                                <CheckCircle className="w-6 h-6 text-white" />
                              ) : isLocked ? (
                                <Lock className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <step.icon className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                              )}
                            </div>
                            {/* Label */}
                            <span
                              className={`mt-2 text-xs font-semibold transition-colors ${
                                isViewing ? "text-foreground" : completed ? "text-foreground" : isCurrent ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              {step.title}
                            </span>
                            {isCurrent && !completed && (
                              <span className="text-[10px] text-primary font-medium mt-0.5">Current</span>
                            )}
                            {/* Active indicator */}
                            {isViewing && (
                              <div className={`mt-2 w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Step Content */}
                  {activeViewStep && (
                    <Card className="overflow-hidden border-border/50 shadow-md animate-fade-in" key={activeViewStep.step}>
                      <div className={`h-1.5 bg-gradient-to-r ${activeViewStep.color}`} />
                      <CardContent className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Left: Info */}
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline" className="text-xs uppercase tracking-widest font-semibold">
                                Step {activeViewStep.step} of 5
                              </Badge>
                              <Badge className={`bg-gradient-to-r ${activeViewStep.color} text-white border-0 text-xs`}>
                                {activeViewStep.subtitle}
                              </Badge>
                            </div>
                            <h2 className="text-2xl font-display font-bold text-foreground">{activeViewStep.title}</h2>
                            <p className="text-muted-foreground leading-relaxed">{activeViewStep.description}</p>
                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What you'll learn</p>
                              {activeViewStep.details.map((detail, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${activeViewStep.color}`} />
                                  <span className="text-sm text-foreground">{detail}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Right: Action */}
                          <div className="flex flex-col items-center justify-center md:w-52 shrink-0 gap-3">
                            <div className={`p-5 rounded-2xl bg-gradient-to-br ${activeViewStep.color} shadow-xl`}>
                              <activeViewStep.icon className="w-10 h-10 text-white" />
                            </div>
                            {isLearningStepCompleted(activeViewStep.step) ? (
                              <div className="flex items-center gap-2 text-primary font-semibold">
                                <CheckCircle className="w-5 h-5" />
                                Completed
                              </div>
                            ) : activeViewStep.step === currentLearningStep ? (
                              <Button variant="default" size="lg" onClick={() => handleOpenLearningStep(activeViewStep.step)} className="w-full gap-2">
                                <Play className="w-5 h-5" />
                                Start Step
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            ) : activeViewStep.step > currentLearningStep ? (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Lock className="w-4 h-4" />
                                Complete previous steps first
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Full Journey Overview — All Phases */}
                  <div className="space-y-4 pt-4">
                    <div className="text-center">
                      <h2 className="text-xl font-display font-bold text-foreground mb-1">Your Complete Journey</h2>
                      <p className="text-sm text-muted-foreground">From learning to scaling — here's the full roadmap</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Phase 0 — Certification */}
                      <Card className={`overflow-hidden border-border/50 ${isAllLearningStepsCompleted() ? "border-primary/30 shadow-md" : ""}`}>
                        <div className="h-1.5 bg-gradient-to-r from-purple-500 to-violet-500" />
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${isAllLearningStepsCompleted() ? "bg-gradient-to-br from-purple-500 to-violet-500" : "bg-muted"}`}>
                              <GraduationCap className={`w-4 h-4 ${isAllLearningStepsCompleted() ? "text-white" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Phase 0</p>
                              <h3 className="text-sm font-display font-bold text-foreground">Certification</h3>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Complete 5 learning steps to earn your Certified Consultant badge.
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all"
                                style={{ width: `${(completedLearningCount / CONSULTANT_LEARNING_STEPS.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">{completedLearningCount}/5</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Phase 1, 2, 3 — Scaling */}
                      {SCALE_NR_STEPS.map((step) => (
                        <Card key={step.step} className="overflow-hidden border-border/50 opacity-60">
                          <div className={`h-1.5 bg-gradient-to-r ${step.color}`} />
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-muted">
                                <step.icon className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Phase {step.step}</p>
                                <h3 className="text-sm font-display font-bold text-foreground">{step.title}</h3>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{step.subtitle}</Badge>
                            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Lock className="w-3 h-3" />
                              <span>Unlocks after certification</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* === SCALING FLOW === */}
              {hasConsultantCert && (
                <div className="space-y-8">
                  <Alert className="border-b4-teal/50 bg-teal-50 dark:bg-teal-950/30">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-b4-teal mt-0.5" />
                      <div>
                        <AlertTitle className="text-teal-800 dark:text-teal-200 font-semibold">✅ Certified Consultant</AlertTitle>
                        <AlertDescription className="text-teal-700 dark:text-teal-300">
                          You've earned your certification. Now scale your expertise.
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>

                  {!showScaleExperience && (
                    <div className="text-center py-10">
                      <div className="inline-flex flex-col items-center gap-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-teal-500/10">
                          <Rocket className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-foreground">Ready to Scale?</h2>
                        <p className="text-muted-foreground max-w-md">Build your brand, systemize your expertise, and scale.</p>
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
                      <div className="text-center">
                        <h2 className="text-2xl font-display font-bold text-foreground mb-1">Scale Your Natural Role</h2>
                        <p className="text-muted-foreground">3 phases to build scalable impact</p>
                      </div>

                      {/* 3-column cards */}
                      <div className="grid md:grid-cols-3 gap-5">
                        {SCALE_NR_STEPS.map((step) => {
                          const completed = scaleCompletionStatus[step.step];
                          return (
                            <Card
                              key={step.step}
                              className={`overflow-hidden transition-all duration-300 ${
                                completed ? "shadow-md border-primary/30" : "hover:shadow-lg border-border/50"
                              }`}
                            >
                              <div className={`h-1.5 bg-gradient-to-r ${step.color}`} />
                              <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={`p-2.5 rounded-xl ${completed ? `bg-gradient-to-br ${step.color}` : "bg-muted"}`}>
                                    <step.icon className={`w-5 h-5 ${completed ? "text-white" : "text-foreground"}`} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Phase {step.step}</p>
                                    <h3 className="text-base font-display font-bold text-foreground">{step.title}</h3>
                                  </div>
                                </div>
                                <Badge variant="outline" className="w-fit text-xs mb-3">{step.subtitle}</Badge>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{step.description}</p>
                                <ul className="space-y-1.5 mb-5">
                                  {step.details.map((d, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs">
                                      <ChevronRight className={`w-3 h-3 shrink-0 ${completed ? "text-primary" : "text-muted-foreground"}`} />
                                      <span className={completed ? "text-foreground" : "text-muted-foreground"}>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  variant={completed ? "outline" : "default"}
                                  className="w-full"
                                  onClick={() => handleOpenScaleStepDialog(step.step as 1 | 2 | 3)}
                                >
                                  {completed ? (
                                    <>
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Edit
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Fill it
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Segmented Phase Tabs */}
                      <div className="space-y-6 pt-4">
                        <div className="text-center">
                          <h2 className="text-xl font-display font-bold text-foreground mb-1">Complete Journey Overview</h2>
                          <p className="text-sm text-muted-foreground">From certification to scaling — your full roadmap</p>
                        </div>

                        {/* Tab bar */}
                        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
                          {[
                            { phase: 0, label: "Phase 0", icon: GraduationCap, completed: true },
                            ...SCALE_NR_STEPS.map((s) => ({
                              phase: s.step,
                              label: `Phase ${s.step}`,
                              icon: s.icon,
                              completed: !!scaleCompletionStatus[s.step],
                            })),
                          ].map((tab) => (
                            <button
                              key={tab.phase}
                              onClick={() => setActivePhase(tab.phase)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activePhase === tab.phase
                                  ? "bg-background shadow-sm text-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {tab.completed ? (
                                <CheckCircle className="w-4 h-4 text-b4-teal" />
                              ) : (
                                <tab.icon className="w-4 h-4" />
                              )}
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Phase content */}
                        <Card className="overflow-hidden border-border/50 animate-fade-in" key={activePhase}>
                          <CardContent className="p-6">
                            {activePhase === 0 ? (
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-display font-bold text-foreground">Certification</h3>
                                    <p className="text-sm text-muted-foreground">5-step learning journey completed</p>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  You mastered consulting foundations, strategy, advisory, leadership, and achieved expert-level mastery. Your Certified Consultant badge is earned.
                                </p>
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Completed
                                </div>
                              </div>
                            ) : (
                              (() => {
                                const step = SCALE_NR_STEPS.find((s) => s.step === activePhase);
                                if (!step) return null;
                                const completed = scaleCompletionStatus[step.step];
                                return (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-3 rounded-xl ${completed ? `bg-gradient-to-br ${step.color}` : "bg-muted"}`}>
                                        <step.icon className={`w-6 h-6 ${completed ? "text-white" : "text-foreground"}`} />
                                      </div>
                                      <div>
                                        <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                        <Badge variant="outline" className="text-xs">{step.subtitle}</Badge>
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                                    <ul className="space-y-2">
                                      {step.details.map((d, i) => (
                                        <li key={i} className="flex items-center gap-2.5 text-sm">
                                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${completed ? "text-primary" : "text-muted-foreground"}`} />
                                          <span className={completed ? "text-foreground" : "text-muted-foreground"}>{d}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="pt-2">
                                      {completed ? (
                                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                          <CheckCircle className="w-4 h-4" />
                                          Completed
                                        </div>
                                      ) : (
                                        <Button onClick={() => handleOpenScaleStepDialog(step.step as 1 | 2 | 3)} className="gap-2">
                                          <Play className="w-4 h-4" />
                                          Start Phase
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                          </CardContent>
                        </Card>

                        {/* Next Journey CTA */}
                        {scaleCompletionStatus[1] && scaleCompletionStatus[2] && scaleCompletionStatus[3] && (
                          <div className="text-center pt-2">
                            <Button variant="hero" onClick={() => navigate("/entrepreneurial-onboarding")} className="gap-2">
                              <Rocket className="w-4 h-4" />
                              Explore the Entrepreneurial Journey
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />

      <ScaleStepDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        stepNumber={activeScaleStep}
        onComplete={() => setScaleCompletionStatus((prev) => ({ ...prev, [activeScaleStep]: true }))}
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

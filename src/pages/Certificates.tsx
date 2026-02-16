import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserStatus } from "@/hooks/useUserStatus";
import { supabase } from "@/integrations/supabase/client";
import {
  Theater,
  Code2,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Lock,
  ArrowRight,
  Zap,
  Pencil,
  Rocket,
  TrendingUp,
  Award,
} from "lucide-react";
import { ScaleStepDialog } from "@/components/scale/ScaleStepDialog";

const SCALE_NR_STEPS = [
  {
    step: 1,
    title: "Structure (Branding Phase)",
    subtitle: "Structured consultants",
    icon: Theater,
    description:
      "Create your Mask — the structured entity that represents your natural role. This is the gamified first step to scaling beyond yourself.",
    details: [
      "Define your Mask's identity and purpose",
      "Structure your natural role into an entity",
      "Ownership: 100% yours",
    ],
    color: "from-violet-500 to-purple-600",
  },
  {
    step: 2,
    title: "Detach (Systemization Phase)",
    subtitle: "Operational systems",
    icon: Code2,
    description:
      "Transform personal thinking into operational systems. Your Mask becomes coded through frameworks, processes, and methods.",
    details: [
      "Training programs & curricula",
      "Consulting frameworks & methodologies",
      "Operating principles & playbooks",
    ],
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: 3,
    title: "Scale (Asset Phase)",
    subtitle: "Clients ask for the brand",
    icon: Users,
    description:
      "Clients ask for the Mask, not you. Work becomes deliverable by others. Value becomes scalable, repeatable, and transferable.",
    details: [
      "Build delivery capacity beyond yourself",
      "Enable others to operate as the Mask",
      "Scale impact without being the bottleneck",
    ],
    color: "from-emerald-500 to-teal-500",
  },
];

const Certificates = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canAccessBoosting, loading: statusLoading } = useUserStatus();

  const [hasConsultantCert, setHasConsultantCert] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<number, boolean>>({});
  const [showScaleExperience, setShowScaleExperience] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("showScaleExperience") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if not approved
  useEffect(() => {
    if (!authLoading && !statusLoading && user && !canAccessBoosting) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, statusLoading, user, canAccessBoosting, navigate]);

  // Fetch consultant certification
  useEffect(() => {
    const fetchConsultantCert = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_certifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("certification_type", "consultant_b4")
        .maybeSingle();
      setHasConsultantCert(!!data);
    };
    fetchConsultantCert();
  }, [user]);

  // Fetch step completion status
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

      setStepCompletionStatus({
        1: completedPhases.includes(1),
        2: completedPhases.includes(2) && completedPhases.includes(3) && completedPhases.includes(4),
        3: completedPhases.includes(5),
      });
    };
    fetchStepCompletionStatus();
  }, [user]);

  // Auto-show experience if user has any completed steps
  useEffect(() => {
    const hasCompletedAnyStep = Object.values(stepCompletionStatus).some(Boolean);
    if (hasCompletedAnyStep) {
      setShowScaleExperience(true);
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [stepCompletionStatus]);

  useEffect(() => {
    if (showScaleExperience) {
      localStorage.setItem("showScaleExperience", "true");
    }
  }, [showScaleExperience]);

  const handleOpenStepDialog = (stepNum: 1 | 2 | 3) => {
    setActiveStep(stepNum);
    setStepDialogOpen(true);
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !canAccessBoosting) return null;

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
                <h1 className="font-display text-3xl font-bold">Certificates</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                Scale your expertise as a certified consultant. Build your Mask and operate beyond yourself.
              </p>
            </div>
          </section>

          <section className="py-12">
            <div className="container max-w-5xl mx-auto px-4">
              <div className="space-y-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-foreground">Your Consultant Journey</h2>
                    <p className="text-muted-foreground mt-1">
                      Build your Mask, scale your expertise, and operate beyond yourself
                    </p>
                  </div>
                  {hasConsultantCert ? (
                    <Button variant="outline" onClick={() => handleOpenStepDialog(1)}>
                      <Theater className="w-4 h-4 mr-2" />
                      Open Your Mask
                    </Button>
                  ) : (
                    <Button variant="teal" onClick={() => navigate("/journey?section=consultant")}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Get Certified
                    </Button>
                  )}
                </div>

                {!hasConsultantCert && (
                  <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-foreground mb-2">Certification Required</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Complete the Consultant learning journey to unlock the full scaling experience and track your
                            consulting missions.
                          </p>
                        </div>
                        <Button variant="teal" onClick={() => navigate("/journey?section=consultant")} className="gap-2">
                          <BookOpen className="w-4 h-4" />
                          Learn to be a Consultant
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasConsultantCert && !showScaleExperience && (
                  <div className="text-center">
                    <Button variant="teal" onClick={() => setShowScaleExperience(true)} className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Start The Experience
                    </Button>
                  </div>
                )}

                {hasConsultantCert && showScaleExperience && (
                  <div className="text-center animate-fade-in">
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">Scale Your Natural Role</h2>
                    <p className="text-muted-foreground">A 3-step journey to build scalable impact</p>
                  </div>
                )}

                {hasConsultantCert && showScaleExperience && (
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
                                      variant={stepCompletionStatus[step.step] ? "outline" : "teal"}
                                      size="sm"
                                      onClick={() => handleOpenStepDialog(step.step as 1 | 2 | 3)}
                                      className="shrink-0"
                                    >
                                      {stepCompletionStatus[step.step] ? (
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

                {hasConsultantCert && showScaleExperience && (
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
                        {stepCompletionStatus[1] && stepCompletionStatus[2] && stepCompletionStatus[3] && (
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
          setStepCompletionStatus((prev) => ({ ...prev, [activeStep]: true }));
        }}
      />
    </div>
  );
};

export default Certificates;

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  ArrowLeft,
  Zap,
  Target,
  Rocket,
  GraduationCap,
  Handshake,
  TrendingUp,
  Play,
  Clock,
  Award,
  Shield,
  UserCheck,
  Wifi,
  BarChart3,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InitiatorQuizDialog } from "@/components/learning/InitiatorQuizDialog";
import { CoBuilderQuizDialog } from "@/components/learning/CoBuilderQuizDialog";
import { FinanceQuizDialog } from "@/components/learning/FinanceQuizDialog";
import { SecurityQuizDialog } from "@/components/learning/SecurityQuizDialog";
import { ConsultantQuizDialog } from "@/components/learning/ConsultantQuizDialog";
import { supabase } from "@/integrations/supabase/client";

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
  { step: 1, title: "Ideation", subtitle: "Vision & Market", icon: Lightbulb, description: "Transform your idea into a clear vision. Define your target market and validate the problem you're solving.", details: ["Define your startup vision and mission", "Identify target market and customer segments", "Validate problem-solution fit"], color: "from-amber-500 to-orange-600" },
  { step: 2, title: "Structuring", subtitle: "Business Model", icon: Target, description: "Build the foundation of your business model. Define value proposition, revenue streams, and key resources.", details: ["Develop your business model canvas", "Define value proposition", "Plan revenue streams and pricing"], color: "from-orange-500 to-red-500" },
  { step: 3, title: "Team Building", subtitle: "Co-Builder Recruitment", icon: Users, description: "Identify the roles you need and learn how to attract and onboard co-builders for your venture.", details: ["Define critical roles needed", "Create compelling role descriptions", "Master co-builder onboarding"], color: "from-red-500 to-pink-500" },
  { step: 4, title: "Launch", subtitle: "Execution", icon: Rocket, description: "Execute your plan and launch your venture. Learn how to iterate based on feedback and scale.", details: ["Create execution roadmap", "Launch and gather feedback", "Iterate and improve"], color: "from-pink-500 to-purple-500" },
];

const FINANCE_STEPS: JourneyStep[] = [
  { step: 1, title: "Fundamentals & Practice", subtitle: "Finance Foundations", icon: BookOpen, description: "Master core principles of corporate finance. Read financial statements and make informed decisions.", details: ["Financial Statements (Balance Sheet, Income, Cash Flow)", "Basic Ratios & Metrics (Liquidity, Profitability, Solvency)", "Cash vs Profit — why cash is king", "Finance mindset for decision-making"], color: "from-emerald-500 to-teal-500" },
  { step: 2, title: "Budgeting & Forecasting", subtitle: "Resource Planning", icon: Briefcase, description: "Plan and allocate resources effectively. Forecast, budget, and control financial outcomes.", details: ["Operating budgets and departmental allocation", "Capital budgeting — ROI, NPV basics", "Variance analysis — actual vs planned"], color: "from-blue-500 to-indigo-500" },
  { step: 3, title: "Financial Decision-Making", subtitle: "Strategic Finance", icon: TrendingUp, description: "Use finance to make better business decisions. Drive decisions with data and analysis.", details: ["Cost-benefit analysis", "Break-even & contribution margin", "Investment appraisal — ROI, payback period"], color: "from-violet-500 to-purple-500" },
  { step: 4, title: "Metrics, KPIs & Reporting", subtitle: "Performance Tracking", icon: Target, description: "Track performance and communicate financial insights. Interpret metrics and advise others.", details: ["Key Performance Indicators selection", "Dashboard creation for stakeholders", "Financial communication to non-finance peers"], color: "from-rose-500 to-pink-500" },
];

const SECURITY_STEPS: JourneyStep[] = [
  { step: 1, title: "Security Fundamentals & Awareness", subtitle: "Foundations", icon: Shield, description: "Master the basics of cybersecurity and risk awareness. Build a security mindset and learn to protect yourself.", details: ["Security mindset — think like a defender", "Common threats: phishing, social engineering, malware", "Basic protections: strong passwords, 2FA, safe browsing", "Principles: least privilege, need-to-know access"], color: "from-red-500 to-orange-500" },
  { step: 2, title: "Device & Network Security", subtitle: "Infrastructure", icon: Wifi, description: "Protect your devices, networks, and data. Learn to secure your digital environment.", details: ["Device security: OS updates, antivirus, firewalls", "Network security: secure Wi-Fi, VPN usage", "Data protection: backups, encryption, secure sharing"], color: "from-blue-500 to-indigo-500" },
  { step: 3, title: "Application & Behavioral Security", subtitle: "Daily Habits", icon: UserCheck, description: "Integrate security practices into daily workflow. Act securely instinctively.", details: ["Safe collaboration and file sharing", "Social engineering awareness and defense", "Incident reporting and security culture"], color: "from-violet-500 to-purple-500" },
  { step: 4, title: "Metrics, Monitoring & Leadership", subtitle: "Leadership", icon: BarChart3, description: "Track, monitor, and guide security in your environment. Lead by example.", details: ["Security metrics and KPIs", "Monitoring, alerts, and log interpretation", "Security leadership and peer education"], color: "from-rose-500 to-pink-500" },
];

const COBUILDER_STEPS: JourneyStep[] = [
  { step: 1, title: "Practice", subtitle: "Fundamentals", icon: BookOpen, description: "Master the B4 methodology and core practices. Build your foundation as a valuable team contributor.", details: ["Learn core B4 methodology", "Complete self-assessment", "Practice fundamental skills"], color: "from-teal-500 to-cyan-500" },
  { step: 2, title: "Train", subtitle: "Portfolio Building", icon: GraduationCap, description: "Develop your skills through case studies and real-world projects. Build a portfolio that showcases your expertise.", details: ["Complete case study exercises", "Build your project portfolio", "Receive peer reviews"], color: "from-cyan-500 to-blue-500" },
  { step: 3, title: "Consult", subtitle: "Advisory Roles", icon: Handshake, description: "Elevate to advisory and mentoring roles. Guide other co-builders and contribute at a strategic level.", details: ["Mentor junior co-builders", "Provide strategic guidance", "Prepare for certification"], color: "from-blue-500 to-indigo-500" },
];

const CONSULTANT_STEPS: JourneyStep[] = [
  { step: 1, title: "Consulting Basics", subtitle: "Foundations", icon: BookOpen, description: "Learn the fundamentals of consulting. Understand client needs, project scoping, and engagement models.", details: ["Master consulting frameworks", "Learn client engagement", "Understand project scoping"], color: "from-purple-500 to-violet-500" },
  { step: 2, title: "Strategic Thinking", subtitle: "Strategy", icon: Target, description: "Develop strategic thinking capabilities. Analyze complex problems and create actionable solutions.", details: ["Strategic analysis methods", "Problem-solving frameworks", "Solution development"], color: "from-violet-500 to-purple-600" },
  { step: 3, title: "Client Relations", subtitle: "Advisory", icon: Handshake, description: "Build strong client relationships. Communicate effectively and manage stakeholder expectations.", details: ["Client relationship management", "Stakeholder communication", "Expectation management"], color: "from-purple-600 to-fuchsia-500" },
  { step: 4, title: "Thought Leadership", subtitle: "Leadership", icon: TrendingUp, description: "Establish yourself as a thought leader. Create content, speak at events, and build your personal brand.", details: ["Content creation", "Speaking engagements", "Personal brand building"], color: "from-fuchsia-500 to-pink-500" },
];

type ActiveSection = "initiator" | "cobuilder" | "finance" | "security" | "consultant";

const SECTION_STEPS: Record<ActiveSection, JourneyStep[]> = {
  initiator: INITIATOR_STEPS,
  cobuilder: COBUILDER_STEPS,
  finance: FINANCE_STEPS,
  security: SECURITY_STEPS,
  consultant: CONSULTANT_STEPS,
};

const SECTION_INFO: Record<ActiveSection, { title: string; description: string; icon: any; color: string; outcome: string }> = {
  initiator: { title: "Learn to be an Initiator", description: "Transform ideas into ventures. 4 steps to certification.", icon: Lightbulb, color: "from-amber-500 to-orange-600", outcome: "You become a certified Initiator — ready to lead ventures, build teams, and turn ideas into reality." },
  cobuilder: { title: "Learn to be a Co-Builder", description: "Master startup collaboration. 3 steps to certification.", icon: Users, color: "from-teal-500 to-cyan-500", outcome: "You become a certified Co-Builder — ready to contribute meaningfully to startups and build your portfolio." },
  finance: { title: "Learn Finance", description: "Corporate finance literacy. 4 steps to certification.", icon: TrendingUp, color: "from-emerald-500 to-green-600", outcome: "You become a Certified Corporate Finance Professional — confident in reading statements, budgeting, decision-making, and advising others." },
  security: { title: "Learn to Be Secure", description: "Practical security literacy. 4 steps to certification.", icon: Shield, color: "from-red-500 to-orange-500", outcome: "You become a Certified Security Literate Professional — aware of threats, confident in securing devices, able to act securely, and capable of advising peers." },
  consultant: { title: "Learn to be Consultant", description: "Advisory and thought leadership. 4 steps to certification.", icon: Handshake, color: "from-purple-500 to-fuchsia-500", outcome: "You become a Certified Consultant — confident in scoping engagements, structuring analysis, advising clients, and building thought leadership." },
};

const JOURNEY_TYPE: Record<ActiveSection, string> = {
  initiator: "idea_ptc",
  cobuilder: "skill_ptc",
  finance: "finance_literacy",
  security: "security_literacy",
  consultant: "scaling_path",
};

const CERT_TYPE: Record<ActiveSection, string> = {
  initiator: "initiator_b4",
  cobuilder: "cobuilder_b4",
  finance: "finance_literacy",
  security: "security_literacy",
  consultant: "consultant_b4",
};

const JourneyDetail = () => {
  const { section: sectionParam } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const { journeys, phaseResponses, certifications } = useLearningJourneys();

  const validSections: ActiveSection[] = ["initiator", "cobuilder", "finance", "security", "consultant"];
  const activeSection = (validSections.includes(sectionParam as ActiveSection) ? sectionParam : "initiator") as ActiveSection;

  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [cobuilderQuizOpen, setCobuilderQuizOpen] = useState(false);
  const [financeQuizOpen, setFinanceQuizOpen] = useState(false);
  const [securityQuizOpen, setSecurityQuizOpen] = useState(false);
  const [consultantQuizOpen, setConsultantQuizOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [stepCompletionStatus, setStepCompletionStatus] = useState<Record<number, boolean>>({});

  // Talent Foundation gate for consultant
  const [talentFoundationSet, setTalentFoundationSet] = useState(false);
  useEffect(() => {
    if (!user) { setTalentFoundationSet(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: nr }, { data: dec }, { data: prof }] = await Promise.all([
        supabase.from("natural_roles").select("description").eq("user_id", user.id).maybeSingle(),
        supabase.from("nr_decoder_submissions").select("status").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles")
          .select("professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications")
          .eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const filled = (v: any) => v !== null && v !== undefined && String(v).trim().length > 0;
      const p: any = prof || {};
      const resumeDone = Boolean(
        filled(p.professional_title) && filled(p.bio) && filled(p.summary_statement) &&
        filled(p.primary_skills) && filled(p.key_projects) && filled(p.education_certifications) &&
        p.years_of_experience !== null && p.years_of_experience !== undefined
      );
      const onboardingDone = !!onboardingState?.onboarding_completed && (onboardingState?.current_step ?? 0) >= 5;
      setTalentFoundationSet(onboardingDone && !!nr?.description && !!dec && resumeDone);
    })();
    return () => { cancelled = true; };
  }, [user, onboardingState]);

  const activeSteps = SECTION_STEPS[activeSection];
  const sectionInfo = SECTION_INFO[activeSection];

  const journey = journeys.find(j => j.journey_type === JOURNEY_TYPE[activeSection]);
  const isSectionCertified = certifications.some(c => c.certification_type === CERT_TYPE[activeSection]);
  const isJourneyPendingApproval = journey?.status === "pending_approval";
  const completedPhasesCount = journey
    ? phaseResponses.filter(pr => pr.journey_id === journey.id && pr.is_completed).length
    : 0;
  const isAllStepsCompleted = journey ? completedPhasesCount >= activeSteps.length : false;
  const shouldShowPendingBanner = isAllStepsCompleted || isJourneyPendingApproval;

  const isStepCompletedFromDB = (stepNumber: number): boolean => {
    if (!journey) return false;
    const phaseNumber = stepNumber - 1;
    return phaseResponses.some(pr => pr.journey_id === journey.id && pr.phase_number === phaseNumber && pr.is_completed);
  };
  const isStepCompleted = (stepNumber: number) => !!stepCompletionStatus[stepNumber] || isStepCompletedFromDB(stepNumber);

  const getStepResponses = (stepNumber: number): Record<string, any> | null => {
    if (!journey) return null;
    const phaseNumber = stepNumber - 1;
    const pr = phaseResponses.find(p => p.journey_id === journey.id && p.phase_number === phaseNumber);
    return pr?.responses || null;
  };

  const handleOpenStep = (stepNum: number) => {
    if (isSectionCertified) return;
    setSelectedStep(stepNum);
    if (activeSection === "initiator") setQuizDialogOpen(true);
    else if (activeSection === "cobuilder") setCobuilderQuizOpen(true);
    else if (activeSection === "finance") setFinanceQuizOpen(true);
    else if (activeSection === "security") setSecurityQuizOpen(true);
    else if (activeSection === "consultant") setConsultantQuizOpen(true);
  };

  const handleStepComplete = (stepNumber: number) => {
    setStepCompletionStatus(prev => ({ ...prev, [stepNumber]: true }));
  };

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
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
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Learning Journey</h1>
                <p className="text-muted-foreground mb-8">Please log in to access your learning journey.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  // Consultant lock
  if (activeSection === "consultant" && !talentFoundationSet) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 max-w-2xl text-center">
                <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                <h1 className="font-display text-2xl font-bold text-foreground mb-2">Consultant Path Locked</h1>
                <p className="text-muted-foreground mb-6">Unlocks after Talent Foundation is complete (onboarding, NR decoder, professional track, resume).</p>
                <Button variant="outline" onClick={() => navigate("/journey")}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Certifications
                </Button>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="pt-20">
          {/* Hero */}
          <section className={`py-10 md:py-14 bg-gradient-to-br ${sectionInfo.color} text-white`}>
            <div className="container mx-auto px-4">
              <button
                onClick={() => navigate("/journey")}
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> All Certifications
              </button>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-sm shrink-0">
                  <sectionInfo.icon className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-2xl md:text-4xl font-bold mb-2">{sectionInfo.title}</h1>
                  <p className="text-white/85 max-w-2xl">{sectionInfo.description}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-10 md:py-12">
            <div className="container max-w-5xl mx-auto px-4">
              <div className="space-y-8">
                {/* Certified Banner */}
                {isSectionCertified && (
                  <Alert className="border-b4-teal/50 bg-teal-50 dark:bg-teal-950/30">
                    <div className="flex flex-col sm:flex-row items-start justify-between w-full gap-3">
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
                      {activeSection === "initiator" && (
                        <Button onClick={() => navigate("/create-idea")} className="bg-b4-teal hover:bg-b4-teal/90 text-white shrink-0">
                          Add Idea
                        </Button>
                      )}
                      {activeSection === "cobuilder" && (
                        <Button onClick={() => navigate("/opportunities?tab=startup")} className="bg-b4-teal hover:bg-b4-teal/90 text-white shrink-0">
                          Co Build a Venture
                        </Button>
                      )}
                    </div>
                  </Alert>
                )}

                {!isSectionCertified && shouldShowPendingBanner && (
                  <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
                      Journey Completed - Pending Review
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      Congratulations! You have completed all the steps for this journey. An admin will review your answers and approve your certification, or get back to you with feedback.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Journey Steps */}
                <div className="relative">
                  <div
                    className={`absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b ${sectionInfo.color} hidden md:block`}
                    style={{ transform: "translateX(-50%)" }}
                  />
                  <div className="space-y-6">
                    {activeSteps.map((step, index) => (
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
                              <div className="flex-1 space-y-3 min-w-0">
                                <div>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      Step {step.step}
                                    </span>
                                    <Badge variant="outline" className="text-xs">{step.subtitle}</Badge>
                                    {isSectionCertified && (
                                      <Badge className="bg-b4-teal text-white text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Certified
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="text-lg font-display font-bold text-foreground">{step.title}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">{step.description}</p>

                                {!isSectionCertified && (
                                  <ul className="space-y-2">
                                    {step.details.map((detail, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <span className="text-muted-foreground">{detail}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {isSectionCertified && getStepResponses(step.step) && (
                                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <h4 className="text-sm font-semibold text-foreground mb-3">Your Submitted Answers</h4>
                                    <div className="space-y-4">
                                      {Object.entries(getStepResponses(step.step) || {}).map(([key, value]) => {
                                        const quizData = typeof value === "object" && value !== null ? value as Record<string, any> : null;
                                        const question = quizData?.question || key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
                                        const answer = quizData?.answer;
                                        const isCorrect = quizData?.isCorrect;
                                        const formatAnswer = (ans: any): string => {
                                          if (Array.isArray(ans)) return ans.join(" → ");
                                          if (typeof ans === "string") return ans;
                                          return String(ans);
                                        };
                                        const displayAnswer = quizData ? formatAnswer(answer) : (typeof value === "string" ? value : JSON.stringify(value));
                                        return (
                                          <div key={key} className="text-sm border-b border-border/30 pb-3 last:border-0 last:pb-0">
                                            <p className="text-foreground font-medium mb-2">{question}</p>
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

                                {!isSectionCertified && (
                                  <div className="pt-2">
                                    <Button
                                      variant={isStepCompleted(step.step) ? "outline" : "teal"}
                                      size="sm"
                                      onClick={() => handleOpenStep(step.step)}
                                      className="w-full sm:w-auto"
                                    >
                                      {isStepCompleted(step.step) ? (
                                        <><CheckCircle className="w-4 h-4 mr-1" />Review</>
                                      ) : (
                                        <><Play className="w-4 h-4 mr-1" />Begin</>
                                      )}
                                    </Button>
                                  </div>
                                )}

                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outcome */}
                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${sectionInfo.color}`}>
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-2">The Outcome</h3>
                        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
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

      <InitiatorQuizDialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen} stepNumber={selectedStep} onComplete={handleStepComplete} />
      <CoBuilderQuizDialog open={cobuilderQuizOpen} onOpenChange={setCobuilderQuizOpen} stepNumber={selectedStep} onComplete={handleStepComplete} />
      <FinanceQuizDialog open={financeQuizOpen} onOpenChange={setFinanceQuizOpen} stepNumber={selectedStep} onComplete={handleStepComplete} />
      <SecurityQuizDialog open={securityQuizOpen} onOpenChange={setSecurityQuizOpen} stepNumber={selectedStep} onComplete={handleStepComplete} />
      <ConsultantQuizDialog open={consultantQuizOpen} onOpenChange={setConsultantQuizOpen} stepNumber={selectedStep} onComplete={handleStepComplete} />
    </div>
  );
};

export default JourneyDetail;

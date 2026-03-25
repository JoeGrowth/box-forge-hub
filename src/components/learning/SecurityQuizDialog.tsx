import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Shield,
  Wifi,
  UserCheck,
  BarChart3,
  Award,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Quiz {
  id: string;
  type: "multiple-choice" | "scenario" | "self-assessment" | "skill-practice" | "case-study" | "reflection";
  question: string;
  scenario?: string;
  options?: { label: string; value: string }[];
  correctAnswer?: string;
  placeholder?: string;
  sliders?: { label: string; id: string }[];
}

interface StepContent {
  step: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  learningGoal: string;
  endState: string;
  concepts: { title: string; description: string }[];
  quizzes: Quiz[];
}

const SECURITY_STEP_CONTENT: StepContent[] = [
  {
    step: 1,
    title: "Security Fundamentals & Awareness",
    subtitle: "Step 1",
    icon: Shield,
    color: "from-red-500 to-orange-500",
    learningGoal: "From \"I ignore security\" → \"I understand basic security risks and safe behaviors.\"",
    endState: "Foundations Set ✅",
    concepts: [
      {
        title: "Security Mindset",
        description: "Think like a defender, not a victim. Security is everyone's responsibility. Risk ≠ fear, it = informed action. Every user is a potential attack surface.",
      },
      {
        title: "Common Threats",
        description: "Phishing, social engineering, malware, weak passwords. Understand how attacks happen in real scenarios — most breaches start with human error, not technical exploits.",
      },
      {
        title: "Basic Protections",
        description: "Strong passwords & password managers, 2FA / MFA, safe browsing & email hygiene. These simple habits prevent the vast majority of common attacks.",
      },
      {
        title: "Security Principles",
        description: "Least privilege — only grant access that's needed. Need-to-know access — limit information sharing. Keep systems updated — patches fix known vulnerabilities.",
      },
    ],
    quizzes: [
      {
        id: "s1a",
        type: "multiple-choice",
        question: "Which of the following is the most secure password practice?",
        options: [
          { label: "Reusing passwords for all accounts", value: "A" },
          { label: "Using long, unique passphrases and a password manager", value: "B" },
          { label: "Writing passwords on sticky notes", value: "C" },
          { label: "Using \"password123\"", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "s1b",
        type: "scenario",
        scenario: "You receive an email from IT asking for your password to \"fix your account.\"",
        question: "What is the most appropriate action?",
        options: [
          { label: "Reply immediately", value: "A" },
          { label: "Click the link and enter password", value: "B" },
          { label: "Report the email to IT/security", value: "C" },
          { label: "Ignore it", value: "D" },
        ],
        correctAnswer: "C",
      },
      {
        id: "s1c",
        type: "self-assessment",
        question: "Rate your current security awareness:",
        sliders: [
          { label: "Password strength habits", id: "password_habits" },
          { label: "Awareness of phishing attempts", id: "phishing_awareness" },
          { label: "Comfort with reporting suspicious activity", id: "reporting_comfort" },
          { label: "Personal risk behavior", id: "risk_behavior" },
        ],
      },
      {
        id: "s1d",
        type: "skill-practice",
        question: "Identify 3 improvements you could make today to secure your digital accounts. For each improvement, explain why it matters and how you would implement it.",
        placeholder: "Improvement 1:\n- What: ...\n- Why it matters: ...\n- How to implement: ...\n\nImprovement 2:\n- What: ...\n- Why it matters: ...\n- How to implement: ...\n\nImprovement 3:\n- What: ...\n- Why it matters: ...\n- How to implement: ...",
      },
    ],
  },
  {
    step: 2,
    title: "Device & Network Security",
    subtitle: "Step 2",
    icon: Wifi,
    color: "from-blue-500 to-indigo-500",
    learningGoal: "From \"I'm vulnerable\" → \"I know how to secure my devices and communications.\"",
    endState: "Device & Network Secured 🔒",
    concepts: [
      {
        title: "Device Security",
        description: "OS updates, antivirus, firewalls — your first line of defense. Physical security of laptops/devices matters too. An unlocked device is an open door.",
      },
      {
        title: "Network Security",
        description: "Secure Wi-Fi, VPN usage for public networks. Public Wi-Fi is inherently risky — never access sensitive data without encryption. Use WPA3 at home.",
      },
      {
        title: "Data Protection",
        description: "Backups, encryption, secure file sharing. Understand the difference between sensitive and public data. Encrypt at rest and in transit. The 3-2-1 backup rule saves careers.",
      },
    ],
    quizzes: [
      {
        id: "s2a",
        type: "case-study",
        scenario: "A colleague uses public Wi-Fi at a coffee shop to access sensitive company data without a VPN.",
        question: "Identify the risks involved and propose at least 3 mitigation steps that should be taken.",
        placeholder: "Risks identified:\n1. ...\n2. ...\n3. ...\n\nMitigation steps:\n1. ...\n2. ...\n3. ...",
      },
      {
        id: "s2b",
        type: "skill-practice",
        question: "Create a device security checklist: list at least 5 actions to configure a device for maximum security. Include VPN setup and backup strategy.",
        placeholder: "Device Security Checklist:\n\n1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n\nVPN Strategy:\n...\n\nBackup Strategy:\n...",
      },
      {
        id: "s2c",
        type: "reflection",
        question: "What changes did you make (or would you make) to secure your devices and network? How would you educate a colleague about these practices?",
        placeholder: "Changes I made/would make:\n...\n\nHow I would educate a colleague:\n...",
      },
    ],
  },
  {
    step: 3,
    title: "Application & Behavioral Security",
    subtitle: "Step 3",
    icon: UserCheck,
    color: "from-violet-500 to-purple-500",
    learningGoal: "From \"I follow rules\" → \"I act securely instinctively.\"",
    endState: "Behavioral Security Habit Activated 🛡️",
    concepts: [
      {
        title: "Safe Collaboration",
        description: "Secure sharing of files & communications. Identifying risky apps or links. Use approved tools, verify before clicking, and encrypt sensitive documents before sharing.",
      },
      {
        title: "Social Engineering Awareness",
        description: "Recognizing manipulation attempts — urgency, authority, and emotional triggers are red flags. Responding safely to unusual requests by verifying through separate channels.",
      },
      {
        title: "Incident Reporting",
        description: "How to escalate suspicious activity quickly and effectively. Creating a security-conscious culture where reporting is encouraged, not punished.",
      },
    ],
    quizzes: [
      {
        id: "s3a",
        type: "scenario",
        scenario: "A co-worker sends a link to a free tool for work. You suspect it might be phishing.",
        question: "What's your response?",
        options: [
          { label: "Click and download", value: "A" },
          { label: "Forward to friends", value: "B" },
          { label: "Verify with IT/security team before accessing", value: "C" },
          { label: "Ignore and delete", value: "D" },
        ],
        correctAnswer: "C",
      },
      {
        id: "s3b",
        type: "skill-practice",
        question: "Write an email to your team explaining a phishing attempt you caught and what actions everyone should take to stay safe.",
        placeholder: "Subject: Security Alert — Phishing Attempt Detected\n\nTeam,\n\nWhat happened:\n...\n\nHow I identified it:\n...\n\nWhat you should do:\n1. ...\n2. ...\n3. ...\n\nStay safe,\n[Your name]",
      },
      {
        id: "s3c",
        type: "reflection",
        question: "List 3 security habits you will consistently follow in the next 14 days. For each, describe the habit and how you'll track your compliance.",
        placeholder: "Habit 1:\n- Description: ...\n- How I'll track it: ...\n\nHabit 2:\n- Description: ...\n- How I'll track it: ...\n\nHabit 3:\n- Description: ...\n- How I'll track it: ...",
      },
    ],
  },
  {
    step: 4,
    title: "Metrics, Monitoring & Leadership",
    subtitle: "Step 4",
    icon: BarChart3,
    color: "from-rose-500 to-pink-500",
    learningGoal: "From \"I follow guidance\" → \"I advise and lead security practices.\"",
    endState: "Security Leadership Unlocked 🚀",
    concepts: [
      {
        title: "Security Metrics",
        description: "Incident rate, phishing click rate, patch compliance, time-to-detect. These KPIs tell the story of your organization's security posture and where to focus efforts.",
      },
      {
        title: "Monitoring & Alerts",
        description: "How to interpret logs, reports, and dashboards. Security monitoring is about patterns, not individual events. Set thresholds, automate alerts, and investigate anomalies.",
      },
      {
        title: "Security Leadership",
        description: "Educating peers, promoting security policies, and responding to incidents effectively. A security leader makes everyone around them more secure.",
      },
    ],
    quizzes: [
      {
        id: "s4a",
        type: "scenario",
        scenario: "Your team has a phishing click rate of 25%. Management wants to reduce it to under 5% within 6 months.",
        question: "Which KPI and approach is most effective to track phishing susceptibility?",
        options: [
          { label: "Track total emails received — block more spam", value: "A" },
          { label: "Track phishing simulation click rates + targeted training for repeat clickers", value: "B" },
          { label: "Ban all external emails", value: "C" },
          { label: "Fire employees who click phishing links", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "s4b",
        type: "skill-practice",
        question: "Create a security dashboard with 3 key metrics and recommended actions for each. For each metric:\n1. Name the metric\n2. Define how it's measured\n3. What insight it provides\n4. Action to take if it trends negatively",
        placeholder: "Metric 1:\n- Name: ...\n- Measurement: ...\n- Insight: ...\n- Action if negative: ...\n\nMetric 2:\n- Name: ...\n- Measurement: ...\n- Insight: ...\n- Action if negative: ...\n\nMetric 3:\n- Name: ...\n- Measurement: ...\n- Insight: ...\n- Action if negative: ...",
      },
      {
        id: "s4c",
        type: "reflection",
        question: "How would you improve security awareness and compliance in your team or organization? This is your certification gate — demonstrate your ability to lead security practices.",
        placeholder: "Current state assessment:\n...\n\nProposed improvements:\n1. ...\n2. ...\n3. ...\n\nImplementation plan:\n...\n\nExpected impact:\n...",
      },
    ],
  },
];

interface SecurityQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  onComplete: (stepNumber: number) => void;
}

export function SecurityQuizDialog({
  open,
  onOpenChange,
  stepNumber,
  onComplete,
}: SecurityQuizDialogProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"learning" | "quiz">("learning");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | Record<string, number>>>({});
  const [showResult, setShowResult] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  const stepContent = SECURITY_STEP_CONTENT.find((s) => s.step === stepNumber);

  useEffect(() => {
    const getOrCreateJourney = async () => {
      if (!user || !open) return;

      const { data: existing } = await supabase
        .from("learning_journeys")
        .select("id")
        .eq("user_id", user.id)
        .eq("journey_type", "security_literacy" as any)
        .maybeSingle();

      if (existing) {
        setJourneyId(existing.id);
      } else {
        const { data: newJourney, error } = await supabase
          .from("learning_journeys")
          .insert({
            user_id: user.id,
            journey_type: "security_literacy" as any,
            status: "in_progress",
            current_phase: 0,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!error && newJourney) {
          setJourneyId(newJourney.id);
        }
      }
    };

    getOrCreateJourney();
  }, [user, open]);

  if (!stepContent) return null;

  const currentQuiz = stepContent.quizzes[currentQuizIndex];
  const totalQuizzes = stepContent.quizzes.length;
  const progress = phase === "learning" ? 0 : ((currentQuizIndex + 1) / totalQuizzes) * 100;

  const handleStartQuiz = () => {
    setPhase("quiz");
    setCurrentQuizIndex(0);
    setAnswers({});
    setShowResult(false);
    setSliderValues({});
  };

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: value }));
  };

  const handleTextAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: value }));
  };

  const handleSliderChange = (sliderId: string, value: number[]) => {
    const newSliderValues = { ...sliderValues, [sliderId]: value[0] };
    setSliderValues(newSliderValues);
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: newSliderValues }));
  };

  const handleCheckAnswer = () => {
    setShowResult(true);
  };

  const handleNextQuiz = () => {
    setShowResult(false);
    if (currentQuizIndex < totalQuizzes - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      handleCompleteStep();
    }
  };

  const handleCompleteStep = async () => {
    if (!user || !journeyId) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedResponses: Record<string, any> = {};
      stepContent.quizzes.forEach((quiz) => {
        const answer = answers[quiz.id];
        formattedResponses[`quiz_${quiz.id}`] = {
          question: quiz.question,
          type: quiz.type,
          answer: quiz.type === "self-assessment" ? sliderValues : answer,
          isCorrect: quiz.correctAnswer ? answers[quiz.id] === quiz.correctAnswer : null,
        };
      });

      await supabase
        .from("journey_phase_responses")
        .upsert({
          journey_id: journeyId,
          user_id: user.id,
          phase_number: stepNumber - 1,
          phase_name: stepContent.title,
          responses: formattedResponses,
          completed_tasks: [`step_${stepNumber}_quizzes_completed`],
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "journey_id,phase_number",
          ignoreDuplicates: false,
        });

      const { data: allPhases } = await supabase
        .from("journey_phase_responses")
        .select("phase_number, is_completed")
        .eq("journey_id", journeyId);

      const completedPhases = new Set((allPhases || []).filter(p => p.is_completed).map(p => p.phase_number));
      completedPhases.add(stepNumber - 1);
      const canSubmitForApproval = [0, 1, 2, 3].every(p => completedPhases.has(p));

      await supabase
        .from("learning_journeys")
        .update({
          current_phase: Math.max(stepNumber, ...[...completedPhases]),
          status: canSubmitForApproval ? "pending_approval" : "in_progress",
          completed_at: canSubmitForApproval ? new Date().toISOString() : null,
        })
        .eq("id", journeyId);

      onComplete(stepNumber);
      toast.success(`Step ${stepNumber} completed!`, {
        description: canSubmitForApproval
          ? "Your Security journey has been submitted for approval! 🎓"
          : "Great progress! Complete all 4 steps to earn your certification.",
      });
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error("Failed to save progress:", error);
      toast.error("Failed to save progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setPhase("learning");
    setCurrentQuizIndex(0);
    setAnswers({});
    setShowResult(false);
    setSliderValues({});
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const canProceed = () => {
    if (!currentQuiz) return false;
    if (currentQuiz.type === "self-assessment") {
      return Object.keys(sliderValues).length === (currentQuiz.sliders?.length || 0);
    }
    if (["reflection", "skill-practice", "case-study"].includes(currentQuiz.type)) {
      const answer = answers[currentQuiz.id] as string;
      return answer && answer.trim().length >= 20;
    }
    return !!answers[currentQuiz.id];
  };

  const StepIcon = stepContent.icon;

  const renderQuizContent = () => {
    if (!currentQuiz) return null;

    switch (currentQuiz.type) {
      case "multiple-choice":
      case "scenario":
        return (
          <div className="space-y-4">
            {currentQuiz.scenario && (
              <Card className="bg-muted/50 border-border/50">
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground italic">{currentQuiz.scenario}</p>
                </CardContent>
              </Card>
            )}
            <h4 className="font-medium text-foreground">{currentQuiz.question}</h4>
            <RadioGroup
              value={answers[currentQuiz.id] as string || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
              disabled={showResult}
            >
              {currentQuiz.options?.map((option) => {
                const isSelected = answers[currentQuiz.id] === option.value;
                const isCorrect = option.value === currentQuiz.correctAnswer;
                const showCorrectness = showResult;

                return (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      showCorrectness
                        ? isCorrect
                          ? "border-green-500 bg-green-500/10"
                          : isSelected
                          ? "border-red-500 bg-red-500/10"
                          : "border-border"
                        : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={`${currentQuiz.id}-${option.value}`} />
                    <Label htmlFor={`${currentQuiz.id}-${option.value}`} className="flex-1 cursor-pointer">
                      {option.label}
                    </Label>
                    {showCorrectness && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {showCorrectness && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case "self-assessment":
        return (
          <div className="space-y-6">
            <h4 className="font-medium text-foreground">{currentQuiz.question}</h4>
            <p className="text-sm text-muted-foreground">Security Awareness Snapshot — rate from 1 (low) to 10 (high)</p>
            {currentQuiz.sliders?.map((slider) => (
              <div key={slider.id} className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">{slider.label}</Label>
                  <span className="text-sm font-medium text-primary">
                    {sliderValues[slider.id] || 5}/10
                  </span>
                </div>
                <Slider
                  value={[sliderValues[slider.id] || 5]}
                  onValueChange={(value) => handleSliderChange(slider.id, value)}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
            ))}
          </div>
        );

      case "skill-practice":
      case "case-study":
      case "reflection":
        return (
          <div className="space-y-4">
            {currentQuiz.scenario && (
              <Card className="bg-muted/50 border-border/50">
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground italic whitespace-pre-line">{currentQuiz.scenario}</p>
                </CardContent>
              </Card>
            )}
            <h4 className="font-medium text-foreground whitespace-pre-line">{currentQuiz.question}</h4>
            <Textarea
              value={(answers[currentQuiz.id] as string) || ""}
              onChange={(e) => handleTextAnswer(e.target.value)}
              placeholder={currentQuiz.placeholder}
              className="min-h-[180px]"
            />
            <p className="text-xs text-muted-foreground">Minimum 20 characters required</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${stepContent.color}`}>
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-display">
                {stepContent.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Learn to Be Secure — {stepContent.subtitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        {phase === "quiz" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Question {currentQuizIndex + 1} of {totalQuizzes}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {phase === "learning" ? (
          <div className="space-y-6">
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">UX Intent</Badge>
                  <p className="text-sm text-muted-foreground italic">{stepContent.learningGoal}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Educational Material
              </h3>
              {stepContent.concepts.map((concept, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-foreground mb-1">{i + 1}. {concept.title}</h4>
                    <p className="text-sm text-muted-foreground">{concept.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={handleStartQuiz} className="w-full" variant="teal">
              Start Quizzes & Practice
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {renderQuizContent()}

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  if (currentQuizIndex > 0) {
                    setCurrentQuizIndex((prev) => prev - 1);
                    setShowResult(false);
                  } else {
                    setPhase("learning");
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentQuiz?.correctAnswer && !showResult ? (
                <Button onClick={handleCheckAnswer} disabled={!canProceed()} variant="teal">
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuiz}
                  disabled={!canProceed() || isSubmitting}
                  variant="teal"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {currentQuizIndex === totalQuizzes - 1 ? (
                    <>
                      Complete Step
                      <Award className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

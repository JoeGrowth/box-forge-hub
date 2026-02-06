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
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Handshake,
  Target,
  TrendingUp,
  Loader2,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Quiz {
  id: string;
  type: "multiple-choice" | "scenario" | "case-analysis" | "framework-application" | "communication-sim" | "content-exercise" | "engagement-plan" | "mastery-scenario" | "mentorship-exercise" | "mini-practice";
  question: string;
  scenario?: string;
  options?: { label: string; value: string }[];
  correctAnswer?: string | string[];
  placeholder?: string;
}

interface StepContent {
  step: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  learningGoal: string;
  concepts: { title: string; description: string }[];
  quizzes: Quiz[];
}

const CONSULTANT_STEP_CONTENT: StepContent[] = [
  {
    step: 1,
    title: "Consulting Basics",
    subtitle: "Foundations",
    icon: BookOpen,
    color: "from-purple-500 to-violet-500",
    learningGoal: "Move from aspiring advisor to prepared for client engagement. Feel competent, structured, and confident.",
    concepts: [
      {
        title: "Consulting Frameworks",
        description: "Common frameworks (MECE, SWOT, 5 Whys, Issue Trees). Use frameworks to structure thinking.",
      },
      {
        title: "Client Engagement Basics",
        description: "Active listening, empathy, trust-building. Understand client context before advising.",
      },
      {
        title: "Project Scoping",
        description: "Define objectives, deliverables, timelines. Clarify responsibilities and expectations.",
      },
    ],
    quizzes: [
      {
        id: "1a",
        type: "multiple-choice",
        question: "Which of the following is key to project scoping?",
        options: [
          { label: "Ignoring client constraints", value: "A" },
          { label: "Defining deliverables and timeline", value: "B" },
          { label: "Only focusing on internal opinions", value: "C" },
          { label: "Copying a competitor project", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "1b",
        type: "scenario",
        scenario: "A client asks for a solution but hasn't defined the problem clearly.",
        question: "What is the best consulting approach?",
        options: [
          { label: "Give them a ready-made solution", value: "A" },
          { label: "Clarify objectives and understand the problem", value: "B" },
          { label: "Delay response until the problem is clear", value: "C" },
          { label: "Provide multiple solutions without context", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "1c",
        type: "mini-practice",
        question: "Draft a short project scope for a hypothetical client engagement. Include:\n• Clear objectives\n• Measurable deliverables\n• Timeline\n• Roles / responsibilities",
        placeholder: "Project Scope:\n\nObjectives:\n\nDeliverables:\n\nTimeline:\n\nRoles & Responsibilities:",
      },
    ],
  },
  {
    step: 2,
    title: "Strategic Thinking",
    subtitle: "Strategy",
    icon: Target,
    color: "from-violet-500 to-purple-600",
    learningGoal: "Move from structured thinking to strategic problem solver. Analyze complex problems and create actionable solutions.",
    concepts: [
      {
        title: "Strategic Analysis Methods",
        description: "SWOT, PESTEL, Porter's Five Forces. Root cause analysis, issue trees.",
      },
      {
        title: "Problem-Solving Frameworks",
        description: "Hypothesis-driven approach. Prioritization techniques.",
      },
      {
        title: "Solution Development",
        description: "Generate options. Evaluate feasibility and impact. Communicate recommendations.",
      },
    ],
    quizzes: [
      {
        id: "2a",
        type: "case-analysis",
        scenario: "A mid-sized e-commerce company is experiencing declining sales despite increasing website traffic. Their conversion rate has dropped 40% over 6 months. The marketing team blames the product team, while product blames UX. The CEO wants a strategic recommendation.",
        question: "Analyze this case:\n1. Identify the core problem\n2. What are the strategic implications?\n3. Provide an actionable recommendation",
        placeholder: "1. Core problem:\n\n2. Strategic implications:\n\n3. Recommendation:",
      },
      {
        id: "2b",
        type: "framework-application",
        scenario: "A food delivery startup wants to expand into a new city. They have limited capital and face two established competitors.",
        question: "Apply 1-2 strategic frameworks (e.g., SWOT, Porter's Five Forces) to analyze this situation and provide your strategic insight.",
        placeholder: "Framework Analysis:\n\nStrategic Insight:",
      },
    ],
  },
  {
    step: 3,
    title: "Client Relations",
    subtitle: "Advisory",
    icon: Handshake,
    color: "from-purple-600 to-fuchsia-500",
    learningGoal: "Move from problem solver to trusted advisor. Build trust, communicate clearly, and manage expectations.",
    concepts: [
      {
        title: "Client Relationship Management",
        description: "Build rapport, understand motivations. Maintain transparency.",
      },
      {
        title: "Stakeholder Communication",
        description: "Adapt style to audience. Regular check-ins.",
      },
      {
        title: "Expectation Management",
        description: "Define scope and constraints. Handle conflicting priorities.",
      },
    ],
    quizzes: [
      {
        id: "3a",
        type: "scenario",
        scenario: "Your client is frustrated with the project progress and sends an angry email questioning your team's competence.",
        question: "What is the best advisory response?",
        options: [
          { label: "Ignore the complaints and continue working", value: "A" },
          { label: "Provide honest status update + next steps", value: "B" },
          { label: "Promise faster delivery to calm them down", value: "C" },
          { label: "Escalate blame to your team", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "3b",
        type: "communication-sim",
        scenario: "You've just completed the first phase of a consulting engagement. The results are mixed – some targets were met, but there are concerns about timeline for phase 2.",
        question: "Draft a short email or update to the client. Focus on:\n• Clarity\n• Empathy\n• Actionable next steps",
        placeholder: "Subject: Project Update - Phase 1 Complete\n\nDear [Client],\n\n",
      },
    ],
  },
  {
    step: 4,
    title: "Thought Leadership",
    subtitle: "Leadership",
    icon: TrendingUp,
    color: "from-fuchsia-500 to-pink-500",
    learningGoal: "Move from trusted advisor to visible influencer. Build influence, share insights, and establish personal brand.",
    concepts: [
      {
        title: "Thought Leadership",
        description: "Publish insights, speak at events, lead workshops. Share unique perspectives.",
      },
      {
        title: "Personal Brand",
        description: "Reputation = credibility × visibility. Leverage networks and social platforms.",
      },
      {
        title: "Leading Consulting Engagements",
        description: "Guide junior co-builders. Influence without authority.",
      },
    ],
    quizzes: [
      {
        id: "4a",
        type: "content-exercise",
        question: "Draft a short article or LinkedIn post sharing insights from your consulting experience.\n\nScoring criteria:\n• Relevance (+2)\n• Clarity (+2)\n• Engagement potential (+1)",
        placeholder: "Title:\n\nContent:\n\nKey takeaway:",
      },
      {
        id: "4b",
        type: "engagement-plan",
        question: "Draft a plan to host a learning session or workshop for co-builders in your domain.\n\nInclude:\n• Clear goal\n• Structure/agenda\n• Value to audience",
        placeholder: "Workshop Plan:\n\nGoal:\n\nAgenda:\n\nValue proposition:",
      },
    ],
  },
  {
    step: 5,
    title: "Expert Consultant",
    subtitle: "Mastery",
    icon: GraduationCap,
    color: "from-pink-500 to-rose-500",
    learningGoal: "Achieve mastery as a consultant. Lead complex projects and mentor the next generation of consultants.",
    concepts: [
      {
        title: "Leading Complex Projects",
        description: "Multi-stakeholder coordination. Risk management. Strategic decision-making.",
      },
      {
        title: "Mentoring Other Consultants",
        description: "Coaching skills. Knowledge transfer. Building consultant capability.",
      },
      {
        title: "Expert Certification",
        description: "Demonstrated success in high-impact engagements. Recognized expertise.",
      },
    ],
    quizzes: [
      {
        id: "5a",
        type: "mastery-scenario",
        scenario: "You're leading a complex consulting engagement with multiple stakeholders. The CEO wants rapid results, the CFO is concerned about costs, and the operations team is resistant to change. A major decision is needed this week, but priorities conflict.",
        question: "How would you handle this situation?\n\nScoring:\n• Prioritize based on impact (+2)\n• Delegate tasks strategically (+2)\n• Communicate decisions clearly (+1)",
        placeholder: "My approach:\n\n1. Prioritization:\n\n2. Delegation strategy:\n\n3. Communication plan:",
      },
      {
        id: "5b",
        type: "mentorship-exercise",
        scenario: "A junior consultant on your team messages you: 'I'm working on my first solo client project and feeling overwhelmed. The client keeps changing requirements, and I'm not sure how to push back without damaging the relationship. Any advice?'",
        question: "Draft advice for this junior consultant. Focus on:\n• Guidance clarity (+2)\n• Empowerment (+2)\n• Strategic insight (+1)",
        placeholder: "Dear [Consultant],\n\n",
      },
    ],
  },
];

interface ConsultantQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  onComplete: (stepNumber: number) => void;
}

export function ConsultantQuizDialog({
  open,
  onOpenChange,
  stepNumber,
  onComplete,
}: ConsultantQuizDialogProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"learning" | "quiz">("learning");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  const stepContent = CONSULTANT_STEP_CONTENT.find((s) => s.step === stepNumber);
  
  // Get or create journey when dialog opens (using scaling_path for consultant)
  useEffect(() => {
    const getOrCreateJourney = async () => {
      if (!user || !open) return;
      
      // Check for existing journey
      const { data: existing } = await supabase
        .from("learning_journeys")
        .select("id")
        .eq("user_id", user.id)
        .eq("journey_type", "scaling_path")
        .maybeSingle();
      
      if (existing) {
        setJourneyId(existing.id);
      } else {
        // Create new journey
        const { data: newJourney, error } = await supabase
          .from("learning_journeys")
          .insert({
            user_id: user.id,
            journey_type: "scaling_path",
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
  };

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: value }));
  };

  const handleTextAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: value }));
  };

  const checkAnswer = () => {
    if (!currentQuiz.correctAnswer) return true;
    const userAnswer = answers[currentQuiz.id];
    return userAnswer === currentQuiz.correctAnswer;
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
      // Format responses for storage
      const formattedResponses: Record<string, any> = {};
      stepContent.quizzes.forEach((quiz) => {
        const answer = answers[quiz.id];
        formattedResponses[`quiz_${quiz.id}`] = {
          question: quiz.question,
          type: quiz.type,
          answer: answer,
          isCorrect: quiz.correctAnswer ? checkAnswer() : null,
        };
      });
      
      // Upsert phase response
      await supabase
        .from("journey_phase_responses")
        .upsert({
          journey_id: journeyId,
          user_id: user.id,
          phase_number: stepNumber - 1, // 0-indexed
          phase_name: stepContent.title,
          responses: formattedResponses,
          completed_tasks: [`step_${stepNumber}_quizzes_completed`],
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "journey_id,phase_number",
          ignoreDuplicates: false,
        });
      
      // Check if ALL phases are now completed (non-sequential: any step can be last)
      const { data: allPhases } = await supabase
        .from("journey_phase_responses")
        .select("phase_number, is_completed")
        .eq("journey_id", journeyId);
      
      const completedPhases = new Set((allPhases || []).filter(p => p.is_completed).map(p => p.phase_number));
      completedPhases.add(stepNumber - 1);
      const canSubmitForApproval = [0, 1, 2, 3, 4].every(p => completedPhases.has(p));
      
      await supabase
        .from("learning_journeys")
        .update({
          current_phase: Math.max(stepNumber - 1, ...[...completedPhases]),
          status: canSubmitForApproval ? "pending_approval" : "in_progress",
          completed_at: canSubmitForApproval ? new Date().toISOString() : null,
        })
        .eq("id", journeyId);
      
      onComplete(stepNumber);
      toast.success(`Step ${stepNumber} completed!`, {
        description: canSubmitForApproval 
          ? "Your Consultant journey has been submitted for approval! 🎓" 
          : "Great progress! Complete all steps to submit for approval.",
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
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const canProceed = () => {
    if (!currentQuiz) return false;
    
    if (["mini-practice", "case-analysis", "framework-application", "communication-sim", "content-exercise", "engagement-plan", "mastery-scenario", "mentorship-exercise"].includes(currentQuiz.type)) {
      const answer = answers[currentQuiz.id] as string;
      return answer && answer.trim().length >= 20;
    }
    
    return !!answers[currentQuiz.id];
  };

  const StepIcon = stepContent.icon;

  const getQuizTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      "multiple-choice": "Knowledge Check",
      "scenario": "Scenario-Based",
      "case-analysis": "Case Analysis",
      "framework-application": "Framework Application",
      "communication-sim": "Communication Simulation",
      "content-exercise": "Content Exercise",
      "engagement-plan": "Engagement Plan",
      "mastery-scenario": "Mastery Scenario",
      "mentorship-exercise": "Mentorship Exercise",
      "mini-practice": "Mini-Practice",
    };
    return labels[type] || "Quiz";
  };

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
              value={answers[currentQuiz.id] || ""}
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
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                      {option.label}
                    </Label>
                    {showCorrectness && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {showCorrectness && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case "case-analysis":
      case "framework-application":
      case "communication-sim":
      case "content-exercise":
      case "engagement-plan":
      case "mastery-scenario":
      case "mentorship-exercise":
      case "mini-practice":
        return (
          <div className="space-y-4">
            {currentQuiz.scenario && (
              <Card className="bg-muted/50 border-border/50">
                <CardContent className="pt-4">
                  <p className="text-sm text-foreground whitespace-pre-line">{currentQuiz.scenario}</p>
                </CardContent>
              </Card>
            )}
            <h4 className="font-medium text-foreground whitespace-pre-line">{currentQuiz.question}</h4>
            <Textarea
              value={answers[currentQuiz.id] || ""}
              onChange={(e) => handleTextAnswer(e.target.value)}
              placeholder={currentQuiz.placeholder}
              className="min-h-[180px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters required. Be thoughtful and specific.
            </p>
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
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${stepContent.color}`}>
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <Badge variant="outline" className="mb-1">
                Step {stepContent.step} of 5
              </Badge>
              <DialogTitle className="text-xl font-display">
                {stepContent.title}
              </DialogTitle>
            </div>
          </div>
          {phase === "quiz" && (
            <Progress value={progress} className="h-2 mt-2" />
          )}
        </DialogHeader>

        {phase === "learning" ? (
          <div className="space-y-6">
            {/* Learning Goal */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border-purple-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Learning Goal</h4>
                    <p className="text-sm text-muted-foreground">{stepContent.learningGoal}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Core Concepts */}
            <div>
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Core Concepts
              </h4>
              <div className="space-y-3">
                {stepContent.concepts.map((concept, index) => (
                  <Card key={index} className="border-border/50">
                    <CardContent className="pt-4">
                      <h5 className="font-medium text-foreground mb-1">{concept.title}</h5>
                      <p className="text-sm text-muted-foreground">{concept.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Start Quiz Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleStartQuiz} className="gap-2">
                Start Quizzes
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quiz Header */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                Quiz {currentQuizIndex + 1} of {totalQuizzes}
              </Badge>
              <Badge variant="outline">
                {getQuizTypeLabel(currentQuiz.type)}
              </Badge>
            </div>

            {/* Quiz Content */}
            {renderQuizContent()}

            {/* Result Feedback */}
            {showResult && currentQuiz.correctAnswer && (
              <Card className={checkAnswer() ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {checkAnswer() ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-green-600">Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-600">
                          Not quite. The correct answer is highlighted above.
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentQuizIndex > 0) {
                    setCurrentQuizIndex((prev) => prev - 1);
                    setShowResult(false);
                  } else {
                    setPhase("learning");
                  }
                }}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {!showResult ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  {currentQuiz.correctAnswer ? "Check Answer" : "Submit"}
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuiz}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentQuizIndex < totalQuizzes - 1 ? (
                    <>
                      Next Quiz
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Complete Step
                      <CheckCircle2 className="w-4 h-4" />
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

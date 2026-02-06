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
  GraduationCap,
  Handshake,
  Award,
  Loader2,
  Zap,
  Users,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Quiz {
  id: string;
  type: "multiple-choice" | "scenario" | "fill-blank" | "true-false" | "self-assessment" | "skill-practice" | "case-study" | "portfolio-task" | "peer-review" | "advisory-scenario" | "mentorship-sim" | "reflection";
  question: string;
  scenario?: string;
  options?: { label: string; value: string }[];
  correctAnswer?: string | string[];
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
  concepts: { title: string; description: string }[];
  principles?: { title: string; description: string }[];
  quizzes: Quiz[];
}

const COBUILDER_STEP_CONTENT: StepContent[] = [
  {
    step: 1,
    title: "Fundamentals & Practice",
    subtitle: "Step 1",
    icon: BookOpen,
    color: "from-teal-500 to-cyan-500",
    learningGoal: "Move from 'I want to help startups' to 'I understand how I create value and collaborate.'",
    concepts: [
      {
        title: "Learning by Doing",
        description: "Skills are built through action → reflection → iteration. Mistakes are signals, not failures.",
      },
      {
        title: "Natural Role",
        description: "People contribute best when aligned with strengths, motivation, and energy. Roles evolve; titles don't define value.",
      },
      {
        title: "Go-to-Work vs Desk Work",
        description: "Real startups > simulated exercises. Output > theory. Contribution > credentials.",
      },
    ],
    principles: [
      {
        title: "Equity-Based Contribution",
        description: "Value = contribution × commitment × impact",
      },
      {
        title: "Talent-Centered",
        description: "Everyone brings unique leverage to the table",
      },
      {
        title: "Multi-Dimensional Growth",
        description: "Personal, professional, social, and venture growth",
      },
    ],
    quizzes: [
      {
        id: "1a",
        type: "multiple-choice",
        question: "Which best reflects 'Learning by Doing'?",
        options: [
          { label: "Completing courses before acting", value: "A" },
          { label: "Acting, reflecting, and iterating", value: "B" },
          { label: "Studying frameworks deeply", value: "C" },
          { label: "Avoiding mistakes", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "1b",
        type: "scenario",
        scenario: "You join a startup but are unsure of your role.",
        question: "What is the most B4-aligned action?",
        options: [
          { label: "Wait for instructions", value: "A" },
          { label: "Propose value and test contribution", value: "B" },
          { label: "Ask for a title", value: "C" },
          { label: "Step back", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "1c",
        type: "self-assessment",
        question: "Complete your Natural Role Snapshot by rating your preferences:",
        sliders: [
          { label: "Energy: Solo work ↔ Collaborative work", id: "energy" },
          { label: "Skills: Technical ↔ People-oriented", id: "skills" },
          { label: "Risk: Conservative ↔ Risk-taking", id: "risk" },
          { label: "Contribution: Execution ↔ Strategy", id: "contribution" },
        ],
      },
      {
        id: "1d",
        type: "skill-practice",
        question: "Describe one real contribution you could make to a startup in the next 14 days.",
        placeholder: "Be specific about what you would do, how you would do it, and what outcome you expect...",
      },
    ],
  },
  {
    step: 2,
    title: "Portfolio Building & Training",
    subtitle: "Step 2",
    icon: GraduationCap,
    color: "from-cyan-500 to-blue-500",
    learningGoal: "Move from potential to demonstrated capability. Prove your value through real work.",
    concepts: [
      {
        title: "Portfolio > CV",
        description: "Evidence beats claims. Outcomes beat intentions.",
      },
      {
        title: "Case-Based Learning",
        description: "Real problems, context matters, trade-offs are expected.",
      },
      {
        title: "Peer Collaboration",
        description: "Feedback loops, shared standards, collective intelligence.",
      },
    ],
    quizzes: [
      {
        id: "2a",
        type: "case-study",
        scenario: "A SaaS startup is struggling with customer churn. They have a great product but users stop using it after the first month. The team is small (3 people) and focused on building new features.",
        question: "As a co-builder joining this team, identify:\n1. The core problem\n2. Your potential contribution\n3. Key trade-offs to consider",
        placeholder: "1. Core problem: ...\n\n2. My contribution: ...\n\n3. Trade-offs: ...",
      },
      {
        id: "2b",
        type: "portfolio-task",
        question: "Create a portfolio entry for a project you've worked on (real or simulated). Include:\n• Context - What was the situation?\n• Role - What was your specific contribution?\n• Output - What did you deliver?\n• Learning - What did you learn?",
        placeholder: "Context:\n\nRole:\n\nOutput:\n\nLearning:",
      },
      {
        id: "2c",
        type: "peer-review",
        scenario: "A fellow co-builder submitted this portfolio entry:\n\n'I helped a startup with their marketing. I made some social media posts and helped with the website. It went well and they liked it.'",
        question: "Provide constructive feedback. Include:\n• One strength you see\n• One specific improvement suggestion",
        placeholder: "Strength:\n\nImprovement suggestion:",
      },
    ],
  },
  {
    step: 3,
    title: "Advisory Roles & Consulting",
    subtitle: "Step 3",
    icon: Handshake,
    color: "from-blue-500 to-indigo-500",
    learningGoal: "Move from doing work to guiding others. Become a multiplier, not just a contributor.",
    concepts: [
      {
        title: "Advisory vs Execution",
        description: "Advisors see patterns, reduce risk, improve decisions. Not authority, but influence.",
      },
      {
        title: "Mentorship Mindset",
        description: "Ask before telling. Enable autonomy. Feedback, not control.",
      },
      {
        title: "Strategic Contribution",
        description: "Focus on leverage, system thinking, long-term impact.",
      },
    ],
    quizzes: [
      {
        id: "3a",
        type: "advisory-scenario",
        scenario: "A junior co-builder is stuck on a task but wants validation rather than help.",
        question: "What is the best response?",
        options: [
          { label: "Give them the answer", value: "A" },
          { label: "Ask guiding questions", value: "B" },
          { label: "Escalate to initiator", value: "C" },
          { label: "Take over the task", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "3b",
        type: "mentorship-sim",
        scenario: "A new co-builder messages you: 'I've been with the startup for 2 weeks but I still don't feel like I'm adding value. The team seems busy and I don't want to bother them. Should I just wait for someone to assign me work?'",
        question: "Write your advisory response. Focus on empowerment, clarity, and strategic thinking.",
        placeholder: "Your response...",
      },
      {
        id: "3c",
        type: "reflection",
        question: "How will you contribute to the B4 ecosystem as a certified Co-Builder? Consider your intent, alignment with B4 principles, and community mindset.",
        placeholder: "My contribution to the B4 ecosystem...",
      },
    ],
  },
];

interface CoBuilderQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  onComplete: (stepNumber: number) => void;
}

export function CoBuilderQuizDialog({
  open,
  onOpenChange,
  stepNumber,
  onComplete,
}: CoBuilderQuizDialogProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"learning" | "quiz">("learning");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | Record<string, number>>>({});
  const [showResult, setShowResult] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  const stepContent = COBUILDER_STEP_CONTENT.find((s) => s.step === stepNumber);
  
  // Get or create journey when dialog opens
  useEffect(() => {
    const getOrCreateJourney = async () => {
      if (!user || !open) return;
      
      // Check for existing journey
      const { data: existing } = await supabase
        .from("learning_journeys")
        .select("id")
        .eq("user_id", user.id)
        .eq("journey_type", "skill_ptc")
        .maybeSingle();
      
      if (existing) {
        setJourneyId(existing.id);
      } else {
        // Create new journey
        const { data: newJourney, error } = await supabase
          .from("learning_journeys")
          .insert({
            user_id: user.id,
            journey_type: "skill_ptc",
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

  const checkAnswer = () => {
    if (!currentQuiz.correctAnswer) return true; // No correct answer for text-based quizzes
    
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
          answer: quiz.type === "self-assessment" 
            ? sliderValues 
            : answer,
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
      completedPhases.add(stepNumber - 1); // Include the one just saved
      const canSubmitForApproval = [0, 1, 2].every(p => completedPhases.has(p));
      
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
          ? "Your Co-Builder journey has been submitted for approval! 🎓" 
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
    
    if (["fill-blank", "reflection", "skill-practice", "case-study", "portfolio-task", "peer-review", "mentorship-sim"].includes(currentQuiz.type)) {
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
      case "advisory-scenario":
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

      case "self-assessment":
        return (
          <div className="space-y-6">
            <h4 className="font-medium text-foreground">{currentQuiz.question}</h4>
            <div className="space-y-6">
              {currentQuiz.sliders?.map((slider) => (
                <div key={slider.id} className="space-y-3">
                  <Label className="text-sm text-muted-foreground">{slider.label}</Label>
                  <div className="px-2">
                    <Slider
                      value={[sliderValues[slider.id] || 50]}
                      onValueChange={(value) => handleSliderChange(slider.id, value)}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0</span>
                      <span className="font-medium text-foreground">{sliderValues[slider.id] || 50}</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Card className="bg-teal-500/10 border-teal-500/20">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> There are no right or wrong answers here. 
                  This assessment helps you understand your natural contribution style.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "case-study":
      case "portfolio-task":
      case "peer-review":
      case "mentorship-sim":
      case "skill-practice":
      case "reflection":
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
              value={(answers[currentQuiz.id] as string) || ""}
              onChange={(e) => handleTextAnswer(e.target.value)}
              placeholder={currentQuiz.placeholder}
              className="min-h-[160px] resize-none"
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
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${stepContent.color}`}>
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display">
                {stepContent.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{stepContent.subtitle}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        {phase === "quiz" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Quiz {currentQuizIndex + 1} of {totalQuizzes}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {phase === "learning" ? (
          // Learning Phase
          <div className="space-y-6">
            {/* Learning Goal */}
            <Card className="border-teal-500/20 bg-teal-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Learning Goal</h4>
                    <p className="text-sm text-muted-foreground">{stepContent.learningGoal}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Core Concepts */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-500" />
                Core B4 Concepts
              </h4>
              <div className="grid gap-3">
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

            {/* B4 Principles (Step 1 only) */}
            {stepContent.principles && (
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-500" />
                  B4 Core Principles
                </h4>
                <div className="grid gap-2">
                  {stepContent.principles.map((principle, index) => (
                    <Card key={index} className="border-cyan-500/20 bg-cyan-500/5">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-cyan-500" />
                          <div>
                            <span className="font-medium text-foreground">{principle.title}</span>
                            <span className="text-muted-foreground"> — {principle.description}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Start Quiz Button */}
            <Button 
              onClick={handleStartQuiz} 
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              size="lg"
            >
              Start Quizzes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          // Quiz Phase
          <div className="space-y-6">
            {/* Quiz Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentQuiz.type === "multiple-choice" && "Knowledge Check"}
                {currentQuiz.type === "scenario" && "Judgment Assessment"}
                {currentQuiz.type === "self-assessment" && "Self-Assessment"}
                {currentQuiz.type === "skill-practice" && "Skill Practice"}
                {currentQuiz.type === "case-study" && "Case Study Analysis"}
                {currentQuiz.type === "portfolio-task" && "Portfolio Task"}
                {currentQuiz.type === "peer-review" && "Peer Review Exercise"}
                {currentQuiz.type === "advisory-scenario" && "Advisory Judgment"}
                {currentQuiz.type === "mentorship-sim" && "Mentorship Simulation"}
                {currentQuiz.type === "reflection" && "Certification Reflection"}
              </Badge>
              {currentQuiz.type === "self-assessment" && (
                <Badge variant="secondary" className="text-xs">No right/wrong answers</Badge>
              )}
            </div>

            {/* Quiz Content */}
            {renderQuizContent()}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
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

              {!showResult && currentQuiz.correctAnswer ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={!canProceed()}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                >
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuiz}
                  disabled={!canProceed() || isSubmitting}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : currentQuizIndex === totalQuizzes - 1 ? (
                    <>
                      <Award className="w-4 h-4 mr-2" />
                      Complete Step
                    </>
                  ) : (
                    <>
                      Next Quiz
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Result Feedback */}
            {showResult && currentQuiz.correctAnswer && (
              <Card className={`${checkAnswer() ? "border-green-500 bg-green-500/10" : "border-amber-500 bg-amber-500/10"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {checkAnswer() ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <h4 className={`font-medium ${checkAnswer() ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                        {checkAnswer() ? "Correct!" : "Not quite right"}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {checkAnswer() 
                          ? "Great understanding of B4 principles!" 
                          : "The B4-aligned approach focuses on proactive contribution and value creation. Review the answer and continue."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

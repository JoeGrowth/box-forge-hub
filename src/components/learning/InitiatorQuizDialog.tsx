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
  Lightbulb,
  Target,
  Users,
  Rocket,
  BookOpen,
  Award,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Quiz {
  id: string;
  type: "multiple-choice" | "scenario" | "fill-blank" | "true-false" | "matching" | "ordering" | "reflection";
  question: string;
  scenario?: string;
  options?: { label: string; value: string }[];
  correctAnswer?: string | string[];
  matchingPairs?: { left: string; right: string }[];
  orderItems?: string[];
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

const INITIATOR_STEP_CONTENT: StepContent[] = [
  {
    step: 1,
    title: "Vision & Market Ideation",
    subtitle: "Step 1",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600",
    learningGoal: "Move from a vague idea to a clear problem, customer, and vision. Feel clarity and confidence.",
    concepts: [
      {
        title: "Vision vs Idea",
        description: "Idea = what you want to build. Vision = the change you want to create in the world.",
      },
      {
        title: "Problem-First Thinking",
        description: "Great startups solve painful, frequent, and expensive problems.",
      },
      {
        title: "Target Market & Segmentation",
        description: "Who feels the problem most? Identify your ideal customer segment.",
      },
      {
        title: "Problem-Solution Fit",
        description: "Evidence > assumptions. Validate before you build.",
      },
    ],
    quizzes: [
      {
        id: "1a",
        type: "multiple-choice",
        question: "Which statement best defines a startup vision?",
        options: [
          { label: "A detailed product roadmap", value: "A" },
          { label: "A description of the company's revenue model", value: "B" },
          { label: "A clear statement of the change you want to create for a specific group", value: "C" },
          { label: "A list of features", value: "D" },
        ],
        correctAnswer: "C",
      },
      {
        id: "1b",
        type: "scenario",
        scenario: "You want to build an app for \"busy people who want to be healthy.\"",
        question: "What is the biggest issue with this target market?",
        options: [
          { label: "Too small", value: "A" },
          { label: "Too broad", value: "B" },
          { label: "Too expensive", value: "C" },
          { label: "Too technical", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "1c",
        type: "fill-blank",
        question: "Complete the customer problem statement:",
        placeholder: "Our target customer is __________ who struggles with __________ because __________.",
      },
    ],
  },
  {
    step: 2,
    title: "Business Model Structuring",
    subtitle: "Step 2",
    icon: Target,
    color: "from-orange-500 to-red-500",
    learningGoal: "Understand how your venture works as a system, not just an idea.",
    concepts: [
      {
        title: "Business Model ≠ Business Plan",
        description: "A business model describes how you create, deliver, and capture value.",
      },
      {
        title: "Value Proposition",
        description: "Functional, emotional, and economic benefits you offer to customers.",
      },
      {
        title: "Revenue Streams",
        description: "Subscription, transaction, licensing, freemium - how you make money.",
      },
      {
        title: "Business Model Canvas",
        description: "A visual framework to map all key elements of your business.",
      },
    ],
    quizzes: [
      {
        id: "2a",
        type: "matching",
        question: "Match each business model element to its description:",
        matchingPairs: [
          { left: "Value Proposition", right: "Why customers choose you" },
          { left: "Revenue Streams", right: "How you make money" },
          { left: "Key Resources", right: "What you must have to operate" },
        ],
      },
      {
        id: "2b",
        type: "scenario",
        scenario: "A startup charges restaurants a monthly fee to manage reservations.",
        question: "What is the primary revenue model?",
        options: [
          { label: "Transaction-based", value: "A" },
          { label: "Subscription", value: "B" },
          { label: "Advertising", value: "C" },
          { label: "Licensing", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "2c",
        type: "fill-blank",
        question: "Write your value proposition statement:",
        placeholder: "We help [customer] achieve [outcome] by [solution] unlike [alternative].",
      },
    ],
  },
  {
    step: 3,
    title: "Co-Builder Recruitment & Team Building",
    subtitle: "Step 3",
    icon: Users,
    color: "from-red-500 to-pink-500",
    learningGoal: "Shift from solo thinker to venture leader. Build your founding team.",
    concepts: [
      {
        title: "Co-founder ≠ Employee",
        description: "Co-founders share ownership, risk, and decision-making power.",
      },
      {
        title: "Skill Balance vs Idea Ownership",
        description: "Build a team with complementary skills, not just people who agree with you.",
      },
      {
        title: "Equity vs Salary Trade-offs",
        description: "Early team members often trade lower salary for equity upside.",
      },
      {
        title: "Culture Starts on Day One",
        description: "The founding team sets the culture for everyone who follows.",
      },
    ],
    quizzes: [
      {
        id: "3a",
        type: "true-false",
        question: "A co-founder should always have equal equity.",
        options: [
          { label: "True", value: "true" },
          { label: "False", value: "false" },
        ],
        correctAnswer: "false",
      },
      {
        id: "3b",
        type: "scenario",
        scenario: "A candidate has strong skills but doesn't believe in your vision.",
        question: "What's the best decision?",
        options: [
          { label: "Hire anyway", value: "A" },
          { label: "Offer less equity", value: "B" },
          { label: "Delay decision", value: "C" },
          { label: "Do not onboard", value: "D" },
        ],
        correctAnswer: "D",
      },
      {
        id: "3c",
        type: "fill-blank",
        question: "Define one critical role you need for your venture:",
        placeholder: "Role name: __________\nCore responsibilities: __________\nSuccess metric (first 90 days): __________",
      },
    ],
  },
  {
    step: 4,
    title: "Execution & Launch",
    subtitle: "Step 4",
    icon: Rocket,
    color: "from-pink-500 to-purple-500",
    learningGoal: "Become action-oriented and feedback-driven. Launch your venture.",
    concepts: [
      {
        title: "Execution > Perfection",
        description: "Done is better than perfect. Ship early, learn fast.",
      },
      {
        title: "MVP Thinking",
        description: "Build the smallest thing that delivers value and validates your hypothesis.",
      },
      {
        title: "Build → Measure → Learn",
        description: "The core feedback loop of lean startup methodology.",
      },
      {
        title: "Launch Metrics",
        description: "Track adoption, retention, and feedback quality - not vanity metrics.",
      },
    ],
    quizzes: [
      {
        id: "4a",
        type: "ordering",
        question: "Put the steps in the correct order:",
        orderItems: ["Gather feedback", "Launch MVP", "Iterate", "Build MVP"],
        correctAnswer: ["Build MVP", "Launch MVP", "Gather feedback", "Iterate"],
      },
      {
        id: "4b",
        type: "multiple-choice",
        question: "Which metric best validates early traction?",
        options: [
          { label: "Website visits", value: "A" },
          { label: "Social media likes", value: "B" },
          { label: "Repeat usage", value: "C" },
          { label: "Logo design quality", value: "D" },
        ],
        correctAnswer: "C",
      },
      {
        id: "4c",
        type: "reflection",
        question: "What is the next action you will take in the next 7 days to move your venture forward?",
        placeholder: "Describe your specific next action...",
      },
    ],
  },
];

interface InitiatorQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  onComplete: (stepNumber: number) => void;
}

export function InitiatorQuizDialog({
  open,
  onOpenChange,
  stepNumber,
  onComplete,
}: InitiatorQuizDialogProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"learning" | "quiz">("learning");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [orderItems, setOrderItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  const stepContent = INITIATOR_STEP_CONTENT.find((s) => s.step === stepNumber);
  
  // Get or create journey when dialog opens
  useEffect(() => {
    const getOrCreateJourney = async () => {
      if (!user || !open) return;
      
      // Check for existing journey
      const { data: existing } = await supabase
        .from("learning_journeys")
        .select("id")
        .eq("user_id", user.id)
        .eq("journey_type", "idea_ptc")
        .maybeSingle();
      
      if (existing) {
        setJourneyId(existing.id);
      } else {
        // Create new journey
        const { data: newJourney, error } = await supabase
          .from("learning_journeys")
          .insert({
            user_id: user.id,
            journey_type: "idea_ptc",
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
    setMatchingSelections({});
    if (currentQuiz?.orderItems) {
      setOrderItems([...currentQuiz.orderItems]);
    }
  };

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: value }));
  };

  const handleTextAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: value }));
  };

  const handleMatchingSelect = (leftItem: string, rightValue: string) => {
    setMatchingSelections((prev) => ({ ...prev, [leftItem]: rightValue }));
  };

  const moveOrderItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...orderItems];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    setOrderItems(newItems);
    setAnswers((prev) => ({ ...prev, [currentQuiz.id]: newItems }));
  };

  const checkAnswer = () => {
    if (!currentQuiz.correctAnswer) return true; // No correct answer for fill-blank/reflection
    
    const userAnswer = answers[currentQuiz.id];
    
    if (currentQuiz.type === "matching") {
      // Check if all matching pairs are correct
      return stepContent.quizzes[currentQuizIndex].matchingPairs?.every(
        (pair) => matchingSelections[pair.left] === pair.right
      );
    }
    
    if (currentQuiz.type === "ordering") {
      const correctOrder = currentQuiz.correctAnswer as string[];
      return JSON.stringify(orderItems) === JSON.stringify(correctOrder);
    }
    
    return userAnswer === currentQuiz.correctAnswer;
  };

  const handleCheckAnswer = () => {
    setShowResult(true);
  };

  const handleNextQuiz = () => {
    setShowResult(false);
    
    if (currentQuizIndex < totalQuizzes - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
      const nextQuiz = stepContent.quizzes[currentQuizIndex + 1];
      if (nextQuiz?.orderItems) {
        setOrderItems([...nextQuiz.orderItems]);
      }
    } else {
      // All quizzes completed
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
          answer: quiz.type === "matching" 
            ? matchingSelections 
            : quiz.type === "ordering" 
              ? orderItems 
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
      
      // Update journey current phase
      const isLastStep = stepNumber === 4;
      await supabase
        .from("learning_journeys")
        .update({
          current_phase: stepNumber,
          status: isLastStep ? "pending_approval" : "in_progress",
          completed_at: isLastStep ? new Date().toISOString() : null,
        })
        .eq("id", journeyId);
      
      onComplete(stepNumber);
      toast.success(`Step ${stepNumber} completed!`, {
        description: isLastStep 
          ? "Your Initiator journey has been submitted for approval!" 
          : "Moving to the next step.",
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
    setMatchingSelections({});
    setOrderItems([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const canProceed = () => {
    if (!currentQuiz) return false;
    
    if (currentQuiz.type === "fill-blank" || currentQuiz.type === "reflection") {
      const answer = answers[currentQuiz.id] as string;
      return answer && answer.trim().length >= 10;
    }
    
    if (currentQuiz.type === "matching") {
      return Object.keys(matchingSelections).length === (currentQuiz.matchingPairs?.length || 0);
    }
    
    if (currentQuiz.type === "ordering") {
      return orderItems.length > 0;
    }
    
    return !!answers[currentQuiz.id];
  };

  const StepIcon = stepContent.icon;

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
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
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
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Core Concepts
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

            {/* Start Quiz Button */}
            <Button 
              onClick={handleStartQuiz} 
              className={`w-full bg-gradient-to-r ${stepContent.color} hover:opacity-90`}
            >
              Start Quiz
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          // Quiz Phase
          <div className="space-y-6">
            {/* Scenario (if present) */}
            {currentQuiz.scenario && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-4">
                  <p className="text-sm italic text-muted-foreground">
                    <strong>Scenario:</strong> {currentQuiz.scenario}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Question */}
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  {currentQuiz.type === "multiple-choice" && "Knowledge Check"}
                  {currentQuiz.type === "scenario" && "Critical Thinking"}
                  {currentQuiz.type === "fill-blank" && "Application"}
                  {currentQuiz.type === "true-false" && "True/False"}
                  {currentQuiz.type === "matching" && "Matching"}
                  {currentQuiz.type === "ordering" && "Ordering"}
                  {currentQuiz.type === "reflection" && "Reflection"}
                </Badge>
              </div>
              <h4 className="text-lg font-medium text-foreground">{currentQuiz.question}</h4>
            </div>

            {/* Answer Options */}
            {(currentQuiz.type === "multiple-choice" || 
              currentQuiz.type === "scenario" || 
              currentQuiz.type === "true-false") && currentQuiz.options && (
              <RadioGroup
                value={answers[currentQuiz.id] as string || ""}
                onValueChange={handleAnswer}
                className="space-y-3"
                disabled={showResult}
              >
                {currentQuiz.options.map((option) => {
                  const isCorrect = showResult && option.value === currentQuiz.correctAnswer;
                  const isWrong = showResult && 
                    answers[currentQuiz.id] === option.value && 
                    option.value !== currentQuiz.correctAnswer;
                  
                  return (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                        isCorrect 
                          ? "border-green-500 bg-green-500/10" 
                          : isWrong 
                            ? "border-red-500 bg-red-500/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label 
                        htmlFor={option.value} 
                        className="flex-1 cursor-pointer text-foreground"
                      >
                        {option.label}
                      </Label>
                      {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {isWrong && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {/* Fill-in-the-blank / Reflection */}
            {(currentQuiz.type === "fill-blank" || currentQuiz.type === "reflection") && (
              <div className="space-y-3">
                <Textarea
                  placeholder={currentQuiz.placeholder}
                  value={(answers[currentQuiz.id] as string) || ""}
                  onChange={(e) => handleTextAnswer(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required
                </p>
              </div>
            )}

            {/* Matching */}
            {currentQuiz.type === "matching" && currentQuiz.matchingPairs && (
              <div className="space-y-4">
                {currentQuiz.matchingPairs.map((pair, index) => {
                  const isCorrect = showResult && matchingSelections[pair.left] === pair.right;
                  const isWrong = showResult && 
                    matchingSelections[pair.left] && 
                    matchingSelections[pair.left] !== pair.right;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        isCorrect 
                          ? "border-green-500 bg-green-500/10" 
                          : isWrong 
                            ? "border-red-500 bg-red-500/10"
                            : "border-border"
                      }`}
                    >
                      <span className="font-medium text-foreground min-w-[140px]">
                        {pair.left}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <select
                        value={matchingSelections[pair.left] || ""}
                        onChange={(e) => handleMatchingSelect(pair.left, e.target.value)}
                        className="flex-1 p-2 rounded-md border border-input bg-background text-foreground"
                        disabled={showResult}
                      >
                        <option value="">Select...</option>
                        {currentQuiz.matchingPairs?.map((p) => (
                          <option key={p.right} value={p.right}>
                            {p.right}
                          </option>
                        ))}
                      </select>
                      {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                      {isWrong && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ordering */}
            {currentQuiz.type === "ordering" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Drag to reorder or use the arrows:
                </p>
                {orderItems.map((item, index) => {
                  const correctOrder = currentQuiz.correctAnswer as string[];
                  const isCorrectPosition = showResult && correctOrder[index] === item;
                  const isWrongPosition = showResult && correctOrder[index] !== item;
                  
                  return (
                    <div
                      key={item}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isCorrectPosition 
                          ? "border-green-500 bg-green-500/10" 
                          : isWrongPosition 
                            ? "border-red-500 bg-red-500/10"
                            : "border-border bg-muted/50"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-foreground">{item}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveOrderItem(index, Math.max(0, index - 1))}
                          disabled={index === 0 || showResult}
                        >
                          <ArrowLeft className="w-4 h-4 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveOrderItem(index, Math.min(orderItems.length - 1, index + 1))}
                          disabled={index === orderItems.length - 1 || showResult}
                        >
                          <ArrowRight className="w-4 h-4 rotate-90" />
                        </Button>
                      </div>
                      {isCorrectPosition && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {isWrongPosition && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  );
                })}
                {showResult && !checkAnswer() && (
                  <p className="text-sm text-muted-foreground">
                    Correct order: {(currentQuiz.correctAnswer as string[]).join(" → ")}
                  </p>
                )}
              </div>
            )}

            {/* Result Feedback */}
            {showResult && currentQuiz.correctAnswer && (
              <Card className={`${checkAnswer() ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {checkAnswer() ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <p className="text-sm text-foreground">
                      {checkAnswer() 
                        ? "Correct! Well done." 
                        : "Not quite right, but that's okay! Learning from mistakes is part of the process."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!showResult ? (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={!canProceed()}
                  className="flex-1"
                >
                  {currentQuiz.type === "fill-blank" || currentQuiz.type === "reflection" 
                    ? "Submit Answer" 
                    : "Check Answer"}
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuiz}
                  disabled={isSubmitting}
                  className={`flex-1 ${
                    currentQuizIndex === totalQuizzes - 1 
                      ? `bg-gradient-to-r ${stepContent.color}` 
                      : ""
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

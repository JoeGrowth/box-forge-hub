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
  BarChart3,
  TrendingUp,
  PieChart,
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

const FINANCE_STEP_CONTENT: StepContent[] = [
  {
    step: 1,
    title: "Fundamentals & Practice",
    subtitle: "Step 1",
    icon: BookOpen,
    color: "from-emerald-500 to-teal-500",
    learningGoal: "From \"I don't understand finance\" → \"I can read financial statements and make informed decisions.\"",
    endState: "Foundations Set ✅",
    concepts: [
      {
        title: "Financial Statements",
        description: "Balance Sheet, Income Statement, Cash Flow — the three core reports. Understand key relationships: Assets = Liabilities + Equity. Revenue flows through to profit, but cash flow tells the real story.",
      },
      {
        title: "Basic Ratios & Metrics",
        description: "Liquidity (current ratio), profitability (net margin), solvency (debt-to-equity). Learn to interpret numbers for decisions, not just calculate them.",
      },
      {
        title: "Cash vs Profit",
        description: "Accounting profit ≠ cash in the bank. Revenue recognition, depreciation, and working capital create gaps. Cash is king — businesses fail from cash shortages, not lack of profit.",
      },
      {
        title: "Finance Mindset",
        description: "Every decision has a financial implication. Think in trade-offs and opportunity costs. Data-driven decisions beat gut feelings when stakes are high.",
      },
    ],
    quizzes: [
      {
        id: "f1a",
        type: "multiple-choice",
        question: "Which of the following best describes cash flow?",
        options: [
          { label: "The company's net income", value: "A" },
          { label: "The movement of cash in and out of the business", value: "B" },
          { label: "Total revenue minus expenses", value: "C" },
          { label: "The company's equity value", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "f1b",
        type: "scenario",
        scenario: "A manager sees strong profit on the income statement but declining cash balance.",
        question: "What is the most appropriate action?",
        options: [
          { label: "Ignore cash, profit is positive", value: "A" },
          { label: "Investigate cash outflows and adjust decisions", value: "B" },
          { label: "Borrow immediately", value: "C" },
          { label: "Cut staff", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "f1c",
        type: "self-assessment",
        question: "Rate your current financial literacy:",
        sliders: [
          { label: "Confidence reading financial statements", id: "statements_confidence" },
          { label: "Understanding of key ratios", id: "ratios_understanding" },
          { label: "Comfort with financial decision-making", id: "decision_comfort" },
          { label: "Risk tolerance in finance", id: "risk_tolerance" },
        ],
      },
      {
        id: "f1d",
        type: "skill-practice",
        question: "Prepare a simple cash flow summary from the following: Starting cash $50,000. Revenue received $30,000. Salaries paid $20,000. Rent paid $5,000. Equipment purchased $10,000. Loan received $15,000.\n\nCalculate ending cash and identify one key decision you would make based on this data.",
        placeholder: "Cash Flow Summary:\n\nStarting Cash: $50,000\nInflows: ...\nOutflows: ...\nEnding Cash: ...\n\nKey Decision: ...",
      },
    ],
  },
  {
    step: 2,
    title: "Budgeting & Forecasting",
    subtitle: "Step 2",
    icon: BarChart3,
    color: "from-blue-500 to-indigo-500",
    learningGoal: "From \"I react to numbers\" → \"I can forecast, budget, and control financial outcomes.\"",
    endState: "Budget Ready 📊",
    concepts: [
      {
        title: "Operating Budgets",
        description: "Revenue planning, expense forecasting, and departmental allocation. A budget is a financial plan that translates strategy into numbers and accountability.",
      },
      {
        title: "Capital Budgeting",
        description: "Evaluating investments using payback period, ROI, and NPV basics. Not all spending is equal — capital investments create long-term value but tie up cash.",
      },
      {
        title: "Variance Analysis",
        description: "Comparing actual results vs planned budget. Favorable and unfavorable variances signal where to investigate. The goal isn't perfection — it's learning and adjusting.",
      },
    ],
    quizzes: [
      {
        id: "f2a",
        type: "case-study",
        scenario: "A department overspent its marketing budget by 40%. Sales increased by only 10%. The CFO wants an explanation.",
        question: "Identify:\n1. The likely cause of overspending\n2. The financial impact on the company\n3. Your recommended corrective action",
        placeholder: "1. Likely cause: ...\n\n2. Financial impact: ...\n\n3. Corrective action: ...",
      },
      {
        id: "f2b",
        type: "skill-practice",
        question: "Create a simple quarterly budget for a 10-person department with the following assumptions:\n- Average salary: $5,000/month per person\n- Office rent: $3,000/month\n- Marketing allocation: 15% of total budget\n- Technology tools: $500/month\n\nPresent your budget breakdown and state your key assumptions.",
        placeholder: "Quarterly Budget:\n\nSalaries: ...\nRent: ...\nMarketing: ...\nTechnology: ...\nTotal: ...\n\nKey Assumptions: ...",
      },
      {
        id: "f2c",
        type: "reflection",
        question: "What is the biggest financial lesson you've learned from this budgeting exercise? How would you apply it in your current or future role?",
        placeholder: "My biggest lesson: ...\n\nHow I would apply it: ...",
      },
    ],
  },
  {
    step: 3,
    title: "Financial Decision-Making",
    subtitle: "Step 3",
    icon: TrendingUp,
    color: "from-violet-500 to-purple-500",
    learningGoal: "From \"I follow reports\" → \"I drive decisions with finance.\"",
    endState: "Decision-Making Ready 💡",
    concepts: [
      {
        title: "Cost-Benefit Analysis",
        description: "Systematically comparing costs and benefits of a decision. Quantify what you can, acknowledge what you can't, and make transparent trade-offs.",
      },
      {
        title: "Break-Even & Contribution Margin",
        description: "How many units must you sell to cover costs? Contribution margin = Revenue - Variable Costs. It tells you how much each sale contributes to covering fixed costs and profit.",
      },
      {
        title: "Investment Appraisal",
        description: "Simple ROI (Return / Investment × 100), payback period (time to recover investment). These tools help you compare alternatives and make go/no-go decisions.",
      },
    ],
    quizzes: [
      {
        id: "f3a",
        type: "scenario",
        scenario: "Launching a new product requires $100,000 upfront investment. Expected annual revenue is $60,000 with $35,000 in annual costs. The company's minimum acceptable ROI is 15%.",
        question: "Should the company proceed with this investment?",
        options: [
          { label: "Yes — ROI exceeds the minimum threshold", value: "A" },
          { label: "Yes — revenue is higher than costs", value: "B" },
          { label: "No — payback period is too long", value: "C" },
          { label: "No — annual profit is below the investment amount", value: "D" },
        ],
        correctAnswer: "A",
      },
      {
        id: "f3b",
        type: "case-study",
        scenario: "You must choose between two projects:\n\nProject A: Investment $50,000, Annual profit $12,000, Payback 4.2 years\nProject B: Investment $80,000, Annual profit $22,000, Payback 3.6 years",
        question: "Which project would you recommend and why? Consider ROI, payback, and risk factors.",
        placeholder: "My recommendation: Project ...\n\nReasoning:\n- ROI comparison: ...\n- Payback analysis: ...\n- Risk considerations: ...",
      },
      {
        id: "f3c",
        type: "reflection",
        question: "Describe one decision you would make differently in your department or career after applying financial decision-making principles. Be specific about the situation, the old approach, and the new approach.",
        placeholder: "Situation: ...\n\nOld approach: ...\n\nNew approach using financial principles: ...\n\nExpected impact: ...",
      },
    ],
  },
  {
    step: 4,
    title: "Metrics, KPIs & Reporting",
    subtitle: "Step 4",
    icon: PieChart,
    color: "from-rose-500 to-pink-500",
    learningGoal: "From \"I track numbers\" → \"I interpret metrics and advise others.\"",
    endState: "Financial Literacy Unlocked 🚀",
    concepts: [
      {
        title: "Key Performance Indicators",
        description: "Profit margin, cash conversion cycle, ROI, customer acquisition cost, lifetime value. KPIs are the vital signs of business health — choose the ones that drive action.",
      },
      {
        title: "Dashboarding",
        description: "Visual reporting that tells a story. Good dashboards answer questions before they're asked. Focus on trends, comparisons, and actionable insights — not data dumps.",
      },
      {
        title: "Financial Communication",
        description: "Presenting financial results to non-finance peers clearly and confidently. Lead with insight, support with data, and always connect numbers to business impact.",
      },
    ],
    quizzes: [
      {
        id: "f4a",
        type: "scenario",
        scenario: "A SaaS company has high revenue growth (40% YoY) but customer churn is increasing (from 5% to 12% monthly). The CEO asks which metric to focus on.",
        question: "Which financial metric is most critical to address first?",
        options: [
          { label: "Revenue growth rate — keep scaling", value: "A" },
          { label: "Customer churn rate — fix retention before scaling", value: "B" },
          { label: "Profit margin — focus on profitability", value: "C" },
          { label: "Customer acquisition cost — reduce spending", value: "D" },
        ],
        correctAnswer: "B",
      },
      {
        id: "f4b",
        type: "skill-practice",
        question: "Create a simple financial dashboard with 3 KPIs for a retail business. For each KPI:\n1. Name the metric\n2. Define how it's calculated\n3. Explain what insight it provides\n4. State what action to take if it trends negatively",
        placeholder: "KPI 1:\n- Metric: ...\n- Calculation: ...\n- Insight: ...\n- Action if negative: ...\n\nKPI 2:\n- Metric: ...\n- Calculation: ...\n- Insight: ...\n- Action if negative: ...\n\nKPI 3:\n- Metric: ...\n- Calculation: ...\n- Insight: ...\n- Action if negative: ...",
      },
      {
        id: "f4c",
        type: "reflection",
        question: "Explain how you would use financial data to guide one strategic decision in your organization. This is your certification gate — demonstrate your ability to connect finance to strategy.",
        placeholder: "Strategic decision: ...\n\nRelevant financial data I would analyze: ...\n\nHow the data informs the decision: ...\n\nExpected business outcome: ...",
      },
    ],
  },
];

interface FinanceQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  onComplete: (stepNumber: number) => void;
}

export function FinanceQuizDialog({
  open,
  onOpenChange,
  stepNumber,
  onComplete,
}: FinanceQuizDialogProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"learning" | "quiz">("learning");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | Record<string, number>>>({});
  const [showResult, setShowResult] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  const stepContent = FINANCE_STEP_CONTENT.find((s) => s.step === stepNumber);

  useEffect(() => {
    const getOrCreateJourney = async () => {
      if (!user || !open) return;

      const { data: existing } = await supabase
        .from("learning_journeys")
        .select("id")
        .eq("user_id", user.id)
        .eq("journey_type", "finance_literacy" as any)
        .maybeSingle();

      if (existing) {
        setJourneyId(existing.id);
      } else {
        const { data: newJourney, error } = await supabase
          .from("learning_journeys")
          .insert({
            user_id: user.id,
            journey_type: "finance_literacy" as any,
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
    if (!currentQuiz.correctAnswer) return true;
    return answers[currentQuiz.id] === currentQuiz.correctAnswer;
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

      // Check if ALL 4 phases are completed
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
          ? "Your Finance journey has been submitted for approval! 🎓"
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
            <p className="text-sm text-muted-foreground">Financial Literacy Snapshot — rate from 1 (low) to 10 (high)</p>
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
                Learn Finance — {stepContent.subtitle}
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
            {/* Learning Goal */}
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 mt-0.5">UX Intent</Badge>
                  <p className="text-sm text-muted-foreground italic">{stepContent.learningGoal}</p>
                </div>
              </CardContent>
            </Card>

            {/* Concepts */}
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

              {currentQuiz.correctAnswer && !showResult ? (
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
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {currentQuizIndex === totalQuizzes - 1 ? (
                    <>
                      <Award className="w-4 h-4 mr-2" />
                      Complete Step
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

            {showResult && currentQuiz.correctAnswer && (
              <Card className={`${checkAnswer() ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {checkAnswer() ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <p className="text-sm font-medium">
                      {checkAnswer() ? "Correct! Well done." : "Not quite. Review the concepts and try to understand why."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* End State Badge */}
        {phase === "learning" && (
          <div className="text-center pt-2">
            <Badge variant="outline" className="text-muted-foreground">
              End state: {stepContent.endState}
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

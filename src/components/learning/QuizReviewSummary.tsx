import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText } from "lucide-react";

interface ReviewQuiz {
  id: string;
  type: string;
  question: string;
  options?: { label: string; value: string }[];
  scenario?: string;
}

interface QuizReviewSummaryProps {
  quizzes: ReviewQuiz[];
  answers: Record<string, any>;
  sliderValues?: Record<string, number>;
  currentIndex?: number;
  onJumpTo?: (index: number) => void;
  title?: string;
}

function formatAnswer(
  quiz: ReviewQuiz,
  answers: Record<string, any>,
  sliderValues?: Record<string, number>
): string {
  if (sliderValues && sliderValues[quiz.id] !== undefined) {
    return `${sliderValues[quiz.id]} / 10`;
  }

  const raw = answers[quiz.id];
  if (raw === undefined || raw === null || raw === "") {
    return "— No answer recorded —";
  }

  const resolveOne = (val: string) => {
    if (quiz.options) {
      const match = quiz.options.find((o) => o.value === val);
      if (match) return match.label;
    }
    return val;
  };

  if (Array.isArray(raw)) {
    return raw.map((v) => resolveOne(String(v))).join(" → ");
  }
  if (typeof raw === "object") {
    return Object.entries(raw)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return resolveOne(String(raw));
}

export function QuizReviewSummary({
  quizzes,
  answers,
  sliderValues,
  currentIndex,
  onJumpTo,
  title = "Your submitted answers",
}: QuizReviewSummaryProps) {
  return (
    <Card className="border-b4-teal/30 bg-b4-teal/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-b4-teal" />
          <h4 className="font-medium text-foreground text-sm">{title}</h4>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {quizzes.length} {quizzes.length === 1 ? "question" : "questions"}
          </Badge>
        </div>

        <ol className="space-y-2">
          {quizzes.map((quiz, index) => {
            const isActive = currentIndex === index;
            const answered =
              (sliderValues && sliderValues[quiz.id] !== undefined) ||
              (answers[quiz.id] !== undefined &&
                answers[quiz.id] !== "" &&
                !(Array.isArray(answers[quiz.id]) &&
                  (answers[quiz.id] as string[]).length === 0));

            return (
              <li key={quiz.id}>
                <button
                  type="button"
                  onClick={() => onJumpTo?.(index)}
                  disabled={!onJumpTo}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    isActive
                      ? "border-b4-teal bg-b4-teal/10"
                      : "border-border/60 bg-background/60 hover:bg-background"
                  } ${onJumpTo ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-b4-teal shrink-0 mt-0.5">
                      Q{index + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-foreground leading-snug">
                        {quiz.question}
                      </p>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            answered ? "text-green-500" : "text-muted-foreground/40"
                          }`}
                        />
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                          {formatAnswer(quiz, answers, sliderValues)}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

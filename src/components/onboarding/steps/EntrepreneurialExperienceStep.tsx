import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle, XCircle, HelpCircle } from "lucide-react";

interface EntrepreneurialExperienceStepProps {
  question: string;
  hasExperience: boolean | null;
  description: string;
  count: string;
  needsHelp: boolean;
  countLabel: string;
  descPlaceholder: string;
  onHasExperienceChange: (val: boolean) => void;
  onDescriptionChange: (val: string) => void;
  onCountChange: (val: string) => void;
  onNeedsHelpChange: (val: boolean) => void;
  onNext: () => void;
}

export const EntrepreneurialExperienceStep = ({
  question,
  hasExperience,
  description,
  count,
  needsHelp,
  countLabel,
  descPlaceholder,
  onHasExperienceChange,
  onDescriptionChange,
  onCountChange,
  onNeedsHelpChange,
  onNext,
}: EntrepreneurialExperienceStepProps) => {
  const canProceed =
    hasExperience === true
      ? description.trim().length > 0 && count.trim().length > 0
      : hasExperience === false;

  return (
    <div className="text-center">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">
        {question}
      </h1>

      {/* Yes / No Selection */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => {
            onHasExperienceChange(true);
            onNeedsHelpChange(false);
          }}
          className={`p-5 rounded-xl border-2 transition-all text-center ${
            hasExperience === true
              ? "border-b4-teal bg-b4-teal/5"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <CheckCircle
            className={`w-6 h-6 mx-auto mb-2 ${
              hasExperience === true ? "text-b4-teal" : "text-muted-foreground"
            }`}
          />
          <div className="font-medium text-foreground">Yes</div>
        </button>
        <button
          type="button"
          onClick={() => {
            onHasExperienceChange(false);
          }}
          className={`p-5 rounded-xl border-2 transition-all text-center ${
            hasExperience === false
              ? "border-b4-teal bg-b4-teal/5"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <XCircle
            className={`w-6 h-6 mx-auto mb-2 ${
              hasExperience === false ? "text-b4-teal" : "text-muted-foreground"
            }`}
          />
          <div className="font-medium text-foreground">No</div>
        </button>
      </div>

      {/* Yes: show description + count */}
      {hasExperience === true && (
        <div className="space-y-5 text-left mb-8 animate-fade-in">
          <div>
            <Label className="mb-2 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={descPlaceholder}
              className="min-h-[100px]"
            />
          </div>
          <div>
            <Label className="mb-2 block">{countLabel}</Label>
            <Input
              type="number"
              min="1"
              max="999"
              value={count}
              onChange={(e) => onCountChange(e.target.value)}
              placeholder="e.g., 3"
              className="max-w-[150px]"
            />
          </div>
        </div>
      )}

      {/* No: ask if they need help */}
      {hasExperience === false && (
        <div className="mb-8 animate-fade-in">
          <button
            type="button"
            onClick={() => onNeedsHelpChange(!needsHelp)}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
              needsHelp
                ? "border-amber-500 bg-amber-500/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <HelpCircle
              className={`w-5 h-5 flex-shrink-0 ${
                needsHelp ? "text-amber-500" : "text-muted-foreground"
              }`}
            />
            <span className="text-sm text-foreground text-left">
              {needsHelp
                ? "We'll connect you with support for this area"
                : "Do you need help with this?"}
            </span>
          </button>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={hasExperience === null}
        size="lg"
        className="w-full"
        variant={canProceed ? "default" : "outline"}
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

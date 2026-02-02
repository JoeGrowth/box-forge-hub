import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, HelpCircle, Check, MessageSquare } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";

interface NaturalRoleDefinitionStepProps {
  onNext: () => void;
  onNeedHelp: () => void;
  showFormDirectly?: boolean;
  onBackToHelp?: () => void;
}

export const NaturalRoleDefinitionStep = ({ onNext, onNeedHelp, showFormDirectly = false, onBackToHelp }: NaturalRoleDefinitionStepProps) => {
  const { naturalRole, updateOnboardingState, updateNaturalRole, sendAdminNotification } = useOnboarding();
  const { toast } = useToast();
  // If user previously had assistance_requested or showFormDirectly is true, show them the description form right away
  const [knowsNR, setKnowsNR] = useState<boolean | null>(
    showFormDirectly || naturalRole?.status === "assistance_requested" ? true : null
  );
  const [description, setDescription] = useState(naturalRole?.description || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleKnowsNR = async () => {
    setKnowsNR(true);
  };

  const handleBackToChoice = () => {
    // If we came from the help screen, go back to help screen
    if (showFormDirectly && onBackToHelp) {
      onBackToHelp();
    } else {
      setKnowsNR(null);
    }
  };

  const handleNeedsHelp = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({ 
        status: "assistance_requested" 
      });
      await sendAdminNotification(
        "nr_help_requested",
        "Natural Role Definition",
        "User needs help defining their Natural Role"
      );
      await updateOnboardingState({ current_step: 2 });
      onNeedHelp();
    } catch (error: any) {
      console.error("Failed to request help:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDescription = async () => {
    if (!description.trim()) return;
    
    setIsLoading(true);
    try {
      await updateNaturalRole({ 
        description: description.trim(),
        status: "defined" 
      });
      await updateOnboardingState({ current_step: 3 });
      
      onNext();
    } catch (error: any) {
      console.error("Failed to save natural role:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (knowsNR === null) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Do you know your Natural Role?
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Your Natural Role is the unique way you create value
        </p>

        <div className="grid gap-4 mb-8">
          <button
            type="button"
            onClick={handleKnowsNR}
            className="p-6 rounded-2xl border-2 border-border hover:border-b4-teal hover:bg-b4-teal/5 transition-all text-left flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-b4-teal/10 text-b4-teal flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg text-foreground">Yes, I know it</div>
              <p className="text-muted-foreground text-sm mt-1">
                I can describe my Natural Role and how I create value
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleNeedsHelp}
            disabled={isLoading}
            className="p-6 rounded-2xl border-2 border-border hover:border-b4-coral hover:bg-b4-coral/5 transition-all text-left flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-b4-coral/10 text-b4-coral flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg text-foreground">
                {isLoading ? "Sending request..." : "No, I need help defining it"}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                I would like guidance to discover my Natural Role
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Describe your Natural Role
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        In one sentence, explain what you do and how you create value
      </p>

      <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-b4-teal flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Example:</p>
            <p className="text-sm text-muted-foreground italic">
              "I hack growth by turning messy ideas into structured, fast processes."
            </p>
          </div>
        </div>
      </div>

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="I create value by..."
        className="min-h-[120px] text-lg mb-6"
        maxLength={500}
      />

      <p className="text-xs text-muted-foreground mb-6 text-right">
        {description.length}/500 characters
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handleBackToChoice}
          className="flex-shrink-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          variant="teal"
          size="lg"
          onClick={handleSubmitDescription}
          disabled={!description.trim() || isLoading}
          className="flex-1"
        >
          {isLoading ? "Saving..." : "Continue to Assessment"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

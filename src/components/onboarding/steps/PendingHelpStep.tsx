import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight, ArrowLeft, HelpCircle, Edit2 } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PendingHelpStepProps {
  onDefineNow?: () => void;
  onBack?: () => void;
}

export const PendingHelpStep = ({ onDefineNow, onBack }: PendingHelpStepProps) => {
  const { updateOnboardingState, updateNaturalRole } = useOnboarding();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinueToProfile = async () => {
    setIsLoading(true);
    try {
      // Mark onboarding as complete but keep assistance_requested status in natural_roles
      // The natural_roles.status = "assistance_requested" is already set
      await updateOnboardingState({ 
        current_step: 8,
        onboarding_completed: true,
        journey_status: "pending_approval" // They still need approval, but have support badge
      });
      
      toast({
        title: "Profile Created",
        description: "You can define your Natural Role anytime from your profile.",
      });
      navigate("/profile", { replace: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDefineNow = async () => {
    setIsLoading(true);
    try {
      // Reset the status so they can define their NR
      await updateNaturalRole({ status: "pending" });
      if (onDefineNow) {
        onDefineNow();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    setIsLoading(true);
    try {
      // Reset the status so they see the choice screen again
      await updateNaturalRole({ status: "pending" });
      if (onBack) {
        onBack();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-b4-coral/10 text-b4-coral flex items-center justify-center mx-auto mb-6">
        <HelpCircle className="w-10 h-10" />
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Need help with your Natural Role?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        No worries! You can continue to your profile and define it later with support, 
        or start defining it now if you're ready.
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-medium text-foreground mb-3">Your options:</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <MessageCircle className="w-4 h-4 mt-0.5 text-b4-teal flex-shrink-0" />
            <span>Continue to your profile with a "Support" badge to get help</span>
          </li>
          <li className="flex items-start gap-2">
            <Edit2 className="w-4 h-4 mt-0.5 text-b4-coral flex-shrink-0" />
            <span>Or define your Natural Role now if you're ready</span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          variant="teal"
          size="lg"
          onClick={handleContinueToProfile}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Continue to Profile"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        
        {onDefineNow && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleDefineNow}
            disabled={isLoading}
            className="w-full"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            I'm ready to define it now
          </Button>
        )}

        {onBack && (
          <Button
            variant="ghost"
            size="lg"
            onClick={handleBack}
            disabled={isLoading}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const CompletionStep = () => {
  const { naturalRole, updateNaturalRole, completeOnboarding, sendAdminNotification } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Evaluate readiness
    const ready = !!(
      naturalRole?.promise_check === true &&
      naturalRole?.practice_check === true &&
      naturalRole?.training_check === true &&
      naturalRole?.consulting_check === true
    );
    setIsReady(ready);
  }, [naturalRole]);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({ is_ready: isReady });
      
      // Send notification to admin for approval
      await sendAdminNotification(
        "journey_completed",
        "Journey Complete - Pending Approval",
        `User completed onboarding journey. Ready status: ${isReady ? 'Ready' : 'Needs assistance'}`
      );
      
      await completeOnboarding();
      
      toast({
        title: "Journey Complete!",
        description: "Your application has been submitted for admin review. You'll be notified once approved.",
      });
      
      navigate("/profile", { replace: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isReady) {
    return (
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-b4-teal/10 text-b4-teal flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Journey Complete!
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Congratulations! You've completed all the steps. Your application will now be reviewed by our admin team.
        </p>

        <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
          <p className="text-sm text-muted-foreground mb-4">Once approved, you'll have access to:</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
              <span className="text-foreground">Co-Build Startup opportunities</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
              <span className="text-foreground">Create your own startup ideas as Initiator</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
              <span className="text-foreground">Equity-based role matching</span>
            </li>
          </ul>
        </div>

        <Button
          variant="teal"
          size="lg"
          onClick={handleComplete}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Submitting..." : "Submit for Approval"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-b4-coral/10 text-b4-coral flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        You're on your way!
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Based on your assessment, there are some areas where you're still developing. 
        Our team will review your profile and reach out to help you progress.
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm text-muted-foreground mb-4">Your current status:</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-3">
            {naturalRole?.promise_check ? (
              <CheckCircle className="w-4 h-4 text-b4-teal" />
            ) : (
              <AlertCircle className="w-4 h-4 text-b4-coral" />
            )}
            <span className="text-sm text-foreground">Promise to deliver</span>
          </li>
          <li className="flex items-center gap-3">
            {naturalRole?.practice_check ? (
              <CheckCircle className="w-4 h-4 text-b4-teal" />
            ) : (
              <AlertCircle className="w-4 h-4 text-b4-coral" />
            )}
            <span className="text-sm text-foreground">Practice experience</span>
          </li>
          <li className="flex items-center gap-3">
            {naturalRole?.training_check ? (
              <CheckCircle className="w-4 h-4 text-b4-teal" />
            ) : (
              <AlertCircle className="w-4 h-4 text-b4-coral" />
            )}
            <span className="text-sm text-foreground">Training experience</span>
          </li>
          <li className="flex items-center gap-3">
            {naturalRole?.consulting_check ? (
              <CheckCircle className="w-4 h-4 text-b4-teal" />
            ) : (
              <AlertCircle className="w-4 h-4 text-b4-coral" />
            )}
            <span className="text-sm text-foreground">Consulting experience</span>
          </li>
        </ul>
      </div>

      <Button
        variant="teal"
        size="lg"
        onClick={handleComplete}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Saving..." : "Continue to Platform"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

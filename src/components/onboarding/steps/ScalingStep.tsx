import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, Clock } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";

interface ScalingStepProps {
  onNext: () => void;
}

export const ScalingStep = ({ onNext }: ScalingStepProps) => {
  const { updateNaturalRole, updateOnboardingState, sendAdminNotification, naturalRole } = useOnboarding();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleWantsToScale = async (wantsToScale: boolean) => {
    setIsLoading(true);
    try {
      await updateNaturalRole({ wants_to_scale: wantsToScale });
      
      if (wantsToScale) {
        await sendAdminNotification(
          "scaling_candidate",
          "Scaling Decision",
          "User wants to scale their Natural Role - process formalization candidate"
        );
      }
      
      await updateOnboardingState({ current_step: 8 });
      onNext();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Do you want to scale your Natural Role?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Turn your intuition into a structured process that can be taught and replicated
      </p>

      <div className="grid gap-4 mb-8">
        <button
          type="button"
          onClick={() => handleWantsToScale(true)}
          disabled={isLoading}
          className="p-6 rounded-2xl border-2 border-border hover:border-b4-teal hover:bg-b4-teal/5 transition-all text-left flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-b4-teal/10 text-b4-teal flex items-center justify-center flex-shrink-0">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <div className="font-display font-semibold text-lg text-foreground">
              Yes, I want to scale
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Unlock the Process Formalization module and maximize your impact
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleWantsToScale(false)}
          disabled={isLoading}
          className="p-6 rounded-2xl border-2 border-border hover:border-muted-foreground/30 hover:bg-muted/30 transition-all text-left flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="font-display font-semibold text-lg text-foreground">
              Not now
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              I'll explore this option later
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

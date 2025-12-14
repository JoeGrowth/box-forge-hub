import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const EntrepreneurPlaceholder = () => {
  const { completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      toast({
        title: "Welcome, Entrepreneur!",
        description: "Your account is set up. Full onboarding coming soon.",
      });
      navigate("/", { replace: true });
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
      <div className="w-20 h-20 rounded-full bg-b4-teal/10 text-b4-teal flex items-center justify-center mx-auto mb-6">
        <Rocket className="w-10 h-10" />
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Welcome, Entrepreneur!
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        The full Entrepreneur onboarding experience is coming soon. For now, you can explore the platform and start building your startup idea.
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-medium text-foreground mb-3">What's coming:</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Guided startup creation workflow</li>
          <li>• Market analysis tools</li>
          <li>• Role and equity structure builder</li>
          <li>• Co-Builder matching system</li>
        </ul>
      </div>

      <Button
        variant="teal"
        size="lg"
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Setting up..." : "Enter the Platform"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

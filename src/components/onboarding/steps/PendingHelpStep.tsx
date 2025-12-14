import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const PendingHelpStep = () => {
  const { completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      toast({
        title: "Request Received",
        description: "Our team will reach out to help you soon.",
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
        <MessageCircle className="w-10 h-10" />
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        We'll get in touch!
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Our team has received your request and will reach out to help you define your Natural Role. 
        This personal guidance ensures you start your journey on the right path.
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-medium text-foreground mb-3">What happens next:</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• A team member will contact you within 48 hours</li>
          <li>• We'll schedule a discovery session</li>
          <li>• Together, we'll uncover your Natural Role</li>
          <li>• You'll continue your onboarding journey</li>
        </ul>
      </div>

      <Button
        variant="teal"
        size="lg"
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Saving..." : "Continue to Platform"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

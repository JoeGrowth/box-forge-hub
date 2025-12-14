import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, X, HelpCircle } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";

interface AssessmentStepProps {
  onNext: () => void;
  onNeedHelp: () => void;
}

// Step 3.1 - Promise Check
export const PromiseCheckStep = ({ onNext, onNeedHelp }: AssessmentStepProps) => {
  const { updateNaturalRole, updateOnboardingState, sendAdminNotification } = useOnboarding();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleAnswer = async (hasPromise: boolean) => {
    setIsLoading(true);
    try {
      await updateNaturalRole({ promise_check: hasPromise });
      
      if (!hasPromise) {
        await updateNaturalRole({ status: "not_ready" });
      }
      
      await updateOnboardingState({ current_step: 4 });
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
        Do you promise people or entities to do this Natural Role for them?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Have you committed to delivering this value to others?
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleAnswer(true)}
          disabled={isLoading}
          className="h-20 text-lg border-2 hover:border-b4-teal hover:bg-b4-teal/5"
        >
          <Check className="mr-2 h-5 w-5" />
          Yes
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleAnswer(false)}
          disabled={isLoading}
          className="h-20 text-lg border-2 hover:border-muted-foreground"
        >
          <X className="mr-2 h-5 w-5" />
          No
        </Button>
      </div>
    </div>
  );
};

// Not Ready Screen (shown when promise_check = false)
export const NotReadyStep = ({ onNeedHelp }: { onNeedHelp: () => void }) => {
  const { sendAdminNotification, updateOnboardingState } = useOnboarding();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleWantGuidance = async () => {
    setIsLoading(true);
    try {
      await sendAdminNotification(
        "user_stuck",
        "Promise Check",
        "User is not ready - wants guidance to develop their Natural Role"
      );
      toast({
        title: "Request sent!",
        description: "Our team will reach out to help you develop your Natural Role.",
      });
      await updateOnboardingState({ onboarding_completed: true });
      onNeedHelp();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComeLater = async () => {
    await updateOnboardingState({ onboarding_completed: true });
    onNeedHelp();
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-b4-coral/10 text-b4-coral flex items-center justify-center mx-auto mb-6">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Your Natural Role needs development
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        It seems like your Natural Role isn't fully developed yet. That's okay! We can help you get there.
      </p>

      <div className="space-y-3">
        <Button
          variant="teal"
          size="lg"
          onClick={handleWantGuidance}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Sending..." : "I want guidance"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleComeLater}
          className="w-full"
        >
          I'll come back later
        </Button>
      </div>
    </div>
  );
};

// Step 3.2 - Practice Check
export const PracticeCheckStep = ({ onNext, onNeedHelp }: AssessmentStepProps) => {
  const { updateNaturalRole, updateOnboardingState, sendAdminNotification, naturalRole } = useOnboarding();
  const { toast } = useToast();
  const [hasPracticed, setHasPracticed] = useState<boolean | null>(null);
  const [entities, setEntities] = useState("");
  const [caseStudies, setCaseStudies] = useState("");
  const [needsHelp, setNeedsHelp] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePracticedYes = () => setHasPracticed(true);
  const handlePracticedNo = () => setHasPracticed(false);

  const handleSubmitDetails = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({
        practice_check: true,
        practice_entities: entities,
        practice_case_studies: parseInt(caseStudies) || 0,
      });
      await updateOnboardingState({ current_step: 5 });
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

  const handleNeedsHelpAnswer = async (wantsHelp: boolean) => {
    setIsLoading(true);
    try {
      await updateNaturalRole({
        practice_check: false,
        practice_needs_help: wantsHelp,
      });
      
      if (wantsHelp) {
        await sendAdminNotification(
          "practice_help",
          "Practice Check",
          "User needs help practicing their Natural Role"
        );
        toast({
          title: "Request sent!",
          description: "Our team will help you start practicing your Natural Role.",
        });
      }
      
      await updateOnboardingState({ current_step: 5 });
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

  if (hasPracticed === null) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Have you practiced this Natural Role inside a structure before?
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          For example, at a company, organization, or project
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePracticedYes}
            className="h-20 text-lg border-2 hover:border-b4-teal hover:bg-b4-teal/5"
          >
            <Check className="mr-2 h-5 w-5" />
            Yes
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handlePracticedNo}
            className="h-20 text-lg border-2 hover:border-muted-foreground"
          >
            <X className="mr-2 h-5 w-5" />
            No
          </Button>
        </div>
      </div>
    );
  }

  if (hasPracticed === true) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Tell us about your practice
        </h1>

        <div className="space-y-4 text-left mb-6">
          <div>
            <Label htmlFor="entities">Which entities did you practice with?</Label>
            <Textarea
              id="entities"
              value={entities}
              onChange={(e) => setEntities(e.target.value)}
              placeholder="Company names, organizations, projects..."
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="caseStudies">How many case studies or projects?</Label>
            <Input
              id="caseStudies"
              type="number"
              min="0"
              value={caseStudies}
              onChange={(e) => setCaseStudies(e.target.value)}
              placeholder="e.g., 5"
              className="mt-2"
            />
          </div>
        </div>

        <Button
          variant="teal"
          size="lg"
          onClick={handleSubmitDetails}
          disabled={!entities.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // hasPracticed === false
  return (
    <div className="text-center">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Do you need help to practice it?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        We can help you gain practical experience with your Natural Role
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="teal"
          size="lg"
          onClick={() => handleNeedsHelpAnswer(true)}
          disabled={isLoading}
          className="h-20 text-lg"
        >
          Yes, help me
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleNeedsHelpAnswer(false)}
          disabled={isLoading}
          className="h-20 text-lg border-2"
        >
          No, continue
        </Button>
      </div>
    </div>
  );
};

// Step 3.3 - Training Check
export const TrainingCheckStep = ({ onNext, onNeedHelp }: AssessmentStepProps) => {
  const { updateNaturalRole, updateOnboardingState, sendAdminNotification } = useOnboarding();
  const { toast } = useToast();
  const [hasTrained, setHasTrained] = useState<boolean | null>(null);
  const [trainingCount, setTrainingCount] = useState("");
  const [contexts, setContexts] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitDetails = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({
        training_check: true,
        training_count: parseInt(trainingCount) || 0,
        training_contexts: contexts,
      });
      await updateOnboardingState({ current_step: 6 });
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

  const handleNeedsHelpAnswer = async (wantsHelp: boolean) => {
    setIsLoading(true);
    try {
      await updateNaturalRole({
        training_check: false,
        training_needs_help: wantsHelp,
      });
      
      if (wantsHelp) {
        await sendAdminNotification(
          "training_help",
          "Training Check",
          "User wants help starting to train others in their Natural Role"
        );
        toast({
          title: "Request sent!",
          description: "Our team will help you start training others.",
        });
      }
      
      await updateOnboardingState({ current_step: 6 });
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

  if (hasTrained === null) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Have you trained individuals from different structures on this Natural Role?
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Teaching others how to do what you do
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setHasTrained(true)}
            className="h-20 text-lg border-2 hover:border-b4-teal hover:bg-b4-teal/5"
          >
            <Check className="mr-2 h-5 w-5" />
            Yes
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setHasTrained(false)}
            className="h-20 text-lg border-2 hover:border-muted-foreground"
          >
            <X className="mr-2 h-5 w-5" />
            No
          </Button>
        </div>
      </div>
    );
  }

  if (hasTrained === true) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Tell us about your training experience
        </h1>

        <div className="space-y-4 text-left mb-6">
          <div>
            <Label htmlFor="trainingCount">How many times have you trained others?</Label>
            <Input
              id="trainingCount"
              type="number"
              min="0"
              value={trainingCount}
              onChange={(e) => setTrainingCount(e.target.value)}
              placeholder="e.g., 10"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="contexts">In which contexts?</Label>
            <Textarea
              id="contexts"
              value={contexts}
              onChange={(e) => setContexts(e.target.value)}
              placeholder="Workshops, 1-on-1 mentoring, online courses..."
              className="mt-2"
            />
          </div>
        </div>

        <Button
          variant="teal"
          size="lg"
          onClick={handleSubmitDetails}
          disabled={!trainingCount || isLoading}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // hasTrained === false
  return (
    <div className="text-center">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Do you want help to start training others?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        We can help you develop your training capabilities
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="teal"
          size="lg"
          onClick={() => handleNeedsHelpAnswer(true)}
          disabled={isLoading}
          className="h-20 text-lg"
        >
          Yes, help me
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleNeedsHelpAnswer(false)}
          disabled={isLoading}
          className="h-20 text-lg border-2"
        >
          No, continue
        </Button>
      </div>
    </div>
  );
};

// Step 3.4 - Consulting Check
export const ConsultingCheckStep = ({ onNext, onNeedHelp }: AssessmentStepProps) => {
  const { updateNaturalRole, updateOnboardingState } = useOnboarding();
  const { toast } = useToast();
  const [hasConsulted, setHasConsulted] = useState<boolean | null>(null);
  const [withWhom, setWithWhom] = useState("");
  const [caseStudies, setCaseStudies] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitDetails = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({
        consulting_check: true,
        consulting_with_whom: withWhom,
        consulting_case_studies: caseStudies,
      });
      await updateOnboardingState({ current_step: 7 });
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

  const handleNoConsulting = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({ consulting_check: false });
      await updateOnboardingState({ current_step: 7 });
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

  if (hasConsulted === null) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Have you consulted people or entities using this Natural Role?
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Providing expert advice and solving problems for others
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setHasConsulted(true)}
            className="h-20 text-lg border-2 hover:border-b4-teal hover:bg-b4-teal/5"
          >
            <Check className="mr-2 h-5 w-5" />
            Yes
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setHasConsulted(false);
              handleNoConsulting();
            }}
            disabled={isLoading}
            className="h-20 text-lg border-2 hover:border-muted-foreground"
          >
            <X className="mr-2 h-5 w-5" />
            No
          </Button>
        </div>
      </div>
    );
  }

  // hasConsulted === true
  return (
    <div className="text-center">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
        Tell us about your consulting experience
      </h1>

      <div className="space-y-4 text-left mb-6">
        <div>
          <Label htmlFor="withWhom">With whom have you consulted?</Label>
          <Textarea
            id="withWhom"
            value={withWhom}
            onChange={(e) => setWithWhom(e.target.value)}
            placeholder="Companies, individuals, organizations..."
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="caseStudiesConsulting">Describe case studies or situations</Label>
          <Textarea
            id="caseStudiesConsulting"
            value={caseStudies}
            onChange={(e) => setCaseStudies(e.target.value)}
            placeholder="Brief descriptions of consulting engagements..."
            className="mt-2"
          />
        </div>
      </div>

      <Button
        variant="teal"
        size="lg"
        onClick={handleSubmitDetails}
        disabled={!withWhom.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? "Saving..." : "Continue"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

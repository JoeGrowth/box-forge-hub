import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, AlertCircle, HelpCircle, XCircle } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type StatusType = "filled" | "needs_help" | "not_needed" | "pending";

interface StatusItemProps {
  label: string;
  status: StatusType;
  detail?: string;
}

const StatusItem = ({ label, status, detail }: StatusItemProps) => {
  const getIcon = () => {
    switch (status) {
      case "filled":
        return <CheckCircle className="w-4 h-4 text-b4-teal" />;
      case "needs_help":
        return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case "not_needed":
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-4 h-4 text-b4-coral" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "filled":
        return "Completed";
      case "needs_help":
        return "Requested help";
      case "not_needed":
        return "Not needed";
      default:
        return "Pending";
    }
  };

  return (
    <li className="flex items-start gap-3 py-2">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            status === "filled" ? "bg-b4-teal/10 text-b4-teal" :
            status === "needs_help" ? "bg-amber-500/10 text-amber-600" :
            status === "not_needed" ? "bg-muted text-muted-foreground" :
            "bg-b4-coral/10 text-b4-coral"
          }`}>
            {getStatusText()}
          </span>
        </div>
        {detail && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{detail}</p>
        )}
      </div>
    </li>
  );
};

export const CompletionStep = () => {
  const { naturalRole, onboardingState, updateNaturalRole, completeOnboarding, sendAdminNotification, sendMilestoneNotification } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const isEntrepreneur = onboardingState?.primary_role === "entrepreneur";

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

  // Determine status for each section
  const getNaturalRoleStatus = (): { status: StatusType; detail?: string } => {
    if (naturalRole?.description) {
      return { status: "filled", detail: naturalRole.description };
    }
    if (naturalRole?.status === "assistance_requested") {
      return { status: "needs_help" };
    }
    return { status: "pending" };
  };

  const getPromiseStatus = (): { status: StatusType; detail?: string } => {
    if (naturalRole?.promise_check === true) {
      return { status: "filled", detail: "Ready to deliver on your Natural Role" };
    }
    if (naturalRole?.promise_check === false) {
      return { status: "not_needed", detail: "Not ready to promise yet" };
    }
    return { status: "pending" };
  };

  const getPracticeStatus = (): { status: StatusType; detail?: string } => {
    if (naturalRole?.practice_check === true) {
      const caseCount = naturalRole.practice_case_studies || 0;
      const entities = naturalRole.practice_entities || "";
      return { 
        status: "filled", 
        detail: `${caseCount} case studies${entities ? ` with ${entities}` : ""}` 
      };
    }
    if (naturalRole?.practice_needs_help === true) {
      return { status: "needs_help", detail: "Requested assistance" };
    }
    if (naturalRole?.practice_check === false) {
      return { status: "not_needed", detail: "No practice experience yet" };
    }
    return { status: "pending" };
  };

  const getTrainingStatus = (): { status: StatusType; detail?: string } => {
    if (naturalRole?.training_check === true) {
      const count = naturalRole.training_count || 0;
      const contexts = naturalRole.training_contexts || "";
      return { 
        status: "filled", 
        detail: `Trained ${count} people${contexts ? ` in ${contexts}` : ""}` 
      };
    }
    if (naturalRole?.training_needs_help === true) {
      return { status: "needs_help", detail: "Requested assistance" };
    }
    if (naturalRole?.training_check === false) {
      return { status: "not_needed", detail: "No training experience yet" };
    }
    return { status: "pending" };
  };

  const getConsultingStatus = (): { status: StatusType; detail?: string } => {
    if (naturalRole?.consulting_check === true) {
      const withWhom = naturalRole.consulting_with_whom || "";
      const caseStudies = naturalRole.consulting_case_studies || "";
      return { 
        status: "filled", 
        detail: withWhom || caseStudies || "Consulting experience confirmed" 
      };
    }
    if (naturalRole?.consulting_check === false) {
      return { status: "not_needed", detail: "No consulting experience yet" };
    }
    return { status: "pending" };
  };

  const getScalingStatus = (): { status: StatusType; detail?: string } => {
    if (naturalRole?.wants_to_scale === true) {
      return { status: "filled", detail: "Ready to scale Natural Role" };
    }
    if (naturalRole?.wants_to_scale === false) {
      return { status: "not_needed", detail: "Not interested in scaling yet" };
    }
    return { status: "pending" };
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await updateNaturalRole({ is_ready: isReady });
      
      // Send notification to admin for approval
      await sendAdminNotification(
        "user_ready",
        "Journey Complete - Pending Approval",
        `User completed onboarding journey as ${isEntrepreneur ? 'Entrepreneur' : 'Co-Builder'}. Ready status: ${isReady ? 'Ready' : 'Needs assistance'}`
      );
      
      await completeOnboarding();
      
      // Send milestone notification for journey completion
      await sendMilestoneNotification(
        "onboarding_complete",
        "Journey Complete! 🎓",
        isEntrepreneur 
          ? "You've completed your onboarding journey. Once approved, you can add your startup idea!"
          : "You've completed your onboarding journey. Your application is now under review.",
        "/profile"
      );
      
      toast({
        title: "Journey Complete!",
        description: isEntrepreneur 
          ? "Your application has been submitted. Once approved, you can add your startup idea!"
          : "Your application has been submitted for admin review. You'll be notified once approved.",
      });
      
      navigate("/", { replace: true });
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

  const naturalRoleStatus = getNaturalRoleStatus();
  const promiseStatus = getPromiseStatus();
  const practiceStatus = getPracticeStatus();
  const trainingStatus = getTrainingStatus();
  const consultingStatus = getConsultingStatus();
  const scalingStatus = getScalingStatus();

  return (
    <div className="text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
        isReady ? "bg-b4-teal/10 text-b4-teal" : "bg-b4-coral/10 text-b4-coral"
      }`}>
        {isReady ? <CheckCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
      </div>
      
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        {isReady 
          ? (isEntrepreneur ? "Onboarding Incomplete" : "Journey Complete!") 
          : "You're on your way!"}
      </h1>
      
      <p className="text-muted-foreground text-lg mb-8">
        {isReady 
          ? (isEntrepreneur 
              ? "You've completed all the assessment steps. Once approved by our admin team, you'll be able to add your startup idea!"
              : "Congratulations! You've completed all the steps. Your application will now be reviewed by our admin team.")
          : "Based on your assessment, there are some areas where you're still developing. Our team will review your profile and reach out to help you progress."}
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-medium text-foreground mb-4">Your current status:</p>
        <ul className="divide-y divide-border">
          <StatusItem 
            label="Natural Role Definition" 
            status={naturalRoleStatus.status} 
            detail={naturalRoleStatus.detail}
          />
          <StatusItem 
            label="Promise to Deliver" 
            status={promiseStatus.status} 
            detail={promiseStatus.detail}
          />
          <StatusItem 
            label="Practice Experience" 
            status={practiceStatus.status} 
            detail={practiceStatus.detail}
          />
          <StatusItem 
            label="Training Experience" 
            status={trainingStatus.status} 
            detail={trainingStatus.detail}
          />
          <StatusItem 
            label="Consulting Experience" 
            status={consultingStatus.status} 
            detail={consultingStatus.detail}
          />
          <StatusItem 
            label="Scaling Interest" 
            status={scalingStatus.status} 
            detail={scalingStatus.detail}
          />
        </ul>
      </div>

      {isReady && (
        <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
          <p className="text-sm text-muted-foreground mb-4">Once approved, you'll have access to:</p>
          <ul className="space-y-3">
            {isEntrepreneur ? (
              <>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
                  <span className="text-foreground">Add your startup idea to the platform</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
                  <span className="text-foreground">Find Co-Builders for your venture</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0" />
                  <span className="text-foreground">Equity-based team building</span>
                </li>
              </>
            ) : (
              <>
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
              </>
            )}
          </ul>
        </div>
      )}

      <Button
        variant="teal"
        size="lg"
        onClick={handleComplete}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Submitting..." : (isReady ? "Submit for Approval" : "Continue to Platform")}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

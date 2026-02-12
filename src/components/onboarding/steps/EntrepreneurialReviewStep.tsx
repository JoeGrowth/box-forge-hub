import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, HelpCircle, XCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { EntrepreneurialData } from "@/pages/EntrepreneurialOnboarding";

type StatusType = "filled" | "needs_help" | "not_done" | "pending";

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
      case "not_done":
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
        return "Needs help";
      case "not_done":
        return "No experience";
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
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === "filled"
                ? "bg-b4-teal/10 text-b4-teal"
                : status === "needs_help"
                ? "bg-amber-500/10 text-amber-600"
                : status === "not_done"
                ? "bg-muted text-muted-foreground"
                : "bg-b4-coral/10 text-b4-coral"
            }`}
          >
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

interface EntrepreneurialReviewStepProps {
  data: EntrepreneurialData;
  onSubmit: () => Promise<void>;
}

export const EntrepreneurialReviewStep = ({ data, onSubmit }: EntrepreneurialReviewStepProps) => {
  const { user } = useAuth();
  const { updateOnboardingState, sendAdminNotification, sendMilestoneNotification } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const getStatus = (
    has: boolean | null,
    needsHelp: boolean,
    desc: string
  ): { status: StatusType; detail?: string } => {
    if (has === true) return { status: "filled", detail: desc || "Experience confirmed" };
    if (has === false && needsHelp) return { status: "needs_help", detail: "Requested assistance" };
    if (has === false) return { status: "not_done" };
    return { status: "pending" };
  };

  const projectStatus = getStatus(data.has_developed_project, data.project_needs_help, data.project_description);
  const productStatus = getStatus(data.has_built_product, data.product_needs_help, data.product_description);
  const businessStatus = getStatus(data.has_run_business, data.business_needs_help, data.business_description);
  const boardStatus = getStatus(data.has_served_on_board, data.board_needs_help, data.board_description);

  const handleComplete = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Save entrepreneurial data
      const { error: saveError } = await supabase
        .from("entrepreneurial_onboarding")
        .upsert({
          user_id: user.id,
          has_developed_project: data.has_developed_project,
          project_description: data.project_description || null,
          project_count: data.project_count ? parseInt(data.project_count, 10) : null,
          project_needs_help: data.project_needs_help,
          has_built_product: data.has_built_product,
          product_description: data.product_description || null,
          product_count: data.product_count ? parseInt(data.product_count, 10) : null,
          product_needs_help: data.product_needs_help,
          has_run_business: data.has_run_business,
          business_description: data.business_description || null,
          business_count: data.business_count ? parseInt(data.business_count, 10) : null,
          business_needs_help: data.business_needs_help,
          has_served_on_board: data.has_served_on_board,
          board_description: data.board_description || null,
          board_count: data.board_count ? parseInt(data.board_count, 10) : null,
          board_needs_help: data.board_needs_help,
          is_completed: true,
        }, { onConflict: "user_id" });

      if (saveError) throw saveError;

      // Update onboarding state
      await updateOnboardingState({
        primary_role: "entrepreneur",
        onboarding_completed: true,
        journey_status: "pending_approval",
        current_step: 9,
      });

      await sendAdminNotification(
        "user_ready",
        "Entrepreneurial Journey Complete",
        "User completed entrepreneurial onboarding journey. Pending approval."
      );

      await sendMilestoneNotification(
        "onboarding_complete",
        "Journey Complete! 🎓",
        "You've completed your entrepreneurial onboarding. Your application is now under review.",
        "/profile"
      );

      await onSubmit();

      toast({
        title: "Journey Complete!",
        description: "Your application has been submitted for admin review.",
      });

      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Error completing entrepreneurial onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-b4-teal/10 text-b4-teal">
        <CheckCircle className="w-10 h-10" />
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Review Your Journey
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Review your entrepreneurial experience before submitting for approval.
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-medium text-foreground mb-4">Your experience summary:</p>
        <ul className="divide-y divide-border">
          <StatusItem
            label="Project Development"
            status={projectStatus.status}
            detail={
              projectStatus.status === "filled"
                ? `${data.project_count} project(s) — ${data.project_description}`
                : projectStatus.detail
            }
          />
          <StatusItem
            label="Product Building"
            status={productStatus.status}
            detail={
              productStatus.status === "filled"
                ? `${data.product_count} product(s) — ${data.product_description}`
                : productStatus.detail
            }
          />
          <StatusItem
            label="Business Experience"
            status={businessStatus.status}
            detail={
              businessStatus.status === "filled"
                ? `${data.business_count} business(es) — ${data.business_description}`
                : businessStatus.detail
            }
          />
          <StatusItem
            label="Board Service"
            status={boardStatus.status}
            detail={
              boardStatus.status === "filled"
                ? `${data.board_count} board(s) — ${data.board_description}`
                : boardStatus.detail
            }
          />
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
};

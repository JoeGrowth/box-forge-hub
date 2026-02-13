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
  extras?: { label: string; value: string }[];
}

const StatusItem = ({ label, status, detail, extras }: StatusItemProps) => {
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
    <li className="flex items-start gap-3 py-3">
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
        {extras && extras.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {extras.filter(e => e.value).map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                <span className="font-medium">{e.label}:</span> {e.value}
              </p>
            ))}
          </div>
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

  const formatRole = (val: string) => {
    const map: Record<string, string> = {
      founder: "Founder / Initiator",
      "co-founder": "Co-Founder",
      project_lead: "Project Lead",
      core_contributor: "Core Contributor",
      team_lead: "Team Lead / Manager",
      cto_coo: "CTO / COO / C-Level",
      key_member: "Key Team Member",
      advisor: "Advisor / Mentor",
      board_member: "Board Member",
      angel_investor: "Angel Investor",
      equity_partner: "Equity Partner / Co-Founder",
      pro_bono: "Pro Bono / Value Contributor",
    };
    return map[val] || val;
  };

  const formatStage = (val: string) => {
    const map: Record<string, string> = {
      idea: "Idea / Concept",
      prototype: "Prototype / PoC",
      mvp: "MVP",
      launched: "Launched / Live",
      revenue: "Revenue-Generating",
    };
    return map[val] || val;
  };

  const projectStatus = getStatus(data.has_developed_project, data.project_needs_help, data.project_description);
  const productStatus = getStatus(data.has_built_product, data.product_needs_help, data.product_description);
  const teamStatus = getStatus(data.has_led_team, data.team_needs_help, data.team_description);
  const businessStatus = getStatus(data.has_run_business, data.business_needs_help, data.business_description);
  const equityStatus = getStatus(data.has_served_on_board, data.board_needs_help, data.board_description);

  const handleComplete = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error: saveError } = await supabase
        .from("entrepreneurial_onboarding")
        .upsert({
          user_id: user.id,
          has_developed_project: data.has_developed_project,
          project_description: data.project_description || null,
          project_count: data.project_count ? parseInt(data.project_count, 10) : null,
          project_needs_help: data.project_needs_help,
          project_role: data.project_role || null,
          project_outcome: data.project_outcome || null,
          has_built_product: data.has_built_product,
          product_description: data.product_description || null,
          product_count: data.product_count ? parseInt(data.product_count, 10) : null,
          product_needs_help: data.product_needs_help,
          product_stage: data.product_stage || null,
          product_users_count: data.product_users_count || null,
          has_led_team: data.has_led_team,
          team_description: data.team_description || null,
          team_size: data.team_size ? parseInt(data.team_size, 10) : null,
          team_role: data.team_role || null,
          team_needs_help: data.team_needs_help,
          has_run_business: data.has_run_business,
          business_description: data.business_description || null,
          business_count: data.business_count ? parseInt(data.business_count, 10) : null,
          business_needs_help: data.business_needs_help,
          business_revenue: data.business_revenue || null,
          business_duration: data.business_duration || null,
          has_served_on_board: data.has_served_on_board,
          board_description: data.board_description || null,
          board_count: data.board_count ? parseInt(data.board_count, 10) : null,
          board_needs_help: data.board_needs_help,
          board_role_type: data.board_role_type || null,
          board_equity_details: data.board_equity_details || null,
          is_completed: true,
        }, { onConflict: "user_id" });

      if (saveError) throw saveError;

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
        Review Your Track Record
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Review your entrepreneurial achievements before submitting for approval.
      </p>

      <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
        <p className="text-sm font-medium text-foreground mb-4">Your achievement summary:</p>
        <ul className="divide-y divide-border">
          <StatusItem
            label="Initiatives & Projects"
            status={projectStatus.status}
            detail={
              projectStatus.status === "filled"
                ? `${data.project_count} initiative(s) — ${data.project_description}`
                : projectStatus.detail
            }
            extras={projectStatus.status === "filled" ? [
              { label: "Role", value: data.project_role ? formatRole(data.project_role) : "" },
              { label: "Outcomes", value: data.project_outcome },
            ] : undefined}
          />
          <StatusItem
            label="Products & Prototypes"
            status={productStatus.status}
            detail={
              productStatus.status === "filled"
                ? `${data.product_count} product(s) — ${data.product_description}`
                : productStatus.detail
            }
            extras={productStatus.status === "filled" ? [
              { label: "Stage", value: data.product_stage ? formatStage(data.product_stage) : "" },
              { label: "Reach", value: data.product_users_count },
            ] : undefined}
          />
          <StatusItem
            label="Team Experience"
            status={teamStatus.status}
            detail={
              teamStatus.status === "filled"
                ? `Team of ${data.team_size} — ${data.team_description}`
                : teamStatus.detail
            }
            extras={teamStatus.status === "filled" ? [
              { label: "Role", value: data.team_role ? formatRole(data.team_role) : "" },
            ] : undefined}
          />
          <StatusItem
            label="Business & Commercial"
            status={businessStatus.status}
            detail={
              businessStatus.status === "filled"
                ? `${data.business_count} business(es) — ${data.business_description}`
                : businessStatus.detail
            }
            extras={businessStatus.status === "filled" ? [
              { label: "Revenue/Impact", value: data.business_revenue },
              { label: "Duration", value: data.business_duration },
            ] : undefined}
          />
          <StatusItem
            label="Equity & Value Contributions"
            status={equityStatus.status}
            detail={
              equityStatus.status === "filled"
                ? `${data.board_count} contribution(s) — ${data.board_description}`
                : equityStatus.detail
            }
            extras={equityStatus.status === "filled" ? [
              { label: "Type", value: data.board_role_type ? formatRole(data.board_role_type) : "" },
              { label: "Details", value: data.board_equity_details },
            ] : undefined}
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

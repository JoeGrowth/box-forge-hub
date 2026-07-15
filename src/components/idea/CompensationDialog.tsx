import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, PieChart, Clock, Target, Send, Check, Edit2 } from "lucide-react";
import { markApplicationConversationRead } from "@/lib/negotiationChat";
import { TrustBlock } from "@/components/trust/TrustBlock";


interface TeamMember {
  id: string;
  member_user_id: string;
  role_type: string;
  full_name: string | null;
}

interface ApplicationContext {
  applicationId: string;
  applicantId: string;
  applicantName: string | null;
  startupId: string;
  initiatorId: string;
  roleApplied: string | null;
  proposed: {
    monthly_salary: number | null;
    salary_currency: string | null;
    time_equity_percentage: number | null;
    cliff_years: number | null;
    vesting_years: number | null;
    performance_equity_percentage: number | null;
    performance_milestone: string | null;
    include_salary: boolean | null;
  };
}

interface CompensationOffer {
  id?: string;
  monthly_salary: number | null;
  salary_currency: string;
  time_equity_percentage: number;
  cliff_years: number;
  vesting_years: number;
  performance_equity_percentage: number;
  performance_milestone: string | null;
  status: string;
  initiator_user_id: string;
  current_proposer_id: string;
  version: number;
  team_member_id?: string | null;
  application_id?: string | null;
}

interface CompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMember?: TeamMember | null;
  application?: ApplicationContext | null;
  startupId: string;
  startupTitle?: string;
  currentUserId: string;
  isInitiator: boolean;
  onOfferSubmitted: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  MVCB: "Most Valuable Co-Builder",
  MMCB: "Most Matching Co-Builder",
  MLCB: "Most Loyal Co-Builder",
};

const ROLE_TIER: Record<string, string> = {
  MVCB: "senior co-founder",
  MMCB: "core co-founder",
  MLCB: "light co-founder",
};

export const CompensationDialog = ({
  open,
  onOpenChange,
  teamMember,
  application,
  startupId,
  startupTitle,
  currentUserId,
  isInitiator,
  onOfferSubmitted,
}: CompensationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingOffer, setExistingOffer] = useState<CompensationOffer | null>(null);

  // Form state
  const [includeSalary, setIncludeSalary] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [timeEquity, setTimeEquity] = useState("");
  const [cliffYears, setCliffYears] = useState("1");
  const [vestingYears, setVestingYears] = useState("4");
  const [performanceEquity, setPerformanceEquity] = useState("");
  const [performanceMilestone, setPerformanceMilestone] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

  const subjectName = teamMember?.full_name || application?.applicantName || "Co-Builder";
  const roleLabel =
    (teamMember && ROLE_LABELS[teamMember.role_type]) ||
    application?.roleApplied ||
    "Co-Builder";
  const roleTier =
    (teamMember && ROLE_TIER[teamMember.role_type]) || "co-founder";

  // Load existing offer
  useEffect(() => {
    if (open && (teamMember || application)) {
      loadExistingOffer();
      // Reconcile: opening the negotiation surface clears unread negotiation
      // messages for this viewer so the bell badge stays in sync.
      if (application && currentUserId) {
        markApplicationConversationRead({
          applicationId: application.applicationId,
          viewerId: currentUserId,
        });
      }
    }
  }, [open, teamMember, application, currentUserId]);


  const loadExistingOffer = async () => {
    setIsLoading(true);

    try {
      let query = supabase.from("team_compensation_offers").select("*");
      if (teamMember) {
        query = query.eq("team_member_id", teamMember.id);
      } else if (application) {
        query = query.eq("application_id", application.applicationId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading offer:", error);
      }

      if (data) {
        setExistingOffer(data as CompensationOffer);
        setIncludeSalary(data.monthly_salary !== null);
        setMonthlySalary(data.monthly_salary?.toString() || "");
        setSalaryCurrency(data.salary_currency || "USD");
        setTimeEquity(data.time_equity_percentage?.toString() || "0");
        setCliffYears(data.cliff_years?.toString() || "1");
        setVestingYears(data.vesting_years?.toString() || "4");
        setPerformanceEquity(data.performance_equity_percentage?.toString() || "0");
        setPerformanceMilestone(data.performance_milestone || "");
        setRoleTitle((data as any).role_title || "");
      } else if (application) {
        // Seed form from applicant's proposal so the initiator opens negotiation
        // looking at exactly what the applicant asked for.
        const p = application.proposed;
        setExistingOffer(null);
        setIncludeSalary(!!p.include_salary);
        setMonthlySalary(p.monthly_salary?.toString() || "");
        setSalaryCurrency(p.salary_currency || "USD");
        setTimeEquity(p.time_equity_percentage?.toString() || "");
        setCliffYears(p.cliff_years?.toString() || "1");
        setVestingYears(p.vesting_years?.toString() || "4");
        setPerformanceEquity(p.performance_equity_percentage?.toString() || "");
        setPerformanceMilestone(p.performance_milestone || "");
        setRoleTitle("");
      } else {
        setExistingOffer(null);
        setIncludeSalary(false);
        setMonthlySalary("");
        setSalaryCurrency("USD");
        setTimeEquity("");
        setCliffYears("1");
        setVestingYears("4");
        setPerformanceEquity("");
        setPerformanceMilestone("");
        setRoleTitle("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalEquity = () => {
    const time = parseFloat(timeEquity) || 0;
    const perf = parseFloat(performanceEquity) || 0;
    return time + perf;
  };

  const canEdit = () => {
    if (!existingOffer) return true; // First proposal: either side can open with a counter
    if (existingOffer.status === "accepted") return false;
    // Can edit if it's my turn (I'm not the current proposer)
    return existingOffer.current_proposer_id !== currentUserId;
  };

  const handleSubmit = async (action: "propose" | "accept") => {
    if (!teamMember && !application) return;

    // Validation
    const timeEq = parseFloat(timeEquity) || 0;
    const perfEq = parseFloat(performanceEquity) || 0;
    const cliff = parseInt(cliffYears) || 0;
    const vesting = parseInt(vestingYears) || 0;

    if (timeEq <= 0 && perfEq <= 0) {
      toast.error("Equity is required. Please add time-based or performance-based equity.");
      return;
    }

    if (timeEq > 0 && vesting <= 0) {
      toast.error("Vesting period must be at least 1 year.");
      return;
    }
    if (timeEq > 0 && cliff > vesting) {
      toast.error(`Cliff (${cliff}y) cannot be longer than the vesting period (${vesting}y).`);
      return;
    }

    if (perfEq > 0 && !performanceMilestone.trim()) {
      toast.error("Please describe the performance milestone for performance-based equity.");
      return;
    }

    if (!roleTitle.trim()) {
      toast.error("Please enter the role title (e.g. AI Compliance Product Engineer).");
      return;
    }

    // Enforce role caps: 3 MVCB · 2 MMCB · 1 MLCB.
    if (action === "accept") {
      const ROLE_CAPS: Record<"MVCB" | "MMCB" | "MLCB", number> = { MVCB: 3, MMCB: 2, MLCB: 1 };
      const resultingRole: "MVCB" | "MMCB" | "MLCB" =
        timeEq + perfEq >= 11 ? "MVCB" : timeEq + perfEq >= 6 ? "MMCB" : "MLCB";
      const { data: sameStartupOffers } = await supabase
        .from("team_compensation_offers")
        .select("id, team_member_id, status, time_equity_percentage, performance_equity_percentage")
        .eq("startup_id", startupId)
        .eq("status", "accepted");
      const currentCount = (sameStartupOffers ?? []).filter((o: any) => {
        if (existingOffer?.id && o.id === existingOffer.id) return false;
        const total = (o.time_equity_percentage || 0) + (o.performance_equity_percentage || 0);
        const r = total >= 11 ? "MVCB" : total >= 6 ? "MMCB" : "MLCB";
        return r === resultingRole;
      }).length;
      if (currentCount + 1 > ROLE_CAPS[resultingRole]) {
        toast.error(
          `Role cap reached: max ${ROLE_CAPS[resultingRole]} ${resultingRole}. Adjust equity to fit another tier.`
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      const cobuilderId =
        teamMember?.member_user_id || application?.applicantId;
      const initiatorIdForOffer =
        existingOffer?.initiator_user_id ||
        application?.initiatorId ||
        (isInitiator ? currentUserId : currentUserId);

      const offerData: Record<string, unknown> = {
        startup_id: startupId,
        team_member_id: teamMember?.id ?? null,
        application_id: application?.applicationId ?? null,
        cobuilder_user_id: cobuilderId,
        initiator_user_id: initiatorIdForOffer,
        monthly_salary: includeSalary ? parseFloat(monthlySalary) || null : null,
        salary_currency: salaryCurrency,
        time_equity_percentage: timeEq,
        cliff_years: parseInt(cliffYears) || 1,
        vesting_years: parseInt(vestingYears) || 4,
        performance_equity_percentage: perfEq,
        performance_milestone: perfEq > 0 ? performanceMilestone : null,
        current_proposer_id: currentUserId,
        status: action === "accept" ? "accepted" : "pending",
        version: (existingOffer?.version || 0) + 1,
        role_title: roleTitle.trim(),
      };

      let offerId = existingOffer?.id ?? null;

      if (existingOffer?.id) {
        const { error } = await supabase
          .from("team_compensation_offers")
          .update({ ...offerData, updated_at: new Date().toISOString() })
          .eq("id", existingOffer.id);
        if (error) throw error;
      } else {
        const { data: newOffer, error } = await supabase
          .from("team_compensation_offers")
          .insert(offerData as never)
          .select()
          .single();
        if (error) throw error;
        offerId = newOffer.id;
      }

      if (offerId) {
        await supabase.from("team_compensation_history").insert({
          offer_id: offerId,
          proposer_id: currentUserId,
          monthly_salary: offerData.monthly_salary as number | null,
          salary_currency: offerData.salary_currency as string,
          time_equity_percentage: offerData.time_equity_percentage as number,
          cliff_years: offerData.cliff_years as number,
          vesting_years: offerData.vesting_years as number,
          performance_equity_percentage: offerData.performance_equity_percentage as number,
          performance_milestone: offerData.performance_milestone as string | null,
          version: offerData.version as number,
          role_title: offerData.role_title as string,
          action: action === "accept" ? "accepted" : existingOffer ? "counter_proposed" : "proposed",
        } as never);
      }

      // ──────────────────────────────────────────────────────────────
      // On final acceptance from an application-only negotiation:
      // promote to team_member + flip application status.
      // ──────────────────────────────────────────────────────────────
      if (action === "accept" && application && !teamMember && offerId) {
        const { data: newMember, error: tmErr } = await supabase
          .from("startup_team_members")
          .insert({
            startup_id: startupId,
            member_user_id: application.applicantId,
            added_by: application.initiatorId,
            role_type: application.roleApplied || "MMCB",
          })
          .select("id")
          .single();
        if (tmErr) console.error("team_member insert failed", tmErr);
        if (newMember) {
          await supabase
            .from("team_compensation_offers")
            .update({ team_member_id: newMember.id })
            .eq("id", offerId);
        }
        await supabase
          .from("startup_applications")
          .update({ status: "accepted" })
          .eq("id", application.applicationId);

        try {
          const { emitGraphEvent, idemKey } = await import("@/lib/graph");
          emitGraphEvent({
            userId: application.applicantId,
            eventType: "startup_contribution_accepted",
            eventVersion: 1,
            aggregateType: "startup",
            aggregateId: startupId,
            sourceModule: "idea.team",
            idempotencyKey: idemKey("startup_contribution_accepted", 1, application.applicantId, startupId),
            payload: { startup_id: startupId, role: application.roleApplied, applicant_name: application.applicantName },
          });
          emitGraphEvent({
            userId: application.applicantId,
            eventType: "startup_member_added",
            eventVersion: 1,
            aggregateType: "startup",
            aggregateId: startupId,
            sourceModule: "idea.team",
            idempotencyKey: idemKey("startup_member_added", 1, application.applicantId, startupId),
            payload: { startup_id: startupId },
          });
        } catch (e) {
          console.error("graph event failed", e);
        }
      }

      // ──────────────────────────────────────────────────────────────
      // Seed/append the chat thread so negotiation shows in Messages.
      // Only the initiator can create the conversation row (per RLS).
      // ──────────────────────────────────────────────────────────────
      if (application) {
        const { ensureChatConversation, postNegotiationSystemMessage } = await import(
          "@/lib/negotiationChat"
        );
        let convId: string | null = null;
        if (isInitiator) {
          convId = await ensureChatConversation({
            applicationId: application.applicationId,
            initiatorId: application.initiatorId,
            applicantId: application.applicantId,
            startupId,
          });
        } else {
          const { data: c } = await supabase
            .from("chat_conversations")
            .select("id")
            .eq("application_id", application.applicationId)
            .maybeSingle();
          convId = c?.id ?? null;
        }
        if (convId) {
          const headline = action === "accept" ? "✅ Compensation agreed" : `📝 New compensation proposal (v${offerData.version})`;
          const lines = [
            headline,
            `• Time equity: ${timeEq}% (${cliff}y cliff + ${vesting}y vest)`,
            perfEq > 0 ? `• Performance equity: ${perfEq}%` : null,
            includeSalary && monthlySalary
              ? `• Salary: ${monthlySalary} ${salaryCurrency}/mo`
              : null,
          ].filter(Boolean);
          await postNegotiationSystemMessage({
            conversationId: convId,
            senderId: currentUserId,
            content: lines.join("\n"),
          });
        }
      }

      // Notify the other party.
      const otherUserId = isInitiator
        ? teamMember?.member_user_id || application?.applicantId
        : application?.initiatorId || existingOffer?.initiator_user_id;
      const notificationLink = application
        ? `/chat/${application.applicationId}`
        : isInitiator
        ? "/start?section=cobuilder"
        : "/start?section=initiator";
      if (otherUserId) {
        await supabase.from("user_notifications").insert({
          user_id: otherUserId,
          title: action === "accept" ? "Compensation Offer Accepted!" : "Compensation Offer Update",
          message:
            action === "accept"
              ? `${subjectName} compensation has been agreed${startupTitle ? ` for ${startupTitle}` : ""}.`
              : `A new compensation proposal needs your response${startupTitle ? ` for ${startupTitle}` : ""}.`,
          notification_type: "compensation_offer",
          link: notificationLink,
        });
      }

      toast.success(action === "accept" ? "Agreement confirmed — co-builder added to your team." : "Proposal sent.");
      onOfferSubmitted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving offer:", error);
      toast.error("Failed to save compensation offer");
    } finally {
      setIsSaving(false);
    }
  };

  if (!teamMember && !application) return null;


  const isMyTurn = canEdit();
  const isAccepted = existingOffer?.status === "accepted";
  const showAcceptButton = existingOffer && !isAccepted && existingOffer.current_proposer_id !== currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-b4-teal" />
            Negotiate Compensation — {subjectName}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mt-1">
              {roleLabel}
            </Badge>
            {existingOffer && (
              <Badge 
                variant={isAccepted ? "default" : "secondary"} 
                className={`ml-2 ${isAccepted ? "bg-b4-teal" : ""}`}
              >
                {isAccepted ? "Agreed" : `Version ${existingOffer.version} - ${isMyTurn ? "Your Turn" : "Awaiting Response"}`}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>
        {application?.applicantId && (
          <TrustBlock userId={application.applicantId} variant="inline" className="-mt-2" />
        )}



        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Role */}
            <div className="rounded-lg border border-b4-teal/30 bg-b4-teal/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="role-title" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Role
                </Label>
                <Badge variant="outline" className="text-[10px]">
                  {roleTier}
                </Badge>
              </div>
              <Input
                id="role-title"
                placeholder="e.g. AI Compliance Product Engineer"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                disabled={!isMyTurn}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Specific job title for this co-builder. Shown as: <span className="italic">{roleTitle.trim() || "Role Title"} ({roleTier})</span>. Tier is inferred from {roleLabel}.
              </p>
            </div>


            {/* Time-Based Equity Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <Label className="font-medium">Time-Based Equity</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Retention incentive – motivates long-term commitment through cliff and vesting.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Equity %</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={timeEquity}
                    onChange={(e) => setTimeEquity(e.target.value)}
                    disabled={!isMyTurn}
                    min="0"
                    max="85"
                    step="0.1"
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground mt-1">
                    Total ownership the person can earn.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Cliff (years)</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={cliffYears}
                    onChange={(e) => setCliffYears(e.target.value)}
                    disabled={!isMyTurn}
                    min="0"
                    max="4"
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground mt-1">
                    Waiting period before they earn any equity.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Vesting (years)</Label>
                  <Input
                    type="number"
                    placeholder="4"
                    value={vestingYears}
                    onChange={(e) => setVestingYears(e.target.value)}
                    disabled={!isMyTurn}
                    min="1"
                    max="6"
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground mt-1">
                    Time over which equity is gradually earned.
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-2 text-[11px] leading-snug text-muted-foreground">
                Equity % is independent — it does not need to equal Cliff + Vesting.
                Cliff must be ≤ Vesting.
              </div>
            </div>

            <Separator />

            {/* Performance-Based Equity Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-600" />
                <Label className="font-medium">Performance-Based Equity</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Aligns work with success – unlocks only after the milestone is verified by the board.
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Equity %</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={performanceEquity}
                    onChange={(e) => setPerformanceEquity(e.target.value)}
                    disabled={!isMyTurn}
                    min="0"
                    max="85"
                    step="0.1"
                  />
                </div>
                {(parseFloat(performanceEquity) || 0) > 0 && (
                  <div>
                    <Label className="text-xs">Milestone Description</Label>
                    <Textarea
                      placeholder="Describe the milestone that must be verified by the board to unlock this equity..."
                      value={performanceMilestone}
                      onChange={(e) => setPerformanceMilestone(e.target.value)}
                      disabled={!isMyTurn}
                      className="min-h-[60px]"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Monthly Salary Section (Optional) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <Label className="font-medium">Monthly Salary (Optional)</Label>
                </div>
                <Switch
                  checked={includeSalary}
                  onCheckedChange={setIncludeSalary}
                  disabled={!isMyTurn}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Covers living expenses and lets the co-builder take less risk with equity.
              </p>
              {includeSalary && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    disabled={!isMyTurn}
                    className="flex-1"
                  />
                  <select
                    value={salaryCurrency}
                    onChange={(e) => setSalaryCurrency(e.target.value)}
                    disabled={!isMyTurn}
                    className="border rounded-md px-3 py-2 bg-background"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TND">TND</option>
                  </select>
                </div>
              )}
            </div>

            <Separator />

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Equity:</span>
                <span className="font-medium">{getTotalEquity().toFixed(1)}%</span>
              </div>
              {includeSalary && monthlySalary && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Salary:</span>
                  <span className="font-medium">{parseFloat(monthlySalary).toLocaleString()} {salaryCurrency}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 flex-col sm:flex-row">
          {isAccepted ? (
            <div className="flex items-center gap-2 text-b4-teal w-full justify-center py-2">
              <Check className="w-5 h-5" />
              <span className="font-medium">Agreement Confirmed</span>
            </div>
          ) : (
            <>
              {showAcceptButton && (
                <Button
                  onClick={() => handleSubmit("accept")}
                  disabled={isSaving}
                  className="bg-b4-teal hover:bg-b4-teal/90"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Accept Offer
                </Button>
              )}
              {isMyTurn && (
                <Button
                  onClick={() => handleSubmit("propose")}
                  disabled={isSaving}
                  variant={showAcceptButton ? "outline" : "default"}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : existingOffer ? (
                    <>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Counter Propose
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Offer
                    </>
                  )}
                </Button>
              )}
              {!isMyTurn && !showAcceptButton && (
                <p className="text-sm text-muted-foreground text-center w-full py-2">
                  Waiting for the other party to respond...
                </p>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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

interface TeamMember {
  id: string;
  member_user_id: string;
  role_type: string;
  full_name: string | null;
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
}

interface CompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMember: TeamMember | null;
  startupId: string;
  currentUserId: string;
  isInitiator: boolean;
  onOfferSubmitted: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  MVCB: "Most Valuable Co-Builder",
  MMCB: "Most Matching Co-Builder",
  MLCB: "Most Loyal Co-Builder",
};

export const CompensationDialog = ({
  open,
  onOpenChange,
  teamMember,
  startupId,
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

  // Load existing offer
  useEffect(() => {
    if (open && teamMember) {
      loadExistingOffer();
    }
  }, [open, teamMember]);

  const loadExistingOffer = async () => {
    if (!teamMember) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("team_compensation_offers")
        .select("*")
        .eq("team_member_id", teamMember.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading offer:", error);
        return;
      }

      if (data) {
        setExistingOffer(data as CompensationOffer);
        // Populate form with existing values
        setIncludeSalary(data.monthly_salary !== null);
        setMonthlySalary(data.monthly_salary?.toString() || "");
        setSalaryCurrency(data.salary_currency || "USD");
        setTimeEquity(data.time_equity_percentage?.toString() || "0");
        setCliffYears(data.cliff_years?.toString() || "1");
        setVestingYears(data.vesting_years?.toString() || "4");
        setPerformanceEquity(data.performance_equity_percentage?.toString() || "0");
        setPerformanceMilestone(data.performance_milestone || "");
      } else {
        // Reset form for new offer
        setExistingOffer(null);
        setIncludeSalary(false);
        setMonthlySalary("");
        setSalaryCurrency("USD");
        setTimeEquity("");
        setCliffYears("1");
        setVestingYears("4");
        setPerformanceEquity("");
        setPerformanceMilestone("");
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
    if (!existingOffer) return isInitiator; // Only initiator can create first offer
    if (existingOffer.status === "accepted") return false;
    // Can edit if it's my turn (I'm not the current proposer)
    return existingOffer.current_proposer_id !== currentUserId;
  };

  const handleSubmit = async (action: "propose" | "accept") => {
    if (!teamMember) return;

    // Validation
    const timeEq = parseFloat(timeEquity) || 0;
    const perfEq = parseFloat(performanceEquity) || 0;

    if (timeEq <= 0 && perfEq <= 0) {
      toast.error("Equity is required. Please add time-based or performance-based equity.");
      return;
    }

    if (perfEq > 0 && !performanceMilestone.trim()) {
      toast.error("Please describe the performance milestone for performance-based equity.");
      return;
    }

    setIsSaving(true);

    try {
      const offerData = {
        startup_id: startupId,
        team_member_id: teamMember.id,
        cobuilder_user_id: teamMember.member_user_id,
        initiator_user_id: isInitiator ? currentUserId : existingOffer?.initiator_user_id || currentUserId,
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
      };

      if (existingOffer?.id) {
        // Update existing offer
        const { error } = await supabase
          .from("team_compensation_offers")
          .update({
            ...offerData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOffer.id);

        if (error) throw error;

        // Add history entry
        await supabase.from("team_compensation_history").insert({
          offer_id: existingOffer.id,
          proposer_id: currentUserId,
          monthly_salary: offerData.monthly_salary,
          salary_currency: offerData.salary_currency,
          time_equity_percentage: offerData.time_equity_percentage,
          cliff_years: offerData.cliff_years,
          vesting_years: offerData.vesting_years,
          performance_equity_percentage: offerData.performance_equity_percentage,
          performance_milestone: offerData.performance_milestone,
          version: offerData.version,
          action: action === "accept" ? "accepted" : "counter_proposed",
        });
      } else {
        // Create new offer
        const { data: newOffer, error } = await supabase
          .from("team_compensation_offers")
          .insert(offerData)
          .select()
          .single();

        if (error) throw error;

        // Add history entry
        await supabase.from("team_compensation_history").insert({
          offer_id: newOffer.id,
          proposer_id: currentUserId,
          monthly_salary: offerData.monthly_salary,
          salary_currency: offerData.salary_currency,
          time_equity_percentage: offerData.time_equity_percentage,
          cliff_years: offerData.cliff_years,
          vesting_years: offerData.vesting_years,
          performance_equity_percentage: offerData.performance_equity_percentage,
          performance_milestone: offerData.performance_milestone,
          version: 1,
          action: "proposed",
        });
      }

      // Send notification to other party
      const otherUserId = isInitiator ? teamMember.member_user_id : existingOffer?.initiator_user_id;
      if (otherUserId) {
        await supabase.from("user_notifications").insert({
          user_id: otherUserId,
          title: action === "accept" ? "Compensation Offer Accepted!" : "Compensation Offer Update",
          message: action === "accept"
            ? `${teamMember.full_name || "A co-builder"} has accepted the compensation offer.`
            : `A new compensation offer has been proposed. Please review and respond.`,
          notification_type: "compensation_offer",
          link: "/scale",
        });
      }

      toast.success(action === "accept" ? "Offer accepted!" : "Offer submitted successfully!");
      onOfferSubmitted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving offer:", error);
      toast.error("Failed to save compensation offer");
    } finally {
      setIsSaving(false);
    }
  };

  if (!teamMember) return null;

  const isMyTurn = canEdit();
  const isAccepted = existingOffer?.status === "accepted";
  const showAcceptButton = existingOffer && !isAccepted && existingOffer.current_proposer_id !== currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-b4-teal" />
            Compensation for {teamMember.full_name || "Co-Builder"}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mt-1">
              {ROLE_LABELS[teamMember.role_type] || teamMember.role_type}
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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Monthly Salary Section */}
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
                </div>
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

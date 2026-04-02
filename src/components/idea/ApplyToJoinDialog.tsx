import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  DollarSign,
  Lock,
  Send,
  Target,
} from "lucide-react";

interface ApplyToJoinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: {
    id: string;
    title: string;
    creator_id: string;
    roles_needed: string[] | null;
  };
  onApplicationSubmitted?: () => void;
}

export function ApplyToJoinDialog({
  open,
  onOpenChange,
  idea,
  onApplicationSubmitted,
}: ApplyToJoinDialogProps) {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [dialogStep, setDialogStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasCheckedCert, setHasCheckedCert] = useState(false);
  const [hasCoBuilderCert, setHasCoBuilderCert] = useState(false);
  const [existingApplication, setExistingApplication] = useState<{
    id: string;
    status: string;
    role_applied: string | null;
    created_at: string;
  } | null>(null);
  const [checkedExisting, setCheckedExisting] = useState(false);

  // Compensation state
  const [includeSalary, setIncludeSalary] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [timeEquity, setTimeEquity] = useState("");
  const [cliffYears, setCliffYears] = useState("1");
  const [vestingYears, setVestingYears] = useState("4");
  const [performanceEquity, setPerformanceEquity] = useState("");
  const [performanceMilestone, setPerformanceMilestone] = useState("");

  // Check cert + existing application when dialog opens
  const checkPrerequisites = async () => {
    if (!user || checkedExisting) return;
    setCheckedExisting(true);

    const [certRes, appRes] = await Promise.all([
      supabase
        .from("user_certifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("certification_type", "cobuilder_b4")
        .maybeSingle(),
      supabase
        .from("startup_applications")
        .select("id, status, role_applied, created_at")
        .eq("startup_id", idea.id)
        .eq("applicant_id", user.id)
        .maybeSingle(),
    ]);

    setHasCoBuilderCert(!!certRes.data);
    setHasCheckedCert(true);
    if (appRes.data) setExistingApplication(appRes.data);
  };

  if (open && !checkedExisting) {
    checkPrerequisites();
  }

  const handleClose = (val: boolean) => {
    if (!val) {
      setDialogStep(1);
      setCheckedExisting(false);
      setHasCheckedCert(false);
      setExistingApplication(null);
    }
    onOpenChange(val);
  };

  const isOwnIdea = user?.id === idea.creator_id;

  const handleApply = async () => {
    if (!user) return;

    const timeEq = parseFloat(timeEquity) || 0;
    const perfEq = parseFloat(performanceEquity) || 0;
    const cliff = parseInt(cliffYears) || 0;
    const vesting = parseInt(vestingYears) || 0;

    if (timeEq <= 0 && perfEq <= 0) {
      toast({ title: "Equity Required", description: "Please propose at least time-based or performance-based equity.", variant: "destructive" });
      return;
    }

    if (timeEq > 0 && timeEq !== cliff + vesting) {
      toast({ title: "Equity Rule", description: `Time-Based Equity (${timeEq}%) must equal Cliff (${cliff}) + Vesting (${vesting}) = ${cliff + vesting}%`, variant: "destructive" });
      return;
    }

    if (perfEq > 0 && !performanceMilestone.trim()) {
      toast({ title: "Milestone Required", description: "Please describe the performance milestone.", variant: "destructive" });
      return;
    }

    setApplying(true);
    try {
      const { data: appData, error: appError } = await supabase
        .from("startup_applications")
        .insert({
          startup_id: idea.id,
          applicant_id: user.id,
          role_applied: selectedRole || null,
          cover_message: applyMessage || null,
          proposed_include_salary: includeSalary,
          proposed_monthly_salary: includeSalary ? parseFloat(monthlySalary) || null : null,
          proposed_salary_currency: salaryCurrency,
          proposed_time_equity_percentage: timeEq,
          proposed_cliff_years: cliff || 1,
          proposed_vesting_years: vesting || 4,
          proposed_performance_equity_percentage: perfEq,
          proposed_performance_milestone: perfEq > 0 ? performanceMilestone : null,
        })
        .select()
        .single();

      if (appError) throw appError;

      await supabase.from("user_notifications").insert({
        user_id: idea.creator_id,
        notification_type: "application_received",
        title: "New Co-Builder Application 📩",
        message: `${user.user_metadata?.full_name || user.email || "A co-builder"} wants to join your startup "${idea.title}"${selectedRole ? ` as ${selectedRole}` : ""} with a compensation proposal. Review it now!`,
        link: `/chat/${appData.id}`,
      });

      await supabase.from("admin_notifications").insert({
        user_id: idea.creator_id,
        notification_type: "application_received",
        user_name: user.user_metadata?.full_name || user.email,
        user_email: user.email,
        message: `${user.user_metadata?.full_name || "A co-builder"} applied to "${idea.title}"${selectedRole ? ` for role: ${selectedRole}` : ""} with equity proposal: ${(timeEq + perfEq).toFixed(1)}%.`,
      });

      toast({
        title: "Application Sent!",
        description: "The initiator will review your application and compensation proposal.",
      });

      handleClose(false);
      onApplicationSubmitted?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingApplication || !user) return;
    try {
      const { error } = await supabase
        .from("startup_applications")
        .delete()
        .eq("startup_id", idea.id)
        .eq("applicant_id", user.id);
      if (error) throw error;
      setExistingApplication(null);
      toast({ title: "Application Withdrawn", description: "Your application has been removed." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const renderContent = () => {
    if (!hasCheckedCert) {
      return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
    }

    if (isOwnIdea) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Your Own Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">This is your own startup idea. You cannot apply to it.</p>
        </>
      );
    }

    if (existingApplication) {
      const status = existingApplication.status;
      return (
        <>
          <DialogHeader>
            <DialogTitle>Application Status</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {status === "pending" && (
              <>
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Application Pending</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {existingApplication.role_applied && <>Applied for: <strong>{existingApplication.role_applied}</strong><br /></>}
                  Submitted on {new Date(existingApplication.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <Button variant="outline" size="sm" onClick={handleWithdraw} className="w-full">
                  Withdraw Application
                </Button>
              </>
            )}
            {status === "accepted" && (
              <div className="flex items-center gap-2 text-b4-teal">
                <span className="font-medium">✅ Application Accepted!</span>
              </div>
            )}
            {status === "rejected" && (
              <>
                <p className="text-sm text-muted-foreground">Your previous application was not accepted. You may apply again.</p>
                <Button variant="teal" className="w-full" onClick={() => setExistingApplication(null)}>Apply Again</Button>
              </>
            )}
          </div>
        </>
      );
    }

    if (!hasCoBuilderCert) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Certification Required</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <span className="font-medium text-foreground">Co-Builder Certification Required</span>
            </div>
            <p className="text-sm text-muted-foreground">Complete the Co-Builder learning journey to unlock applications.</p>
            <Button variant="teal" className="w-full" onClick={() => { handleClose(false); navigate("/journey?section=cobuilder"); }}>
              <BookOpen className="w-4 h-4 mr-2" /> Learn to be a Co-Builder <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      );
    }

    if (dialogStep === 1) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Apply to Join "{idea.title}"</DialogTitle>
            <DialogDescription>Step 1 of 2 — Tell the initiator about yourself and your interest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {idea.roles_needed && idea.roles_needed.length > 0 && (
              <div className="space-y-2">
                <Label>Which role are you applying for?</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue placeholder="Select a role..." /></SelectTrigger>
                  <SelectContent>
                    {idea.roles_needed.map((role, i) => (
                      <SelectItem key={i} value={role}>{role}</SelectItem>
                    ))}
                    <SelectItem value="other">Other / Multiple Roles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Your message to the initiator</Label>
              <Textarea placeholder="Introduce yourself, share your relevant skills and experience..." value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} rows={4} />
            </div>
            <Button variant="teal" className="w-full" onClick={() => setDialogStep(2)} disabled={!!(idea.roles_needed && idea.roles_needed.length > 0 && !selectedRole)}>
              Next: Compensation Proposal <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle>Your Compensation Proposal</DialogTitle>
          <DialogDescription>Step 2 of 2 — Propose your equity and salary terms.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Time-Based Equity</Label>
            </div>
            <p className="text-xs text-muted-foreground">Retention incentive. Rule: Equity % = Cliff + Vesting years.</p>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Equity %</Label><Input type="number" placeholder="e.g. 5" value={timeEquity} onChange={(e) => setTimeEquity(e.target.value)} min="0" max="85" step="0.1" /></div>
              <div><Label className="text-xs">Cliff (years)</Label><Input type="number" placeholder="1" value={cliffYears} onChange={(e) => setCliffYears(e.target.value)} min="0" max="4" /></div>
              <div><Label className="text-xs">Vesting (years)</Label><Input type="number" placeholder="4" value={vestingYears} onChange={(e) => setVestingYears(e.target.value)} min="1" max="6" /></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-foreground" />
              <Label className="text-sm font-medium">Performance-Based Equity</Label>
            </div>
            <p className="text-xs text-muted-foreground">Unlocks only after a board-verified milestone.</p>
            <div><Label className="text-xs">Equity %</Label><Input type="number" placeholder="e.g. 2" value={performanceEquity} onChange={(e) => setPerformanceEquity(e.target.value)} min="0" max="85" step="0.1" /></div>
            {(parseFloat(performanceEquity) || 0) > 0 && (
              <div><Label className="text-xs">Milestone Description</Label><Textarea placeholder="Describe the milestone..." value={performanceMilestone} onChange={(e) => setPerformanceMilestone(e.target.value)} className="min-h-[50px]" /></div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-b4-teal" />
                <Label className="text-sm font-medium">Monthly Salary (Optional)</Label>
              </div>
              <Switch checked={includeSalary} onCheckedChange={setIncludeSalary} />
            </div>
            {includeSalary && (
              <div className="flex gap-2">
                <Input type="number" placeholder="Amount" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className="flex-1" />
                <select value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)} className="border rounded-md px-3 py-2 bg-background text-sm">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="TND">TND</option>
                </select>
              </div>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Equity Proposed:</span>
              <span className="font-medium">{((parseFloat(timeEquity) || 0) + (parseFloat(performanceEquity) || 0)).toFixed(1)}%</span>
            </div>
            {includeSalary && monthlySalary && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Salary:</span>
                <span className="font-medium">{parseFloat(monthlySalary).toLocaleString()} {salaryCurrency}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button variant="teal" className="flex-1" onClick={handleApply} disabled={applying}>
              {applying ? "Sending..." : "Send Application"}
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

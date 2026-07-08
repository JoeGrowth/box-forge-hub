import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emitOpportunityEvent } from "@/lib/opportunityEvents";
import { OpportunityStatusPanel } from "@/components/opportunities/OpportunityStatusPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft,
  Rocket, 
  User, 
  Calendar, 
  MapPin,
  Users,
  Briefcase,
  Send,
  CheckCircle,
  Clock,
  BookOpen,
  ArrowRight,
  Lock,
  DollarSign,
  PieChart,
  Target
} from "lucide-react";

interface StartupIdea {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  roles_needed: string[] | null;
  status: string;
  review_status: string;
  created_at: string;
  creator_id: string;
}

interface CreatorProfile {
  full_name: string | null;
  bio: string | null;
  primary_skills: string | null;
  avatar_url: string | null;
}

interface Application {
  id: string;
  status: string;
  role_applied: string | null;
  cover_message: string | null;
  created_at: string;
}

const parseSkills = (skills: string | null): string[] => {
  if (!skills) return [];
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const StartupOpportunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const { toast } = useToast();
  const [idea, setIdea] = useState<StartupIdea | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [naturalRole, setNaturalRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyMessage, setApplyMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [applying, setApplying] = useState(false);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasCoBuilderCert, setHasCoBuilderCert] = useState(false);
  const [dialogStep, setDialogStep] = useState<1 | 2>(1);

  // Compensation proposal state
  const [includeSalary, setIncludeSalary] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [timeEquity, setTimeEquity] = useState("");
  const [cliffYears, setCliffYears] = useState("1");
  const [vestingYears, setVestingYears] = useState("4");
  const [performanceEquity, setPerformanceEquity] = useState("");
  const [performanceMilestone, setPerformanceMilestone] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Detail page is viewable by any authenticated user; application/role-taking
  // actions remain gated by RLS and certification checks inside the page.

  useEffect(() => {
    const fetchIdea = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("startup_ideas")
        .select("*")
        .eq("id", id)
        .eq("review_status", "approved")
        .maybeSingle();

      if (error || !data) {
        navigate("/opportunities", { replace: true });
        return;
      }

      setIdea(data);

      // Fetch creator profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio, primary_skills, avatar_url")
        .eq("user_id", data.creator_id)
        .maybeSingle();

      if (profile) {
        setCreatorProfile(profile);
      }

      // Fetch natural role
      const { data: nrData } = await supabase
        .from("natural_roles")
        .select("description")
        .eq("user_id", data.creator_id)
        .maybeSingle();

      if (nrData?.description) {
        setNaturalRole(nrData.description);
      }

      // Check if user has already applied
      const { data: applicationData } = await supabase
        .from("startup_applications")
        .select("*")
        .eq("startup_id", id)
        .eq("applicant_id", user.id)
        .maybeSingle();

      if (applicationData) {
        setExistingApplication(applicationData);
      }

      // Check co-builder certification
      const { data: certData } = await supabase
        .from("user_certifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("certification_type", "cobuilder_b4")
        .maybeSingle();

      setHasCoBuilderCert(!!certData);

      // Fix 2: behavioral telemetry — viewed event (day-bucketed, idempotent).
      void emitOpportunityEvent("user_viewed_opportunity", {
        userId: user.id,
        opportunityId: id,
        category: "startup",
      });

      setLoading(false);
    };

    if (user) {
      fetchIdea();
    }
  }, [id, user, navigate]);

  const handleApply = async () => {
    if (!user || !idea) return;

    // Validate compensation
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

      setExistingApplication({
        id: appData.id,
        status: "pending",
        role_applied: selectedRole,
        cover_message: applyMessage,
        created_at: new Date().toISOString(),
      });
      setDialogOpen(false);

      // Fix 2: behavioral telemetry — applied event (single-shot, idempotent).
      void emitOpportunityEvent("user_applied_opportunity", {
        userId: user.id,
        opportunityId: idea.id,
        category: "startup",
        extra: { role: selectedRole || null, total_equity: timeEq + perfEq },
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!existingApplication || !idea) return;

    try {
      const { error } = await supabase
        .from("startup_applications")
        .delete()
        .eq("startup_id", idea.id)
        .eq("applicant_id", user?.id);

      if (error) throw error;

      setExistingApplication(null);
      toast({
        title: "Application Withdrawn",
        description: "Your application has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOwnIdea = user?.id === idea?.creator_id;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!idea) return null;

  const getApplicationStatusUI = () => {
    if (!existingApplication) return null;

    switch (existingApplication.status) {
      case "pending":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Application Pending</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {existingApplication.role_applied && (
                <>Applied for: <strong>{existingApplication.role_applied}</strong><br /></>
              )}
              Submitted on {formatDate(existingApplication.created_at)}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleWithdrawApplication}
              className="w-full"
            >
              Withdraw Application
            </Button>
          </div>
        );
      case "accepted":
        return (
          <div className="flex items-center gap-2 text-b4-teal">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Application Accepted!</span>
          </div>
        );
      case "rejected":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your previous application was not accepted. You may apply again with updated information.
            </p>
            <Button 
              variant="teal" 
              className="w-full"
              onClick={() => {
                setExistingApplication(null);
              }}
            >
              Apply Again
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Header */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-b4-teal/10 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-8 h-8 text-b4-teal" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {idea.sector && (
                    <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {idea.sector}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-b4-teal/10 text-sm font-medium text-b4-teal">
                    Looking for Co-Builders
                  </span>
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-3">
                  {idea.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>By {creatorProfile?.full_name || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Posted {formatDate(idea.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <div className="bg-card rounded-2xl border border-border p-8">
                  <h2 className="font-display text-xl font-bold text-foreground mb-4">
                    About This Opportunity
                  </h2>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {idea.description}
                  </p>
                </div>

                {/* Roles Needed */}
                {idea.roles_needed && idea.roles_needed.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">
                      Roles Needed
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {idea.roles_needed.map((role, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-3 p-4 rounded-xl bg-b4-teal/5 border border-b4-teal/20"
                        >
                          <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-b4-teal" />
                          </div>
                          <span className="font-medium text-foreground">{role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Fix 3: post-apply state surface — owns truth about lifecycle. */}
                {existingApplication && user && (
                  <OpportunityStatusPanel
                    userId={user.id}
                    opportunityId={idea.id}
                    category="startup"
                    source="startup_applications"
                    onChatRoute={`/chat/${existingApplication.id}`}
                  />
                )}
                {/* Apply Card */}
                {!isOwnIdea && (
                <div className="bg-gradient-to-br from-b4-teal/10 to-b4-navy/10 rounded-2xl border border-b4-teal/20 p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    Join This Startup
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Express your interest and connect with the initiator to discuss collaboration.
                  </p>
                  
                  {existingApplication ? (
                    getApplicationStatusUI()
                  ) : !hasCoBuilderCert ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-5 h-5" />
                        <span className="font-medium text-foreground">Certification Required</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Complete the Co-Builder learning journey to unlock applications.
                      </p>
                      <Button 
                        variant="teal" 
                        className="w-full"
                        onClick={() => navigate("/certifications?section=cobuilder")}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Learn to be a Co-Builder
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setDialogStep(1); }}>
                      <DialogTrigger asChild>
                        <Button variant="teal" className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Apply to Join
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        {dialogStep === 1 ? (
                          <>
                            <DialogHeader>
                              <DialogTitle>Apply to Join "{idea.title}"</DialogTitle>
                              <DialogDescription>
                                Step 1 of 2 — Tell the initiator about yourself and your interest.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              {idea.roles_needed && idea.roles_needed.length > 0 && (
                                <div className="space-y-2">
                                  <Label>Which role are you applying for?</Label>
                                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a role..." />
                                    </SelectTrigger>
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
                                <Textarea
                                  placeholder="Introduce yourself, share your relevant skills and experience..."
                                  value={applyMessage}
                                  onChange={(e) => setApplyMessage(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <Button
                                variant="teal"
                                className="w-full"
                                onClick={() => setDialogStep(2)}
                                disabled={!!(idea.roles_needed && idea.roles_needed.length > 0 && !selectedRole)}
                              >
                                Next: Compensation Proposal
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <DialogHeader>
                              <DialogTitle>Your Compensation Proposal</DialogTitle>
                              <DialogDescription>
                                Step 2 of 2 — Propose your equity and salary terms. The initiator can accept, counter-propose, or decline.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              {/* Time-Based Equity */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <Label className="text-sm font-medium">Time-Based Equity</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Retention incentive. Rule: Equity % = Cliff + Vesting years.
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">Equity %</Label>
                                    <Input type="number" placeholder="e.g. 5" value={timeEquity} onChange={(e) => setTimeEquity(e.target.value)} min="0" max="85" step="0.1" />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Cliff (years)</Label>
                                    <Input type="number" placeholder="1" value={cliffYears} onChange={(e) => setCliffYears(e.target.value)} min="0" max="4" />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Vesting (years)</Label>
                                    <Input type="number" placeholder="4" value={vestingYears} onChange={(e) => setVestingYears(e.target.value)} min="1" max="6" />
                                  </div>
                                </div>
                              </div>

                              {/* Performance-Based Equity */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-accent-foreground" />
                                  <Label className="text-sm font-medium">Performance-Based Equity</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Unlocks only after a board-verified milestone.
                                </p>
                                <div>
                                  <Label className="text-xs">Equity %</Label>
                                  <Input type="number" placeholder="e.g. 2" value={performanceEquity} onChange={(e) => setPerformanceEquity(e.target.value)} min="0" max="85" step="0.1" />
                                </div>
                                {(parseFloat(performanceEquity) || 0) > 0 && (
                                  <div>
                                    <Label className="text-xs">Milestone Description</Label>
                                    <Textarea placeholder="Describe the milestone..." value={performanceMilestone} onChange={(e) => setPerformanceMilestone(e.target.value)} className="min-h-[50px]" />
                                  </div>
                                )}
                              </div>

                              {/* Monthly Salary (Optional) */}
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

                              {/* Summary */}
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
                                  <ArrowLeft className="w-4 h-4 mr-2" />
                                  Back
                                </Button>
                                <Button
                                  variant="teal"
                                  className="flex-1"
                                  onClick={handleApply}
                                  disabled={applying}
                                >
                                  {applying ? "Sending..." : "Send Application"}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                )}

                {/* Initiator Card */}
                <div className="group rounded-2xl border border-border p-6 transition-all duration-300 relative flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">
                    About the Initiator
                  </h3>
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-b4-teal/10 flex items-center justify-center font-semibold text-lg ring-2 ring-background shadow-md overflow-hidden shrink-0">
                      {creatorProfile?.avatar_url ? (
                        <img
                          src={creatorProfile.avatar_url}
                          alt={creatorProfile.full_name || "Initiator"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-b4-teal" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-foreground">
                        {creatorProfile?.full_name || "Unknown"}
                      </h3>
                      <p className="text-sm text-muted-foreground">Initiator</p>
                    </div>
                  </div>

                  {/* Natural Role */}
                  {naturalRole && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span>Natural Role</span>
                      </div>
                      <p className="text-sm text-foreground italic line-clamp-2">
                        {naturalRole}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {creatorProfile?.primary_skills && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        <span>Skills</span>
                      </div>
                      {(() => {
                        const allSkills = parseSkills(creatorProfile.primary_skills);
                        const visible = allSkills.slice(0, 5);
                        const hidden = allSkills.slice(5);
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {visible.map((skill, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-b4-teal/10 text-b4-navy border border-b4-teal/30 hover:bg-b4-teal/20 transition-colors font-semibold text-xs px-2.5 py-0.5"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {hidden.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="text-muted-foreground border-dashed cursor-help text-xs px-2.5 py-0.5"
                                    >
                                      +{hidden.length} more
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{hidden.join(", ")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StartupOpportunityDetail;

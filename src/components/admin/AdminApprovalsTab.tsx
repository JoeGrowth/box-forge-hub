import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  RefreshCw, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Briefcase,
  Eye,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "@/lib/emailNotifications";

interface NaturalRoleDetails {
  description: string | null;
  is_ready: boolean;
  promise_check: boolean | null;
  practice_check: boolean | null;
  practice_entities: string | null;
  practice_case_studies: number | null;
  practice_needs_help: boolean | null;
  training_check: boolean | null;
  training_contexts: string | null;
  training_count: number | null;
  training_needs_help: boolean | null;
  consulting_check: boolean | null;
  consulting_with_whom: string | null;
  consulting_case_studies: string | null;
  wants_to_scale: boolean | null;
}

interface EntrepreneurialDetails {
  has_developed_project: boolean | null;
  project_description: string | null;
  project_count: number | null;
  project_needs_help: boolean | null;
  has_built_product: boolean | null;
  product_description: string | null;
  product_count: number | null;
  product_needs_help: boolean | null;
  has_run_business: boolean | null;
  business_description: string | null;
  business_count: number | null;
  business_needs_help: boolean | null;
  has_served_on_board: boolean | null;
  board_description: string | null;
  board_count: number | null;
  board_needs_help: boolean | null;
  is_completed: boolean | null;
}

interface PendingApproval {
  id: string;
  user_id: string;
  primary_role: string | null;
  potential_role: string | null;
  current_step: number;
  journey_status: string;
  created_at: string;
  updated_at: string;
  profile: {
    full_name: string | null;
    primary_skills: string | null;
    bio: string | null;
    years_of_experience: number | null;
  } | null;
  naturalRole: NaturalRoleDetails | null;
  entrepreneurialData: EntrepreneurialDetails | null;
}

interface AdminApprovalsTabProps {
  onRefresh: () => Promise<any>;
}

export const AdminApprovalsTab = ({ onRefresh }: AdminApprovalsTabProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      // Fetch onboarding states with pending_approval status AND step 9 (completed)
      const { data: onboardingData, error: onboardingError } = await supabase
        .from("onboarding_state")
        .select("*")
        .eq("journey_status", "pending_approval")
        .gte("current_step", 9);

      if (onboardingError) throw onboardingError;

      // Fetch profiles and natural roles for these users
      const userIds = onboardingData?.map(o => o.user_id) || [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, primary_skills, bio, years_of_experience")
        .in("user_id", userIds);

      const { data: naturalRoles } = await supabase
        .from("natural_roles")
        .select("user_id, description, is_ready, promise_check, practice_check, practice_entities, practice_case_studies, practice_needs_help, training_check, training_contexts, training_count, training_needs_help, consulting_check, consulting_with_whom, consulting_case_studies, wants_to_scale")
        .in("user_id", userIds);

      // Fetch entrepreneurial onboarding data
      const { data: entrepreneurialData } = await supabase
        .from("entrepreneurial_onboarding")
        .select("*")
        .in("user_id", userIds);

      // Combine data
      const combined: PendingApproval[] = (onboardingData || []).map(o => ({
        ...o,
        profile: profiles?.find(p => p.user_id === o.user_id) || null,
        naturalRole: naturalRoles?.find(n => n.user_id === o.user_id) || null,
        entrepreneurialData: entrepreneurialData?.find(e => e.user_id === o.user_id) || null,
      }));

      setPendingApprovals(combined);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPendingApprovals();
    await onRefresh();
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "Approvals list updated." });
  };

  const handleApprove = async (userId: string, userName: string | null, primaryRole: string | null, userEmail?: string) => {
    try {
      // Determine potential_role based on primary_role from onboarding
      const potentialRole = primaryRole === "entrepreneur" 
        ? "potential_entrepreneur" 
        : "potential_co_builder";

      const { error } = await supabase
        .from("onboarding_state")
        .update({ 
          journey_status: primaryRole === "entrepreneur" ? "entrepreneur_approved" : "approved",
          user_status: "approved",
          potential_role: potentialRole
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Create notification for user
      await supabase.from("user_notifications").insert({
        user_id: userId,
        notification_type: "approval_granted",
        title: "Application Approved!",
        message: "Your journey has been approved! You now have access to the Boosting page.",
        link: "/journey"
      });

      toast({
        title: "Approved!",
        description: `${userName || "User"} has been approved as ${potentialRole === "potential_entrepreneur" ? "Potential Entrepreneur" : "Potential Co-Builder"}.`,
      });

      fetchPendingApprovals();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (userId: string, userName: string | null) => {
    try {
      const { error } = await supabase
        .from("onboarding_state")
        .update({ journey_status: "rejected" })
        .eq("user_id", userId);

      if (error) throw error;

      await supabase.from("admin_notifications").insert({
        user_id: userId,
        notification_type: "approval_rejected",
        user_name: userName,
        step_name: "Approval",
        message: "Your Co-Builder application requires additional review. Please contact support.",
      });

      toast({
        title: "Rejected",
        description: `${userName || "User"}'s application has been rejected.`,
      });

      fetchPendingApprovals();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredApprovals = pendingApprovals.filter((approval) => {
    const name = approval.profile?.full_name?.toLowerCase() || "";
    const skills = approval.profile?.primary_skills?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || skills.includes(query);
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handlePreview = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setPreviewOpen(true);
  };

  // Enhanced status badge with detailed states
  const getStatusInfo = (
    checked: boolean | null, 
    needsHelp?: boolean,
    details?: string | number | null
  ): { status: string; color: string; icon: React.ReactNode } => {
    if (needsHelp) {
      return { 
        status: "Requested help", 
        color: "text-orange-600 bg-orange-100", 
        icon: <AlertCircle className="w-3 h-3" /> 
      };
    }
    if (checked === null) {
      return { 
        status: "Pending", 
        color: "text-amber-600 bg-amber-100", 
        icon: <Clock className="w-3 h-3" /> 
      };
    }
    if (checked === false) {
      return { 
        status: "Not needed", 
        color: "text-muted-foreground bg-muted", 
        icon: <XCircle className="w-3 h-3" /> 
      };
    }
    return { 
      status: "Completed", 
      color: "text-b4-teal bg-b4-teal/10", 
      icon: <CheckCircle className="w-3 h-3" /> 
    };
  };

  const DetailedStatusRow = ({ 
    label, 
    checked, 
    needsHelp,
    details 
  }: { 
    label: string; 
    checked: boolean | null; 
    needsHelp?: boolean;
    details?: string | number | null;
  }) => {
    const statusInfo = getStatusInfo(checked, needsHelp, details);
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-2">
          <span className={`p-1 rounded-full ${statusInfo.color}`}>
            {statusInfo.icon}
          </span>
          <div>
            <span className="font-medium text-foreground">{label}</span>
            {details && checked && (
              <p className="text-xs text-muted-foreground mt-0.5">{details}</p>
            )}
            {needsHelp && (
              <p className="text-xs text-orange-600 mt-0.5">Requested assistance</p>
            )}
            {checked === false && (
              <p className="text-xs text-muted-foreground mt-0.5">No experience yet</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className={statusInfo.color}>
          {statusInfo.status}
        </Badge>
      </div>
    );
  };

  const StatusBadge = ({ checked, label }: { checked: boolean | null; label: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      {checked ? (
        <Badge variant="default" className="bg-b4-teal text-white">
          <CheckCircle className="w-3 h-3 mr-1" /> Complete
        </Badge>
      ) : (
        <Badge variant="secondary">
          <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
        </Badge>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Pending Approvals List */}
      {filteredApprovals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No pending approvals at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-b4-teal/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-b4-teal" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {approval.profile?.full_name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Applied {formatDate(approval.updated_at)}
                        {" · "}
                        <Badge variant="outline" className="ml-1 text-xs">
                          {approval.primary_role === "entrepreneur" ? "Entrepreneurial" : "Professional"}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  {approval.profile?.primary_skills && (
                    <div className="flex items-center gap-2 mt-3">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {approval.profile.primary_skills}
                      </span>
                    </div>
                  )}

                  {approval.primary_role === "entrepreneur" ? (
                    approval.entrepreneurialData?.is_completed ? (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-foreground italic">
                          Entrepreneurial journey completed
                        </p>
                      </div>
                    ) : null
                  ) : approval.naturalRole?.description ? (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-foreground italic">
                        "{approval.naturalRole.description}"
                      </p>
                    </div>
                  ) : approval.naturalRole && !approval.naturalRole.is_ready ? (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Needs help defining Natural Role
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 mt-3">
                    {approval.primary_role === "entrepreneur" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Entrepreneur
                      </span>
                    ) : approval.naturalRole?.is_ready ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Needs Review
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Step {approval.current_step}/9
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(approval)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(approval.user_id, approval.profile?.full_name)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() => handleApprove(approval.user_id, approval.profile?.full_name, approval.primary_role)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredApprovals.length} pending approval{filteredApprovals.length !== 1 ? "s" : ""}
      </p>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-b4-teal" />
              {selectedApproval?.primary_role === "entrepreneur" ? "Entrepreneur" : "Co-Builder"} Profile Review - {selectedApproval?.profile?.full_name || "Unknown User"}
            </DialogTitle>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-6 py-4">
              {/* Profile Information */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-b4-teal" />
                  Profile Information
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      <p className="text-sm text-foreground mt-1">
                        {selectedApproval.profile?.full_name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                      <p className="text-sm text-foreground mt-1">
                        {selectedApproval.profile?.years_of_experience || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Primary Skills</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedApproval.profile?.primary_skills || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedApproval.profile?.bio || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Path Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {selectedApproval.primary_role === "entrepreneur" ? "🚀 Entrepreneurial Journey" : "💼 Professional Journey"}
                </Badge>
              </div>

              {/* Professional Journey content */}
              {selectedApproval.primary_role !== "entrepreneur" && (
                <>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-b4-teal" />
                      Natural Role
                    </h4>
                    <p className="text-sm text-foreground italic bg-background/50 p-3 rounded-lg">
                      "{selectedApproval.naturalRole?.description || "Not provided"}"
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <h4 className="font-semibold text-foreground mb-3">Current Status</h4>
                    <div className="space-y-1">
                      <DetailedStatusRow 
                        label="Natural Role Definition" 
                        checked={!!selectedApproval.naturalRole?.description} 
                        details={selectedApproval.naturalRole?.description}
                      />
                      <DetailedStatusRow 
                        label="Promise to Deliver" 
                        checked={selectedApproval.naturalRole?.promise_check} 
                      />
                      <DetailedStatusRow 
                        label="Practice Experience" 
                        checked={selectedApproval.naturalRole?.practice_check}
                        needsHelp={!!selectedApproval.naturalRole?.practice_needs_help}
                        details={selectedApproval.naturalRole?.practice_case_studies 
                          ? `${selectedApproval.naturalRole.practice_case_studies} case studies with ${selectedApproval.naturalRole.practice_entities || 'various entities'}`
                          : undefined}
                      />
                      <DetailedStatusRow 
                        label="Training Experience" 
                        checked={selectedApproval.naturalRole?.training_check}
                        needsHelp={!!selectedApproval.naturalRole?.training_needs_help}
                        details={selectedApproval.naturalRole?.training_count 
                          ? `${selectedApproval.naturalRole.training_count} trainings in ${selectedApproval.naturalRole.training_contexts || 'various contexts'}`
                          : undefined}
                      />
                      <DetailedStatusRow 
                        label="Consulting Experience" 
                        checked={selectedApproval.naturalRole?.consulting_check}
                        details={selectedApproval.naturalRole?.consulting_with_whom 
                          ? `With ${selectedApproval.naturalRole.consulting_with_whom}`
                          : undefined}
                      />
                      <DetailedStatusRow 
                        label="Scaling Interest" 
                        checked={selectedApproval.naturalRole?.wants_to_scale}
                        details={selectedApproval.naturalRole?.wants_to_scale 
                          ? "Interested in scaling" 
                          : undefined}
                      />
                    </div>
                  </div>

                  {selectedApproval.naturalRole?.practice_check && (
                    <div className="bg-muted/30 rounded-xl p-4 border border-border">
                      <h4 className="font-semibold text-foreground mb-3">Practice Experience</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Entities/Organizations</Label>
                          <p className="text-sm text-foreground mt-1">
                            {selectedApproval.naturalRole?.practice_entities || "Not provided"}
                          </p>
                        </div>
                        {selectedApproval.naturalRole?.practice_case_studies && (
                          <p className="text-xs text-muted-foreground">
                            Case studies: {selectedApproval.naturalRole.practice_case_studies}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedApproval.naturalRole?.training_check && (
                    <div className="bg-muted/30 rounded-xl p-4 border border-border">
                      <h4 className="font-semibold text-foreground mb-3">Training Experience</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Training Contexts</Label>
                          <p className="text-sm text-foreground mt-1">
                            {selectedApproval.naturalRole?.training_contexts || "Not provided"}
                          </p>
                        </div>
                        {selectedApproval.naturalRole?.training_count && (
                          <p className="text-xs text-muted-foreground">
                            Training count: {selectedApproval.naturalRole.training_count}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedApproval.naturalRole?.consulting_check && (
                    <div className="bg-muted/30 rounded-xl p-4 border border-border">
                      <h4 className="font-semibold text-foreground mb-3">Consulting Experience</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Consulted With</Label>
                          <p className="text-sm text-foreground mt-1">
                            {selectedApproval.naturalRole?.consulting_with_whom || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Case Studies</Label>
                          <p className="text-sm text-foreground mt-1">
                            {selectedApproval.naturalRole?.consulting_case_studies || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Interested in Scaling</span>
                      <Badge variant={selectedApproval.naturalRole?.wants_to_scale ? "default" : "secondary"}>
                        {selectedApproval.naturalRole?.wants_to_scale ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </>
              )}

              {/* Entrepreneurial Journey content */}
              {selectedApproval.primary_role === "entrepreneur" && (
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <h4 className="font-semibold text-foreground mb-3">Entrepreneurial Track Record</h4>
                  <div className="space-y-1">
                    <DetailedStatusRow 
                      label="Project Development" 
                      checked={selectedApproval.entrepreneurialData?.has_developed_project ?? null}
                      needsHelp={!!selectedApproval.entrepreneurialData?.project_needs_help}
                      details={selectedApproval.entrepreneurialData?.has_developed_project 
                        ? `${selectedApproval.entrepreneurialData.project_count || 0} project(s) — ${selectedApproval.entrepreneurialData.project_description || "No description"}`
                        : undefined}
                    />
                    <DetailedStatusRow 
                      label="Product Building" 
                      checked={selectedApproval.entrepreneurialData?.has_built_product ?? null}
                      needsHelp={!!selectedApproval.entrepreneurialData?.product_needs_help}
                      details={selectedApproval.entrepreneurialData?.has_built_product 
                        ? `${selectedApproval.entrepreneurialData.product_count || 0} product(s) — ${selectedApproval.entrepreneurialData.product_description || "No description"}`
                        : undefined}
                    />
                    <DetailedStatusRow 
                      label="Business Experience" 
                      checked={selectedApproval.entrepreneurialData?.has_run_business ?? null}
                      needsHelp={!!selectedApproval.entrepreneurialData?.business_needs_help}
                      details={selectedApproval.entrepreneurialData?.has_run_business 
                        ? `${selectedApproval.entrepreneurialData.business_count || 0} business(es) — ${selectedApproval.entrepreneurialData.business_description || "No description"}`
                        : undefined}
                    />
                    <DetailedStatusRow 
                      label="Board Service" 
                      checked={selectedApproval.entrepreneurialData?.has_served_on_board ?? null}
                      needsHelp={!!selectedApproval.entrepreneurialData?.board_needs_help}
                      details={selectedApproval.entrepreneurialData?.has_served_on_board 
                        ? `${selectedApproval.entrepreneurialData.board_count || 0} board(s) — ${selectedApproval.entrepreneurialData.board_description || "No description"}`
                        : undefined}
                    />
                  </div>
                </div>
              )}

              {/* Readiness Status */}
              <div className="flex items-center justify-center gap-2 py-2">
                {selectedApproval.primary_role === "entrepreneur" ? (
                  <Badge className="bg-b4-teal text-white px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" /> Entrepreneurial Journey Complete
                  </Badge>
                ) : selectedApproval.naturalRole?.is_ready ? (
                  <Badge className="bg-b4-teal text-white px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" /> Ready for Approval
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-4 py-2">
                    <AlertCircle className="w-4 h-4 mr-2" /> Needs Review
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    handleReject(selectedApproval.user_id, selectedApproval.profile?.full_name);
                    setPreviewOpen(false);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="teal"
                  className="flex-1"
                  onClick={() => {
                    handleApprove(selectedApproval.user_id, selectedApproval.profile?.full_name, selectedApproval.primary_role);
                    setPreviewOpen(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

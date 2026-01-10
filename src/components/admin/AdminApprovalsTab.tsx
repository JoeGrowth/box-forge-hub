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
  training_check: boolean | null;
  training_contexts: string | null;
  training_count: number | null;
  consulting_check: boolean | null;
  consulting_with_whom: string | null;
  consulting_case_studies: string | null;
  wants_to_scale: boolean | null;
}

interface PendingApproval {
  id: string;
  user_id: string;
  primary_role: string | null;
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
      // Fetch onboarding states with pending_approval status AND step 8 (completed)
      const { data: onboardingData, error: onboardingError } = await supabase
        .from("onboarding_state")
        .select("*")
        .eq("journey_status", "pending_approval")
        .eq("current_step", 8);

      if (onboardingError) throw onboardingError;

      // Fetch profiles and natural roles for these users
      const userIds = onboardingData?.map(o => o.user_id) || [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, primary_skills, bio, years_of_experience")
        .in("user_id", userIds);

      const { data: naturalRoles } = await supabase
        .from("natural_roles")
        .select("user_id, description, is_ready, promise_check, practice_check, practice_entities, practice_case_studies, training_check, training_contexts, training_count, consulting_check, consulting_with_whom, consulting_case_studies, wants_to_scale")
        .in("user_id", userIds);

      // Combine data
      const combined: PendingApproval[] = (onboardingData || []).map(o => ({
        ...o,
        profile: profiles?.find(p => p.user_id === o.user_id) || null,
        naturalRole: naturalRoles?.find(n => n.user_id === o.user_id) || null,
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

                  {approval.naturalRole?.description && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-foreground italic">
                        "{approval.naturalRole.description}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {approval.naturalRole?.is_ready ? (
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
                      Step {approval.current_step}/8
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
              Co-Builder Profile Review - {selectedApproval?.profile?.full_name || "Unknown User"}
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

              {/* Natural Role Description */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-b4-teal" />
                  Natural Role
                </h4>
                <p className="text-sm text-foreground italic bg-background/50 p-3 rounded-lg">
                  "{selectedApproval.naturalRole?.description || "Not provided"}"
                </p>
              </div>

              {/* Assessment Status Grid */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3">Maturity Assessment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <StatusBadge checked={selectedApproval.naturalRole?.promise_check} label="Promise" />
                  <StatusBadge checked={selectedApproval.naturalRole?.practice_check} label="Practice" />
                  <StatusBadge checked={selectedApproval.naturalRole?.training_check} label="Training" />
                  <StatusBadge checked={selectedApproval.naturalRole?.consulting_check} label="Consulting" />
                </div>
              </div>

              {/* Practice Details */}
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

              {/* Training Details */}
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

              {/* Consulting Details */}
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

              {/* Scaling Interest */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Interested in Scaling</span>
                  <Badge variant={selectedApproval.naturalRole?.wants_to_scale ? "default" : "secondary"}>
                    {selectedApproval.naturalRole?.wants_to_scale ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              {/* Readiness Status */}
              <div className="flex items-center justify-center gap-2 py-2">
                {selectedApproval.naturalRole?.is_ready ? (
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

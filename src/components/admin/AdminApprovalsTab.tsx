import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  } | null;
  naturalRole: {
    description: string | null;
    is_ready: boolean;
  } | null;
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
        .select("user_id, full_name, primary_skills")
        .in("user_id", userIds);

      const { data: naturalRoles } = await supabase
        .from("natural_roles")
        .select("user_id, description, is_ready")
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

  const handleApprove = async (userId: string, userName: string | null) => {
    try {
      const { error } = await supabase
        .from("onboarding_state")
        .update({ journey_status: "approved" })
        .eq("user_id", userId);

      if (error) throw error;

      // Create notification for user (could be extended to send email)
      await supabase.from("admin_notifications").insert({
        user_id: userId,
        notification_type: "journey_approved",
        user_name: userName,
        step_name: "Approval",
        message: "Your Co-Builder journey has been approved! You now have full access to the platform.",
      });

      toast({
        title: "Approved!",
        description: `${userName || "User"} has been approved as a Co-Builder.`,
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
        notification_type: "journey_rejected",
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(approval.user_id, approval.profile?.full_name)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() => handleApprove(approval.user_id, approval.profile?.full_name)}
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
    </div>
  );
};

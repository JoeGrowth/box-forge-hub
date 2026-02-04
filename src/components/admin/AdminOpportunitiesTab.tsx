import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "@/lib/emailNotifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Search,
  Check,
  Lock,
  Rocket,
  User,
  Calendar,
  Eye,
  XCircle,
  Edit,
  Trash2,
} from "lucide-react";

interface OpportunityWithCreator {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  roles_needed: string[] | null;
  status: string;
  review_status: string;
  created_at: string;
  creator_id: string;
  creator_profile?: {
    full_name: string | null;
    primary_skills: string | null;
  };
  onboarding_state?: {
    journey_status: string | null;
    current_step: number;
    primary_role: string | null;
  };
}

interface AdminOpportunitiesTabProps {
  onRefresh: () => void;
}

export function AdminOpportunitiesTab({ onRefresh }: AdminOpportunitiesTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "all">("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [stayPrivateDialog, setStayPrivateDialog] = useState<OpportunityWithCreator | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<OpportunityWithCreator | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  const fetchOpportunities = async () => {
    setLoading(true);
    
    // Build query based on filter
    let query = supabase
      .from("startup_ideas")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter === "pending") {
      query = query.in("review_status", ["pending", "under_review"]);
    } else if (statusFilter === "approved") {
      query = query.eq("review_status", "approved");
    }
    // "all" shows everything

    const { data: ideas, error } = await query;

    if (error) {
      console.error("Error fetching opportunities:", error);
      setLoading(false);
      return;
    }

    if (!ideas || ideas.length === 0) {
      setOpportunities([]);
      setLoading(false);
      return;
    }

    // Fetch creator profiles and onboarding states
    const creatorIds = ideas.map((i) => i.creator_id);
    
    const [profilesRes, onboardingRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, primary_skills").in("user_id", creatorIds),
      supabase.from("onboarding_state").select("user_id, journey_status, current_step, primary_role").in("user_id", creatorIds),
    ]);

    const opportunitiesWithData = ideas.map((idea) => ({
      ...idea,
      creator_profile: profilesRes.data?.find((p) => p.user_id === idea.creator_id),
      onboarding_state: onboardingRes.data?.find((o) => o.user_id === idea.creator_id),
    }));

    setOpportunities(opportunitiesWithData);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOpportunities();
    onRefresh();
    setRefreshing(false);
    toast({ title: "Opportunities refreshed" });
  };

  const handleApprove = async (opportunity: OpportunityWithCreator) => {
    setProcessing(true);
    try {
      // Update startup idea review status
      const { error: ideaError } = await supabase
        .from("startup_ideas")
        .update({ 
          review_status: "approved",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", opportunity.id);

      if (ideaError) throw ideaError;

      // Update onboarding state to unlock entrepreneur journey
      const { error: onboardingError } = await supabase
        .from("onboarding_state")
        .update({ 
          entrepreneur_step: 1,
          journey_status: "entrepreneur_approved"
        })
        .eq("user_id", opportunity.creator_id);

      if (onboardingError) throw onboardingError;

      // Grant cobuilder role if not already present
      await supabase
        .from("user_roles")
        .insert({
          user_id: opportunity.creator_id,
          role: "cobuilder" as const
        });

      // Grant entrepreneur role (initiator) if not already present
      await supabase
        .from("user_roles")
        .insert({
          user_id: opportunity.creator_id,
          role: "entrepreneur" as const
        });

      // Create notification for user
      await supabase.from("admin_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: "opportunity_approved",
        user_name: opportunity.creator_profile?.full_name,
        message: `Your opportunity "${opportunity.title}" has been approved and is now visible to all co-builders! You are now a Co-Builder and Initiator.`,
      });

      toast({
        title: "Opportunity Approved",
        description: "The opportunity is now public. User granted Co-Builder and Initiator roles.",
      });

      fetchOpportunities();
    } catch (error: any) {
      toast({
        title: "Error approving opportunity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStayPrivate = async (opportunity: OpportunityWithCreator, action: "declined" | "to_be_enhanced") => {
    setProcessing(true);
    try {
      const newStatus = action === "declined" ? "declined" : "needs_enhancement";
      const message = action === "declined" 
        ? `Your opportunity "${opportunity.title}" has been declined.`
        : `Your opportunity "${opportunity.title}" needs enhancement. Please review and resubmit.`;

      const { error } = await supabase
        .from("startup_ideas")
        .update({ 
          review_status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", opportunity.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from("admin_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: action === "declined" ? "opportunity_declined" : "opportunity_needs_enhancement",
        user_name: opportunity.creator_profile?.full_name,
        message,
      });

      toast({
        title: action === "declined" ? "Opportunity Declined" : "Enhancement Requested",
        description: "The initiator has been notified.",
        variant: action === "declined" ? "destructive" : "default",
      });

      setStayPrivateDialog(null);
      fetchOpportunities();
    } catch (error: any) {
      toast({
        title: "Error updating opportunity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (opportunity: OpportunityWithCreator) => {
    setProcessing(true);
    try {
      // Delete the startup idea
      const { error } = await supabase
        .from("startup_ideas")
        .delete()
        .eq("id", opportunity.id);

      if (error) throw error;

      toast({
        title: "Opportunity Deleted",
        description: `"${opportunity.title}" has been permanently deleted.`,
      });

      setDeleteDialog(null);
      fetchOpportunities();
    } catch (error: any) {
      toast({
        title: "Error deleting opportunity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      opp.title.toLowerCase().includes(searchLower) ||
      opp.description.toLowerCase().includes(searchLower) ||
      opp.creator_profile?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading opportunities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-x border-border ${
                statusFilter === "approved"
                  ? "bg-b4-teal text-white"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setStatusFilter("approved")}
            >
              Approved
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-b4-navy text-white"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredOpportunities.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
          <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {statusFilter === "pending" 
              ? "No opportunities pending review" 
              : statusFilter === "approved" 
              ? "No approved opportunities" 
              : "No opportunities found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-card rounded-xl border border-border p-6 hover:border-b4-teal/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-b4-teal" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">{opp.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{opp.creator_profile?.full_name || "Unknown"}</span>
                        {opp.sector && (
                          <>
                            <span>•</span>
                            <span>{opp.sector}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {opp.description}
                  </p>

                  {/* Creator Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="px-2 py-0.5 rounded-full bg-b4-teal/10 text-b4-teal text-xs font-medium">
                        Co-Builder
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                        Initiator
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        opp.review_status === "approved" 
                          ? "bg-b4-teal/10 text-b4-teal"
                          : opp.review_status === "declined"
                          ? "bg-red-500/10 text-red-600"
                          : opp.review_status === "needs_enhancement"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {opp.review_status === "approved" ? "Approved" 
                          : opp.review_status === "declined" ? "Declined"
                          : opp.review_status === "needs_enhancement" ? "Needs Enhancement"
                          : "Pending Review"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(opp.created_at)}</span>
                    </div>
                  </div>

                  {/* Roles Needed */}
                  {opp.roles_needed && opp.roles_needed.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Looking for co-builders:</p>
                      <div className="flex flex-wrap gap-1">
                        {opp.roles_needed.map((role, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {opp.creator_profile?.primary_skills && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Skills: {opp.creator_profile.primary_skills}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/admin/opportunity/${opp.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  {opp.review_status !== "approved" && (
                    <>
                      <Button 
                        variant="teal" 
                        size="sm" 
                        onClick={() => handleApprove(opp)}
                        disabled={processing}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setStayPrivateDialog(opp)}
                        disabled={processing}
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        Stay Private
                      </Button>
                    </>
                  )}
                  {opp.review_status === "approved" && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setDeleteDialog(opp)}
                      disabled={processing}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredOpportunities.length} {statusFilter === "all" ? "" : statusFilter} opportunity
        {filteredOpportunities.length !== 1 ? "ies" : "y"}
        {filteredOpportunities.length !== 1 ? "ies" : "y"} pending review
      </p>

      {/* Stay Private Dialog */}
      <Dialog open={!!stayPrivateDialog} onOpenChange={() => setStayPrivateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keep Opportunity Private</DialogTitle>
            <DialogDescription>
              Choose an action for "{stayPrivateDialog?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant="destructive"
              onClick={() => stayPrivateDialog && handleStayPrivate(stayPrivateDialog, "declined")}
              disabled={processing}
              className="w-full justify-start"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Declined - Opportunity is not suitable
            </Button>
            <Button
              variant="outline"
              onClick={() => stayPrivateDialog && handleStayPrivate(stayPrivateDialog, "to_be_enhanced")}
              disabled={processing}
              className="w-full justify-start"
            >
              <Edit className="w-4 h-4 mr-2" />
              To Be Enhanced - Needs improvements
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{deleteDialog?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              disabled={processing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
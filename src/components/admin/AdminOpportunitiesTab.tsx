import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Search,
  Check,
  X,
  Rocket,
  User,
  Calendar,
  ExternalLink,
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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityWithCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    
    // Fetch all startup ideas pending review
    const { data: ideas, error } = await supabase
      .from("startup_ideas")
      .select("*")
      .in("review_status", ["pending", "under_review"])
      .order("created_at", { ascending: false });

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

      // Grant entrepreneur role if not already present
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: opportunity.creator_id,
          role: "entrepreneur" as const
        });

      // Ignore duplicate role error
      if (roleError && !roleError.message.includes("duplicate")) {
        console.warn("Role insert warning:", roleError.message);
      }

      // Create notification for user
      await supabase.from("admin_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: "opportunity_approved",
        user_name: opportunity.creator_profile?.full_name,
        message: `Your opportunity "${opportunity.title}" has been approved! You can now start your entrepreneur journey.`,
      });

      toast({
        title: "Opportunity Approved",
        description: "The initiator can now access the entrepreneur journey steps.",
      });

      fetchOpportunities();
    } catch (error: any) {
      toast({
        title: "Error approving opportunity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (opportunity: OpportunityWithCreator) => {
    try {
      const { error } = await supabase
        .from("startup_ideas")
        .update({ 
          review_status: "rejected",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", opportunity.id);

      if (error) throw error;

      // Create notification for user
      await supabase.from("admin_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: "opportunity_rejected",
        user_name: opportunity.creator_profile?.full_name,
        message: `Your opportunity "${opportunity.title}" needs revision. Please contact admin for more details.`,
      });

      toast({
        title: "Opportunity Rejected",
        description: "The initiator will be notified.",
        variant: "destructive",
      });

      fetchOpportunities();
    } catch (error: any) {
      toast({
        title: "Error rejecting opportunity",
        description: error.message,
        variant: "destructive",
      });
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
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty State */}
      {filteredOpportunities.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
          <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No opportunities pending review</p>
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
                      <span className="text-muted-foreground">Journey:</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">
                        Pending Approval
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
                  <Button variant="teal" size="sm" onClick={() => handleApprove(opp)}>
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReject(opp)}>
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredOpportunities.length} opportunity
        {filteredOpportunities.length !== 1 ? "ies" : "y"} pending review
      </p>
    </div>
  );
}
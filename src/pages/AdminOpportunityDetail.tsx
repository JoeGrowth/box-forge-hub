import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
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
  ArrowLeft,
  Rocket,
  User,
  Calendar,
  MapPin,
  Check,
  X,
  FileText,
  Briefcase,
  Target,
  AlertCircle,
  Lock,
  XCircle,
  Edit,
} from "lucide-react";

interface OpportunityDetails {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  roles_needed: string[] | null;
  status: string;
  review_status: string;
  admin_notes: string | null;
  created_at: string;
  creator_id: string;
}

interface CreatorProfile {
  full_name: string | null;
  primary_skills: string | null;
  bio: string | null;
  years_of_experience: number | null;
}

interface CreatorOnboarding {
  journey_status: string | null;
  current_step: number;
  primary_role: string | null;
}

interface NaturalRole {
  description: string | null;
  status: string | null;
  is_ready: boolean;
}

interface EntrepreneurJourneyResponses {
  vision: string | null;
  problem: string | null;
  market: string | null;
  business_model: string | null;
  roles_needed: string | null;
  cobuilder_plan: string | null;
  execution_plan: string | null;
}

const AdminOpportunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [opportunity, setOpportunity] = useState<OpportunityDetails | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorOnboarding, setCreatorOnboarding] = useState<CreatorOnboarding | null>(null);
  const [creatorNaturalRole, setCreatorNaturalRole] = useState<NaturalRole | null>(null);
  const [journeyResponses, setJourneyResponses] = useState<EntrepreneurJourneyResponses | null>(null);
  const [creatorEmail, setCreatorEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showStayPrivateDialog, setShowStayPrivateDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate("/", { replace: true });
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    const fetchOpportunityDetails = async () => {
      if (!id) return;

      setLoading(true);

      // Fetch opportunity
      const { data: oppData, error: oppError } = await supabase
        .from("startup_ideas")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (oppError || !oppData) {
        console.error("Error fetching opportunity:", oppError);
        setLoading(false);
        return;
      }

      setOpportunity(oppData);
      setAdminNotes(oppData.admin_notes || "");

      // Fetch creator profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, primary_skills, bio, years_of_experience")
        .eq("user_id", oppData.creator_id)
        .maybeSingle();

      if (profileData) {
        setCreatorProfile(profileData);
      }

      // Fetch creator onboarding state
      const { data: onboardingData } = await supabase
        .from("onboarding_state")
        .select("journey_status, current_step, primary_role")
        .eq("user_id", oppData.creator_id)
        .maybeSingle();

      if (onboardingData) {
        setCreatorOnboarding(onboardingData);
      }

      // Fetch creator natural role
      const { data: nrData } = await supabase
        .from("natural_roles")
        .select("description, status, is_ready")
        .eq("user_id", oppData.creator_id)
        .maybeSingle();

      if (nrData) {
        setCreatorNaturalRole(nrData);
      }

      // Fetch entrepreneur journey responses for this idea
      const { data: journeyData } = await supabase
        .from("entrepreneur_journey_responses")
        .select("vision, problem, market, business_model, roles_needed, cobuilder_plan, execution_plan")
        .eq("idea_id", oppData.id)
        .maybeSingle();

      if (journeyData) {
        setJourneyResponses(journeyData);
      }

      setLoading(false);
    };

    if (isAdmin) {
      fetchOpportunityDetails();
    }
  }, [id, isAdmin]);

  const handleSaveNotes = async () => {
    if (!opportunity) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("startup_ideas")
        .update({ admin_notes: adminNotes })
        .eq("id", opportunity.id);

      if (error) throw error;

      toast({
        title: "Notes Saved",
        description: "Admin notes have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!opportunity || !creatorProfile) return;

    setApproving(true);
    try {
      // Update opportunity
      const { error: oppError } = await supabase
        .from("startup_ideas")
        .update({
          review_status: "approved",
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq("id", opportunity.id);

      if (oppError) throw oppError;

      // Update onboarding state
      const { error: onboardingError } = await supabase
        .from("onboarding_state")
        .update({
          entrepreneur_step: 1,
          journey_status: "entrepreneur_approved",
        })
        .eq("user_id", opportunity.creator_id);

      if (onboardingError) throw onboardingError;

      // Grant cobuilder role
      await supabase
        .from("user_roles")
        .insert({
          user_id: opportunity.creator_id,
          role: "cobuilder" as const,
        });

      // Grant entrepreneur role (initiator)
      await supabase
        .from("user_roles")
        .insert({
          user_id: opportunity.creator_id,
          role: "entrepreneur" as const,
        });

      // Create notification
      await supabase.from("admin_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: "opportunity_approved",
        user_name: creatorProfile.full_name,
        message: `Your opportunity "${opportunity.title}" has been approved and is now visible to all co-builders! You are now a Co-Builder and Initiator.`,
      });

      // Send email notification (async, don't block)
      if (creatorEmail) {
        sendNotificationEmail({
          to: creatorEmail,
          userName: creatorProfile.full_name || "User",
          type: "opportunity_approved",
          data: { ideaTitle: opportunity.title },
        });
      }

      toast({
        title: "Opportunity Approved",
        description: "The opportunity is now public. User granted Co-Builder and Initiator roles.",
      });

      navigate("/admin");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleStayPrivate = async (action: "declined" | "to_be_enhanced") => {
    if (!opportunity || !creatorProfile) return;

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
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq("id", opportunity.id);

      if (error) throw error;

      // Create user notification (visible to the user)
      await supabase.from("user_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: action === "declined" ? "opportunity_declined" : "opportunity_needs_enhancement",
        title: action === "declined" ? "Opportunity Declined" : "Enhancement Requested",
        message,
        link: action === "to_be_enhanced" ? `/edit-idea/${opportunity.id}` : null,
      });

      // Also create admin notification for tracking
      await supabase.from("admin_notifications").insert({
        user_id: opportunity.creator_id,
        notification_type: action === "declined" ? "opportunity_declined" : "opportunity_needs_enhancement",
        user_name: creatorProfile.full_name,
        message,
      });

      // Send email notification
      if (creatorEmail) {
        sendNotificationEmail({
          to: creatorEmail,
          userName: creatorProfile.full_name || "User",
          type: action === "declined" ? "opportunity_declined" : "opportunity_needs_enhancement",
          data: { ideaTitle: opportunity.title },
        });
      }

      toast({
        title: action === "declined" ? "Opportunity Declined" : "Enhancement Requested",
        description: "The initiator has been notified.",
        variant: action === "declined" ? "destructive" : "default",
      });

      setShowStayPrivateDialog(false);
      navigate("/admin");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Opportunity Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The opportunity you're looking for doesn't exist or has been removed.
            </p>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <section className="py-8 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="mb-4 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Opportunity Review</h1>
            </div>
            <p className="text-primary-foreground/80">
              Review and manage startup opportunity submissions
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Opportunity Details */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-b4-teal/10 flex items-center justify-center">
                        <Rocket className="w-6 h-6 text-b4-teal" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          {opportunity.title}
                        </h2>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            opportunity.review_status === "approved"
                              ? "bg-b4-teal/10 text-b4-teal"
                              : opportunity.review_status === "rejected"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {opportunity.review_status === "under_review"
                            ? "Under Review"
                            : opportunity.review_status.charAt(0).toUpperCase() +
                              opportunity.review_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </h3>
                      <p className="text-foreground">{opportunity.description}</p>
                    </div>

                    {opportunity.sector && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{opportunity.sector}</span>
                      </div>
                    )}

                    {opportunity.roles_needed && opportunity.roles_needed.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Roles Needed
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.roles_needed.map((role, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-sm"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Submitted {formatDate(opportunity.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Entrepreneur Journey Responses */}
                {journeyResponses && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-b4-teal" />
                      Initiator's Idea Development Answers
                    </h3>
                    <div className="space-y-5">
                      {journeyResponses.vision && (
                        <div>
                          <h4 className="text-sm font-medium text-b4-teal mb-1">Vision</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.vision}
                          </p>
                        </div>
                      )}
                      {journeyResponses.problem && (
                        <div>
                          <h4 className="text-sm font-medium text-b4-coral mb-1">Problem</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.problem}
                          </p>
                        </div>
                      )}
                      {journeyResponses.market && (
                        <div>
                          <h4 className="text-sm font-medium text-amber-600 mb-1">Market</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.market}
                          </p>
                        </div>
                      )}
                      {journeyResponses.business_model && (
                        <div>
                          <h4 className="text-sm font-medium text-purple-600 mb-1">Business Model</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.business_model}
                          </p>
                        </div>
                      )}
                      {journeyResponses.roles_needed && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-600 mb-1">Roles Needed</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.roles_needed}
                          </p>
                        </div>
                      )}
                      {journeyResponses.cobuilder_plan && (
                        <div>
                          <h4 className="text-sm font-medium text-green-600 mb-1">Co-Builder Plan</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.cobuilder_plan}
                          </p>
                        </div>
                      )}
                      {journeyResponses.execution_plan && (
                        <div>
                          <h4 className="text-sm font-medium text-indigo-600 mb-1">Execution Plan</h4>
                          <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">
                            {journeyResponses.execution_plan}
                          </p>
                        </div>
                      )}
                    </div>
                    {!journeyResponses.vision && !journeyResponses.problem && !journeyResponses.market && 
                     !journeyResponses.business_model && !journeyResponses.roles_needed && 
                     !journeyResponses.cobuilder_plan && !journeyResponses.execution_plan && (
                      <p className="text-muted-foreground text-sm italic">
                        No journey responses submitted yet.
                      </p>
                    )}
                  </div>
                )}

                {/* Admin Notes */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    Admin Notes
                  </h3>
                  <div className="space-y-4">
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this opportunity (visible to admins only)..."
                      rows={5}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                {opportunity.review_status !== "approved" && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Actions</h3>
                    <div className="flex gap-4">
                      <Button
                        variant="teal"
                        onClick={handleApprove}
                        disabled={approving || processing}
                        className="flex-1"
                      >
                        {approving ? (
                          "Approving..."
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowStayPrivateDialog(true)}
                        disabled={approving || processing}
                        className="flex-1"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Stay Private
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar - Creator Info */}
              <div className="space-y-6">
                {/* Creator Profile */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    Creator Profile
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-foreground font-medium">
                        {creatorProfile?.full_name || "Unknown"}
                      </p>
                    </div>

                    {creatorProfile?.primary_skills && (
                      <div>
                        <p className="text-sm text-muted-foreground">Skills</p>
                        <p className="text-foreground">{creatorProfile.primary_skills}</p>
                      </div>
                    )}

                    {creatorProfile?.years_of_experience && (
                      <div>
                        <p className="text-sm text-muted-foreground">Experience</p>
                        <p className="text-foreground">
                          {creatorProfile.years_of_experience} years
                        </p>
                      </div>
                    )}

                    {creatorProfile?.bio && (
                      <div>
                        <p className="text-sm text-muted-foreground">Bio</p>
                        <p className="text-foreground text-sm">{creatorProfile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Journey Status */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-muted-foreground" />
                    Journey Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <span className="px-2 py-0.5 rounded-full bg-b4-teal/10 text-b4-teal text-xs font-medium">
                        {creatorOnboarding?.primary_role || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                        {creatorOnboarding?.journey_status || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Step</span>
                      <span className="text-foreground text-sm">
                        {creatorOnboarding?.current_step || 0}/8
                      </span>
                    </div>
                  </div>
                </div>

                {/* Natural Role */}
                {creatorNaturalRole && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                      Natural Role
                    </h3>
                    {creatorNaturalRole.description ? (
                      <p className="text-foreground text-sm italic bg-muted/50 p-3 rounded-lg">
                        "{creatorNaturalRole.description}"
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">Not defined</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Ready:</span>
                      {creatorNaturalRole.is_ready ? (
                        <Check className="w-4 h-4 text-b4-teal" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Stay Private Dialog */}
      <Dialog open={showStayPrivateDialog} onOpenChange={setShowStayPrivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keep Opportunity Private</DialogTitle>
            <DialogDescription>
              Choose an action for "{opportunity?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant="destructive"
              onClick={() => handleStayPrivate("declined")}
              disabled={processing}
              className="w-full justify-start"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Declined - Opportunity is not suitable
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStayPrivate("to_be_enhanced")}
              disabled={processing}
              className="w-full justify-start"
            >
              <Edit className="w-4 h-4 mr-2" />
              To Be Enhanced - Needs improvements
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOpportunityDetail;
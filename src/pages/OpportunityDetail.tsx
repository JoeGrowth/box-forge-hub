import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  ArrowLeft,
  Rocket, 
  User, 
  Calendar, 
  MapPin,
  Users,
  Briefcase,
  Send,
  CheckCircle,
  Clock
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
}

interface Application {
  id: string;
  status: string;
  role_applied: string | null;
  cover_message: string | null;
  created_at: string;
}

const OpportunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const { toast } = useToast();
  const [idea, setIdea] = useState<StartupIdea | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyMessage, setApplyMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [applying, setApplying] = useState(false);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const isApproved = onboardingState?.journey_status === "approved" || 
                       onboardingState?.journey_status === "entrepreneur_approved";
    if (onboardingState && !isApproved) {
      navigate("/profile", { replace: true });
    }
  }, [onboardingState, navigate]);

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
        .select("full_name, bio, primary_skills")
        .eq("user_id", data.creator_id)
        .maybeSingle();

      if (profile) {
        setCreatorProfile(profile);
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

      setLoading(false);
    };

    if (user) {
      fetchIdea();
    }
  }, [id, user, navigate]);

  const handleApply = async () => {
    if (!user || !idea) return;

    setApplying(true);
    try {
      // Insert application into the new table
      const { error: appError } = await supabase
        .from("startup_applications")
        .insert({
          startup_id: idea.id,
          applicant_id: user.id,
          role_applied: selectedRole || null,
          cover_message: applyMessage || null,
        });

      if (appError) throw appError;

      // Create user notification for the idea creator
      await supabase.from("user_notifications").insert({
        user_id: idea.creator_id,
        notification_type: "cobuilder_application",
        title: "New Co-Builder Application",
        message: `${user.user_metadata?.full_name || user.email || "A co-builder"} wants to join your startup "${idea.title}"${selectedRole ? ` as ${selectedRole}` : ""}.`,
        link: "/profile",
      });

      // Also create admin notification for tracking
      await supabase.from("admin_notifications").insert({
        user_id: idea.creator_id,
        notification_type: "cobuilder_application",
        user_name: user.user_metadata?.full_name || user.email,
        user_email: user.email,
        message: `${user.user_metadata?.full_name || "A co-builder"} applied to "${idea.title}"${selectedRole ? ` for role: ${selectedRole}` : ""}. Message: ${applyMessage || "No message provided."}`,
      });

      toast({
        title: "Application Sent!",
        description: "The initiator will be notified of your interest.",
      });

      setExistingApplication({
        id: "new",
        status: "pending",
        role_applied: selectedRole,
        cover_message: applyMessage,
        created_at: new Date().toISOString(),
      });
      setDialogOpen(false);
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
            onClick={() => navigate("/opportunities")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Opportunities
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
                {/* Apply Card */}
                <div className="bg-gradient-to-br from-b4-teal/10 to-b4-navy/10 rounded-2xl border border-b4-teal/20 p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    Join This Startup
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Express your interest and connect with the initiator to discuss collaboration.
                  </p>
                  
                  {isOwnIdea ? (
                    <p className="text-sm text-muted-foreground italic">
                      This is your own startup idea.
                    </p>
                  ) : existingApplication ? (
                    getApplicationStatusUI()
                  ) : (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="teal" className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Apply to Join
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Apply to Join "{idea.title}"</DialogTitle>
                          <DialogDescription>
                            Send a message to the initiator explaining why you'd be a great co-builder for this startup.
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
                              placeholder="Introduce yourself, share your relevant skills and experience, and explain why you're excited about this opportunity..."
                              value={applyMessage}
                              onChange={(e) => setApplyMessage(e.target.value)}
                              rows={5}
                            />
                          </div>
                          <Button 
                            variant="teal" 
                            className="w-full"
                            onClick={handleApply}
                            disabled={applying || (!selectedRole && idea.roles_needed && idea.roles_needed.length > 0)}
                          >
                            {applying ? "Sending..." : "Send Application"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Initiator Card */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">
                    About the Initiator
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-b4-teal/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-b4-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {creatorProfile?.full_name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">Initiator</p>
                    </div>
                  </div>
                  {creatorProfile?.bio && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {creatorProfile.bio}
                    </p>
                  )}
                  {creatorProfile?.primary_skills && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Skills:</p>
                      <p className="text-sm text-foreground">
                        {creatorProfile.primary_skills}
                      </p>
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

export default OpportunityDetail;

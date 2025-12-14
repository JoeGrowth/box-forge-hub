import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { EntrepreneurJourney } from "@/components/entrepreneur/EntrepreneurJourney";
import { 
  User, 
  Mail, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  ArrowRight,
  LogOut,
  Settings,
  Rocket,
  Users,
  Clock,
  Lightbulb,
  Send
} from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface StartupIdea {
  id: string;
  title: string;
  review_status: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, needsOnboarding, refetch } = useOnboarding();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userIdeas, setUserIdeas] = useState<StartupIdea[]>([]);
  const [requestingReview, setRequestingReview] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setFullName(data.full_name || "");
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch user's startup ideas
  useEffect(() => {
    const fetchUserIdeas = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("startup_ideas")
        .select("id, title, review_status")
        .eq("creator_id", user.id);

      if (!error && data) {
        setUserIdeas(data);
      }
    };

    fetchUserIdeas();
  }, [user]);

  const handleRequestEntrepreneurReview = async () => {
    if (!user || userIdeas.length === 0) return;

    setRequestingReview(true);
    try {
      // Update the first pending idea to "under_review"
      const pendingIdea = userIdeas.find((i) => i.review_status === "pending");
      if (pendingIdea) {
        await supabase
          .from("startup_ideas")
          .update({ review_status: "under_review" })
          .eq("id", pendingIdea.id);
      }

      // Create admin notification
      await supabase.from("admin_notifications").insert({
        user_id: user.id,
        notification_type: "entrepreneur_review_request",
        user_name: profile?.full_name,
        user_email: user.email,
        message: `${profile?.full_name || "A user"} is requesting entrepreneur review for their startup idea.`,
      });

      toast({
        title: "Review Requested",
        description: "Your entrepreneur review request has been submitted to admins.",
      });

      // Refresh ideas
      const { data } = await supabase
        .from("startup_ideas")
        .select("id, title, review_status")
        .eq("creator_id", user.id);
      if (data) setUserIdeas(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequestingReview(false);
    }
  };

  const handleEntrepreneurStepComplete = async (step: number) => {
    await refetch();
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, full_name: fullName } : null);
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = () => {
    if (onboardingState?.primary_role === "entrepreneur") return "Entrepreneur";
    if (onboardingState?.primary_role === "cobuilder") {
      if (onboardingState.journey_status === "approved") return "Co-Builder";
      return "Potential Co-Builder";
    }
    return "Member";
  };

  const getReadinessStatus = () => {
    if (!onboardingState?.onboarding_completed) {
      return { label: "Onboarding Incomplete", color: "text-b4-coral", icon: AlertCircle };
    }
    if (onboardingState.journey_status === "approved") {
      return { label: "Approved Co-Builder", color: "text-b4-teal", icon: CheckCircle };
    }
    if (onboardingState.journey_status === "pending_approval") {
      return { label: "Pending Admin Approval", color: "text-amber-500", icon: Clock };
    }
    if (onboardingState.journey_status === "rejected") {
      return { label: "Application Rejected", color: "text-b4-coral", icon: AlertCircle };
    }
    if (naturalRole?.status === "assistance_requested") {
      return { label: "Pending Assistance", color: "text-amber-500", icon: AlertCircle };
    }
    return { label: "In Progress", color: "text-muted-foreground", icon: AlertCircle };
  };

  const isApprovedCoBuilder = onboardingState?.journey_status === "approved";

  const status = getReadinessStatus();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Profile Header */}
            <div className="bg-card rounded-3xl border border-border p-8 mb-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="w-24 h-24 text-2xl">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-b4-teal text-primary-foreground">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="teal" 
                          size="sm" 
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setIsEditing(false);
                            setFullName(profile?.full_name || "");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                        {profile?.full_name || "User"}
                      </h1>
                      <p className="text-muted-foreground mb-3">{user?.email}</p>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium">
                          <Briefcase className="w-3.5 h-3.5" />
                          {getRoleLabel()}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm font-medium ${status.color}`}>
                          <status.icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Natural Role Section */}
            {onboardingState?.primary_role === "cobuilder" && naturalRole && (
              <div className="bg-card rounded-3xl border border-border p-8 mb-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">
                  Natural Role
                </h2>
                
                {naturalRole.description ? (
                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="text-foreground italic">"{naturalRole.description}"</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground mb-6">Not defined yet</p>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    {naturalRole.promise_check ? (
                      <CheckCircle className="w-5 h-5 text-b4-teal" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">Promise</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {naturalRole.practice_check ? (
                      <CheckCircle className="w-5 h-5 text-b4-teal" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">Practice</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {naturalRole.training_check ? (
                      <CheckCircle className="w-5 h-5 text-b4-teal" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">Training</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {naturalRole.consulting_check ? (
                      <CheckCircle className="w-5 h-5 text-b4-teal" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">Consulting</span>
                  </div>
                </div>
              </div>
            )}

            {/* Approved Co-Builder Dashboard */}
            {isApprovedCoBuilder && (
              <div className="bg-gradient-to-br from-b4-teal/10 to-b4-navy/10 rounded-3xl border border-b4-teal/20 p-8 mb-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  🎉 You're an Approved Co-Builder!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Choose how you want to build your next venture:
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-card rounded-xl border border-border p-6 hover:border-b4-teal/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-b4-teal/10 flex items-center justify-center mb-4">
                      <Users className="w-6 h-6 text-b4-teal" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Co-Build a Startup</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse startup ideas looking for co-builders with roles matching your skills.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/opportunities")}>
                      View Opportunities
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-card rounded-xl border border-border p-6 hover:border-b4-coral/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-b4-coral/10 flex items-center justify-center mb-4">
                      <Lightbulb className="w-6 h-6 text-b4-coral" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Be an Initiator</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your own startup idea and find co-builders to join your venture.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/create-idea")}>
                      Create Startup Idea
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Entrepreneur Journey Section */}
            {onboardingState?.journey_status === "entrepreneur_approved" && (
              <div className="mb-8">
                <EntrepreneurJourney
                  currentStep={onboardingState?.entrepreneur_step || 1}
                  onStepComplete={handleEntrepreneurStepComplete}
                />
              </div>
            )}

            {/* Request Entrepreneur Review - for approved co-builders with ideas */}
            {isApprovedCoBuilder && userIdeas.length > 0 && (
              <div className="bg-gradient-to-br from-amber-500/10 to-b4-coral/10 rounded-3xl border border-amber-500/20 p-8 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Rocket className="w-6 h-6 text-amber-500" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Ready to Become an Entrepreneur?
                  </h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  You've created {userIdeas.length} startup idea{userIdeas.length > 1 ? "s" : ""}. 
                  Request a review to unlock the full entrepreneur journey with guided steps.
                </p>
                
                {/* Show idea statuses */}
                <div className="space-y-2 mb-4">
                  {userIdeas.map((idea) => (
                    <div key={idea.id} className="flex items-center gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{idea.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        idea.review_status === "approved" 
                          ? "bg-b4-teal/10 text-b4-teal"
                          : idea.review_status === "under_review"
                          ? "bg-amber-500/10 text-amber-600"
                          : idea.review_status === "rejected"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {idea.review_status === "under_review" ? "Under Review" : 
                         idea.review_status.charAt(0).toUpperCase() + idea.review_status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>

                {userIdeas.some((i) => i.review_status === "pending") && (
                  <Button 
                    variant="teal" 
                    onClick={handleRequestEntrepreneurReview}
                    disabled={requestingReview}
                  >
                    {requestingReview ? "Submitting..." : "Request Entrepreneur Review"}
                    <Send className="ml-2 w-4 h-4" />
                  </Button>
                )}
                
                {userIdeas.some((i) => i.review_status === "under_review") && (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Your review request is being processed by admins.
                  </p>
                )}
              </div>
            )}

            {/* Pending Approval Status */}
            {onboardingState?.journey_status === "pending_approval" && (
              <div className="bg-amber-500/10 rounded-3xl border border-amber-500/20 p-8 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-amber-500" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Awaiting Admin Approval
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  Your Co-Builder journey is complete! Our admin team is reviewing your application. 
                  You'll be notified once approved.
                </p>
              </div>
            )}

            {/* Continue Onboarding CTA */}
            {needsOnboarding && (
              <div className="bg-b4-teal/10 rounded-3xl border border-b4-teal/20 p-8 mb-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  Complete Your Onboarding
                </h2>
                <p className="text-muted-foreground mb-4">
                  Finish setting up your profile to unlock all platform features.
                </p>
                <Button variant="teal" onClick={() => navigate("/onboarding")}>
                  Continue Onboarding
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Account Info */}
            <div className="bg-card rounded-3xl border border-border p-8 mb-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="text-foreground">
                      {profile?.created_at 
                        ? new Date(profile.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;

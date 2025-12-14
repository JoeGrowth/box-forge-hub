import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
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
  Lightbulb
} from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, needsOnboarding } = useOnboarding();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

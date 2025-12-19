import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { EntrepreneurJourney } from "@/components/entrepreneur/EntrepreneurJourney";
import { OnboardingAnswersCard } from "@/components/profile/OnboardingAnswersCard";
import { IdeaApplicationsViewer } from "@/components/profile/IdeaApplicationsViewer";
import { LearningJourneyDashboard } from "@/components/learning/LearningJourneyDashboard";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Send,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  Loader2,
  ChevronDown,
  MessageSquare
} from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_skills: string | null;
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
  
  // Skills state
  const [skills, setSkills] = useState("");
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  
  // Change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Account deletion state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteType, setDeleteType] = useState<"soft" | "hard" | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<"choose" | "code">("choose");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);

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
        setSkills(data.primary_skills || "");
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

  const handleSaveSkills = async () => {
    if (!user) return;
    
    setIsSavingSkills(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ primary_skills: skills })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, primary_skills: skills } : null);
      setIsEditingSkills(false);
      toast({
        title: "Skills Updated",
        description: "Your skills have been saved and will appear in the Co-Builders Directory.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update skills. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSkills(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordError(error.message);
      } else {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully changed.",
        });
        setIsChangingPassword(false);
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSendConfirmationCode = async () => {
    if (!user) return;
    
    setIsSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'send_confirmation' }
      });

      if (error) throw error;

      toast({
        title: "Code Sent",
        description: "Check your email for the confirmation code.",
      });
      setConfirmationStep("code");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send confirmation code",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleDeleteAccount = async (type: "soft" | "hard") => {
    if (!user) return;

    // For hard delete, require confirmation code
    if (type === "hard" && confirmationStep === "choose") {
      await handleSendConfirmationCode();
      return;
    }

    if (type === "hard" && !confirmationCode) {
      toast({
        title: "Error",
        description: "Please enter the confirmation code",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { 
          deleteType: type,
          confirmationCode: type === "hard" ? confirmationCode : undefined
        }
      });

      if (error) throw error;

      await signOut();
      
      toast({
        title: type === "soft" ? "Account Deactivated" : "Account Deleted",
        description: type === "soft" 
          ? "Your account has been deactivated. Contact support to reactivate."
          : "Your account has been permanently deleted.",
      });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setDeleteType(null);
      setShowDeleteOptions(false);
      setConfirmationStep("choose");
      setConfirmationCode("");
    }
  };

  const isEmailVerified = user?.email_confirmed_at != null;

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
    // entrepreneur_approved = Co-Builder with approved idea (Initiator), not yet full entrepreneur
    if (onboardingState?.journey_status === "entrepreneur_approved") return "Co-Builder & Initiator";
    if (onboardingState?.primary_role === "entrepreneur") return "Entrepreneur";
    if (onboardingState?.primary_role === "cobuilder") {
      if (onboardingState.journey_status === "approved") return "Approved Co-Builder";
      return "Potential Co-Builder";
    }
    return "Member";
  };

  const getReadinessStatus = () => {
    if (!onboardingState?.onboarding_completed) {
      return { label: "Onboarding Incomplete", color: "text-b4-coral", icon: AlertCircle };
    }
    // entrepreneur_approved = Co-Builder with approved startup idea, on entrepreneur journey
    if (onboardingState.journey_status === "entrepreneur_approved") {
      const step = onboardingState.entrepreneur_step || 1;
      if (step >= 4) {
        return { 
          label: "Entrepreneur Journey: Completed", 
          color: "text-b4-teal", 
          icon: CheckCircle 
        };
      }
      return { 
        label: `Entrepreneur Journey: Step ${step}/4`, 
        color: "text-amber-500", 
        icon: Rocket 
      };
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

  const getScalingStatus = () => {
    if (naturalRole?.wants_to_scale) {
      // Placeholder for future scaling journey steps
      return { 
        label: "Scaling Journey: Pending Steps", 
        color: "text-purple-500", 
        icon: Rocket,
        show: true
      };
    }
    return { show: false };
  };

  const scalingStatus = getScalingStatus();

  const isApprovedCoBuilder = onboardingState?.journey_status === "approved" || 
                               onboardingState?.journey_status === "entrepreneur_approved";

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
              <div className="relative group">
                <Avatar className="w-24 h-24 text-2xl">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-b4-teal text-primary-foreground">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </div>
                
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
                        {scalingStatus.show && (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-sm font-medium ${scalingStatus.color}`}>
                            <scalingStatus.icon className="w-3.5 h-3.5" />
                            {scalingStatus.label}
                          </span>
                        )}
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

            {/* Part 1: Natural Role Section */}
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

            {/* Part 2: Approved Co-Builder Dashboard with Toggle Lists */}
            {isApprovedCoBuilder && (
              <div className="bg-gradient-to-br from-b4-teal/10 to-b4-navy/10 rounded-3xl border border-b4-teal/20 p-8 mb-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  🎉 You're an Approved Co-Builder!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Choose how you want to build your next venture:
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
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

                {/* Skills Section */}
                <div className="bg-card rounded-xl border border-border p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Your Skills</h3>
                        <p className="text-sm text-muted-foreground">
                          These skills will be shown in the Co-Builders Directory
                        </p>
                      </div>
                    </div>
                    {!isEditingSkills && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditingSkills(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {isEditingSkills ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Textarea
                          id="skills"
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                          placeholder="e.g., React, Node.js, Product Management, UI/UX Design, Marketing"
                          className="mt-1"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your skills separated by commas
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="teal" 
                          size="sm" 
                          onClick={handleSaveSkills}
                          disabled={isSavingSkills}
                        >
                          {isSavingSkills ? "Saving..." : "Save Skills"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setIsEditingSkills(false);
                            setSkills(profile?.primary_skills || "");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {skills ? (
                        <div className="flex flex-wrap gap-2">
                          {skills.split(",").map((skill, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary"
                              className="bg-purple-500/10 text-purple-600 border-none"
                            >
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No skills added yet. Click "Edit" to add your skills.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle Lists Section */}
                <div className="space-y-3">
                  {/* Toggle 1: Your Journey Answers */}
                  {naturalRole && (
                    <Collapsible>
                      <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-b4-navy/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-b4-navy" />
                            </div>
                            <span className="font-display font-semibold text-foreground">
                              Your Journey Answers
                            </span>
                          </div>
                          <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            <OnboardingAnswersCard naturalRole={naturalRole} onUpdate={refetch} />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Toggle 2+: Startup Ideas */}
                  {userIdeas.map((idea, index) => (
                    <Collapsible key={idea.id}>
                      <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-b4-coral/10 flex items-center justify-center">
                              <Lightbulb className="w-4 h-4 text-b4-coral" />
                            </div>
                            <span className="font-display font-semibold text-foreground">
                              Idea {index + 1}: {idea.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              idea.review_status === "approved" 
                                ? "bg-b4-teal/10 text-b4-teal"
                                : idea.review_status === "under_review"
                                ? "bg-amber-500/10 text-amber-600"
                                : idea.review_status === "rejected"
                                ? "bg-red-500/10 text-red-600"
                                : idea.review_status === "needs_enhancement"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {idea.review_status === "under_review" ? "Under Review" : 
                               idea.review_status === "needs_enhancement" ? "Needs Enhancement" :
                               idea.review_status.charAt(0).toUpperCase() + idea.review_status.slice(1)}
                            </span>
                          </div>
                          <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-4">
                            <div className="flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate(`/edit-idea/${idea.id}`)}
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Edit Idea
                              </Button>
                            </div>
                            {idea.review_status === "approved" && onboardingState?.journey_status === "entrepreneur_approved" && (
                              <EntrepreneurJourney
                                currentStep={onboardingState?.entrepreneur_step || 1}
                                onStepComplete={handleEntrepreneurStepComplete}
                                ideaId={idea.id}
                              />
                            )}
                            {idea.review_status === "pending" && (
                              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                                This idea is pending review. Submit for review to unlock the entrepreneur journey.
                              </div>
                            )}
                            {idea.review_status === "under_review" && (
                              <div className="text-sm text-amber-600 bg-amber-500/10 rounded-lg p-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Your idea is being reviewed by admins.
                              </div>
                            )}
                            {idea.review_status === "needs_enhancement" && (
                              <div className="text-sm text-amber-600 bg-amber-500/10 rounded-lg p-4">
                                Your idea needs enhancement. Click "Edit Idea" above to make improvements.
                              </div>
                            )}
                            
                            {/* Applications Received Section - only for approved ideas */}
                            {idea.review_status === "approved" && (
                              <div className="border-t border-border pt-4 mt-4">
                                <IdeaApplicationsViewer ideaId={idea.id} ideaTitle={idea.title} />
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Journeys Dashboard */}
            {isApprovedCoBuilder && (
              <div className="mb-8">
                <LearningJourneyDashboard />
              </div>
            )}

            {/* Request Entrepreneur Review - for approved co-builders with pending ideas */}
            {isApprovedCoBuilder && userIdeas.some((i) => i.review_status === "pending") && (
              <div className="bg-gradient-to-br from-amber-500/10 to-b4-coral/10 rounded-3xl border border-amber-500/20 p-8 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Rocket className="w-6 h-6 text-amber-500" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Ready to Submit for Review?
                  </h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Submit your startup idea for admin review to unlock the entrepreneur journey.
                </p>
                
                <Button 
                  variant="teal" 
                  onClick={handleRequestEntrepreneurReview}
                  disabled={requestingReview}
                >
                  {requestingReview ? "Submitting..." : "Request Entrepreneur Review"}
                  <Send className="ml-2 w-4 h-4" />
                </Button>
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
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground">{user?.email}</p>
                      {isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-b4-teal/10 text-b4-teal text-xs font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                          <ShieldAlert className="w-3 h-3" />
                          Not Verified
                        </span>
                      )}
                    </div>
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

            {/* Security Settings */}
            <div className="bg-card rounded-3xl border border-border p-8 mb-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">
                Security
              </h2>
              
              {isChangingPassword ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-12 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        id="confirmNewPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-12 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="teal"
                      onClick={handleChangePassword}
                      disabled={isUpdatingPassword}
                    >
                      {isUpdatingPassword ? "Updating..." : "Update Password"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setPasswordError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Password</p>
                      <p className="text-foreground">••••••••</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                    Change Password
                  </Button>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-card rounded-3xl border border-destructive/30 p-8 mb-8">
              <h2 className="font-display text-xl font-bold text-destructive mb-4">
                Danger Zone
              </h2>
              <p className="text-muted-foreground mb-4">
                Choose how you want to handle your account deletion.
              </p>
              
              <AlertDialog open={showDeleteOptions} onOpenChange={(open) => {
                setShowDeleteOptions(open);
                if (!open) {
                  setDeleteType(null);
                  setConfirmationStep("choose");
                  setConfirmationCode("");
                }
              }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-lg">
                  {confirmationStep === "choose" ? (
                    <>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Choose deletion type</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-4 pt-2">
                            {/* Soft Delete Option */}
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                deleteType === "soft" 
                                  ? "border-amber-500 bg-amber-500/10" 
                                  : "border-border hover:border-amber-500/50"
                              }`}
                              onClick={() => setDeleteType("soft")}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                  deleteType === "soft" ? "border-amber-500" : "border-muted-foreground"
                                }`}>
                                  {deleteType === "soft" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">Deactivate Account (Recommended)</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Your account will be deactivated and hidden. You can contact support later to reactivate it and recover your data.
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">Recoverable</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">Data preserved</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Hard Delete Option */}
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                deleteType === "hard" 
                                  ? "border-destructive bg-destructive/10" 
                                  : "border-border hover:border-destructive/50"
                              }`}
                              onClick={() => setDeleteType("hard")}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                  deleteType === "hard" ? "border-destructive" : "border-muted-foreground"
                                }`}>
                                  {deleteType === "hard" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">Permanently Delete</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Your account and all data will be permanently removed. This action cannot be undone. You can sign up again with the same email.
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">Irreversible</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Email reusable</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel onClick={() => setDeleteType(null)}>Cancel</AlertDialogCancel>
                        <Button
                          variant={deleteType === "hard" ? "destructive" : "default"}
                          onClick={() => deleteType && handleDeleteAccount(deleteType)}
                          disabled={!deleteType || isDeletingAccount || isSendingCode}
                          className={deleteType === "soft" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                        >
                          {isDeletingAccount || isSendingCode ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {isSendingCode ? "Sending code..." : "Processing..."}
                            </>
                          ) : deleteType === "soft" ? (
                            "Deactivate Account"
                          ) : deleteType === "hard" ? (
                            "Send Confirmation Code"
                          ) : (
                            "Select an option"
                          )}
                        </Button>
                      </AlertDialogFooter>
                    </>
                  ) : (
                    <>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enter Confirmation Code</AlertDialogTitle>
                        <AlertDialogDescription>
                          We sent a 6-digit confirmation code to your email. Enter it below to permanently delete your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Label htmlFor="confirmationCode">Confirmation Code</Label>
                        <Input
                          id="confirmationCode"
                          type="text"
                          placeholder="123456"
                          value={confirmationCode}
                          onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="mt-2 text-center text-2xl tracking-widest"
                          maxLength={6}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Code expires in 15 minutes
                        </p>
                      </div>
                      <AlertDialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setConfirmationStep("choose");
                            setConfirmationCode("");
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteAccount("hard")}
                          disabled={confirmationCode.length !== 6 || isDeletingAccount}
                        >
                          {isDeletingAccount ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete Permanently"
                          )}
                        </Button>
                      </AlertDialogFooter>
                    </>
                  )}
                </AlertDialogContent>
              </AlertDialog>
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

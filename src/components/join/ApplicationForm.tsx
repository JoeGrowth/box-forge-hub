import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, AlertCircle } from "lucide-react";

type Role = "entrepreneur" | "cobuilder" | "partner";

interface Profile {
  full_name: string | null;
  startup_name: string | null;
  preferred_sector: string | null;
  bio: string | null;
  primary_skills: string | null;
  years_of_experience: number | null;
  organization_name: string | null;
  partnership_interest: string | null;
}

interface ApplicationFormProps {
  selectedRole: Role;
}

export function ApplicationForm({ selectedRole }: ApplicationFormProps) {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [startupName, setStartupName] = useState("");
  const [preferredSector, setPreferredSector] = useState("");
  const [bio, setBio] = useState("");
  const [primarySkills, setPrimarySkills] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [partnershipInterest, setPartnershipInterest] = useState("");
  const [wantsAccount, setWantsAccount] = useState(false);

  // Fetch profile data if user is logged in
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, startup_name, preferred_sector, bio, primary_skills, years_of_experience, organization_name, partnership_interest")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        if (data.full_name) {
          const parts = data.full_name.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
        setStartupName(data.startup_name || "");
        setPreferredSector(data.preferred_sector || "");
        setBio(data.bio || "");
        setPrimarySkills(data.primary_skills || "");
        setYearsOfExperience(data.years_of_experience?.toString() || "");
        setOrganizationName(data.organization_name || "");
        setPartnershipInterest(data.partnership_interest || "");
      }
    };

    if (user) {
      setEmail(user.email || "");
      fetchProfile();
    }
  }, [user]);

  // Check if email exists when user types it
  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck || user) return;
    
    // We can't directly check if email exists via public API, 
    // but we can show a message suggesting to log in
    setEmailExists(false);
  };

  const handleStartJourney = () => {
    if (user) {
      navigate("/onboarding");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (user) {
        // Update profile for logged-in user
        const updates: Record<string, string | number | null> = {
          full_name: fullName,
          bio,
        };
        
        if (selectedRole === "entrepreneur") {
          updates.startup_name = startupName;
          updates.preferred_sector = preferredSector;
        } else if (selectedRole === "cobuilder") {
          updates.primary_skills = primarySkills;
          updates.years_of_experience = yearsOfExperience ? parseInt(yearsOfExperience) : null;
        } else if (selectedRole === "partner") {
          updates.organization_name = organizationName;
          updates.partnership_interest = partnershipInterest;
        }

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Application Submitted!",
          description: selectedRole === "partner" 
            ? "We'll review your inquiry and get back to you within 48 hours."
            : "Proceeding to your journey...",
        });

        if (selectedRole !== "partner") {
          navigate("/onboarding");
        }
      } else if (wantsAccount && password) {
        // Create new account
        const { error } = await signUp(email, password, fullName, selectedRole === "partner" ? "cobuilder" : selectedRole);
        
        if (error) {
          if (error.message.includes("already registered")) {
            setEmailExists(true);
            throw new Error("This email is already registered. Please sign in instead.");
          }
          throw error;
        }

        toast({
          title: "Account Created!",
          description: "Please check your email to confirm your account, then continue your journey.",
        });
      } else {
        // Submit application without account (store as admin notification)
        const { error } = await supabase
          .from("admin_notifications")
          .insert({
            user_id: "00000000-0000-0000-0000-000000000000", // placeholder for non-users
            notification_type: "application_submission",
            user_name: fullName,
            user_email: email,
            step_name: selectedRole,
            message: JSON.stringify({
              role: selectedRole,
              firstName,
              lastName,
              email,
              bio,
              ...(selectedRole === "entrepreneur" && { startupName, preferredSector }),
              ...(selectedRole === "cobuilder" && { primarySkills, yearsOfExperience }),
              ...(selectedRole === "partner" && { organizationName, partnershipInterest }),
            }),
          });

        if (error) throw error;

        toast({
          title: "Application Submitted!",
          description: "We'll review your application and get back to you within 48 hours.",
        });

        // Reset form
        setFirstName("");
        setLastName("");
        setEmail("");
        setBio("");
        setStartupName("");
        setPreferredSector("");
        setPrimarySkills("");
        setYearsOfExperience("");
        setOrganizationName("");
        setPartnershipInterest("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine which fields are already filled
  const hasFullName = user && profile?.full_name;
  const hasEmail = !!user;
  const hasBio = profile?.bio;
  const hasStartupName = profile?.startup_name;
  const hasPreferredSector = profile?.preferred_sector;
  const hasPrimarySkills = profile?.primary_skills;
  const hasYearsOfExperience = profile?.years_of_experience;
  const hasOrganizationName = profile?.organization_name;
  const hasPartnershipInterest = profile?.partnership_interest;

  // For logged-in users who can start journey directly
  if (user && selectedRole !== "partner") {
    return (
      <div className="bg-card rounded-3xl border border-border p-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Ready to Continue?
        </h2>
        <p className="text-muted-foreground mb-6">
          You're already signed in as <strong>{user.email}</strong>. Click below to continue your onboarding journey 
          as {selectedRole === "entrepreneur" ? "an Entrepreneur" : "a Co-Builder"}.
        </p>
        
        <Button 
          variant="teal" 
          size="lg" 
          className="w-full"
          onClick={handleStartJourney}
        >
          Start Your Journey <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  const getFormTitle = () => {
    if (selectedRole === "partner") return "Partnership Inquiry";
    if (selectedRole === "entrepreneur") return "Entrepreneur Application";
    return "Co-Builder Application";
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-8">
      <h2 className="font-display text-2xl font-bold text-foreground mb-4">
        {getFormTitle()}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name fields - always show if not filled */}
        {!hasFullName && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input 
                id="firstName" 
                placeholder="John" 
                required 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input 
                id="lastName" 
                placeholder="Doe" 
                required 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
        )}
        
        {/* Email - show only if not logged in */}
        {!hasEmail && (
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="john@example.com" 
              required 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                checkEmailExists(e.target.value);
              }}
            />
            {emailExists && (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>This email may already be registered. <a href="/login" className="underline">Sign in instead?</a></span>
              </div>
            )}
          </div>
        )}

        {/* Entrepreneur-specific fields */}
        {selectedRole === "entrepreneur" && (
          <>
            {!hasStartupName && (
              <div className="space-y-2">
                <Label htmlFor="startupName">Startup Name (if any)</Label>
                <Input 
                  id="startupName" 
                  placeholder="My Startup Inc." 
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                />
              </div>
            )}
            {!hasPreferredSector && (
              <div className="space-y-2">
                <Label htmlFor="preferredSector">Preferred Sector *</Label>
                <Input 
                  id="preferredSector" 
                  placeholder="e.g., Health, Agriculture, Education..." 
                  required
                  value={preferredSector}
                  onChange={(e) => setPreferredSector(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Co-Builder-specific fields */}
        {selectedRole === "cobuilder" && (
          <>
            {!hasPrimarySkills && (
              <div className="space-y-2">
                <Label htmlFor="primarySkills">Primary Skills *</Label>
                <Input 
                  id="primarySkills" 
                  placeholder="e.g., Web Development, Marketing, Finance..." 
                  required
                  value={primarySkills}
                  onChange={(e) => setPrimarySkills(e.target.value)}
                />
              </div>
            )}
            {!hasYearsOfExperience && (
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                <Input 
                  id="yearsOfExperience" 
                  type="number" 
                  placeholder="5" 
                  required
                  min="0"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Partner-specific fields */}
        {selectedRole === "partner" && (
          <>
            {!hasOrganizationName && (
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input 
                  id="organizationName" 
                  placeholder="Acme Corp" 
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>
            )}
            {!hasPartnershipInterest && (
              <div className="space-y-2">
                <Label htmlFor="partnershipInterest">Partnership Interest *</Label>
                <Input 
                  id="partnershipInterest" 
                  placeholder="e.g., Investment, Mentorship, Resources..." 
                  required
                  value={partnershipInterest}
                  onChange={(e) => setPartnershipInterest(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Bio - always show if not filled */}
        {!hasBio && (
          <div className="space-y-2">
            <Label htmlFor="bio">Tell us about yourself *</Label>
            <Textarea 
              id="bio" 
              placeholder={
                selectedRole === "entrepreneur" 
                  ? "Tell us about your background and startup vision..."
                  : selectedRole === "cobuilder"
                  ? "Tell us about your experience and what you're looking to build..."
                  : "Describe the partnership opportunity you're interested in..."
              }
              rows={4}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        )}

        {/* Account creation option for non-logged-in users */}
        {!user && selectedRole !== "partner" && (
          <div className="border-t border-border pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="wantsAccount"
                checked={wantsAccount}
                onChange={(e) => setWantsAccount(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <Label htmlFor="wantsAccount" className="text-sm cursor-pointer">
                Create an account to track your journey
              </Label>
            </div>
            
            {wantsAccount && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Create a password" 
                  required={wantsAccount}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
            )}
          </div>
        )}

        <Button 
          type="submit" 
          variant="teal" 
          size="lg" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : (
            <>
              {user ? "Continue" : wantsAccount ? "Create Account & Apply" : "Submit Application"} 
              <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>

        {!user && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-b4-teal hover:underline">
              Sign in
            </a>
          </p>
        )}
      </form>
    </div>
  );
}

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

type Role = "person" | "organization";

interface ApplicationFormProps {
  selectedRole: Role;
}

export function ApplicationForm({ selectedRole }: ApplicationFormProps) {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  // Person fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Organization fields
  const [organizationName, setOrganizationName] = useState("");
  const [partnershipInterest, setPartnershipInterest] = useState("");
  const [bio, setBio] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Pre-fill for logged-in users
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setContactEmail(user.email || "");

      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, organization_name, partnership_interest, bio")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setFullName(data.full_name || "");
          setContactName(data.full_name || "");
          setOrganizationName(data.organization_name || "");
          setPartnershipInterest(data.partnership_interest || "");
          setBio(data.bio || "");
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedRole === "person") {
        if (user) {
          // Already logged in, go to onboarding
          navigate("/onboarding");
          return;
        }

        // Sign up new person
        const { error } = await signUp(email, password, fullName, "cobuilder");

        if (error) {
          if (error.message.includes("already registered")) {
            setEmailExists(true);
            throw new Error("This email is already registered. Please sign in instead.");
          }
          throw error;
        }

        toast({
          title: "Account Created!",
          description: "Please check your email to confirm your account.",
        });
      } else {
        // Organization - partnership inquiry
        const { error } = await supabase
          .from("admin_notifications")
          .insert({
            user_id: user?.id || "00000000-0000-0000-0000-000000000000",
            notification_type: "application_submission",
            user_name: contactName,
            user_email: contactEmail,
            step_name: "partner",
            message: JSON.stringify({
              role: "organization",
              contactName,
              contactEmail,
              organizationName,
              partnershipInterest,
              bio,
            }),
          });

        if (error) throw error;

        toast({
          title: "Inquiry Submitted!",
          description: "We'll review your partnership inquiry and get back to you within 48 hours.",
        });

        // Reset form
        if (!user) {
          setContactName("");
          setContactEmail("");
          setOrganizationName("");
          setPartnershipInterest("");
          setBio("");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Person form - logged in shortcut
  if (user && selectedRole === "person") {
    return (
      <div className="bg-card rounded-3xl border border-border p-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Ready to Continue?
        </h2>
        <p className="text-muted-foreground mb-6">
          You're already signed in as <strong>{user.email}</strong>. Click below to continue your journey.
        </p>
        <Button
          variant="teal"
          size="lg"
          className="w-full"
          onClick={() => navigate("/onboarding")}
        >
          Start Your Journey <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-border p-8">
      <h2 className="font-display text-2xl font-bold text-foreground mb-4">
        {selectedRole === "person" ? "Create Your Account" : "Partnership Inquiry"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedRole === "person" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
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
                  setEmailExists(false);
                }}
              />
              {emailExists && (
                <div className="flex items-center gap-2 text-amber-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    This email is already registered.{" "}
                    <a href="/auth" className="underline">Sign in instead?</a>
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                placeholder="Jane Smith"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@organization.com"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="bio">Tell us about your organization *</Label>
              <Textarea
                id="bio"
                placeholder="Describe the partnership opportunity you're interested in..."
                rows={4}
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </>
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
              {selectedRole === "person" ? "Create Account" : "Submit Inquiry"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>

        {selectedRole === "person" && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/auth" className="text-b4-teal hover:underline">
              Sign in
            </a>
          </p>
        )}
      </form>
    </div>
  );
}

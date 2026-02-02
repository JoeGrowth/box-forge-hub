import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowRight, User, Sparkles, MessageCircle } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfileInfoStepProps {
  onNext: () => void;
}

export const ProfileInfoStep = ({ onNext }: ProfileInfoStepProps) => {
  const { updateOnboardingState } = useOnboarding();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState("");
  const [primarySkills, setPrimarySkills] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update the profile with the collected info
      const { error } = await supabase
        .from("profiles")
        .update({
          bio: bio.trim() || null,
          primary_skills: primarySkills.trim() || null,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await updateOnboardingState({ current_step: 9 });

      onNext();
    } catch (error) {
      console.error("Error saving profile info:", error);
      toast({
        title: "Error",
        description: "Failed to save profile info. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = bio.trim() || primarySkills.trim() || yearsOfExperience;

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-b4-teal/10 text-b4-teal flex items-center justify-center mx-auto mb-6">
        <User className="w-8 h-8" />
      </div>
      
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Tell us about yourself
      </h1>
      <p className="text-muted-foreground text-lg mb-6">
        Help others understand your background and expertise
      </p>

      {/* AI Tip Banner */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 mb-8 flex items-start gap-3 text-left">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Need help defining these?</span>{" "}
            You can have a conversation with an AI agent outside of the platform to help you articulate your skills and experience.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-left mb-8">
        <div>
          <Label htmlFor="bio" className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-b4-teal" />
            Short Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A brief description of who you are and what you do..."
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Share your professional identity in 2-3 sentences
          </p>
        </div>

        <div>
          <Label htmlFor="skills" className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-b4-teal" />
            Primary Skills
          </Label>
          <Textarea
            id="skills"
            value={primarySkills}
            onChange={(e) => setPrimarySkills(e.target.value)}
            placeholder="e.g., Product Strategy, UX Design, Full-Stack Development, Business Analysis..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            List your main skills and areas of expertise
          </p>
        </div>

        <div>
          <Label htmlFor="experience" className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-b4-teal" />
            Years of Experience
          </Label>
          <Input
            id="experience"
            type="number"
            min="0"
            max="50"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            placeholder="e.g., 5"
            className="max-w-[150px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Total years in your professional field
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={async () => {
            setIsLoading(true);
            try {
              await updateOnboardingState({ current_step: 9 });
              onNext();
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to proceed. Please try again.",
                variant: "destructive",
              });
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="text-muted-foreground"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
};

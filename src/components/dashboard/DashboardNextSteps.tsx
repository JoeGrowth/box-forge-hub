import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Lightbulb, 
  Target, 
  Users, 
  FileText, 
  Award,
  Sparkles 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";

interface NextStep {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  priority: "high" | "medium" | "low";
}

export function DashboardNextSteps() {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);

  useEffect(() => {
    const calculateNextSteps = async () => {
      if (!user) return;

      const steps: NextStep[] = [];

      // Check various states to determine recommendations
      const [
        { data: nrDecoder },
        { data: certifications },
        { data: applications },
        { data: ideas },
        { data: profile },
      ] = await Promise.all([
        supabase.from("nr_decoder_submissions").select("status").eq("user_id", user.id).single(),
        supabase.from("user_certifications").select("*").eq("user_id", user.id),
        supabase.from("startup_applications").select("status").eq("applicant_id", user.id),
        supabase.from("startup_ideas").select("review_status").eq("creator_id", user.id),
        supabase.from("profiles").select("bio, primary_skills").eq("user_id", user.id).single(),
      ]);

      // Priority 1: Complete onboarding
      if (!onboardingState?.onboarding_completed) {
        steps.push({
          icon: Target,
          title: "Complete Your Onboarding",
          description: "Finish setting up your profile to unlock all features",
          link: "/professional-onboarding",
          priority: "high",
        });
      }

      // Priority 2: Take NR Decoder
      if (!nrDecoder) {
        steps.push({
          icon: Sparkles,
          title: "Discover Your Natural Role",
          description: "Take the decoder to find your unique strengths",
          link: "/decoder",
          priority: "high",
        });
      }

      // Priority 3: Get certified
      if (!certifications?.length && onboardingState?.onboarding_completed) {
        steps.push({
          icon: Award,
          title: "Start a Learning Journey",
          description: "Get certified to unlock more opportunities",
          link: "/journey",
          priority: "high",
        });
      }

      // Priority 4: Complete profile
      if (!profile?.bio || !profile?.primary_skills) {
        steps.push({
          icon: FileText,
          title: "Enhance Your Profile",
          description: "Add skills and bio to stand out",
          link: "/profile",
          priority: "medium",
        });
      }

      // Priority 5: Apply to opportunities
      if (certifications?.some(c => c.certification_type === 'cobuilder_b4') && !applications?.length) {
        steps.push({
          icon: Users,
          title: "Apply to Startups",
          description: "Browse opportunities matching your skills",
          link: "/opportunities",
          priority: "medium",
        });
      }

      // Priority 6: Create an idea
      if (certifications?.some(c => c.certification_type === 'initiator_b4') && !ideas?.length) {
        steps.push({
          icon: Lightbulb,
          title: "Create Your First Idea",
          description: "Launch your startup initiative",
          link: "/create-idea",
          priority: "medium",
        });
      }

      // Default: Explore opportunities
      if (steps.length === 0) {
        steps.push({
          icon: Users,
          title: "Explore New Opportunities",
          description: "Discover startups looking for talent",
          link: "/opportunities",
          priority: "low",
        });
      }

      setNextSteps(steps.slice(0, 4)); // Show max 4 steps
    };

    calculateNextSteps();
  }, [user, onboardingState]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-b4-coral";
      case "medium":
        return "border-l-b4-teal";
      default:
        return "border-l-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextSteps.map((step, i) => (
          <Link
            key={i}
            to={step.link}
            className={`block p-3 rounded-lg border-l-4 ${getPriorityColor(step.priority)} bg-muted/30 hover:bg-muted/50 transition-colors`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-b4-teal/10 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-4 h-4 text-b4-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        ))}

        {nextSteps.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-b4-teal" />
            <p className="text-sm">You're all caught up! 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

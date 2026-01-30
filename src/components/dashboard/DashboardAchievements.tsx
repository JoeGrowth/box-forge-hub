import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Star, 
  Rocket, 
  Target, 
  Users, 
  Zap,
  Trophy,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  icon: React.ElementType;
  title: string;
  description: string;
  earned: boolean;
  color: string;
}

export function DashboardAchievements() {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user) return;

      const [
        { data: certifications },
        { data: applications },
        { data: ideas },
        { data: teamMemberships },
        { data: nrDecoder },
      ] = await Promise.all([
        supabase.from("user_certifications").select("*").eq("user_id", user.id),
        supabase.from("startup_applications").select("status").eq("applicant_id", user.id),
        supabase.from("startup_ideas").select("review_status").eq("creator_id", user.id),
        supabase.from("startup_team_members").select("*").eq("member_user_id", user.id),
        supabase.from("nr_decoder_submissions").select("status").eq("user_id", user.id).single(),
      ]);

      const achievementsList: Achievement[] = [
        {
          icon: Target,
          title: "First Steps",
          description: "Complete onboarding",
          earned: !!onboardingState?.onboarding_completed,
          color: "text-blue-500",
        },
        {
          icon: Zap,
          title: "Role Discovered",
          description: "Complete NR Decoder",
          earned: !!nrDecoder,
          color: "text-purple-500",
        },
        {
          icon: Award,
          title: "Certified Builder",
          description: "Earn your first certification",
          earned: (certifications?.length || 0) > 0,
          color: "text-amber-500",
        },
        {
          icon: Rocket,
          title: "Initiator",
          description: "Create your first idea",
          earned: (ideas?.length || 0) > 0,
          color: "text-rose-500",
        },
        {
          icon: Users,
          title: "Team Player",
          description: "Join a startup team",
          earned: (teamMemberships?.length || 0) > 0,
          color: "text-emerald-500",
        },
        {
          icon: Star,
          title: "Go-Getter",
          description: "Submit first application",
          earned: (applications?.length || 0) > 0,
          color: "text-cyan-500",
        },
        {
          icon: Trophy,
          title: "Approved",
          description: "Get journey approved",
          earned: onboardingState?.journey_status === "approved" || onboardingState?.journey_status === "entrepreneur_approved",
          color: "text-b4-teal",
        },
        {
          icon: CheckCircle,
          title: "Multi-Certified",
          description: "Earn 2+ certifications",
          earned: (certifications?.length || 0) >= 2,
          color: "text-pink-500",
        },
      ];

      setAchievements(achievementsList);
    };

    fetchAchievements();
  }, [user, onboardingState]);

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Achievements
          </CardTitle>
          <Badge variant="secondary">
            {earnedCount}/{achievements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {achievements.map((achievement, i) => (
            <div
              key={i}
              className={`relative group cursor-default ${
                achievement.earned ? "" : "opacity-40 grayscale"
              }`}
              title={`${achievement.title}: ${achievement.description}`}
            >
              <div
                className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-transform ${
                  achievement.earned
                    ? "bg-muted hover:scale-110"
                    : "bg-muted/50"
                }`}
              >
                <achievement.icon
                  className={`w-6 h-6 ${
                    achievement.earned ? achievement.color : "text-muted-foreground"
                  }`}
                />
              </div>
              {achievement.earned && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-b4-teal rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-xs text-center mt-1 font-medium truncate">
                {achievement.title}
              </div>
            </div>
          ))}
        </div>

        {earnedCount === achievements.length && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-b4-teal/10 to-emerald-500/10 border border-b4-teal/20 text-center">
            <span className="text-sm font-medium text-b4-teal">
              🎉 All achievements unlocked!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

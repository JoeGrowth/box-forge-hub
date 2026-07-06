import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
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
import { useTalentReadiness } from "@/hooks/useTalentReadiness";
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
  const { talentReady } = useTalentReadiness();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [soloDelivered, setSoloDelivered] = useState(0);
  const [contractorsDelivered, setContractorsDelivered] = useState(0);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;

    const [
      { data: ideas },
      { data: teamMemberships },
      { data: nrDecoder },
      { data: closedOpps },
    ] = await Promise.all([
      supabase.from("startup_ideas").select("review_status").eq("creator_id", user.id),
      supabase.from("startup_team_members").select("*").eq("member_user_id", user.id),
      supabase.from("nr_decoder_submissions").select("status").eq("user_id", user.id).single(),
      supabase.from("consultant_opportunities").select("id").eq("user_id", user.id).eq("stage", "closed"),
    ]);

    const closedIds = (closedOpps ?? []).map((o: any) => o.id);
    let solo = 0;
    let contractors = 0;
    if (closedIds.length > 0) {
      const { data: dists } = await supabase
        .from("consultant_opportunity_distributions")
        .select("opportunity_id, recipient_name, note")
        .in("opportunity_id", closedIds);
      const byOpp: Record<string, { name: string; note: string | null }[]> = {};
      (dists ?? []).forEach((d: any) => {
        (byOpp[d.opportunity_id] ||= []).push({ name: d.recipient_name || "", note: d.note });
      });
      for (const id of closedIds) {
        const list = byOpp[id] || [];
        const hasEquity = list.some((r) =>
          /associé|associe|equity|partner|co[- ]?builder/i.test(`${r.name} ${r.note ?? ""}`)
        );
        if (list.length <= 1) solo++;
        else if (!hasEquity) contractors++;
      }
    }
    setSoloDelivered(solo);
    setContractorsDelivered(contractors);

    const talentMonetized = solo >= 3 && contractors >= 7;

    const a1 = !!onboardingState?.onboarding_completed;
    const a2 = a1 && !!nrDecoder;
    const a3 = a2 && talentReady;
    const a4 = a3 && (onboardingState?.journey_status === "approved" || onboardingState?.journey_status === "entrepreneur_approved");
    const a5 = a4 && (ideas?.length || 0) > 0;
    const a6 = a5 && (teamMemberships?.length || 0) > 0;
    const a7 = a6 && talentMonetized;

    const achievementsList: Achievement[] = [
      {
        icon: Target,
        title: "Onboarded",
        description: "Intent declared",
        earned: a1,
        color: "text-blue-500",
      },
      {
        icon: Zap,
        title: "Self-aware",
        description: "Natural role decoded",
        earned: a2,
        color: "text-purple-500",
      },
      {
        icon: Star,
        title: "Talent",
        description: "Talent foundation set",
        earned: a3,
        color: "text-cyan-500",
      },
      {
        icon: Trophy,
        title: "Approved",
        description: "Journey validated",
        earned: a4,
        color: "text-b4-teal",
      },
      {
        icon: Rocket,
        title: "Initiator",
        description: "First idea launched",
        earned: a5,
        color: "text-rose-500",
      },
      {
        icon: Users,
        title: "Co-builder",
        description: "Took a seat in a venture",
        earned: a6,
        color: "text-emerald-500",
      },
      {
        icon: TrendingUp,
        title: "Advisor",
        description: "Talent monetized",
        earned: a7,
        color: "text-pink-500",
      },
    ];

    setAchievements(achievementsList);
  }, [user, onboardingState, talentReady]);

  useEffect(() => {
    fetchAchievements();
    if (!user) return;
    const onVisible = () => { if (document.visibilityState === "visible") fetchAchievements(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", fetchAchievements);

    const channel = supabase
      .channel(`dashboard-achievements-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultant_opportunities", filter: `user_id=eq.${user.id}` }, fetchAchievements)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultant_opportunity_distributions" }, fetchAchievements)
      .on("postgres_changes", { event: "*", schema: "public", table: "startup_ideas", filter: `creator_id=eq.${user.id}` }, fetchAchievements)
      .on("postgres_changes", { event: "*", schema: "public", table: "startup_team_members", filter: `member_user_id=eq.${user.id}` }, fetchAchievements)
      .on("postgres_changes", { event: "*", schema: "public", table: "nr_decoder_submissions", filter: `user_id=eq.${user.id}` }, fetchAchievements)
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", fetchAchievements);
      supabase.removeChannel(channel);
    };
  }, [fetchAchievements, user]);

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
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {achievements.map((achievement, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={`relative group cursor-default ${
                      achievement.earned ? "" : "opacity-40 grayscale"
                    }`}
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
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center">
                  <p className="font-medium">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {earnedCount === achievements.length && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-b4-teal/10 to-emerald-500/10 border border-b4-teal/20 text-center">
            <span className="text-sm font-medium text-b4-teal">
              Every badge unlocked. You're shaping the future.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

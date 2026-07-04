import { TrendingUp, Users, Award, Briefcase, Target, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useExpertise } from "@/hooks/useExpertise";
import { useNextBestActions } from "@/hooks/useNextBestActions";
import { supabase } from "@/integrations/supabase/client";

const STAGE_LEVEL: Record<string, number> = {
  novice: 1,
  emerging: 2,
  capable: 3,
  monetizing: 4,
  building: 5,
  founder: 6,
};

export default function Squares() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { expertise } = useExpertise(user?.id);
  const { progression } = useNextBestActions(user?.id);
  const [activity, setActivity] = useState({ applications: 0, ideas: 0, journeysCompleted: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: appCount }, { count: ideaCount }, { data: journeys }] = await Promise.all([
        supabase.from("startup_applications").select("*", { count: "exact", head: true }).eq("applicant_id", user.id),
        supabase.from("startup_ideas").select("*", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("learning_journeys").select("status").eq("user_id", user.id).eq("status", "approved"),
      ]);
      setActivity({
        applications: appCount || 0,
        ideas: ideaCount || 0,
        journeysCompleted: journeys?.length || 0,
      });
    })();
  }, [user]);

  const certifications = expertise?.monetizable.certifications ?? 0;
  const teamMemberships = expertise?.monetizable.contributions ?? 0;
  const baseEquity = teamMemberships * 5 + certifications * 2;
  const potentialEquityNum = Math.min(baseEquity, 25);
  const potentialEquity = baseEquity > 0 ? `${potentialEquityNum}%` : "0%";
  const stageLevel = STAGE_LEVEL[progression?.current_state ?? "novice"] ?? 1;

  const statCards = [
    {
      icon: TrendingUp,
      label: "Potential equity",
      value: potentialEquity,
      description: "Across active ventures",
      bgColor: "bg-emerald-500/10",
      iconColor: "#10b981",
      detail: `Weighted from ${teamMemberships} co-builder seat${teamMemberships === 1 ? "" : "s"} (×5%) + ${certifications} certification${certifications === 1 ? "" : "s"} (×2%), capped at 25%.`,
      link: null,
    },
    {
      icon: Award,
      label: "Certifications",
      value: certifications.toString(),
      description: "Vaccinated skills",
      bgColor: "bg-purple-500/10",
      iconColor: "#a855f7",
      detail: "Skills you've earned Vaccinated status on by completing the full practice → train → consult journey.",
      link: "/journey",
    },
    {
      icon: Target,
      label: "Ideas launched",
      value: activity.ideas.toString(),
      description: "Ventures you initiated",
      bgColor: "bg-rose-500/10",
      iconColor: "#f43f5e",
      detail: "Startup ideas you've authored and pushed into the platform.",
      link: "/entrepreneurship",
    },
    {
      icon: Briefcase,
      label: "Applications sent",
      value: activity.applications.toString(),
      description: "Moves in play",
      bgColor: "bg-orange-500/10",
      iconColor: "#f97316",
      detail: "Startup role applications you've submitted.",
      link: "/entrepreneurship",
    },
    {
      icon: Users,
      label: "Co-builder seats",
      value: teamMemberships.toString(),
      description: "Ventures you're in",
      bgColor: "bg-blue-500/10",
      iconColor: "#3b82f6",
      detail: "Active ventures where you're a confirmed team member with an equity or role package.",
      link: "/entrepreneurship",
    },
    {
      icon: Zap,
      label: "Journeys cleared",
      value: stageLevel.toString(),
      description: "Stages unlocked",
      bgColor: "bg-b4-teal/10",
      iconColor: "#14b8a6",
      detail: `Current stage: ${progression?.current_state ?? "novice"} (${stageLevel}/6). Novice (1), Emerging (2), Capable (3), Monetizing (4), Building (5), Founder (6).`,
      link: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Your Squares
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              A snapshot of your signals across ventures, certifications and moves in play.
            </p>
          </header>

          <TooltipProvider delayDuration={150}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statCards.map((stat, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(stat.link)}
                      className="bg-card rounded-xl border border-border p-4 hover:border-b4-teal/30 transition-all duration-300 hover:shadow-lg hover:shadow-b4-teal/5 text-left cursor-pointer w-full"
                    >
                      <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                        <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-0.5">{stat.value}</div>
                      <div className="text-sm font-medium text-foreground/80">{stat.label}</div>
                      <div className="text-xs text-muted-foreground">{stat.description}</div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold mb-1">{stat.label} — {stat.value}</p>
                    <p className="text-xs leading-relaxed">{stat.detail}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </main>
      <Footer />
    </div>
  );
}

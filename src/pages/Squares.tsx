import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useExpertise } from "@/hooks/useExpertise";
import { useNextBestActions } from "@/hooks/useNextBestActions";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Zap, Target, Award, Briefcase, Users } from "lucide-react";

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
      icon: Zap,
      label: "Stages unlocked",
      value: `${stageLevel}/6`,
      description: "Proof of progress",
      bgColor: "bg-b4-teal/10",
      iconColor: "#14b8a6",
      detail: `Current stage: ${progression?.current_state ?? "novice"} (${stageLevel}/6). Novice (1), Emerging (2), Capable (3), Monetizing (4), Building (5), Founder (6).`,
      link: null,
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                const content = (
                  <div className="border border-border rounded-2xl p-5 bg-card h-full flex flex-col gap-3 hover:shadow-md transition-shadow text-left">
                    <div
                      className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}
                    >
                      <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-foreground leading-tight">
                        {card.value}
                      </div>
                      <div className="text-sm font-medium text-foreground mt-1">
                        {card.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {card.description}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <Tooltip key={card.label}>
                    <TooltipTrigger asChild>
                      {card.link ? (
                        <button
                          type="button"
                          onClick={() => navigate(card.link!)}
                          className="text-left"
                        >
                          {content}
                        </button>
                      ) : (
                        <div>{content}</div>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {card.detail}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </main>
      <Footer />
    </div>
  );
}

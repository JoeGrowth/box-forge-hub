import { useEffect, useState } from "react";
import { TrendingUp, Users, Award, Briefcase, Target, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useExpertise } from "@/hooks/useExpertise";

interface ActivityStats {
  applications: number;
  ideas: number;
  journeysCompleted: number;
}

export function DashboardStats() {
  const { user } = useAuth();
  // Expertise (certifications, contributions, equity) — sourced exclusively
  // from the expertise_graph projection via useExpertise(). No direct reads
  // from user_certifications / user_skills / startup_team_members.
  const { expertise, loading: expertiseLoading } = useExpertise(user?.id);
  // Activity counters that are NOT expertise (applications submitted, ideas
  // authored, learning journeys completed) remain as direct module reads —
  // they belong to forthcoming Opportunity / Progression projections, not
  // the Expertise Graph.
  const [activity, setActivity] = useState<ActivityStats>({ applications: 0, ideas: 0, journeysCompleted: 0 });
  const [activityLoading, setActivityLoading] = useState(true);

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
      setActivityLoading(false);
    })();
  }, [user]);

  const loading = expertiseLoading || activityLoading;

  const certifications = expertise?.monetizable.certifications ?? 0;
  const teamMemberships = expertise?.monetizable.contributions ?? 0;
  // Same formula as before — equity weighting is unchanged; only the inputs
  // now come from the graph projection instead of two parallel COUNT(*)s.
  const baseEquity = teamMemberships * 5 + certifications * 2;
  const potentialEquityNum = Math.min(baseEquity, 25);
  const potentialEquity = baseEquity > 0 ? `${potentialEquityNum}%` : "0%";

  // Gate the entire stats bar — only show for users with meaningful signals.
  // Novice / cold-start users see a cleaner dashboard.
  const meetsThreshold =
    potentialEquityNum >= 10 ||
    certifications >= 2 ||
    teamMemberships >= 1 ||
    activity.applications >= 2 ||
    activity.ideas >= 2 ||
    activity.journeysCompleted >= 1;

  if (loading) return null;
  if (!meetsThreshold) return null;

  const statCards = [
    {
      icon: TrendingUp,
      label: "Potential equity",
      value: potentialEquity,
      description: "Across active ventures",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      detail: `Weighted from ${teamMemberships} co-builder seat${teamMemberships === 1 ? "" : "s"} (×5%) + ${certifications} certification${certifications === 1 ? "" : "s"} (×2%), capped at 25%. Reflects the equity you could realistically negotiate across active ventures given your current signals.`,
    },
    {
      icon: Award,
      label: "Certifications",
      value: certifications.toString(),
      description: "Certified skills",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      detail: "Skills you've earned Certified status on by completing the full practice → train → consult journey. Each one raises your equity ceiling and unlocks gated opportunities.",
    },
    {
      icon: Users,
      label: "Co-builder seats",
      value: teamMemberships.toString(),
      description: "Ventures you're in",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      detail: "Active ventures where you're a confirmed team member with an equity or role package. Each seat carries responsibility scope and vesting.",
    },
    {
      icon: Briefcase,
      label: "Applications sent",
      value: activity.applications.toString(),
      description: "Moves in play",
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-500/10",
      detail: "Startup role applications you've submitted. Track their status in Opportunities — pending, in review, accepted, or closed.",
    },
    {
      icon: Target,
      label: "Ideas launched",
      value: activity.ideas.toString(),
      description: "Ventures you initiated",
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
      detail: "Startup ideas you've authored and pushed into the platform. Approved ones become public opportunities others can apply to.",
    },
    {
      icon: Zap,
      label: "Journeys cleared",
      value: activity.journeysCompleted.toString(),
      description: "Proof of progress",
      color: "from-b4-teal to-emerald-400",
      bgColor: "bg-b4-teal/10",
      detail: "Learning journeys you've completed and had approved. Each cleared journey is verifiable proof of a real skill or certification.",
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className="bg-card rounded-xl border border-border p-4 hover:border-b4-teal/30 transition-all duration-300 hover:shadow-lg hover:shadow-b4-teal/5 text-left"
                tabIndex={0}
              >
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ color: stat.color.includes('emerald') ? '#10b981' : stat.color.includes('purple') ? '#a855f7' : stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('orange') ? '#f97316' : stat.color.includes('rose') ? '#f43f5e' : '#14b8a6' }} />
                </div>
                <div className="text-2xl font-bold text-foreground mb-0.5">
                  {loading ? "..." : stat.value}
                </div>
                <div className="text-sm font-medium text-foreground/80">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.description}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-semibold mb-1">{stat.label} — {stat.value}</p>
              <p className="text-xs leading-relaxed">{stat.detail}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

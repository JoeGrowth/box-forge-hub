import { useEffect, useState } from "react";
import { TrendingUp, Users, Award, Briefcase, Target, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  certifications: number;
  applications: number;
  teamMemberships: number;
  ideas: number;
  journeysCompleted: number;
  potentialEquity: string;
}

export function DashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    certifications: 0,
    applications: 0,
    teamMemberships: 0,
    ideas: 0,
    journeysCompleted: 0,
    potentialEquity: "0%",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const [
        { count: certCount },
        { count: appCount },
        { count: teamCount },
        { count: ideaCount },
        { data: journeys },
      ] = await Promise.all([
        supabase.from("user_certifications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("startup_applications").select("*", { count: "exact", head: true }).eq("applicant_id", user.id),
        supabase.from("startup_team_members").select("*", { count: "exact", head: true }).eq("member_user_id", user.id),
        supabase.from("startup_ideas").select("*", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("learning_journeys").select("status").eq("user_id", user.id).eq("status", "approved"),
      ]);

      // Calculate potential equity based on team memberships and certifications
      const baseEquity = (teamCount || 0) * 5 + (certCount || 0) * 2;
      const potentialEquity = baseEquity > 0 ? `${Math.min(baseEquity, 25)}%` : "0%";

      setStats({
        certifications: certCount || 0,
        applications: appCount || 0,
        teamMemberships: teamCount || 0,
        ideas: ideaCount || 0,
        journeysCompleted: journeys?.length || 0,
        potentialEquity,
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      icon: TrendingUp,
      label: "Potential Equity",
      value: stats.potentialEquity,
      description: "Across active startups",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Award,
      label: "Certifications",
      value: stats.certifications.toString(),
      description: "Verified skills",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Users,
      label: "Team Roles",
      value: stats.teamMemberships.toString(),
      description: "Active memberships",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Briefcase,
      label: "Applications",
      value: stats.applications.toString(),
      description: "Submitted",
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Target,
      label: "Ideas Created",
      value: stats.ideas.toString(),
      description: "Your initiatives",
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
    },
    {
      icon: Zap,
      label: "Journeys",
      value: stats.journeysCompleted.toString(),
      description: "Completed",
      color: "from-b4-teal to-emerald-400",
      bgColor: "bg-b4-teal/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-4 hover:border-b4-teal/30 transition-all duration-300 hover:shadow-lg hover:shadow-b4-teal/5"
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
      ))}
    </div>
  );
}

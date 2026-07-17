import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useExpertise } from "@/hooks/useExpertise";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AIProfileDraftCard } from "@/components/dashboard/AIProfileDraftCard";
import { ctasFor } from "@/lib/dashboardCtas";



export function DashboardHero() {
  const { user } = useAuth();
  const { expertise, loading: expertiseLoading } = useExpertise(user?.id);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  const [activity, setActivity] = useState<{ applications: number; ideas: number; journeysCompleted: number }>({ applications: 0, ideas: 0, journeysCompleted: 0 });
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const [{ data: prof }, { data: state }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
        supabase.from("onboarding_state").select("primary_role").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(prof);
      setPrimaryRole((state as any)?.primary_role ?? null);
    };
    fetchProfile();
  }, [user]);

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

  const { data: goal = null } = useQuery({
    queryKey: ["onboarding_session_goal", user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_sessions")
        .select("goal")
        .eq("user_id", user!.id)
        .maybeSingle();
      return ((data as any)?.goal as string | null) ?? null;
    },
  });

  const { data: intent = null } = useQuery({
    queryKey: ["onboarding_session_intent", user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_sessions")
        .select("onboarding_intent")
        .eq("user_id", user!.id)
        .maybeSingle();
      return ((data as any)?.onboarding_intent as string | null) ?? null;
    },
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const rawFirst = profile?.full_name?.split(" ")[0] || "Builder";
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const { primary: primaryCta, secondary: secondaryCta } = ctasFor(goal, intent, primaryRole);

  // Goal-aware copy. Reinforces the platform vision: decide to grow, take part
  // in shaping the future. Each onboarding goal gets its own reminder so the
  // dashboard speaks the user's language from the first second.
  const copyByGoal: Record<string, { eyebrow: string; headline: string; subline: string }> = {
    find_opportunities: {
      eyebrow: "Explorer mode",
      headline: `${getGreeting()}, ${firstName} — your next move is on the board`,
      subline:
        "The future belongs to those who scout it first. Scan today's opportunities, shortlist the ones that match the builder you're becoming, and move.",
    },
    join_startup: {
      eyebrow: "Co-builder in motion",
      headline: `${getGreeting()}, ${firstName} — a venture is waiting for your signature`,
      subline:
        "Great startups aren't built alone. Pick the idea you want your name on, meet its initiator, and start co-shaping the future from day one.",
    },
    build_venture: {
      eyebrow: "Initiator mode",
      headline: `${getGreeting()}, ${firstName} — the future you imagined still needs to be built`,
      subline:
        "You didn't come here to watch. Sharpen your idea, recruit your co-builders, and turn the vision into a venture the ecosystem can rally behind.",
    },
    monetize_expertise: {
      eyebrow: "Advisor in the making",
      headline: `${getGreeting()}, ${firstName} — your expertise deserves to be paid`,
      subline:
        "Stop giving advice for free. Publish a service, qualify the requests that come in, and grow a consulting track record that compounds.",
    },
    learn_skills: {
      eyebrow: "Learner mode",
      headline: `${getGreeting()}, ${firstName} — every certification opens a new door`,
      subline:
        "Builders are trained, not born. Pick a journey, get certified, and let the ecosystem unlock the opportunities your new skills deserve.",
    },
  };

  const copy =
    (goal && copyByGoal[goal]) || {
      eyebrow: "Welcome back",
      headline: `${getGreeting()}, ${firstName}! 👋`,
      subline:
        "You're here to grow, to build, and to take part in shaping the future. Pick your next move and let the ecosystem move with you.",
    };

  const certifications = expertise?.monetizable.certifications ?? 0;
  const teamMemberships = expertise?.monetizable.contributions ?? 0;
  const baseEquity = teamMemberships * 5 + certifications * 2;
  const potentialEquityNum = Math.min(baseEquity, 25);

  const loading = expertiseLoading || activityLoading;

  const meetsThreshold =
    potentialEquityNum >= 10 ||
    certifications >= 2 ||
    teamMemberships >= 1 ||
    activity.applications >= 2 ||
    activity.ideas >= 2 ||
    activity.journeysCompleted >= 1;

  if (loading) return null;

  return (
    <div className="mt-4">
      <AIProfileDraftCard />
    </div>
  );
}



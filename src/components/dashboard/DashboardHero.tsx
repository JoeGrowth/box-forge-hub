import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Lightbulb, Search, Users, GraduationCap, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AIProfileDraftCard } from "@/components/dashboard/AIProfileDraftCard";


type CtaSpec = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
};

// Map onboarding goal → two CTAs. Falls back to primary_role logic when goal is missing.
function ctasForGoal(goal: string | null, primaryRole: string | null): [CtaSpec, CtaSpec] {
  switch (goal) {
    case "find_opportunities":
      return [
        { to: "/opportunities", label: "Browse Opportunities", icon: Search, primary: true },
        { to: "/cobuilders", label: "Connect with People", icon: Users },
      ];
    case "join_startup":
      return [
        { to: "/opportunities?category=startup", label: "Browse Ideas", icon: Search, primary: true },
        { to: "/cobuilders", label: "Connect Co-Builders", icon: Users },
      ];
    case "build_venture":
      return [
        { to: "/create-idea", label: "Post an Idea", icon: Lightbulb, primary: true },
        { to: "/cobuilders", label: "Connect Co-Builders", icon: Users },
      ];
    case "monetize_expertise":
      return [
        { to: "/publish-consulting", label: "Publish a Service", icon: DollarSign, primary: true },
        { to: "/opportunities", label: "Browse Opportunities", icon: Search },
      ];
    case "learn_skills":
      return [
        { to: "/journey", label: "Open Learning", icon: GraduationCap, primary: true },
        { to: "/opportunities", label: "Browse Opportunities", icon: Search },
      ];
    default:
      if (primaryRole === "entrepreneur") {
        return [
          { to: "/create-idea", label: "Post an Idea", icon: Lightbulb, primary: true },
          { to: "/cobuilders", label: "Connect Co-Builders", icon: Users },
        ];
      }
      return [
        { to: "/opportunities?category=startup", label: "Browse Ideas", icon: Search, primary: true },
        { to: "/cobuilders", label: "Connect Co-Builders", icon: Users },
      ];
  }
}

export function DashboardHero() {
  const { user } = useAuth();
  const { level } = useAccessLevel();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const [{ data: prof }, { data: state }, { data: session }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
        supabase.from("onboarding_state").select("primary_role").eq("user_id", user.id).maybeSingle(),
        supabase.from("onboarding_sessions").select("goal").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(prof);
      setPrimaryRole((state as any)?.primary_role ?? null);
      setGoal((session as any)?.goal ?? null);
    };
    fetchProfile();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Builder";
  const [primaryCta, secondaryCta] = ctasForGoal(goal, primaryRole);
  const PrimaryIcon = primaryCta.icon;
  const SecondaryIcon = secondaryCta.icon;

  return (
    <>
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/90 p-8 md:p-10">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-b4-teal/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-b4-coral/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-b4-teal" />
            <span className="text-b4-teal text-sm font-medium">{format(new Date(), "EEEE, MMMM d")}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-white/70 max-w-lg">
            Your startup journey continues. Check your progress and discover new opportunities waiting for you.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="bg-b4-teal hover:bg-b4-teal/90 text-white" asChild>
            <Link to={primaryCta.to}>
              <PrimaryIcon className="mr-2 w-4 h-4" /> {primaryCta.label}
            </Link>
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
            <Link to={secondaryCta.to}>
              <SecondaryIcon className="mr-2 w-4 h-4" /> {secondaryCta.label} <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {level === "pending" && (
        <div className="relative z-10 mt-6 rounded-xl bg-white/10 border border-white/15 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-b4-teal mt-0.5 shrink-0" />
            <div className="text-sm text-white/85">
              <span className="font-semibold text-white">Pending review.</span>{" "}
              You can browse opportunities, save them and view co-builders.
              Publishing and applying unlock once you're approved.
            </div>
          </div>
          <Button asChild size="sm" className="bg-b4-teal hover:bg-b4-teal/90 text-white shrink-0">
            <Link to="/professional-track">Boost approval <ArrowRight className="ml-1 w-3 h-3" /></Link>
          </Button>
        </div>
      )}
    </div>
    <div className="mt-4">
      <AIProfileDraftCard />
    </div>
    </>
  );
}



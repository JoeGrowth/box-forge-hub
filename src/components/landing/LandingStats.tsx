import { useEffect, useState } from "react";
import { TrendingUp, Users, Rocket, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Live community stats — sourced from materialized projections.
// Hardcoded vanity numbers were removed; we display "—" if a count
// is unavailable rather than inflate. Trust > theatre.

interface LiveStat {
  icon: typeof Users;
  value: string;
  label: string;
  description: string;
}

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  return `${n}`;
}

export function LandingStats() {
  const [members, setMembers] = useState<number | null>(null);
  const [ideas, setIdeas] = useState<number | null>(null);
  const [opportunities, setOpportunities] = useState<number | null>(null);
  const [matches, setMatches] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [m, i, jobs, trainings, consulting, mg] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).or("is_deleted.is.null,is_deleted.eq.false"),
        supabase.from("startup_ideas").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("job_opportunities").select("id", { count: "exact", head: true }),
        supabase.from("training_opportunities").select("id", { count: "exact", head: true }),
        supabase.from("consulting_services").select("id", { count: "exact", head: true }),
        supabase.from("opportunity_graph").select("id", { count: "exact", head: true }).gte("match_score", 50),
      ]);
      setMembers(m.count ?? null);
      setIdeas(i.count ?? null);
      const totalOpps = (jobs.count ?? 0) + (trainings.count ?? 0) + (consulting.count ?? 0) + (i.count ?? 0);
      setOpportunities(totalOpps || null);
      setMatches(mg.count ?? null);
    };
    void load();
  }, []);

  const stats: LiveStat[] = [
    {
      icon: Users,
      value: fmt(members),
      label: "Members",
      description: "Co-builders, initiators and consultants",
    },
    {
      icon: Rocket,
      value: fmt(ideas),
      label: "Active startup ideas",
      description: "Founders looking for co-builders right now",
    },
    {
      icon: TrendingUp,
      value: fmt(opportunities),
      label: "Live opportunities",
      description: "Jobs, training, consulting and startups",
    },
    {
      icon: DollarSign,
      value: fmt(matches),
      label: "Strong matches",
      description: "Person–opportunity pairs over 50% fit",
    },
  ];

  return (
    <section className="py-20 bg-background border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-b4-teal/10 mb-4">
                <stat.icon className="w-6 h-6 text-b4-teal" />
              </div>
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="font-semibold text-foreground mb-1">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.description}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          Live community metrics — updated from the platform graph.
        </p>
      </div>
    </section>
  );
}

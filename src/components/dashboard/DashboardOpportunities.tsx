import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Briefcase, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useOpportunityRecommendations, type OpportunityRecommendation } from "@/hooks/useOpportunityRecommendations";

// P0.5 — Mixed dashboard feed.
// Reads top matches across ALL opportunity kinds from opportunity_graph
// instead of cherry-picking one category. The graph already ranks every
// kind on the same match_score axis; we just consume the top 5.

interface FeedItem {
  rec: OpportunityRecommendation;
  title: string;
  subtitle: string | null;
  route: string;
}

const kindMeta: Record<string, { label: string; className: string; route: (id: string) => string }> = {
  startup:    { label: "Startup",    className: "bg-b4-teal/10 text-b4-teal border-b4-teal/20",       route: (id) => `/opportunities/startup/${id}` },
  job:        { label: "Job",        className: "bg-blue-500/10 text-blue-600 border-blue-500/20",   route: (id) => `/opportunities/job/${id}` },
  training:   { label: "Training",   className: "bg-purple-500/10 text-purple-600 border-purple-500/20", route: (id) => `/opportunities/training/${id}` },
  consulting: { label: "Consulting", className: "bg-amber-500/10 text-amber-700 border-amber-500/20", route: (id) => `/opportunities/consulting/${id}` },
  tender:     { label: "Tender",     className: "bg-rose-500/10 text-rose-600 border-rose-500/20",   route: (id) => `/opportunities/tender/${id}` },
};

async function fetchTitles(recs: OpportunityRecommendation[]) {
  const byKind: Record<string, string[]> = {};
  for (const r of recs) {
    (byKind[r.opportunityKind] ||= []).push(r.opportunityId);
  }
  const titles: Record<string, { title: string; subtitle: string | null }> = {};

  await Promise.all(
    Object.entries(byKind).map(async ([kind, ids]) => {
      const table = ({
        startup: "startup_ideas",
        job: "job_opportunities",
        training: "training_opportunities",
        consulting: "consulting_services",
        tender: "tenders",
      } as Record<string, string>)[kind];
      if (!table) return;
      const { data } = await (supabase.from(table as any) as any)
        .select("id, title, sector")
        .in("id", ids);
      for (const row of data ?? []) {
        titles[`${kind}:${row.id}`] = { title: row.title, subtitle: row.sector ?? null };
      }
    })
  );
  return titles;
}

export function DashboardOpportunities() {
  const { user } = useAuth();
  const { recommendations, loading } = useOpportunityRecommendations(user?.id, { limit: 5 });
  const [items, setItems] = useState<FeedItem[]>([]);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!recommendations.length) {
      setItems([]);
      return;
    }
    setResolving(true);
    fetchTitles(recommendations).then((titles) => {
      if (cancelled) return;
      const next: FeedItem[] = recommendations.map((rec) => {
        const meta = kindMeta[rec.opportunityKind] ?? kindMeta.startup;
        const t = titles[`${rec.opportunityKind}:${rec.opportunityId}`];
        return {
          rec,
          title: t?.title ?? "Untitled opportunity",
          subtitle: t?.subtitle ?? null,
          route: meta.route(rec.opportunityId),
        };
      }).filter((i) => i.title !== "Untitled opportunity");
      setItems(next);
      setResolving(false);
    });
    return () => { cancelled = true; };
  }, [recommendations]);

  const showing = loading || resolving;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-b4-teal" />
            Picked for you
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/opportunities">
              See everything <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Jobs, ventures, missions, training and tenders — ranked on one match score.
        </p>
      </CardHeader>
      <CardContent>
        {showing ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No matches yet.</p>
            <p className="text-sm">Add a few skills to your profile and the ecosystem will start pointing back at you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ rec, title, subtitle, route }) => {
              const meta = kindMeta[rec.opportunityKind] ?? kindMeta.startup;
              return (
                <Link
                  key={`${rec.opportunityKind}:${rec.opportunityId}`}
                  to={route}
                  className="block p-4 rounded-lg border border-border hover:border-b4-teal/30 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${meta.className}`}>
                          {meta.label}
                        </Badge>
                        <h4 className="font-medium text-foreground truncate">{title}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {Math.round(rec.matchScore)}% match
                        </span>
                        {subtitle && <span className="truncate">{subtitle}</span>}
                        {rec.nextAction && (
                          <span className="truncate hidden sm:inline">Next: {rec.nextAction}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

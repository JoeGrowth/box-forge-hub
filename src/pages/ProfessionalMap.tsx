import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useColdStart } from "@/hooks/useColdStart";
import { useUserState, useEmitOnboardingEvent } from "@/hooks/useOnboardingSession";
import { useNextBestActions } from "@/hooks/useNextBestActions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

// P0.6 — First Value Screen. Renders the user's professional map within
// seconds of completing compressed onboarding. Estimated tags are clearly
// labeled. At least 3 recommendations are shown with reasons + next actions.

interface RecCard {
  id: string;
  title: string;
  reason: string;
  next: string;
  link: string;
}

export default function ProfessionalMap() {
  const navigate = useNavigate();
  const { data: cold, isLoading: csLoading } = useColdStart();
  const { data: userState, isLoading: usLoading } = useUserState();
  const [uid, setUid] = useState<string | null>(null);
  const { progression, loading: progLoading } = useNextBestActions(uid);
  const emit = useEmitOnboardingEvent();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const estimated = useMemo<string[]>(
    () => (cold?.estimated_expertise as unknown as string[]) ?? [],
    [cold],
  );

  const recommendations = useMemo<RecCard[]>(() => {
    const fromGraph: RecCard[] = (progression?.recommended_actions ?? []).slice(0, 5).map((a) => ({
      id: a.rule,
      title: (a.payload?.label as string) ?? a.action,
      reason: typeof a.reason === "object" ? Object.values(a.reason).join(" · ") : String(a.reason ?? ""),
      next: a.action,
      link: (a.payload?.link as string) ?? "/dashboard",
    }));
    if (fromGraph.length >= 3) return fromGraph;
    // Guaranteed cold-start fallbacks so the user never sees an empty map.
    const fallback: RecCard[] = [
      {
        id: "discover",
        title: "Discover matching opportunities",
        reason: "Based on your estimated expertise",
        next: "Browse the opportunities feed",
        link: "/opportunities",
      },
      {
        id: "verify",
        title: "Verify your expertise",
        reason: "Estimated tags become real signals once verified",
        next: "Take the Natural Role decoder",
        link: "/nr-decoder",
      },
      {
        id: "connect",
        title: "Find co-builders",
        reason: "Density of warm matches improves with 5+ connections",
        next: "Open the co-builder directory",
        link: "/people",
      },
    ];
    return [...fromGraph, ...fallback].slice(0, Math.max(3, fromGraph.length + 1));
  }, [progression]);

  useEffect(() => {
    if (!uid || usLoading || progLoading) return;
    // Fire-and-forget viewer event.
    emit.mutate({ type: "first_recommendations_viewed", payload: { count: recommendations.length } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, usLoading, progLoading]);

  if (csLoading || usLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const state = userState?.state ?? "Explorer";
  const flowLabel: Record<string, string> = {
    discover_expertise: "Complete one learning journey to unlock Validated Expert opportunities",
    build_credibility: "Get verified on one estimated skill to move from estimated to validated",
    find_paid_engagement: "Apply to one paid engagement to start your Revenue Graph",
    engage_startup: "Accept a co-builder role to start earning equity",
    monetize: "Launch a productized offer to compound revenue",
    scale_venture: "Recruit one co-builder to expand your venture",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="h-3 w-3" /> Your professional map
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Hypothesis: {state}</h1>
          <p className="text-muted-foreground text-sm">
            {flowLabel[userState?.recommended_flow ?? "discover_expertise"]}
          </p>
        </header>

        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">You appear strong in</h2>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Estimated
            </Badge>
          </div>
          {estimated.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags seeded yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {estimated.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary/70" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground pt-2">
            These do not affect your Trust or Reputation graphs until verified.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            First recommendations
          </h2>
          <div className="grid gap-3">
            {recommendations.map((r) => (
              <Link
                key={r.id}
                to={r.link}
                onClick={() =>
                  emit.mutate({
                    type: "first_recommendation_clicked",
                    payload: { recommendation_id: r.id, link: r.link },
                    aggregateId: r.id,
                  })
                }
                className="block"
              >
                <Card className="p-4 hover:border-primary/40 transition group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="font-medium text-sm leading-tight">{r.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Why: </span>
                        {r.reason || "Matches your current professional signals"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Next: </span>
                        {r.next}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={() => navigate("/profile")}>
            Complete fuller profile later
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            Go to dashboard <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

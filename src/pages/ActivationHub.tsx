// Activation Hub — the single screen between onboarding completion and
// dashboard. Four blocks: Welcome, 3 matches, 1 NBA, 1 missing signal.
//
// Measurement model:
//   activation_seen_at      → set on first mount
//   activation_completed_at → set only on meaningful action
//                             (Save / Interest / Apply / Signal completed)
//   activation_hub_viewed   → graph_events row on first mount

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useOpportunityRecommendations } from "@/hooks/useOpportunityRecommendations";
import { useNextBestAction } from "@/hooks/useNextBestAction";
import { ActivationMatchCard, type FallbackMatch, type MatchCardData } from "@/components/activation/ActivationMatchCard";
import { ActivationNBA } from "@/components/activation/ActivationNBA";
import { MissingSignalDrawer } from "@/components/activation/MissingSignalDrawer";

const ACTIVATION_SOURCE = "activation_hub";

async function fetchFallbacks(): Promise<FallbackMatch[]> {
  const out: FallbackMatch[] = [];

  const { data: jobs } = await supabase
    .from("job_opportunities")
    .select("id, title, company")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1);
  if (jobs?.[0])
    out.push({
      opportunityId: jobs[0].id,
      kind: "job",
      title: jobs[0].title ?? "Open role",
      subtitle: jobs[0].company ?? null,
      reason: "Popular on the platform right now",
    });

  const { data: trainings } = await supabase
    .from("training_opportunities")
    .select("id, title, sector")
    .eq("review_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);
  if (trainings?.[0])
    out.push({
      opportunityId: trainings[0].id,
      kind: "training",
      title: trainings[0].title ?? "Training",
      subtitle: trainings[0].sector ?? null,
      reason: "Popular on the platform right now",
    });

  const { data: startups } = await supabase
    .from("startup_ideas")
    .select("id, title, sector")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  if (startups?.[0])
    out.push({
      opportunityId: startups[0].id,
      kind: "startup",
      title: startups[0].title ?? "Startup idea",
      subtitle: startups[0].sector ?? null,
      reason: "Popular on the platform right now",
    });

  return out;
}


export default function ActivationHub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole } = useOnboarding();
  const [fullName, setFullName] = useState<string | null>(null);
  const [fallbacks, setFallbacks] = useState<FallbackMatch[]>([]);
  const [signalOpen, setSignalOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const viewEmittedRef = useRef(false);

  const { recommendations, loading: recsLoading } =
    useOpportunityRecommendations(user?.id, { limit: 3 });
  const { topAction } = useNextBestAction(user?.id, {
    surface: "growth_loops",
    limit: 1,
  });

  // Redirect away if user has already completed activation.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    const completedAt = (onboardingState as { activation_completed_at?: string | null } | null)
      ?.activation_completed_at;
    if (completedAt) navigate("/dashboard", { replace: true });
  }, [user, authLoading, onboardingState, navigate]);

  // Fire seen-event + load fallbacks on first mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setFullName(prof?.full_name ?? null);

      // seen_at is set once; the unique idempotency_key on graph_events
      // guarantees a single activation_hub_viewed across refreshes & tabs.
      const seenAt =
        (onboardingState as { activation_seen_at?: string | null } | null)
          ?.activation_seen_at ?? null;
      if (!seenAt) {
        await supabase
          .from("onboarding_state")
          .update({ activation_seen_at: new Date().toISOString() })
          .is("activation_seen_at", null)
          .eq("user_id", user.id);
      }

      const fb = await fetchFallbacks();
      if (!cancelled) setFallbacks(fb);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build the 3-card slot — personalized first, then fallback labeled as "Explore".
  const matches: MatchCardData[] = useMemo(() => {
    const personalized: MatchCardData[] = recommendations.slice(0, 3).map((r) => ({
      kind: "personalized",
      opportunityId: r.opportunityId,
      opportunityKind: r.opportunityKind,
      title: r.opportunityId, // placeholder; ActivationMatchCard will fetch the row
      subtitle: null,
      reason: r.explanation?.skills_match?.reason ?? "Strong fit on your skills",
      matchScore: r.matchScore,
    }));
    const remaining = 3 - personalized.length;
    const explore: MatchCardData[] =
      remaining > 0
        ? fallbacks.slice(0, remaining).map((f) => ({
            kind: "explore",
            opportunityId: f.opportunityId,
            opportunityKind: f.kind,
            title: f.title,
            subtitle: f.subtitle,
            reason: f.reason,
            matchScore: null,
          }))
        : [];
    return [...personalized, ...explore];
  }, [recommendations, fallbacks]);

  // Recommendation-quality counters. Emit activation_hub_viewed exactly once
  // per user (DB-level dedup via idempotency_key) AFTER matches resolve, so
  // personalized vs fallback counts are accurate.
  useEffect(() => {
    if (!user || viewEmittedRef.current) return;
    if (recsLoading) return;
    viewEmittedRef.current = true;
    const personalizedCount = matches.filter((m) => m.kind === "personalized").length;
    const fallbackCount = matches.filter((m) => m.kind === "explore").length;
    void supabase.from("graph_events").upsert(
      {
        user_id: user.id,
        event_type: "activation_hub_viewed",
        aggregate_type: "user",
        aggregate_id: user.id,
        source_module: ACTIVATION_SOURCE,
        payload: {
          canonical_name: "activation.hub_viewed",
          source: ACTIVATION_SOURCE,
          personalized_matches_count: personalizedCount,
          fallback_matches_count: fallbackCount,
        } as never,
        idempotency_key: `activation_hub_viewed:v1:${user.id}`,
        weight: 0,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    );
  }, [user, recsLoading, matches]);

  const markCompleted = async () => {
    if (!user || completed) return;
    setCompleted(true);
    // Only stamp the first meaningful action; guard against double-writes
    // (refresh, two tabs, racing handlers).
    await supabase
      .from("onboarding_state")
      .update({ activation_completed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("activation_completed_at", null);
    // Small UX pause so the user sees the toast/state, then route to dashboard.
    setTimeout(() => navigate("/dashboard", { replace: true }), 700);
  };

  const handleSkip = () => navigate("/dashboard", { replace: true });

  const nrLine =
    naturalRole?.description?.trim().slice(0, 140) ||
    "Your professional map is ready.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-b4-teal mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                You're in
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Welcome{fullName ? `, ${fullName.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">{nrLine}</p>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip to dashboard
          </button>
        </div>

        {/* Block 2 — Matches */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Recommended for you
          </h2>
          {recsLoading && matches.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Matching opportunities…
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m, idx) => (
                <ActivationMatchCard
                  key={`${m.opportunityKind}-${m.opportunityId}-${idx}`}
                  data={m}
                  source={ACTIVATION_SOURCE}
                  onMeaningfulAction={markCompleted}
                />
              ))}
              {matches.length === 0 && (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No live opportunities yet — check back soon.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Block 3 — Next Best Action */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            One action that unlocks the rest
          </h2>
          <ActivationNBA
            action={topAction}
            source={ACTIVATION_SOURCE}
            onExecuted={markCompleted}
          />
        </section>

        {/* Block 4 — Missing Signal */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Add one thing to unlock more
          </h2>
          <button
            onClick={() => setSignalOpen(true)}
            className="w-full text-left rounded-xl border bg-card hover:bg-accent transition px-5 py-4 flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-medium text-foreground">
                Add one skill
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Unlock more opportunity matches
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </section>

        <div className="flex justify-end mt-8">
          <Button variant="ghost" onClick={handleSkip} disabled={completed}>
            Go to dashboard <ArrowRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      </div>

      <MissingSignalDrawer
        open={signalOpen}
        onOpenChange={setSignalOpen}
        userId={user?.id ?? null}
        source={ACTIVATION_SOURCE}
        onCompleted={() => {
          setSignalOpen(false);
          void markCompleted();
        }}
      />
    </div>
  );
}

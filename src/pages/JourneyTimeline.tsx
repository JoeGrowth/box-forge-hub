import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import {
  UserPlus,
  CheckCircle2,
  Compass,
  UserCheck,
  ShieldCheck,
  Target,
  Send,
  Handshake,
  Hammer,
  Trophy,
  Circle,
  Clock,
  ArrowRight,
} from "lucide-react";

type Status = "done" | "current" | "locked";

interface Step {
  key: string;
  label: string;
  description: string;
  icon: typeof UserPlus;
  cta?: { label: string; to: string };
  at: string | null;
  status: Status;
  detail?: string;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

export default function JourneyTimeline() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[] | null>(null);

  useEffect(() => {
    document.title = "Your Journey Timeline | Box4Solutions";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Track every milestone from signup to equity earned.");
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [
        { data: profile },
        { data: onb },
        { data: firstInteraction },
        { data: firstApp },
        { data: firstIdea },
        { data: allocation },
        { data: ownedIdea },
        { data: vesting },
        { data: vestEvent },
      ] = await Promise.all([
        supabase.from("profiles").select("created_at, updated_at, summary_statement, primary_skills, professional_title").eq("user_id", user.id).maybeSingle(),
        supabase.from("onboarding_state").select("created_at, updated_at, onboarding_completed, primary_role, user_status, journey_status").eq("user_id", user.id).maybeSingle(),
        supabase.from("opportunity_interactions").select("created_at, action_type").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("startup_applications").select("created_at, status").eq("applicant_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("startup_ideas").select("created_at, current_episode, development_completed_at, validation_completed_at, growth_completed_at").eq("creator_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("equity_allocations").select("created_at, status, percentage").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("startup_ideas").select("current_episode, development_completed_at, validation_completed_at, growth_completed_at").eq("creator_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("vesting_schedules").select("start_date, vested_percentage, total_percentage").gt("vested_percentage", 0).limit(1).maybeSingle(),
        supabase.from("equity_events").select("occurred_at, event_type, percentage").in("event_type", ["vested", "vesting", "earned"]).order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (cancelled) return;

      const signupAt = user.created_at ?? profile?.created_at ?? null;
      const onbDone = !!onb?.onboarding_completed;
      const onbAt = onbDone ? onb?.updated_at ?? null : null;
      const pathPicked = !!onb?.primary_role;
      const enriched = !!(profile?.summary_statement || (profile?.primary_skills as unknown as string[])?.length || profile?.professional_title);
      const approved = onb?.user_status === "approved";
      const engaged = !!(firstApp || firstIdea);
      const negotiated = !!allocation;
      const buildAt =
        ownedIdea?.growth_completed_at ||
        ownedIdea?.validation_completed_at ||
        ownedIdea?.development_completed_at ||
        null;
      const earnedAt = vestEvent?.occurred_at || (vesting ? vesting.start_date : null);

      const raw: Omit<Step, "status">[] = [
        {
          key: "signup",
          label: "1. Signup",
          description: "Account created — your acquisition event.",
          icon: UserPlus,
          at: signupAt,
        },
        {
          key: "activate",
          label: "2. Activate",
          description: "Completed the compressed onboarding (activation metric).",
          icon: CheckCircle2,
          cta: !onbDone ? { label: "Finish onboarding", to: "/onboarding" } : undefined,
          at: onbAt,
          detail: onbDone ? "onboarding_completed = true" : "Pending",
        },
        {
          key: "path",
          label: "3. Path chosen",
          description: "Professional or Entrepreneurial track selected.",
          icon: Compass,
          cta: !pathPicked ? { label: "Choose path", to: "/onboarding" } : undefined,
          at: pathPicked ? onb?.updated_at ?? null : null,
          detail: onb?.primary_role ?? undefined,
        },
        {
          key: "enrich",
          label: "4. Enrich",
          description: "Filled professional signals (skills, title, summary).",
          icon: UserCheck,
          cta: !enriched ? { label: "Enrich profile", to: "/profile" } : undefined,
          at: enriched ? profile?.updated_at ?? null : null,
        },
        {
          key: "approve",
          label: "5. Approval",
          description: "Admin verified — unlocks Publish & Apply.",
          icon: ShieldCheck,
          at: approved ? onb?.updated_at ?? null : null,
          detail: approved ? "approved" : onb?.user_status ?? "pending",
        },
        {
          key: "match",
          label: "6. Match",
          description: "First interaction with the opportunity graph.",
          icon: Target,
          cta: !firstInteraction ? { label: "Browse opportunities", to: "/opportunities" } : undefined,
          at: firstInteraction?.created_at ?? null,
        },
        {
          key: "engage",
          label: "7. Engage",
          description: "Applied to a venture or published your own idea.",
          icon: Send,
          cta: !engaged ? { label: "Apply or publish", to: "/opportunities" } : undefined,
          at: firstApp?.created_at ?? firstIdea?.created_at ?? null,
          detail: firstApp ? `application · ${firstApp.status}` : firstIdea ? "idea published" : undefined,
        },
        {
          key: "negotiate",
          label: "8. Negotiate",
          description: "Equity allocation agreed (role label assigned).",
          icon: Handshake,
          at: allocation?.created_at ?? null,
          detail: allocation ? `${allocation.percentage}% · ${allocation.status}` : undefined,
        },
        {
          key: "build",
          label: "9. Build",
          description: "Develop → Validate → Grow episodes in motion.",
          icon: Hammer,
          cta: negotiated && !buildAt ? { label: "Open Scale", to: "/start" } : undefined,
          at: buildAt,
          detail: ownedIdea?.current_episode ?? undefined,
        },
        {
          key: "earned",
          label: "10. Equity Earned",
          description: "Vesting recorded — terminal value event.",
          icon: Trophy,
          at: earnedAt,
          detail: vesting ? `${vesting.vested_percentage}% vested` : vestEvent?.event_type,
        },
      ];

      // Compute status: done if at present; current = first not-done; rest locked.
      let currentAssigned = false;
      const computed: Step[] = raw.map((s) => {
        if (s.at) return { ...s, status: "done" as Status };
        if (!currentAssigned) {
          currentAssigned = true;
          return { ...s, status: "current" as Status };
        }
        return { ...s, status: "locked" as Status };
      });

      setSteps(computed);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageTransition>
          <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Sign in to see your journey</h1>
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  const doneCount = steps?.filter((s) => s.status === "done").length ?? 0;
  const totalCount = steps?.length ?? 10;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <main className="container mx-auto px-4 py-12 max-w-3xl">
      <header className="mb-10">
        <p className="text-sm text-muted-foreground mb-2">End-to-end process</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Your Journey Timeline</h1>
        <p className="text-muted-foreground">
          From <span className="font-medium">signup</span> to{" "}
          <span className="font-medium">equity earned</span> — every milestone, timestamped.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">
            {doneCount}/{totalCount} · {pct}%
          </span>
        </div>
      </header>

      {!steps ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <ol className="relative border-l border-border ml-4 space-y-6">
          {steps.map((s) => {
            const Icon = s.icon;
            const ring =
              s.status === "done"
                ? "bg-primary text-primary-foreground border-primary"
                : s.status === "current"
                ? "bg-background text-primary border-primary animate-pulse"
                : "bg-muted text-muted-foreground border-border";
            return (
              <li key={s.key} className="ml-6">
                <span
                  className={`absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full border-2 ${ring}`}
                >
                  {s.status === "done" ? (
                    <Icon className="h-4 w-4" />
                  ) : s.status === "current" ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </span>
                <Card className={s.status === "current" ? "border-primary" : ""}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-base">{s.label}</h2>
                          <Badge
                            variant={
                              s.status === "done"
                                ? "default"
                                : s.status === "current"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {s.status}
                          </Badge>
                          {s.detail && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {s.detail}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                        <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                          {fmt(s.at) ?? (s.status === "locked" ? "—" : "Not yet")}
                        </p>
                      </div>
                      {s.cta && s.status !== "locked" && (
                        <Button asChild size="sm" variant={s.status === "current" ? "default" : "outline"}>
                          <Link to={s.cta.to}>
                            {s.cta.label} <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}

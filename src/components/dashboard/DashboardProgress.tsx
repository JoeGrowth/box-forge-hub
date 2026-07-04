import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Circle, FileText, Briefcase, Rocket, Compass, Target, Award, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

interface JourneyProgress {
  type: string;
  title: string;
  status: string;
  currentPhase: number;
  totalPhases: number;
  link: string;
}

export function DashboardProgress() {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();
  const [journeys, setJourneys] = useState<JourneyProgress[]>([]);
  const [naturalRoleComplete, setNaturalRoleComplete] = useState(false);
  const [nrDecoderComplete, setNrDecoderComplete] = useState(false);
  const [resumeComplete, setResumeComplete] = useState(false);
  const [trackRecordComplete, setTrackRecordComplete] = useState(false);
  const [proTrackComplete, setProTrackComplete] = useState(false);
  const [hasLearningJourneys, setHasLearningJourneys] = useState(false);


  const fetchProgress = useCallback(async () => {
    if (!user) return;

    const [
      { data: learningJourneys },
      { data: naturalRole },
      { data: nrDecoder },
      { data: profile },
      { data: entOnboarding },
    ] = await Promise.all([
      supabase.from("learning_journeys").select("*").eq("user_id", user.id),
      supabase.from("natural_roles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("nr_decoder_submissions").select("status").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("profiles")
        .select("professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("entrepreneurial_onboarding").select("is_completed").eq("user_id", user.id).maybeSingle(),
    ]);

    setNaturalRoleComplete(!!naturalRole?.description);
    setNrDecoderComplete(!!nrDecoder);

    const p: any = profile || {};
    const filled = (v: any) => v !== null && v !== undefined && String(v).trim().length > 0;
    const resumeDone = Boolean(
      filled(p.professional_title) &&
      filled(p.bio) &&
      filled(p.summary_statement) &&
      filled(p.primary_skills) &&
      filled(p.key_projects) &&
      filled(p.education_certifications) &&
      p.years_of_experience !== null && p.years_of_experience !== undefined
    );
    setResumeComplete(resumeDone);
    setTrackRecordComplete(!!entOnboarding?.is_completed);
    setProTrackComplete(!!naturalRole?.description);

    const journeyMap: JourneyProgress[] = [];

    if (onboardingState && !onboardingState.onboarding_completed) {
      journeyMap.push({
        type: "onboarding",
        title: "Onboarding Journey",
        status: "in_progress",
        currentPhase: onboardingState.current_step || 1,
        totalPhases: 5,
        link: "/professional-track",
      });
    }

    const titleMap: Record<string, string> = {
      skill_ptc: "Co-Builder Certification",
      idea_ptc: "Initiator Certification",
      scaling_path: "Scaling Path",
      finance_literacy: "Finance Literacy",
      security_literacy: "Security Literacy",
    };
    const phaseMap: Record<string, number> = {
      skill_ptc: 4,
      idea_ptc: 4,
      scaling_path: 5,
    };
    learningJourneys?.forEach((journey) => {
      journeyMap.push({
        type: journey.journey_type,
        title: titleMap[journey.journey_type] || journey.journey_type,
        status: journey.status,
        currentPhase: journey.current_phase,
        totalPhases: phaseMap[journey.journey_type] || 4,
        link: "/journey",
      });
    });

    setJourneys(journeyMap);
    setHasLearningJourneys((learningJourneys?.length ?? 0) > 0);
  }, [user, onboardingState]);

  useEffect(() => {
    fetchProgress();
    if (!user) return;
    const onVisible = () => { if (document.visibilityState === "visible") fetchProgress(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", fetchProgress);

    const channel = supabase
      .channel(`dashboard-progress-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, fetchProgress)
      .on("postgres_changes", { event: "*", schema: "public", table: "natural_roles", filter: `user_id=eq.${user.id}` }, fetchProgress)
      .on("postgres_changes", { event: "*", schema: "public", table: "nr_decoder_submissions", filter: `user_id=eq.${user.id}` }, fetchProgress)
      .on("postgres_changes", { event: "*", schema: "public", table: "entrepreneurial_onboarding", filter: `user_id=eq.${user.id}` }, fetchProgress)
      .on("postgres_changes", { event: "*", schema: "public", table: "learning_journeys", filter: `user_id=eq.${user.id}` }, fetchProgress)
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", fetchProgress);
      supabase.removeChannel(channel);
    };
  }, [fetchProgress, user]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      not_started: { label: "Not Started", variant: "outline" },
      in_progress: { label: "In Progress", variant: "secondary" },
      pending_approval: { label: "Pending Review", variant: "default" },
      approved: { label: "Completed", variant: "default" },
      rejected: { label: "Needs Revision", variant: "destructive" },
    };
    const config = statusConfig[status] || statusConfig.not_started;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Check if onboarding is truly complete (step 5 AND completed flag)
  const isOnboardingTrulyComplete = onboardingState?.onboarding_completed &&
    (onboardingState?.current_step ?? 0) >= 5;


  // Check if user is approved by admin
  const isApproved = onboardingState?.journey_status === "approved" || 
    onboardingState?.journey_status === "entrepreneur_approved";

  const coreReady = isOnboardingTrulyComplete && nrDecoderComplete && proTrackComplete && resumeComplete;

  const overallProgress = () => {
    let completed = 0;
    const total = 5; // Intent, Decoder, Professional Track, Entrepreneurial Track, Resume

    if (isOnboardingTrulyComplete) completed++;
    if (nrDecoderComplete) completed++;
    if (proTrackComplete) completed++;
    if (trackRecordComplete) completed++;
    if (resumeComplete) completed++;

    return Math.round((completed / total) * 100);
  };

  const foundationSteps = [
    {
      key: "intent",
      title: "Declare your intent",
      description: isOnboardingTrulyComplete
        ? "Role, goals and direction locked in."
        : `Step ${onboardingState?.current_step || 1} of 5 — pick up where you left off.`,
      icon: Target,
      done: isOnboardingTrulyComplete,
      cta: { label: "Continue", to: "/professional-track" },
    },
    {
      key: "decoder",
      title: "Decode your natural role",
      description: "7 questions. Your starting compass on the platform.",
      icon: Compass,
      done: nrDecoderComplete,
      cta: { label: "Start", to: "/decoder" },
    },
    {
      key: "pro-track",
      title: "Fill your Professional Track Record",
      description: "Promise, practice, training, consulting — the receipts behind your natural role.",
      icon: Briefcase,
      done: proTrackComplete,
      cta: { label: "Complete", to: "/track" },
    },
    {
      key: "resume",
      title: "Sharpen your resume",
      description: "Title, summary and signature skills — the first thing recruiters and initiators see.",
      icon: FileText,
      done: resumeComplete,
      cta: { label: "Complete", to: "/resume" },
    },
  ];

  const foundationDone = foundationSteps.every((s) => s.done);

  const steps = [
    ...(foundationDone
      ? [
          {
            key: "talent-foundation" as const,
            title: "Talent Foundation set",
            description: "Intent, natural role, professional track record and resume — all locked in.",
            icon: CheckCircle2,
            done: true,
            cta: { label: "Review", to: "/profile" },
          },
        ]
      : foundationSteps),
    ...(coreReady
      ? [
          {
            key: "consulting-growth" as const,
            title: "Launch your Consulting Growth",
            description:
              "Track opportunities from LinkedIn or tenders through proposal, delivery and payment distribution.",
            icon: TrendingUp,
            done: false,
            cta: { label: "Start", to: "/consulting-growth" },
          },
        ]
      : []),
    {
      key: "certify",
      title: "Getting Certified",
      description: "Pick a certification path — Initiator, Co-Builder, Finance or Security — and earn your badges.",
      icon: Award,
      done: false,
      cta: { label: hasLearningJourneys ? "Continue" : "Start", to: "/journey" },
    },
    {
      key: "ent-track",
      title: "Fill your Entrepreneurial Track Record",
      description: "Initiatives, products, teams, business, equity — what you've shipped as a builder.",
      icon: Rocket,
      done: trackRecordComplete,
      cta: { label: "Complete", to: "/track" },
    },
  ];


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Shape your talent
          </CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
            {overallProgress()}% ready
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Finish these milestones to unlock matches, opportunities and co-builders. Track your long-game in the{" "}
          <Link to="/profile" className="text-b4-teal hover:underline font-medium">
            Professional Growth Path
          </Link>.
        </p>
        <Progress value={overallProgress()} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${
                  step.done
                    ? "bg-b4-teal/5 border-b4-teal/30"
                    : "bg-muted/40 border-border/60 hover:border-b4-teal/40 hover:bg-muted/60"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-colors ${
                      step.done
                        ? "bg-b4-teal text-white"
                        : "bg-background border border-border text-muted-foreground group-hover:border-b4-teal/50 group-hover:text-b4-teal"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : Icon ? (
                      <Icon className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base">{step.title}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground break-words">{step.description}</div>
                  </div>
                </div>
                {!step.done && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="w-full sm:w-auto sm:min-w-[110px] flex-shrink-0"
                  >
                    <Link to={step.cta.to}>{step.cta.label}</Link>
                  </Button>
                )}

              </div>
            );
          })}

        </div>


        <Button variant="ghost" className="w-full mt-4" asChild>
          <Link to="/journey">
            Explore all learning paths <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

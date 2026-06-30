import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Circle, Lock, FileText, Briefcase, Rocket, Compass, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";

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


  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      // Fetch learning journeys
      const { data: learningJourneys } = await supabase
        .from("learning_journeys")
        .select("*")
        .eq("user_id", user.id);

      // Fetch natural role
      const { data: naturalRole } = await supabase
        .from("natural_roles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch NR Decoder submission
      const { data: nrDecoder } = await supabase
        .from("nr_decoder_submissions")
        .select("status")
        .eq("user_id", user.id)
        .single();

      setNaturalRoleComplete(!!naturalRole?.description);
      setNrDecoderComplete(!!nrDecoder);

      // Fetch profile for resume + track record completion
      const { data: profile } = await supabase
        .from("profiles")
        .select("professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications")
        .eq("user_id", user.id)
        .maybeSingle();

      const p: any = profile || {};
      const filled = (v: any) =>
        v !== null && v !== undefined && String(v).trim().length > 0;
      const resumeDone = Boolean(
        filled(p.professional_title) &&
        filled(p.bio) &&
        filled(p.summary_statement) &&
        filled(p.primary_skills) &&
        filled(p.key_projects) &&
        filled(p.education_certifications) &&
        p.years_of_experience !== null && p.years_of_experience !== undefined
      );
      // Track record completion = entrepreneurial onboarding marked complete
      const { data: entOnboarding } = await supabase
        .from("entrepreneurial_onboarding")
        .select("is_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      setResumeComplete(resumeDone);
      setTrackRecordComplete(!!entOnboarding?.is_completed);




      const journeyMap: JourneyProgress[] = [];

      // Add onboarding progress
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


      // Map learning journeys
      learningJourneys?.forEach((journey) => {
        const titleMap: Record<string, string> = {
          skill_ptc: "Co-Builder Certification",
          idea_ptc: "Initiator Certification",
          scaling_path: "Scaling Path",
        };
        const phaseMap: Record<string, number> = {
          skill_ptc: 4,
          idea_ptc: 4,
          scaling_path: 5,
        };
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
    };

    fetchProgress();
  }, [user, onboardingState]);

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



  const steps = [
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
      key: "ent-track",
      title: "Fill your Entrepreneurial Track Record",
      description: "Initiatives, products, teams, business, equity — what you've shipped as a builder.",
      icon: Rocket,
      done: trackRecordComplete,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Shape your talent
          </CardTitle>
          <span className="text-sm text-muted-foreground">
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
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  step.done
                    ? "bg-b4-teal/5 border-b4-teal/30"
                    : "bg-muted/40 border-border/60 hover:border-b4-teal/40 hover:bg-muted/60"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                    step.done
                      ? "bg-b4-teal text-white"
                      : "bg-background border border-border text-muted-foreground group-hover:border-b4-teal/50 group-hover:text-b4-teal"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                    {step.title}
                  </div>
                  <div className="text-sm text-muted-foreground">{step.description}</div>
                </div>
                {!step.done && (
                  <Button size="sm" variant="outline" asChild className="min-w-[110px] flex-shrink-0">
                    <Link to={step.cta.to}>{step.cta.label}</Link>
                  </Button>
                )}

              </div>
            );
          })}

          {journeys.map((journey, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {journey.status === "approved" ? (
                <CheckCircle2 className="w-5 h-5 text-b4-teal flex-shrink-0" />
              ) : journey.status === "not_started" ? (
                <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{journey.title}</span>
                  {getStatusBadge(journey.status)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Phase {journey.currentPhase} of {journey.totalPhases}
                </div>
              </div>
              {journey.status !== "approved" && journey.status !== "not_started" && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={journey.link}>Continue</Link>
                </Button>
              )}
            </div>
          ))}
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

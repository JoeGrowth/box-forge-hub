import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react";
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

      const journeyMap: JourneyProgress[] = [];

      // Add onboarding progress
      if (onboardingState && !onboardingState.onboarding_completed) {
        journeyMap.push({
          type: "onboarding",
          title: "Onboarding Journey",
          status: "in_progress",
          currentPhase: onboardingState.current_step || 1,
          totalPhases: 5,
          link: "/onboarding",
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

  // Check if onboarding is truly complete (step 9 AND completed flag)
  const isOnboardingTrulyComplete = onboardingState?.onboarding_completed && 
    (onboardingState?.current_step ?? 0) >= 9;

  // Check if user is approved by admin
  const isApproved = onboardingState?.journey_status === "approved" || 
    onboardingState?.journey_status === "entrepreneur_approved";

  const overallProgress = () => {
    let completed = 0;
    let total = 4; // Base milestones: Decoder, Onboarding, Approval, Learning

    if (nrDecoderComplete) completed++;
    if (isOnboardingTrulyComplete) completed++;
    if (isApproved) completed++;
    if (journeys.some((j) => j.status === "approved")) completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Your Journey Progress
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {overallProgress()}% Complete
          </span>
        </div>
        <Progress value={overallProgress()} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Core Milestones - Reordered */}
        <div className="space-y-3">
          {/* 1. Natural Role Decoder - First */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {nrDecoderComplete ? (
              <CheckCircle2 className="w-5 h-5 text-b4-teal flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-medium">Natural Role Decoder</div>
              <div className="text-sm text-muted-foreground">Discover your unique strengths</div>
            </div>
            {!nrDecoderComplete && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/decoder">Take Test</Link>
              </Button>
            )}
          </div>

          {/* 2. Complete Onboarding - Second */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isOnboardingTrulyComplete ? (
              <CheckCircle2 className="w-5 h-5 text-b4-teal flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-medium">Complete Onboarding</div>
              <div className="text-sm text-muted-foreground">
                {isOnboardingTrulyComplete 
                  ? "Define your role and goals" 
                  : `Step ${onboardingState?.current_step || 1} of 9 - Continue where you left off`}
              </div>
            </div>
            {!isOnboardingTrulyComplete && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/onboarding">Continue</Link>
              </Button>
            )}
          </div>

          {/* 3. Getting Approved - Third */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isApproved ? (
              <CheckCircle2 className="w-5 h-5 text-b4-teal flex-shrink-0" />
            ) : isOnboardingTrulyComplete ? (
              <Circle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-medium">Getting Approved</div>
              <div className="text-sm text-muted-foreground">
                {isApproved 
                  ? "You can now access all learning paths" 
                  : isOnboardingTrulyComplete 
                    ? "Pending admin review"
                    : "Complete onboarding first"}
              </div>
            </div>
            {isOnboardingTrulyComplete && !isApproved && (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>

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

        {isApproved && (
          <Button variant="ghost" className="w-full mt-4" asChild>
            <Link to="/journey">
              View All Learning Paths <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

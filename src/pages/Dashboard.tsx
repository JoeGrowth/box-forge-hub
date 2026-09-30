import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTalentReadiness } from "@/hooks/useTalentReadiness";
import { useNextBestActions } from "@/hooks/useNextBestActions";
import { STAGE_RANK, type Stage } from "@/components/layout/GatedRoute";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { AIProfileDraftCard } from "@/components/dashboard/AIProfileDraftCard";
import { NextGoalBanner } from "@/components/progression/NextGoalBanner";
import { DashboardProgress } from "@/components/dashboard/DashboardProgress";
import { DashboardNextSteps } from "@/components/dashboard/DashboardNextSteps";
import { DashboardOpportunities } from "@/components/dashboard/DashboardOpportunities";
import { DashboardAchievements } from "@/components/dashboard/DashboardAchievements";
import { ProgressionPathCard } from "@/components/profile/ProgressionPathCard";
import { CommitmentsPanel } from "@/components/commitments/CommitmentsPanel";
import { MyOrgProjectsCard } from "@/components/dashboard/MyOrgProjectsCard";
import { MyEntitiesCard } from "@/components/dashboard/MyEntitiesCard";
import { MyMissionsCard } from "@/components/dashboard/MyMissionsCard";
import { useShapeYourTalentComplete } from "@/hooks/useShapeYourTalentComplete";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";



const GATE_MESSAGES: Record<string, { title: string; description: string }> = {
  talent: {
    title: "Complete your Talent Foundation",
    description:
      "Finish onboarding (intent, role decoder, professional track, resume) to unlock this page.",
  },
  "org-admin": {
    title: "Organization admins only",
    description: "You need to be an admin or owner of an organization to access this page.",
  },
  "stage-emerging": {
    title: "Unlocks at Emerging stage",
    description:
      "Keep progressing — this page opens once you reach the Emerging stage. Novices have access to Boxes and Programs.",
  },
  "stage-capable": {
    title: "Unlocks at Capable stage",
    description: "Reach the Capable stage to access this page.",
  },
  "stage-monetizing": {
    title: "Unlocks at Monetizing stage",
    description: "Reach the Monetizing stage to access this page.",
  },
  "stage-building": {
    title: "Unlocks at Building stage",
    description: "Reach the Building stage to access this page.",
  },
  "stage-founder": {
    title: "Unlocks at Founder stage",
    description: "Reach the Founder stage to access this page.",
  },
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const { talentReady, loading: talentLoading } = useTalentReadiness();
  const { progression } = useNextBestActions(user?.id);
  const { shapeYourTalentComplete } = useShapeYourTalentComplete();
  // Seed from cache so returning users get their full dashboard on the first
  // paint instead of waiting for the profiles query below.
  const [draftAccepted, setDraftAccepted] = useState<boolean | null>(() => {
    try {
      return window.localStorage.getItem("b4:draft-accepted") === "1" ? true : null;
    } catch {
      return null;
    }
  });
  const [allBadgesEarned, setAllBadgesEarned] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const gated = searchParams.get("gated");
    if (!gated) return;
    const from = searchParams.get("from");
    const preset = GATE_MESSAGES[gated];
    const engineMatch = gated.startsWith("engine-") ? gated.slice(7) : null;
    const msg = preset ?? (engineMatch
      ? {
          title: `${engineMatch.charAt(0).toUpperCase()}${engineMatch.slice(1)} engine locked`,
          description: "Unlock this engine from your dashboard to access the page.",
        }
      : {
          title: "This page is locked",
          description: "Keep progressing to unlock it.",
        });
    toast({
      title: msg.title,
      description: from ? `${msg.description} (Tried to open ${from})` : msg.description,
    });
    // Clear the params so the toast doesn't re-fire on refresh.
    const next = new URLSearchParams(searchParams);
    next.delete("gated");
    next.delete("from");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Progressive dashboard reveal. On first login only the AI draft card
  // and Achievements show side by side. Accepting the draft reveals
  // "Shape your talent". Reaching the Capable stage reveals the full dashboard.

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("profile_draft_accepted_at, profile_draft_source")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      // Treat "no AI draft ever generated" as accepted so returning users
      // (pre-draft feature) still see their normal dashboard.
      const noDraft = !data?.profile_draft_source;
      const accepted = noDraft || Boolean(data?.profile_draft_accepted_at);
      try {
        window.localStorage.setItem("b4:draft-accepted", accepted ? "1" : "0");
      } catch { /* ignore */ }
      setDraftAccepted(accepted);
    })();
    return () => { alive = false; };
  }, [user]);

  // Cache the ladder stage and "all badges earned" per user so the cards that
  // depend on them don't pop in and then vanish after the async queries.
  const uid = user?.id;
  const cachedStage = useMemo(() => {
    try { return uid ? window.localStorage.getItem(`b4:dash-stage:${uid}`) : null; } catch { return null; }
  }, [uid]);
  const cachedAllBadges = useMemo(() => {
    try { return uid ? window.localStorage.getItem(`b4:dash-all-badges:${uid}`) === "1" : false; } catch { return false; }
  }, [uid]);

  useEffect(() => {
    if (!uid || !progression?.current_state) return;
    try { window.localStorage.setItem(`b4:dash-stage:${uid}`, String(progression.current_state)); } catch { /* ignore */ }
  }, [uid, progression?.current_state]);

  useEffect(() => {
    if (!uid || allBadgesEarned === null) return;
    try { window.localStorage.setItem(`b4:dash-all-badges:${uid}`, allBadgesEarned ? "1" : "0"); } catch { /* ignore */ }
  }, [uid, allBadgesEarned]);

  const effectiveStage = (progression?.current_state as Stage) ?? (cachedStage as Stage | null) ?? "novice";
  const allBadges = allBadgesEarned ?? cachedAllBadges;
  const hideGuidance = allBadges;

  const stageRank = STAGE_RANK[effectiveStage] ?? 0;
  const isCapable = stageRank >= STAGE_RANK.capable || shapeYourTalentComplete;
  const isMonetizing = stageRank >= STAGE_RANK.monetizing;
  const showShapeTalent = draftAccepted === true || isCapable;
  const isFirstLogin = draftAccepted === false && !isCapable;




  if (authLoading || onboardingLoading) {
    // Match ProtectedRoute's placeholder so the two hold the same background
    // instead of swapping layouts (which caused the "skeleton flash" between
    // the guard clearing and the real dashboard painting).
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-3 sm:px-4 py-6 md:py-8 pt-20 md:pt-24 pb-16">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {!isFirstLogin && (
              <>
                <DashboardHero />
                {/* Next goal banner is only for users who have NOT completed
                    the Talent Foundation set. */}
                {!talentLoading && !talentReady && isCapable && !isMonetizing && <NextGoalBanner />}
              </>
            )}
            <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
              <div className={cn("min-w-0 lg:col-span-2", !isFirstLogin && "space-y-6 md:space-y-8")}>
                {isFirstLogin ? (
                  <AIProfileDraftCard />
                ) : (
                  <>
                    {showShapeTalent && <DashboardProgress />}
                    {shapeYourTalentComplete && <MyOrgProjectsCard />}
                    {shapeYourTalentComplete && <MyEntitiesCard />}
                    {shapeYourTalentComplete && <MyMissionsCard />}
                    {isCapable && <CommitmentsPanel />}
                    {isCapable && !hideGuidance && <DashboardOpportunities />}
                    {isCapable && !hideGuidance && <ProgressionPathCard userId={user?.id} />}
                  </>
                )}
              </div>
              <div className="space-y-6 md:space-y-8 min-w-0">
                {isCapable && !hideGuidance && <DashboardNextSteps />}
                <DashboardAchievements onAllEarnedChange={setAllBadgesEarned} />
              </div>
            </div>

          </div>
        </main>
      </PageTransition>

      <Footer />
    </div>
  );
};

export default Dashboard;

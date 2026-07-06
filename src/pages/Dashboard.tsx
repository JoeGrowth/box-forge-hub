import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTalentReadiness } from "@/hooks/useTalentReadiness";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { NextGoalBanner } from "@/components/progression/NextGoalBanner";
import { DashboardProgress } from "@/components/dashboard/DashboardProgress";
import { DashboardNextSteps } from "@/components/dashboard/DashboardNextSteps";
import { DashboardOpportunities } from "@/components/dashboard/DashboardOpportunities";
import { DashboardAchievements } from "@/components/dashboard/DashboardAchievements";
import { ProgressionPathCard } from "@/components/profile/ProgressionPathCard";
import { CommitmentsPanel } from "@/components/commitments/CommitmentsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

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
            <DashboardHero />
            <NextGoalBanner />
            <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-6 md:space-y-8 min-w-0">
                <DashboardProgress />
                <CommitmentsPanel />
                <DashboardOpportunities />
                <ProgressionPathCard userId={user?.id} />
              </div>
              <div className="space-y-6 md:space-y-8 min-w-0">
                <DashboardNextSteps />
                <DashboardAchievements />
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

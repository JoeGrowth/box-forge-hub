import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardProgress } from "@/components/dashboard/DashboardProgress";
import { DashboardNextSteps } from "@/components/dashboard/DashboardNextSteps";
import { DashboardOpportunities } from "@/components/dashboard/DashboardOpportunities";
import { DashboardAchievements } from "@/components/dashboard/DashboardAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [procuringAccess, setProcuringAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("onboarding_state")
      .select("procuring_access" as any)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProcuringAccess(!!(data as any)?.procuring_access));
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="space-y-8">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-4 py-8 pt-24 pb-16">
          <div className="max-w-7xl mx-auto space-y-8">
            <DashboardHero />
            <DashboardStats />
            {procuringAccess && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Procuring Entity</p>
                      <p className="text-xs text-muted-foreground">Publish tenders to the marketplace.</p>
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/procuring">
                      Procuring <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <DashboardProgress />
                <DashboardOpportunities />
              </div>
              <div className="space-y-8">
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

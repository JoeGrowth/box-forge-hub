import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Loader2,
  Briefcase,
  Rocket,
  CheckCircle,
  HelpCircle,
  XCircle,
  ArrowRight,
  Lock,
  Unlock,
  Lightbulb,
  Package,
  Users,
  Building2,
  HandCoins,
  Target,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface EntrepreneurialData {
  has_developed_project: boolean | null;
  project_needs_help: boolean | null;
  has_built_product: boolean | null;
  product_needs_help: boolean | null;
  has_led_team: boolean | null;
  team_needs_help: boolean | null;
  has_run_business: boolean | null;
  business_needs_help: boolean | null;
  has_served_on_board: boolean | null;
  board_needs_help: boolean | null;
  is_completed: boolean | null;
}

const Track = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, loading: onboardingLoading } = useOnboarding();

  const [entrepreneurialData, setEntrepreneurialData] = useState<EntrepreneurialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [professionalUnlocked, setProfessionalUnlocked] = useState(false);
  const [entrepreneurialUnlocked, setEntrepreneurialUnlocked] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("entrepreneurial_onboarding")
          .select("has_developed_project, project_needs_help, has_built_product, product_needs_help, has_led_team, team_needs_help, has_run_business, business_needs_help, has_served_on_board, board_needs_help, is_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        setEntrepreneurialData(data as EntrepreneurialData | null);
      } catch (err) {
        console.error("Error fetching entrepreneurial data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (authLoading || onboardingLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine which path was completed first
  const hasProfessional = !!naturalRole?.description;
  const hasEntrepreneurial = !!entrepreneurialData?.is_completed;
  const primaryRole = onboardingState?.primary_role;

  // The primary path is always visible; the other starts blurred
  const isProfessionalPrimary = primaryRole === "cobuilder" || (!primaryRole && hasProfessional && !hasEntrepreneurial);
  const isEntrepreneurialPrimary = primaryRole === "entrepreneur" || (!primaryRole && hasEntrepreneurial && !hasProfessional);

  const showProfessional = isProfessionalPrimary || professionalUnlocked || (hasProfessional && hasEntrepreneurial);
  const showEntrepreneurial = isEntrepreneurialPrimary || entrepreneurialUnlocked || (hasProfessional && hasEntrepreneurial);

  // Professional summary items
  const professionalItems = [
    {
      label: "Natural Role Definition",
      subtitle: naturalRole?.description || "Not defined yet",
      status: naturalRole?.description ? "completed" : "pending",
      icon: Target,
    },
    {
      label: "Promise to Deliver",
      subtitle: naturalRole?.promise_check ? "Ready to deliver on your Natural Role" : "Not committed yet",
      status: naturalRole?.promise_check ? "completed" : "pending",
      icon: Sparkles,
    },
    {
      label: "Practice Experience",
      subtitle: naturalRole?.practice_check
        ? naturalRole.practice_entities || "Practice documented"
        : naturalRole?.practice_needs_help
        ? "Requested assistance"
        : "No practice experience yet",
      status: naturalRole?.practice_check ? "completed" : naturalRole?.practice_needs_help ? "help" : "pending",
      icon: Briefcase,
    },
    {
      label: "Training Experience",
      subtitle: naturalRole?.training_check
        ? naturalRole.training_contexts || "Training documented"
        : naturalRole?.training_needs_help
        ? "Requested assistance"
        : "No training experience yet",
      status: naturalRole?.training_check ? "completed" : naturalRole?.training_needs_help ? "help" : "pending",
      icon: GraduationCap,
    },
    {
      label: "Consulting Experience",
      subtitle: naturalRole?.consulting_check
        ? naturalRole.consulting_with_whom || "Consulting documented"
        : "No consulting experience yet",
      status: naturalRole?.consulting_check ? "completed" : "pending",
      icon: Users,
    },
    {
      label: "Scaling Interest",
      subtitle: naturalRole?.wants_to_scale ? "Interested in scaling" : "Not interested in scaling yet",
      status: naturalRole?.wants_to_scale ? "completed" : "pending",
      icon: Rocket,
    },
  ];

  // Entrepreneurial summary items
  const entrepreneurialItems = [
    {
      label: "Initiatives & Projects",
      subtitle: entrepreneurialData?.has_developed_project
        ? "Experience documented"
        : entrepreneurialData?.project_needs_help
        ? "Requested assistance"
        : "No experience yet",
      status: entrepreneurialData?.has_developed_project ? "completed" : entrepreneurialData?.project_needs_help ? "help" : "pending",
      icon: Lightbulb,
    },
    {
      label: "Products & Prototypes",
      subtitle: entrepreneurialData?.has_built_product
        ? "Experience documented"
        : entrepreneurialData?.product_needs_help
        ? "Requested assistance"
        : "No experience yet",
      status: entrepreneurialData?.has_built_product ? "completed" : entrepreneurialData?.product_needs_help ? "help" : "pending",
      icon: Package,
    },
    {
      label: "Team Experience",
      subtitle: entrepreneurialData?.has_led_team
        ? "Experience documented"
        : entrepreneurialData?.team_needs_help
        ? "Requested assistance"
        : "No experience yet",
      status: entrepreneurialData?.has_led_team ? "completed" : entrepreneurialData?.team_needs_help ? "help" : "pending",
      icon: Users,
    },
    {
      label: "Business & Commercial",
      subtitle: entrepreneurialData?.has_run_business
        ? "Experience documented"
        : entrepreneurialData?.business_needs_help
        ? "Requested assistance"
        : "No experience yet",
      status: entrepreneurialData?.has_run_business ? "completed" : entrepreneurialData?.business_needs_help ? "help" : "pending",
      icon: Building2,
    },
    {
      label: "Equity & Value Contributions",
      subtitle: entrepreneurialData?.has_served_on_board
        ? "Experience documented"
        : entrepreneurialData?.board_needs_help
        ? "Requested assistance"
        : "No experience yet",
      status: entrepreneurialData?.has_served_on_board ? "completed" : entrepreneurialData?.board_needs_help ? "help" : "pending",
      icon: HandCoins,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-b4-teal" />;
      case "help":
        return <HelpCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <XCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-b4-teal/10 text-b4-teal border-b4-teal/20 text-xs">Completed</Badge>;
      case "help":
        return <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Needs help</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-muted-foreground">Not needed</Badge>;
    }
  };

  const renderSection = (
    title: string,
    subtitle: string,
    icon: React.ElementType,
    items: typeof professionalItems,
    isBlurred: boolean,
    onUnlock: () => void,
    linkTo: string,
    hasData: boolean
  ) => {
    const Icon = icon;

    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-b4-teal/10 shrink-0">
                <Icon className="w-6 h-6 text-b4-teal" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
              </div>
            </div>
            {!isBlurred && hasData && (
              <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0" asChild>
                <Link to={linkTo}>
                  View Full Details <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative">
          {isBlurred && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-b-lg">
              <Lock className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3 text-center max-w-xs">
                Focus on your current path first. Unlock this section when you're ready.
              </p>
              <Button variant="outline" size="sm" onClick={onUnlock} className="gap-2">
                <Unlock className="w-4 h-4" />
                Unlock Section
              </Button>
            </div>
          )}

          <div className={`space-y-1 divide-y divide-border ${isBlurred ? "filter blur-[6px] pointer-events-none select-none" : ""}`}>
            {items.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div key={idx} className="flex items-start sm:items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="shrink-0 mt-0.5 sm:mt-0">{getStatusIcon(item.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <p className="font-medium text-sm">{item.label}</p>
                      <div className="shrink-0">{getStatusBadge(item.status)}</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {!isBlurred && !hasData && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-dashed text-center">
              <p className="text-sm text-muted-foreground mb-3">
                You haven't started this journey yet.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={linkTo === "/resume" ? "/professional-onboarding" : "/entrepreneurial-onboarding"}>
                  Start Journey <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="py-12 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Your Track</h1>
            </div>
            <p className="text-primary-foreground/80 max-w-xl">
              View your professional and entrepreneurial journeys side by side. 
              Focus on your primary path, and unlock the other when you're ready.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {renderSection(
                "Professional Resume",
                "Your natural role, skills & consulting experience",
                Briefcase,
                professionalItems,
                !showProfessional,
                () => setProfessionalUnlocked(true),
                "/resume",
                hasProfessional
              )}

              {renderSection(
                "Entrepreneurial Resume",
                "Your ventures, products & business achievements",
                Rocket,
                entrepreneurialItems,
                !showEntrepreneurial,
                () => setEntrepreneurialUnlocked(true),
                "/track-record",
                hasEntrepreneurial
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Track;

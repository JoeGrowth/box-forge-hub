import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useLearningJourneys } from "@/hooks/useLearningJourneys";
import {
  Loader2,
  Users,
  Lightbulb,
  ArrowRight,
  Handshake,
  TrendingUp,
  Award,
  Shield,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type SectionKey = "initiator" | "cobuilder" | "consultant" | "finance" | "security";

interface PathCard {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  border: string;
  certType: string;
}

const NEEDED_PATHS: PathCard[] = [
  { key: "initiator", title: "Learn to be an Initiator", subtitle: "Transform ideas into ventures. 4 steps to certification.", icon: Lightbulb, gradient: "from-amber-500 to-orange-600", border: "hover:border-amber-500/50", certType: "initiator_b4" },
  { key: "cobuilder", title: "Learn to be a Co-Builder", subtitle: "Master startup collaboration. 3 steps to certification.", icon: Users, gradient: "from-teal-500 to-cyan-500", border: "hover:border-teal-500/50", certType: "cobuilder_b4" },
  { key: "consultant", title: "Learn to be Consultant", subtitle: "Advisory and thought leadership. 4 steps to certification.", icon: Handshake, gradient: "from-purple-500 to-fuchsia-500", border: "hover:border-purple-500/50", certType: "consultant_b4" },
];

const OPTIONAL_PATHS: PathCard[] = [
  { key: "finance", title: "Learn Finance", subtitle: "Corporate finance literacy. 4 steps to certification.", icon: TrendingUp, gradient: "from-emerald-500 to-green-600", border: "hover:border-emerald-500/50", certType: "finance_literacy" },
  { key: "security", title: "Learn to Be Secure", subtitle: "Practical security literacy. 4 steps to certification.", icon: Shield, gradient: "from-red-500 to-orange-500", border: "hover:border-red-500/50", certType: "security_literacy" },
];

const Journey = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const { certifications } = useLearningJourneys();
  const navigate = useNavigate();

  const [talentFoundationSet, setTalentFoundationSet] = useState(false);
  useEffect(() => {
    if (!user) { setTalentFoundationSet(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: nr }, { data: dec }, { data: prof }] = await Promise.all([
        supabase.from("natural_roles").select("description").eq("user_id", user.id).maybeSingle(),
        supabase.from("nr_decoder_submissions").select("status").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles")
          .select("professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications")
          .eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const filled = (v: any) => v !== null && v !== undefined && String(v).trim().length > 0;
      const p: any = prof || {};
      const resumeDone = Boolean(
        filled(p.professional_title) && filled(p.bio) && filled(p.summary_statement) &&
        filled(p.primary_skills) && filled(p.key_projects) && filled(p.education_certifications) &&
        p.years_of_experience !== null && p.years_of_experience !== undefined
      );
      const onboardingDone = !!onboardingState?.onboarding_completed && (onboardingState?.current_step ?? 0) >= 5;
      setTalentFoundationSet(onboardingDone && !!nr?.description && !!dec && resumeDone);
    })();
    return () => { cancelled = true; };
  }, [user, onboardingState]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Getting Certified</h1>
                <p className="text-muted-foreground mb-8">Please log in to access your certifications.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  const isCertified = (certType: string) => certifications.some(c => c.certification_type === certType);

  const renderCard = (path: PathCard) => {
    const locked = path.key === "consultant" && !talentFoundationSet;
    const certified = isCertified(path.certType);
    return (
      <Card
        key={path.key}
        onClick={() => !locked && navigate(`/certifications/${path.key}`)}
        className={`group cursor-pointer transition-all border-2 border-border/50 ${path.border} hover:shadow-lg ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${path.gradient} shrink-0`}>
              <path.icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-foreground text-base">{path.title}</h3>
                {certified && <Award className="w-4 h-4 text-b4-teal shrink-0" />}
                {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground">{path.subtitle}</p>
              {locked && (
                <p className="text-xs text-muted-foreground mt-2">
                  Unlocks after Talent Foundation is complete
                </p>
              )}
              {!locked && (
                <div className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3 group-hover:gap-2 transition-all">
                  Start path <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="pt-20">
          {/* Hero */}
          <section className="py-12 md:py-16 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Getting Certified</h1>
              <p className="text-primary-foreground/80 max-w-2xl mx-auto text-sm md:text-base">
                Pick a certification path — Initiator, Co-Builder, Finance or Security — and earn your badges.
              </p>
            </div>
          </section>

          <section className="py-10 md:py-14">
            <div className="container max-w-5xl mx-auto px-4 space-y-10">
              {/* Needed */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Needed Certifications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {NEEDED_PATHS.map(renderCard)}
                </div>
              </div>

              {/* Optional */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Optional Certifications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {OPTIONAL_PATHS.map(renderCard)}
                </div>
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Journey;

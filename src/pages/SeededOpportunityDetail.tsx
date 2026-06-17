import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Rocket,
  Calendar,
  User,
  Info,
} from "lucide-react";
import { SEEDED_OPPORTUNITIES } from "@/data/seededOpportunities";
import type { Opportunity } from "@/components/opportunities/OpportunityCard";

const ICONS: Record<Opportunity["category"], typeof Briefcase> = {
  job: Briefcase,
  training: GraduationCap,
  consulting: Lightbulb,
  startup: Rocket,
  tender: Briefcase,
};

const LABELS: Record<Opportunity["category"], string> = {
  job: "Job",
  training: "Training",
  consulting: "Consulting Service",
  startup: "Venture",
  tender: "Tender",
};

export default function SeededOpportunityDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const opp = SEEDED_OPPORTUNITIES.find((o) => o.id === id);

  if (!opp) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 container mx-auto px-4">
          <p className="text-muted-foreground">Opportunity not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/opportunities")}>
            Back to Opportunities
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = ICONS[opp.category];
  const label = LABELS[opp.category];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/opportunities?tab=${opp.category}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Opportunities
          </Button>
        </div>

        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary">{label}</Badge>
                  {opp.sector && <Badge variant="outline">{opp.sector}</Badge>}
                  <Badge variant="outline" className="text-[10px]">Sample listing</Badge>
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-3">{opp.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" /> {opp.author_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Posted {new Date(opp.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card rounded-2xl border border-border p-8">
                  <h2 className="font-display text-xl font-bold text-foreground mb-4">About this opportunity</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{opp.description}</p>
                </div>

                {opp.required_skills.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">Skills & attributes</h2>
                    <div className="flex flex-wrap gap-2">
                      {opp.required_skills.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">Engagement</h3>
                  <div className="mb-2 text-sm">
                    <span className="text-muted-foreground">Reward: </span>
                    <span className="font-semibold text-foreground">{opp.income_range}</span>
                  </div>
                  <div className="mb-4 text-sm">
                    <span className="text-muted-foreground">Effort: </span>
                    <span className="font-semibold text-foreground">{opp.effort_level}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <p>
                      This is a sample listing used to illustrate the marketplace.
                      Real listings posted by organizations and co-builders accept
                      applications directly.
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">Explore real opportunities</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse live {label.toLowerCase()} listings from the community.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/opportunities?tab=${opp.category}`)}
                  >
                    View all {label.toLowerCase()}s
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

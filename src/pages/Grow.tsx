import { Link } from "react-router-dom";
import { ArrowRight, Compass, CheckCircle2, Coins, Settings, TrendingUp, User, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProgressionLadder } from "@/hooks/useProgressionLadder";

const STAGES = [
  { key: "foundation", label: "Foundation", icon: Compass, blurb: "Define who you are or what you're building." },
  { key: "validated", label: "Validated", icon: CheckCircle2, blurb: "Prove it with real signals, not opinions." },
  { key: "monetized", label: "Monetized", icon: Coins, blurb: "Earn from it — cash, equity, or clients." },
  { key: "grown", label: "Grown", icon: Settings, blurb: "Systematize so it runs beyond you." },
  { key: "scaled", label: "Scaled", icon: TrendingUp, blurb: "Compound through teams, boxes, and capital." },
];

export default function Grow() {
  const { stages, loading } = useProgressionLadder();

  // Map ladder → track statuses (best-effort surfacing, no schema change).
  const talentFoundationDone = stages.find((s) => s.key === "talent")?.achieved ?? false;
  const talentMonetizedDone = stages.find((s) => s.key === "advisor")?.achieved ?? false;
  const ideaFoundationDone = stages.find((s) => s.key === "founder")?.achieved ?? false;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
            One engine. Two objects. Five stages.
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            What are you growing?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Career, Consulting, and Entrepreneurship aren't separate products. They're outcomes of one
            progression engine applied to what you choose to grow.
          </p>
        </header>

        {/* Engine strip */}
        <section aria-labelledby="engine-heading" className="mb-14">
          <h2 id="engine-heading" className="sr-only">The growth engine</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={s.key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                      <Icon size={16} className="text-b4-teal" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">0{i + 1}</span>
                  </div>
                  <div className="font-semibold text-sm text-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-snug">{s.blurb}</div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Tracks */}
        <section aria-labelledby="tracks-heading" className="grid md:grid-cols-2 gap-6">
          <h2 id="tracks-heading" className="sr-only">Choose a track</h2>

          {/* Talent */}
          <Card className="p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <User size={20} className="text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Track</div>
                <h3 className="font-display text-xl font-bold text-foreground">Grow Your Talent</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Develop your natural role, prove it, monetize it as consulting, systematize it as a
              practice, and scale it into a brand entity.
            </p>

            <ul className="space-y-2 mb-6">
              <TrackStage label="Foundation" outcome="Career" href="/career" done={talentFoundationDone} loading={loading} />
              <TrackStage label="Validated" outcome="Public profile" href="/publish-talent" done={talentFoundationDone} loading={loading} />
              <TrackStage label="Monetized" outcome="Consulting" href="/consulting-growth" done={talentMonetizedDone} loading={loading} />
              <TrackStage label="Grown" outcome="Practice" href="/consulting" done={false} loading={loading} />
              <TrackStage label="Scaled" outcome="Brand entity" href="/brand-entity" done={false} loading={loading} />
            </ul>

            <Button asChild variant="teal" className="mt-auto">
              <Link to="/career" className="inline-flex items-center gap-2">
                Start with Talent <ArrowRight size={16} />
              </Link>
            </Button>
          </Card>

          {/* Idea */}
          <Card className="p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-b4-teal/10 flex items-center justify-center">
                <Lightbulb size={20} className="text-b4-teal" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Track</div>
                <h3 className="font-display text-xl font-bold text-foreground">Grow an Idea</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Turn a concept into an approved venture, validate it, monetize it, systematize a team,
              and scale it as a company or box.
            </p>

            <ul className="space-y-2 mb-6">
              <TrackStage label="Foundation" outcome="Create idea" href="/create-idea" done={ideaFoundationDone} loading={loading} />
              <TrackStage label="Validated" outcome="Approved venture" href="/entrepreneurship" done={ideaFoundationDone} loading={loading} />
              <TrackStage label="Monetized" outcome="Revenue / equity" href="/entrepreneurship" done={false} loading={loading} />
              <TrackStage label="Grown" outcome="Team & systems" href="/projects" done={false} loading={loading} />
              <TrackStage label="Scaled" outcome="Company / box" href="/boxes" done={false} loading={loading} />
            </ul>

            <Button asChild variant="outline" className="mt-auto">
              <Link to="/entrepreneurship" className="inline-flex items-center gap-2">
                Start with an Idea <ArrowRight size={16} />
              </Link>
            </Button>
          </Card>
        </section>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Same engine. Pick what you're growing.
        </p>
      </div>
    </div>
  );
}

function TrackStage({
  label,
  outcome,
  href,
  done,
  loading,
}: {
  label: string;
  outcome: string;
  href: string;
  done: boolean;
  loading: boolean;
}) {
  return (
    <li>
      <Link
        to={href}
        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full ${
              loading ? "bg-muted-foreground/30" : done ? "bg-b4-teal" : "bg-muted-foreground/40"
            }`}
            aria-hidden
          />
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground truncate">· {outcome}</span>
        </div>
        <ArrowRight size={14} className="text-muted-foreground shrink-0" />
      </Link>
    </li>
  );
}

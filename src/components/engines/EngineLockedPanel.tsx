import { Link } from "react-router-dom";
import { Lock, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EngineAccess, EngineKey } from "@/hooks/useEngineAccess";

const ENGINE_META: Record<EngineKey, { title: string; tagline: string; valueProp: string }> = {
  career: {
    title: "Career Engine",
    tagline: "Build your evidence base",
    valueProp: "Career is your on-ramp — discover your role, ship a track record, collect skill evidence.",
  },
  consulting: {
    title: "Consulting Engine",
    tagline: "Monetize your expertise",
    valueProp: "Package what you know into trainings, services and tender bids. Unlocks once you have proven expertise.",
  },
  entrepreneurship: {
    title: "Entrepreneurship Engine",
    tagline: "Create ownership",
    valueProp: "Launch ventures, take equity, lead teams. Unlocks once you carry venture-grade signals.",
  },
};

interface Props {
  engine: EngineKey;
  access: EngineAccess;
}

export function EngineLockedPanel({ engine, access }: Props) {
  const meta = ENGINE_META[engine];

  return (
    <section className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {meta.tagline}
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {meta.title} — not yet unlocked
              </h1>
            </div>
          </div>

          <p className="text-muted-foreground mb-8 leading-relaxed">{meta.valueProp}</p>

          <div className="mb-8">
            <h2 className="font-display text-lg font-bold text-foreground mb-3">
              Evidence required
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Any one of the signals below unlocks this engine.
            </p>
            <ul className="space-y-2.5">
              {access.met.map((s, i) => (
                <li key={`met-${i}`} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-b4-teal shrink-0 mt-0.5" />
                  <span className="text-foreground">{s.label}</span>
                </li>
              ))}
              {access.missing.map((s, i) => (
                <li key={`missing-${i}`} className="flex items-start gap-3 text-sm">
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {access.missing.some((s) => s.cta) && (
            <div>
              <h2 className="font-display text-lg font-bold text-foreground mb-3">
                Next actions
              </h2>
              <div className="flex flex-wrap gap-2">
                {access.missing
                  .filter((s) => s.cta)
                  .map((s, i) => (
                    <Button key={i} variant="outline" size="sm" asChild>
                      <Link to={s.cta!.to}>
                        {s.cta!.label} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border text-sm text-muted-foreground">
            Career stays open at any time — that's where you build the evidence to unlock the rest.{" "}
            <Link to="/career" className="text-b4-teal hover:underline">
              Open Career →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import { XCircle, CheckCircle } from "lucide-react";

const problems = [
  "Need capital to start a business",
  "Finding co-founders is hit or miss",
  "Equity splits cause conflict",
  "Skills go undervalued",
];

const solutions = [
  "Your skills ARE your investment",
  "Matched with verified co-builders",
  "Fair, formula-based equity allocation",
  "Every contribution is valued",
];

export function LandingProblem() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Startup Building is <span className="text-b4-coral">Broken</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Traditional startup paths exclude talented people. We're changing that.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Problems */}
          <div className="bg-muted/30 rounded-2xl p-8 border border-border">
            <h3 className="text-lg font-semibold text-muted-foreground mb-6 uppercase tracking-wide">
              The Old Way
            </h3>
            <ul className="space-y-4">
              {problems.map((problem, i) => (
                <li key={i} className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-500/70 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="bg-gradient-to-br from-b4-teal/10 to-b4-teal/5 rounded-2xl p-8 border border-b4-teal/20">
            <h3 className="text-lg font-semibold text-b4-teal mb-6 uppercase tracking-wide">
              The B4 Way
            </h3>
            <ul className="space-y-4">
              {solutions.map((solution, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-b4-teal flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

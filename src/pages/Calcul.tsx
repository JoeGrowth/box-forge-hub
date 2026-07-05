import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useReputation, reputationLevelStyle } from "@/hooks/useReputation";
import { useTrust, trustLevelStyle } from "@/hooks/useTrust";
import { useExpertise } from "@/hooks/useExpertise";
import { Loader2, Brain, ShieldCheck, Coins, Users, Sparkles } from "lucide-react";

const Row = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <div className="text-sm font-mono text-foreground whitespace-nowrap">{value}</div>
  </div>
);

const Calcul = () => {
  const { user, loading: authLoading } = useAuth();
  const { reputation, loading: repLoading } = useReputation(user?.id);
  const { trust, loading: trustLoading } = useTrust(user?.id);
  const { expertise, loading: expLoading } = useExpertise(user?.id);

  const loading = authLoading || repLoading || trustLoading || expLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto pt-32 px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <p>Sign in to see how your reputation is calculated.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const repLevel = reputation ? reputationLevelStyle(reputation.reputation_level) : null;
  const trustBadge = trust ? trustLevelStyle(trust.level) : null;

  const breakdown = reputation?.reputation_breakdown ?? {};
  const weights = breakdown.weights ?? { expertise: 0.35, trust: 0.30, revenue: 0.20, community: 0.15 };

  const eScore = reputation?.expertise_score ?? 0;
  const tScore = reputation?.trust_score ?? 0;
  const rScore = reputation?.revenue_score ?? 0;
  const cScore = reputation?.community_score ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-24 pb-16 px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Reputation calculator</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">How your professional reputation is computed</h1>
          <p className="text-muted-foreground">
            Live projection for <span className="font-medium text-foreground">{user.email}</span>.
            All scores are read from the graph — no client-side estimation.
          </p>
        </header>

        {/* Final reputation */}
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-2xl">Professional reputation</CardTitle>
                <CardDescription>Weighted synthesis of the four graph components</CardDescription>
              </div>
              {repLevel && (
                <Badge variant="outline" className={`text-sm px-3 py-1 ${repLevel.className}`}>
                  {repLevel.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-primary">{Math.round(reputation?.reputation_score ?? 0)}</span>
              <span className="text-muted-foreground mb-2">/ 100</span>
            </div>
            <Progress value={reputation?.reputation_score ?? 0} className="h-2" />

            <div className="rounded-lg bg-muted/40 p-4 font-mono text-xs sm:text-sm overflow-x-auto">
              reputation = expertise × {weights.expertise} + trust × {weights.trust} + revenue × {weights.revenue} + community × {weights.community}
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= {eScore.toFixed(1)} × {weights.expertise} + {tScore.toFixed(1)} × {weights.trust} + {rScore.toFixed(1)} × {weights.revenue} + {cScore.toFixed(1)} × {weights.community}
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <span className="text-primary font-semibold">{(reputation?.reputation_score ?? 0).toFixed(1)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Expertise", value: eScore, weight: weights.expertise, icon: Brain },
                { label: "Trust", value: tScore, weight: weights.trust, icon: ShieldCheck },
                { label: "Revenue", value: rScore, weight: weights.revenue, icon: Coins },
                { label: "Community", value: cScore, weight: weights.community, icon: Users },
              ].map(({ label, value, weight, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{value.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">weight × {weight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expertise */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <CardTitle>Expertise score</CardTitle>
              </div>
              <Badge variant="outline" className="capitalize">{expertise?.level ?? "novice"}</Badge>
            </div>
            <CardDescription>What you know, verified through skills, certifications and delivered work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{(expertise?.score ?? 0).toFixed(0)}</span>
              <span className="text-muted-foreground text-sm">/ 100</span>
            </div>
            <Progress value={expertise?.score ?? 0} className="h-2" />
            <Separator />
            <Row label="Verified expertise items" value={expertise?.verifiedCount ?? 0} hint="Skills + certifications validated by evidence" />
            <Row label="Tagged expertise domains" value={expertise?.tags.length ?? 0} hint="Max 20 signal tags (Minimal Viable Intelligence)" />
            <Row label="Monetizable skills" value={expertise?.monetizable.skills ?? 0} />
            <Row label="Monetizable certifications" value={expertise?.monetizable.certifications ?? 0} />
            <Row label="Trainings delivered" value={expertise?.monetizable.trainings_delivered ?? 0} />
            <Row label="Consulting engagements" value={expertise?.monetizable.consulting_engagements ?? 0} />
            <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs overflow-x-auto">
              expertise = verified_items × w_verified + monetizable_output × w_output + tag_coverage × w_tags
            </div>
          </CardContent>
        </Card>

        {/* Trust */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <CardTitle>Trust score</CardTitle>
              </div>
              {trustBadge && (
                <Badge variant="outline" className={trustBadge.className}>{trustBadge.label}</Badge>
              )}
            </div>
            <CardDescription>Why others should believe you — evidence of verified credentials, completed work, and peer reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{(trust?.score ?? 0).toFixed(0)}</span>
              <span className="text-muted-foreground text-sm">/ 100</span>
            </div>
            <Progress value={trust?.score ?? 0} className="h-2" />
            <Separator />
            <Row label="Verified credentials" value={trust?.verifiedCount ?? 0} hint="Admin-approved certifications & affiliations" />
            <Row label="Review score" value={(trust?.reviewScore ?? 0).toFixed(1)} hint="Average of peer / client reviews" />
            <Row label="Completion score" value={(trust?.completionScore ?? 0).toFixed(1)} hint="Missions closed on time & accepted" />

            {trust && Object.keys(trust.breakdown).length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-muted-foreground pt-2">Contribution breakdown</p>
                {Object.entries(trust.breakdown).map(([key, b]) => (
                  <Row
                    key={key}
                    label={key.replace(/_/g, " ")}
                    hint={`weight ${b.weight}${b.count !== undefined ? ` · count ${b.count}` : ""}${b.average !== undefined ? ` · avg ${b.average.toFixed(2)}` : ""}`}
                    value={`+${(b.points ?? 0).toFixed(1)} pts`}
                  />
                ))}
              </>
            )}

            <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs overflow-x-auto">
              trust = Σ ( component_points × component_weight )  &nbsp;→ capped at 100
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Computed by the graph worker · last update:{" "}
          {reputation?.computed_at ? new Date(reputation.computed_at).toLocaleString() : "not yet computed"}
        </p>
      </main>
    </div>
  );
};

export default Calcul;

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Briefcase, GraduationCap, Lightbulb, Users, Rocket, Compass, Plus, ArrowRight, Sparkles,
} from "lucide-react";

type CharacterKey = "professional" | "consultant" | "trainer" | "entrepreneur" | "initiator" | "cobuilder";

interface CharacterDef {
  key: CharacterKey;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // tailwind classes for gradient
  cta: string;
  href: string;
}

const CHARACTERS: CharacterDef[] = [
  {
    key: "professional",
    name: "Professional Career",
    tagline: "Build and showcase your expertise as an employed professional.",
    icon: Briefcase,
    accent: "from-b4-navy to-b4-navy/70",
    cta: "Enhance Career",
    href: "/career",
  },
  {
    key: "consultant",
    name: "Consultant",
    tagline: "Monetize your skills through advisory and services.",
    icon: Compass,
    accent: "from-b4-teal to-b4-teal/70",
    cta: "Grow Consulting",
    href: "/consulting",
  },
  {
    key: "trainer",
    name: "Trainer",
    tagline: "Publish trainings and grow your educational footprint.",
    icon: GraduationCap,
    accent: "from-emerald-600 to-emerald-500",
    cta: "Publish Training",
    href: "/trainingmanagement",
  },
  {
    key: "entrepreneur",
    name: "Entrepreneur",
    tagline: "Launch and scale your own ventures.",
    icon: Rocket,
    accent: "from-b4-coral to-b4-coral/70",
    cta: "Build Venture",
    href: "/entrepreneurship",
  },
  {
    key: "initiator",
    name: "Initiator",
    tagline: "Spark a new idea and recruit co-builders.",
    icon: Lightbulb,
    accent: "from-amber-500 to-orange-500",
    cta: "Start an Idea",
    href: "/create-idea",
  },
  {
    key: "cobuilder",
    name: "Co-Builder",
    tagline: "Join ventures as an equity-aligned operator.",
    icon: Users,
    accent: "from-indigo-600 to-indigo-500",
    cta: "Find Ventures",
    href: "/opportunities?tab=startup",
  },
];

export default function Characters() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<CharacterKey, number>>({
    professional: 0, consultant: 0, trainer: 0, entrepreneur: 0, initiator: 0, cobuilder: 0,
  });
  const [loading, setLoading] = useState(true);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestText, setSuggestText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Your Characters — Box4Solutions";
    let cancelled = false;
    (async () => {
      if (!user) { setLoading(false); return; }
      const [
        { data: profile },
        { count: services },
        { count: trainings },
        { count: ideas },
        { count: applications },
        { data: certs },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name,professional_title,bio,summary_statement,primary_skills,years_of_experience,key_projects,education_certifications,avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("consulting_services").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("training_opportunities").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("startup_ideas").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("startup_applications").select("id", { count: "exact", head: true }).eq("applicant_id", user.id),
        supabase.from("user_certifications").select("certification_key,status").eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const pf = profile ?? {};
      const profileFields = ["full_name","professional_title","bio","summary_statement","primary_skills","years_of_experience","key_projects","education_certifications","avatar_url"];
      const profilePct = Math.round(
        (profileFields.filter((k) => (pf as any)[k] != null && String((pf as any)[k]).trim() !== "").length / profileFields.length) * 100
      );

      const hasCert = (key: string) =>
        (certs ?? []).some((c: any) => c.certification_key === key && c.status === "approved");

      const cap = (n: number, max: number) => Math.min(100, Math.round((n / max) * 100));

      setScores({
        professional: profilePct,
        consultant: Math.round(((services ?? 0 ? 50 : 0) + (hasCert("consultant") ? 50 : profilePct * 0.3)) ),
        trainer: Math.round(((trainings ?? 0 ? 60 : 0) + (hasCert("trainer") ? 40 : 0)) || (profilePct * 0.2)),
        entrepreneur: cap((ideas ?? 0) * 50 + (hasCert("initiator") ? 30 : 0), 100),
        initiator: cap((ideas ?? 0) * 60, 100),
        cobuilder: cap((applications ?? 0) * 40 + (hasCert("cobuilder") ? 30 : 0) + (profilePct > 60 ? 20 : 0), 100),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const overall = useMemo(
    () => Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / CHARACTERS.length),
    [scores]
  );

  const submitSuggestion = async () => {
    if (!user) { toast.error("Sign in to submit suggestions"); return; }
    if (!suggestName.trim()) { toast.error("Name the character"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("admin_notifications").insert({
        notification_type: "user_stuck",
        user_id: user.id,
        title: `New character suggestion: ${suggestName.trim()}`,
        message: suggestText.trim() || `User suggests adding "${suggestName.trim()}" as a new character path.`,
        metadata: { kind: "character_suggestion", name: suggestName.trim(), details: suggestText.trim() },
      });
      if (error) throw error;
      toast.success("Suggestion sent to admins");
      setSuggestOpen(false);
      setSuggestName("");
      setSuggestText("");
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-6xl flex-1">
        {/* Header */}
        <div className="bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/80 rounded-2xl p-8 text-white mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 mb-3">
                <Sparkles className="w-3 h-3 mr-1" /> Your Characters
              </Badge>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Pick the character you want to grow
              </h1>
              <p className="text-white/80 max-w-2xl">
                Every member carries multiple professional characters. Track each one's
                completion and continue exactly where it makes the most sense.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 min-w-[180px]">
              <div className="text-xs uppercase tracking-wide text-white/70">Overall</div>
              <div className="font-display text-3xl font-bold">{overall}%</div>
              <Progress value={overall} className="mt-2 h-1.5 bg-white/10" />
            </div>
          </div>
        </div>

        {/* Characters grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CHARACTERS.map((c) => {
            const Icon = c.icon;
            const score = scores[c.key];
            return (
              <button
                key={c.key}
                onClick={() => navigate(c.href)}
                className="text-left group"
              >
                <Card className="h-full transition-all group-hover:shadow-lg group-hover:-translate-y-0.5 overflow-hidden">
                  <div className={`h-2 w-full bg-gradient-to-r ${c.accent}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.accent} text-white flex items-center justify-center shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl font-bold text-foreground">{loading ? "—" : `${score}%`}</div>
                        <div className="text-xs text-muted-foreground">completion</div>
                      </div>
                    </div>
                    <CardTitle className="mt-3 text-xl">{c.name}</CardTitle>
                    <CardDescription>{c.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={loading ? 0 : score} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {score >= 80 ? "Strong" : score >= 40 ? "Building" : "Just starting"}
                      </span>
                      <span className="text-primary font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        {c.cta} <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}

          {/* Suggest new character */}
          <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
            <DialogTrigger asChild>
              <button className="text-left group">
                <Card className="h-full border-dashed border-2 border-border bg-muted/20 transition-all group-hover:bg-muted/40 group-hover:border-primary">
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <CardTitle className="mt-3 text-xl">Suggest a Character</CardTitle>
                    <CardDescription>
                      Missing a role you embody? Propose it and the admins will review adding it to the platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                      Suggest now <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suggest a new character</DialogTitle>
                <DialogDescription>
                  Tell us what character path you'd like Box4Solutions to support. Admins are notified directly.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="e.g. Researcher, Investor, Mentor…"
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  maxLength={60}
                />
                <Textarea
                  placeholder="What does this character do? What would you want to grow on the platform?"
                  value={suggestText}
                  onChange={(e) => setSuggestText(e.target.value)}
                  maxLength={600}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSuggestOpen(false)}>Cancel</Button>
                <Button onClick={submitSuggestion} disabled={submitting}>
                  {submitting ? "Sending…" : "Send suggestion"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!user && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            <Link to="/auth" className="text-primary underline">Sign in</Link> to see your real character scores.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useOnboardingSession,
  useStartOnboarding,
  useCompleteStep,
  useEmitOnboardingEvent,
} from "@/hooks/useOnboardingSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

// P0.6 — Compressed onboarding. Five steps, <5 min, graph seed > profile completion.

const INTENT_OPTIONS = [
  { value: "Explorer", description: "Just browsing — no specific plan yet" },
  { value: "Builder", description: "I build products, code, or designs and want real projects" },
  { value: "Validated Expert", description: "I have proven expertise and want to monetize or advise" },
  { value: "Professional Operator", description: "I run teams, processes, or operations in established settings" },
  { value: "Co-Builder", description: "I want to join a startup as a core team member" },
  { value: "Venture Creator", description: "I have an idea and want to build a company" },
] as const;

const GOAL_OPTIONS = [
  { value: "find_opportunities", label: "Find opportunities" },
  { value: "monetize_expertise", label: "Monetize expertise" },
  { value: "join_startup", label: "Join a startup" },
  { value: "build_venture", label: "Build a venture" },
  { value: "learn_skills", label: "Learn new skills" },
] as const;

const COMMITMENT_OPTIONS = [
  { value: "few_hours", label: "A few hours / week" },
  { value: "part_time", label: "Part-time (10–20h)" },
  { value: "full_time", label: "Full-time" },
] as const;

const SUGGESTED_TAGS = [
  "Product Strategy", "AI", "Engineering", "Design", "Sales",
  "Marketing", "Operations", "Finance", "Data", "Entrepreneurship",
  "Consulting", "Training",
];

export default function CompressedOnboarding() {
  const navigate = useNavigate();
  const { data: session, isLoading } = useOnboardingSession();
  const start = useStartOnboarding();
  const complete = useCompleteStep();
  const emit = useEmitOnboardingEvent();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [headline, setHeadline] = useState("");
  const [intent, setIntent] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [goal, setGoal] = useState<string>("");
  const [commitment, setCommitment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      start.mutateAsync().catch(() => {});
    } else if (session.completed_at) {
      navigate("/onboarding/map", { replace: true });
    } else {
      setStep(session.current_step);
      setIntent(session.onboarding_intent ?? "");
      setGoal(session.goal ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session?.id]);

  const progress = useMemo(() => ((step - 1) / 5) * 100, [step]);

  function toggleTag(t: string) {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 3 ? prev : [...prev, t],
    );
  }

  function addCustomTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t) || tags.length >= 3) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  async function next() {
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        toast.error("Your session expired — please sign in again");
        navigate("/auth", { replace: true });
        return;
      }


      if (step === 1) {
        if (!fullName.trim()) throw new Error("Name is required");
        await supabase.from("profiles").upsert(
          [{
            user_id: uid,
            full_name: fullName.trim(),
            professional_title: headline.trim() || null,
            bio: location.trim() ? `Based in ${location.trim()}` : null,
          }],
          { onConflict: "user_id" },
        );
        await complete.mutateAsync({ step: 1 });
      } else if (step === 2) {
        if (!intent) throw new Error("Pick where you are today");
        await complete.mutateAsync({ step: 2, patch: { onboarding_intent: intent } });
      } else if (step === 3) {
        if (tags.length < 1) throw new Error("Pick at least one expertise area");
        // Upsert cold-start profile and emit cold_start_seeded so worker seeds the graph.
        const { data: existing } = await supabase
          .from("cold_start_profiles")
          .select("estimated_expertise")
          .eq("user_id", uid)
          .maybeSingle();
        await supabase.from("cold_start_profiles").upsert(
          [{
            user_id: uid,
            decoder_result: { source: "compressed_onboarding", tags } as never,
            estimated_expertise: tags as never,
            confidence: 0.5,
            seed_source: "compressed_onboarding",
          }],
          { onConflict: "user_id" },
        );
        const isUpdate = !!existing;
        await emit.mutateAsync({
          type: isUpdate ? "cold_start_updated" : "cold_start_seeded",
          payload: { tags },
        });
        await complete.mutateAsync({ step: 3 });
      } else if (step === 4) {
        if (!goal) throw new Error("Pick a goal");
        await complete.mutateAsync({ step: 4, patch: { goal } });
      } else if (step === 5) {
        if (!commitment) throw new Error("Pick your availability");
        await complete.mutateAsync({
          step: 5,
          patch: { availability: { commitment } },
        });
        toast.success("Welcome — building your professional map");
        navigate("/onboarding/map", { replace: true });
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step} of 5</span>
            <span>Under 5 minutes</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card className="p-6 md:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Who are you?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  This helps people recognize you. Nothing more required.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc">Location</Label>
                <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, country" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hd">
                  Professional headline <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input id="hd" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Student exploring product design — or leave blank" maxLength={140} />
                <p className="text-xs text-muted-foreground">
                  No title yet? Skip it. You can describe yourself with a goal like "Student looking for first startup role" or leave it empty — you'll refine it later from your expertise tags.
                </p>
              </div>

            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Where are you today?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Used only for initial routing. Your real state is derived from what you do here.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INTENT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setIntent(o.value)}
                    className={`text-left rounded-lg border p-3 transition ${
                      intent === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-medium text-sm">{o.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Three expertise areas</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick up to 3. These seed your professional map. They are marked <em>estimated</em> until verified.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...SUGGESTED_TAGS, ...tags.filter((t) => !SUGGESTED_TAGS.includes(t))].map((t) => {
                  const active = tags.includes(t);
                  const isCustom = !SUGGESTED_TAGS.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`text-xs rounded-full px-3 py-1.5 border transition ${
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {t}{isCustom && active ? " ×" : ""}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  placeholder="Add custom area"
                  maxLength={50}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                />
                <Button type="button" variant="outline" onClick={addCustomTag} disabled={tags.length >= 3}>
                  Add
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">{tags.length}/3 selected</div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">What do you want next?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Maps you to the right progression rule. You can change later.
                </p>
              </div>
              <div className="grid gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={`text-left rounded-lg border p-3 transition ${
                      goal === g.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-medium text-sm">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Used for opportunity matching. No reputation signal is created from this.
                </p>
              </div>
              <div className="grid gap-2">
                {COMMITMENT_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCommitment(c.value)}
                    className={`text-left rounded-lg border p-3 transition ${
                      commitment === c.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-medium text-sm">{c.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-xs">
              Graph-first onboarding
            </Badge>
            <Button onClick={next} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {step === 5 ? "See my map" : "Continue"} <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

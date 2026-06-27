import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const GOAL_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "find_opportunities", label: "Find opportunities", desc: "Scout jobs, projects, and missions worth your time." },
  { value: "join_startup", label: "Join a startup", desc: "Co-build a venture as a co-founder or early team member." },
  { value: "build_venture", label: "Build my venture", desc: "Launch your own idea and recruit co-builders." },
  { value: "monetize_expertise", label: "Monetize my expertise", desc: "Sell consulting services and grow an advisory track record." },
  { value: "learn_skills", label: "Learn new skills", desc: "Get vaccinated through certifications and journeys." },
];

export function GoalSelectorCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("onboarding_sessions")
      .select("goal")
      .eq("user_id", user.id)
      .maybeSingle();
    const g = (data as any)?.goal ?? null;
    setCurrentGoal(g);
    setSelected(g ?? "");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user || !selected || selected === currentGoal) return;
    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("onboarding_sessions")
        .upsert({ user_id: user.id, goal: selected }, { onConflict: "user_id" });
      if (upErr) throw upErr;
      await supabase.from("goal_change_log").insert({
        user_id: user.id,
        old_goal: currentGoal,
        new_goal: selected,
        source: "profile",
      });
      setCurrentGoal(selected);
      toast({ title: "Goal updated", description: "Your dashboard will adapt to your new direction." });
    } catch (e: any) {
      toast({ title: "Could not update", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-b4-teal" /> What do you want next?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick the direction that fits you today. Your dashboard messages and CTAs will adapt instantly.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
          {GOAL_OPTIONS.map((g) => (
            <Label
              key={g.value}
              htmlFor={`goal-${g.value}`}
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50"
            >
              <RadioGroupItem value={g.value} id={`goal-${g.value}`} className="mt-1" />
              <div>
                <div className="font-medium text-foreground">{g.label}</div>
                <div className="text-xs text-muted-foreground">{g.desc}</div>
              </div>
            </Label>
          ))}
        </RadioGroup>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !selected || selected === currentGoal}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save direction
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

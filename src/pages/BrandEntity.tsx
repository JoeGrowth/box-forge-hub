import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Lock, Sparkles, Users } from "lucide-react";

const MILESTONE = 10;

export default function BrandEntity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [paidCount, setPaidCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from("consultant_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_completed", true);
      setPaidCount(count ?? 0);
      setLoading(false);
    })();
  }, [user?.id]);

  const unlocked = paidCount >= MILESTONE;
  const progress = Math.min(100, (paidCount / MILESTONE) * 100);

  const launch = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast({ title: "Brand name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: form.name.trim(),
        slug,
        type: "brand",
        description: form.description.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      setSaving(false);
      toast({ title: "Failed to launch brand", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: user.id,
      role: "admin",
    });
    // Assign B4 as Inspiring Advisor (best-effort)
    const { data: b4 } = await supabase
      .from("platform_partners")
      .select("organization_id")
      .eq("slug", "b4")
      .maybeSingle();
    if (b4?.organization_id) {
      await supabase.from("entity_role_assignments").insert({
        entity_type: "organization",
        entity_id: org.id,
        role_slug: "inspiring_advisor",
        slot: 1,
        label: "Inspiring Advisor",
        linked_user_id: null,
        status: "verified",
      } as never);
    }
    setSaving(false);
    toast({ title: "Brand launched", description: `${form.name} is now active.` });
    nav("/organizations");
  };

  return (
    <div className="container mx-auto max-w-3xl pt-24 pb-8 px-4 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Rocket className="w-7 h-7 text-b4-teal" /> Launch your brand entity
        </h1>
        <p className="text-muted-foreground mt-1">Graduate from solo consultant to a brand systematized</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Unlock progress</CardTitle>
            <Badge variant={unlocked ? "default" : "outline"}>{paidCount}/{MILESTONE} paid missions</Badge>
          </div>
          <CardDescription>
            {unlocked ? "You've hit the threshold. Time to name your brand." : `${MILESTONE - paidCount} more paid missions to unlock brand launch.`}
          </CardDescription>
        </CardHeader>
        <CardContent><Progress value={progress} /></CardContent>
      </Card>

      {!unlocked ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Locked until you complete {MILESTONE} paid missions.</p>
            <Button variant="outline" onClick={() => nav("/consulting-growth")}>Go to Consulting Growth</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-b4-teal" />Brand identity</CardTitle>
            <CardDescription>Pick a name — this creates a new organization you control.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Brand name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AngryPenguin & Co" disabled={loading} /></div>
            <div><Label>Short description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm flex gap-2">
              <Users className="w-4 h-4 flex-shrink-0 mt-0.5 text-b4-teal" />
              <span>On launch, B4 is auto-assigned as <strong>Inspiring Advisor</strong>. You remain the sole admin; add co-founders from the organization page.</span>
            </div>
            <Button onClick={launch} disabled={saving} variant="teal" className="w-full">
              {saving ? "Launching…" : "Launch brand entity"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

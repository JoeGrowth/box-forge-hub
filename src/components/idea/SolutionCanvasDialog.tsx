import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2, ShieldCheck, Lightbulb, Users } from "lucide-react";
import { SolutionStageBadge, SolutionStage } from "./SolutionStageBadge";
import { RequestAdvisorDrawer } from "@/components/box/RequestAdvisorDrawer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: string;
  isCreator: boolean;
  onSaved?: () => void;
}

interface Canvas {
  problem_statement: string | null;
  who_suffers: string | null;
  evidence: string | null;
  current_alternatives: string | null;
  why_now: string | null;
  completed_at: string | null;
  signed_off_at: string | null;
  signed_off_role: string | null;
}

const FIELDS: Array<{ key: keyof Canvas; label: string; placeholder: string; helper: string }> = [
  {
    key: "problem_statement",
    label: "1. Problem statement",
    placeholder: "What specific, painful problem does this solve? One concrete sentence.",
    helper: "Avoid abstractions. Name the pain.",
  },
  {
    key: "who_suffers",
    label: "2. Who suffers from it",
    placeholder: "Which exact group of people experiences this problem today?",
    helper: "Be specific — age, role, context.",
  },
  {
    key: "evidence",
    label: "3. Evidence",
    placeholder: "3 interviews, a data source, or observable behavior proving the problem is real.",
    helper: "No evidence = no validation.",
  },
  {
    key: "current_alternatives",
    label: "4. Current alternatives",
    placeholder: "What do they do today instead? Why is it inadequate?",
    helper: "If nothing competes, the problem may not be real.",
  },
  {
    key: "why_now",
    label: "5. Why now",
    placeholder: "What changed in the world that makes this the right moment?",
    helper: "Timing is part of the solution.",
  },
];

const EMPTY: Canvas = {
  problem_statement: "",
  who_suffers: "",
  evidence: "",
  current_alternatives: "",
  why_now: "",
  completed_at: null,
  signed_off_at: null,
  signed_off_role: null,
};

export function SolutionCanvasDialog({ open, onOpenChange, ideaId, isCreator, onSaved }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [canvas, setCanvas] = useState<Canvas>(EMPTY);
  const [stage, setStage] = useState<SolutionStage>("draft");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);


  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data: canvasRow }, { data: ideaRow }] = await Promise.all([
        supabase.from("idea_solution_canvas").select("*").eq("idea_id", ideaId).maybeSingle(),
        supabase.from("startup_ideas").select("solution_stage").eq("id", ideaId).maybeSingle(),
      ]);
      setCanvas(canvasRow ? { ...EMPTY, ...canvasRow } : EMPTY);
      setStage(((ideaRow as { solution_stage?: string } | null)?.solution_stage ?? "draft") as SolutionStage);
      setLoading(false);
    })();
  }, [open, ideaId]);

  const allFilled = FIELDS.every((f) => (canvas[f.key] as string | null)?.trim());

  const handleSave = async () => {
    if (!isCreator) return;
    setSaving(true);
    const payload = {
      idea_id: ideaId,
      problem_statement: canvas.problem_statement,
      who_suffers: canvas.who_suffers,
      evidence: canvas.evidence,
      current_alternatives: canvas.current_alternatives,
      why_now: canvas.why_now,
    };
    const { error } = await supabase.from("idea_solution_canvas").upsert(payload, { onConflict: "idea_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: allFilled ? "Canvas complete" : "Saved",
      description: allFilled
        ? "Your idea moved to Discovery. Applications are open with a 'not validated' badge until an advisor or admin signs off."
        : "Keep going. All 5 fields are needed to unlock Discovery.",
    });
    onSaved?.();
    if (allFilled) onOpenChange(false);
  };

  const handleSignOff = async () => {
    if (!isAdmin) return;
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("idea_solution_canvas")
      .update({
        signed_off_by: userRes.user?.id,
        signed_off_at: new Date().toISOString(),
        signed_off_role: "admin",
      })
      .eq("idea_id", ideaId);
    setSaving(false);
    if (error) {
      toast({ title: "Sign-off failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solution validated", description: "Idea promoted. Recruiting fully unlocked." });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-b4-teal" />
            <DialogTitle>Solution Canvas</DialogTitle>
            <SolutionStageBadge stage={stage} className="ml-auto" />
          </div>
          <DialogDescription>
            We don't build products without proving the problem. Fill these 5 fields to move from Draft to Discovery.
            An advisor or admin signs off to reach Validated.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Textarea
                  value={(canvas[f.key] as string | null) ?? ""}
                  onChange={(e) => setCanvas((c) => ({ ...c, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="mt-1 min-h-[80px]"
                  disabled={!isCreator}
                />
                <p className="text-xs text-muted-foreground mt-1">{f.helper}</p>
              </div>
            ))}

            {canvas.signed_off_at && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">
                  Signed off by {canvas.signed_off_role} on{" "}
                  {new Date(canvas.signed_off_at).toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {isCreator && stage === "discovery" && !canvas.signed_off_at && (
                <Button variant="outline" onClick={() => setRequestOpen(true)}>
                  <Users className="h-4 w-4 mr-1" /> Request validation
                </Button>
              )}
              {isCreator && (
                <Button onClick={handleSave} disabled={saving} variant="teal">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              )}
              {isAdmin && allFilled && !canvas.signed_off_at && (
                <Button onClick={handleSignOff} disabled={saving}>
                  <ShieldCheck className="h-4 w-4 mr-1" /> Sign off
                </Button>
              )}
            </div>

            <RequestAdvisorDrawer
              open={requestOpen}
              onOpenChange={setRequestOpen}
              defaultType="solution_signoff"
              defaultTopic="Solution Canvas sign-off"
              subjectEntityType="idea"
              subjectEntityId={ideaId}
              assignmentPolicy="select"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

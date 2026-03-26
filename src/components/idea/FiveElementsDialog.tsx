import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit2, RotateCcw, Layers, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FiveElementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: { id: string; title: string; description: string } | null;
}

interface Elements {
  problem: string;
  solution: string;
  product: string;
  market: string;
  business_model: string;
}

const LABELS: Record<keyof Elements, string> = {
  problem: "Problem",
  solution: "Solution",
  product: "Product",
  market: "Market",
  business_model: "Business Model",
};

const KEYS: (keyof Elements)[] = ["problem", "solution", "product", "market", "business_model"];

const EMPTY: Elements = { problem: "", solution: "", product: "", market: "", business_model: "" };

export const FiveElementsDialog = ({ open, onOpenChange, idea }: FiveElementsDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elements, setElements] = useState<Elements | null>(null);
  const [editing, setEditing] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Load saved data or generate on open
  useEffect(() => {
    if (open && idea) {
      loadSaved();
    }
    if (!open) {
      setElements(null);
      setEditing(false);
      setHasSaved(false);
    }
  }, [open, idea?.id]);

  const loadSaved = async () => {
    if (!idea) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("startup_five_elements")
        .select("problem, solution, product, market, business_model")
        .eq("startup_id", idea.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setElements(data);
        setHasSaved(true);
      } else {
        // No saved data — generate
        await generate();
      }
    } catch (err: any) {
      toast({ title: "Error loading", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!idea) return;
    setLoading(true);
    setEditing(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-five-elements", {
        body: { title: idea.title, description: idea.description },
      });
      if (error) throw error;
      setElements(data);
      setHasSaved(false);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Could not generate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!idea || !elements || !user) return;
    setSaving(true);
    try {
      const payload = {
        startup_id: idea.id,
        user_id: user.id,
        ...elements,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("startup_five_elements")
        .upsert(payload, { onConflict: "startup_id" });

      if (error) throw error;
      setHasSaved(true);
      setEditing(false);
      toast({ title: "Saved successfully" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers className="w-5 h-5 text-b4-teal" />
            5 Elements
          </DialogTitle>
          <DialogDescription className="text-xs truncate">{idea?.title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
            <p className="text-sm text-muted-foreground">
              {hasSaved ? "Loading..." : "Generating 5 Elements..."}
            </p>
          </div>
        ) : elements ? (
          <div className="space-y-4 pt-2">
            {KEYS.map((key) => (
              <div key={key}>
                <label className="text-xs font-bold text-b4-teal uppercase tracking-wider mb-1 block">
                  {LABELS[key]}
                </label>
                {editing ? (
                  <Textarea
                    className="text-sm min-h-[50px] resize-none"
                    value={elements[key]}
                    onChange={(e) => setElements((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                  />
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{elements[key]}</p>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              {editing ? (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={generate}
                disabled={loading}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

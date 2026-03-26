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
import { Loader2, Edit2, CheckCircle, RotateCcw, Layers, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export const FiveElementsDialog = ({ open, onOpenChange, idea }: FiveElementsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [elements, setElements] = useState<Elements | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (open && idea && !elements) {
      generate();
    }
  }, [open, idea?.id]);

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
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Could not generate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setElements(null);
      setEditing(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
            <p className="text-sm text-muted-foreground">Generating 5 Elements...</p>
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
              <Button
                variant={editing ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (editing) {
                    toast({ title: "Changes saved" });
                  }
                  setEditing(!editing);
                }}
              >
                {editing ? (
                  <><Save className="w-3.5 h-3.5 mr-1" /> Save</>
                ) : (
                  <><Edit2 className="w-3.5 h-3.5 mr-1" /> Edit</>
                )}
              </Button>
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

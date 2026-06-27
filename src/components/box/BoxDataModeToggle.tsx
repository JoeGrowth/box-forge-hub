import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Database, Sparkles } from "lucide-react";

interface Props {
  boxId: string;
  initialMode: "demo" | "live";
  onChange?: (mode: "demo" | "live") => void;
}

/**
 * Visible only to platform admins and the box's assigned ecosystem admins.
 * Lets them flip the box display between curated demo data and real DB data.
 */
export function BoxDataModeToggle({ boxId, initialMode, onChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [canEdit, setCanEdit] = useState(false);
  const [mode, setMode] = useState<"demo" | "live">(initialMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  useEffect(() => {
    if (!user || !boxId) {
      setCanEdit(false);
      return;
    }
    (async () => {
      const [{ data: roleRow }, { data: adminRow }] = await Promise.all([
        (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
        (supabase as any)
          .from("box_ecosystem_admins")
          .select("id")
          .eq("user_id", user.id)
          .eq("box_id", boxId)
          .maybeSingle(),
      ]);
      setCanEdit(Boolean(roleRow) || Boolean(adminRow));
    })();
  }, [user, boxId]);

  if (!canEdit) return null;

  const handleToggle = async (next: boolean) => {
    const nextMode: "demo" | "live" = next ? "live" : "demo";
    setSaving(true);
    const { error } = await (supabase as any)
      .from("boxes")
      .update({ data_mode: nextMode })
      .eq("id", boxId);
    setSaving(false);
    if (error) {
      toast({
        title: "Could not update box",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setMode(nextMode);
    onChange?.(nextMode);
    toast({
      title: nextMode === "live" ? "Live data activated" : "Demo data restored",
      description:
        nextMode === "live"
          ? "Visitors now see real startups, co-builders, and ventures from the database."
          : "Visitors now see the curated demo content for this box.",
    });
  };

  return (
    <div className="rounded-xl border bg-card/60 backdrop-blur px-4 py-3 flex items-center gap-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {mode === "live" ? <Database className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Box data source</span>
          <Badge variant={mode === "live" ? "default" : "secondary"} className="text-[10px]">
            {mode === "live" ? "Live" : "Demo"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">Admin only</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "live"
            ? "Real startups, co-builders, and ventures from the database are shown to visitors."
            : "Curated demo content is shown. Switch to live once the box has real activity."}
        </p>
      </div>
      <Switch checked={mode === "live"} onCheckedChange={handleToggle} disabled={saving} />
    </div>
  );
}

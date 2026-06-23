// Single-field, single-save drawer. By design this NEVER opens a multi-step
// flow or routes to /profile. Add one skill → emit signal_completed → close.

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  source: string;
  onCompleted: () => void;
}

export function MissingSignalDrawer({ open, onOpenChange, userId, source, onCompleted }: Props) {
  const [skill, setSkill] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const value = skill.trim();
    if (!value || !userId) return;
    setSaving(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("primary_skills")
        .eq("user_id", userId)
        .maybeSingle();
      const existing = (prof?.primary_skills ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!existing.includes(value)) {
        const next = [...existing, value].join(", ");
        await supabase.from("profiles").update({ primary_skills: next }).eq("user_id", userId);
      }
      const insert = {
        user_id: userId,
        event_type: "signal_completed" as const,
        aggregate_type: "user",
        aggregate_id: userId,
        source_module: source,
        payload: {
          canonical_name: "signal.completed",
          source,
          signal_type: "skill",
          value,
        } as never,
        idempotency_key: `signal_completed:skill:v1:${userId}:${value}`,
        weight: 1,
      };
      await supabase
        .from("graph_events")
        .upsert(insert, { onConflict: "idempotency_key", ignoreDuplicates: true });
      setSkill("");
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto max-w-md w-full">
          <DrawerHeader>
            <DrawerTitle>Add one skill</DrawerTitle>
            <DrawerDescription>One word or short phrase. We use it to match you to more opportunities.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <Input
              autoFocus
              placeholder="e.g. Product Strategy"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
            />
          </div>
          <DrawerFooter>
            <Button onClick={handleSave} disabled={!skill.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add skill
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Maybe later
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

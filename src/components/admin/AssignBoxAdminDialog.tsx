import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName?: string | null;
  onAdded?: () => void;
}

type BoxRow = { id: string; name: string; slug: string };

const NEW_BOX = "__new__";

export const AssignBoxAdminDialog = ({
  open,
  onOpenChange,
  userId,
  userName,
  onAdded,
}: Props) => {
  const { user: admin } = useAuth();
  const { toast } = useToast();

  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [boxId, setBoxId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxSlug, setNewBoxSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setBoxId(null);
    setNotes("");
    setNewBoxName("");
    setNewBoxSlug("");
    setLoading(true);
    (async () => {
      const [{ data: bx }, { data: ex }] = await Promise.all([
        (supabase as any).from("boxes").select("id,name,slug").order("name"),
        (supabase as any)
          .from("box_ecosystem_admins")
          .select("box_id")
          .eq("user_id", userId),
      ]);
      setBoxes((bx as BoxRow[]) ?? []);
      setExisting(((ex as any[]) ?? []).map((r) => r.box_id));
      setLoading(false);
    })();
  }, [open, userId]);

  const isCreatingBox = boxId === NEW_BOX;
  const newBoxValid =
    isCreatingBox &&
    newBoxName.trim().length >= 3 &&
    /^[a-z0-9-]{3,}$/.test(newBoxSlug.trim());
  const alreadyAdmin = !!boxId && !isCreatingBox && existing.includes(boxId);
  const canSubmit =
    !!boxId && !alreadyAdmin && !submitting && (!isCreatingBox || newBoxValid);

  const handleSubmit = async () => {
    if (!userId || !admin || !boxId) return;
    setSubmitting(true);
    try {
      let targetBoxId = boxId;
      if (isCreatingBox) {
        const { data: created, error: createErr } = await (supabase as any)
          .from("boxes")
          .insert({ slug: newBoxSlug.trim(), name: newBoxName.trim() })
          .select("id")
          .single();
        if (createErr) throw createErr;
        targetBoxId = created.id;
      }

      const { error } = await (supabase as any)
        .from("box_ecosystem_admins")
        .upsert(
          {
            user_id: userId,
            box_id: targetBoxId,
            assigned_by: admin.id,
            notes: notes.trim() || null,
          },
          { onConflict: "user_id,box_id" },
        );
      if (error) throw error;

      toast({
        title: "Box admin assigned",
        description: `${userName ?? "User"} now has Box admin permissions.`,
      });
      onAdded?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Could not assign Box admin",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-b4-navy" />
            Assign as Box Admin
          </DialogTitle>
          <DialogDescription>
            Box admins govern a single vertical. Existing demo content is never
            modified by this action.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Box</Label>
              <Select value={boxId ?? ""} onValueChange={setBoxId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_BOX}>+ Create a new Box…</SelectItem>
                </SelectContent>
              </Select>
              {alreadyAdmin && (
                <p className="text-xs text-amber-600 mt-1">
                  Already a Box admin here — submitting will refresh the
                  assignment.
                </p>
              )}
              {isCreatingBox && (
                <div className="mt-3 space-y-2 rounded-md border border-dashed p-3">
                  <p className="text-xs text-muted-foreground">
                    A new Box page will be generated from the demo template.
                  </p>
                  <div>
                    <Label className="text-xs">Box name</Label>
                    <Input
                      value={newBoxName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewBoxName(v);
                        if (!newBoxSlug) {
                          setNewBoxSlug(
                            v
                              .toLowerCase()
                              .replace(/^box\s*for\s*/i, "")
                              .replace(/\s*solutions?$/i, "")
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)/g, ""),
                          );
                        }
                      }}
                      placeholder="e.g. Box For Security Solutions"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slug (URL)</Label>
                    <Input
                      value={newBoxSlug}
                      onChange={(e) =>
                        setNewBoxSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      placeholder="security"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      /boxes/{newBoxSlug || "your-slug"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context for this assignment (visible to admins only)."
                className="min-h-[70px] mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Assign Box admin"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

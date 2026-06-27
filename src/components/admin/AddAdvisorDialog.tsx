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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface BoxRow {
  id: string;
  slug: string;
  name: string;
}

interface ReadinessRow {
  eligible: boolean;
  nr_complete: boolean;
  verified_skills: number;
  track_record_count: number;
  reputation_score: number;
  eligibility_reason: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  userName?: string | null;
  onAdded?: () => void;
}

export function AddAdvisorDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onAdded,
}: Props) {
  const { user: admin } = useAuth();
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [boxId, setBoxId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessRow | null>(null);
  const [existing, setExisting] = useState<{ box_id: string; status: string }[]>(
    [],
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const NEW_BOX = "__new__";
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxSlug, setNewBoxSlug] = useState("");


  useEffect(() => {
    if (!open || !userId) return;
    setBoxId(null);
    setOverrideReason("");
    setReadiness(null);
    setExisting([]);
    setNewBoxName("");
    setNewBoxSlug("");
    setLoading(true);

    (async () => {
      const [{ data: bx }, { data: rd }, { data: ex }] = await Promise.all([
        (supabase as any).from("boxes").select("id,slug,name").order("name"),
        (supabase as any)
          .from("advisor_readiness")
          .select(
            "eligible,nr_complete,verified_skills,track_record_count,reputation_score,eligibility_reason",
          )
          .eq("user_id", userId)
          .maybeSingle(),
        (supabase as any)
          .from("box_advisors")
          .select("box_id,status")
          .eq("user_id", userId),
      ]);
      setBoxes((bx as BoxRow[]) ?? []);
      setReadiness((rd as ReadinessRow) ?? null);
      setExisting((ex as any[]) ?? []);
      setLoading(false);
    })();
  }, [open, userId]);

  const eligible = readiness?.eligible === true;
  const alreadyInBox =
    boxId != null && existing.some((e) => e.box_id === boxId);
  const requireOverride = !eligible;
  const canSubmit =
    !!boxId &&
    !alreadyInBox &&
    !submitting &&
    (!requireOverride || overrideReason.trim().length >= 10);

  const handleSubmit = async () => {
    if (!userId || !admin || !boxId) return;
    setSubmitting(true);
    try {
      // 1) Override audit (only when overriding ineligibility)
      if (requireOverride) {
        const { error: ovErr } = await (supabase as any)
          .from("admin_overrides")
          .insert({
            actor_id: admin.id,
            target_kind: "advisor_appointment",
            target_id: userId,
            overridden_rule: "advisor_readiness.eligible",
            reason: overrideReason.trim(),
            snapshot: {
              box_id: boxId,
              readiness: readiness ?? null,
            },
          });
        if (ovErr) throw ovErr;
      }

      // 2) Appointment
      const { error: insErr } = await (supabase as any)
        .from("box_advisors")
        .upsert(
          {
            user_id: userId,
            box_id: boxId,
            status: "active",
            approved_by: admin.id,
            approved_at: new Date().toISOString(),
            accepting_requests: true,
            override_reason: requireOverride ? overrideReason.trim() : null,
          },
          { onConflict: "user_id,box_id" },
        );
      if (insErr) throw insErr;

      toast({
        title: "Advisor appointed",
        description: `${userName ?? "User"} is now an active advisor.`,
      });
      onAdded?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Could not appoint advisor",
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
            <ShieldCheck className="h-5 w-5 text-b4-teal" />
            Appoint as advisor
          </DialogTitle>
          <DialogDescription>
            Eligibility is global. Appointment is per Box. Both states are
            tracked separately.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Eligibility summary */}
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Advisor readiness {userName ? `· ${userName}` : ""}
                </span>
                {readiness == null ? (
                  <Badge variant="outline">Not computed</Badge>
                ) : eligible ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Eligible
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <XCircle className="h-3 w-3 mr-1" /> Not eligible
                  </Badge>
                )}
              </div>
              {readiness ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>NR complete: <span className="text-foreground font-medium">{readiness.nr_complete ? "Yes" : "No"}</span></div>
                  <div>Verified skills: <span className="text-foreground font-medium">{readiness.verified_skills}</span></div>
                  <div>Track record: <span className="text-foreground font-medium">{readiness.track_record_count}</span></div>
                  <div>Reputation: <span className="text-foreground font-medium">{Number(readiness.reputation_score).toFixed(1)}</span></div>
                  {readiness.eligibility_reason && (
                    <div className="col-span-2">Reason: <span className="text-foreground">{readiness.eligibility_reason}</span></div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No readiness row yet — projection has not run for this user.
                  You can still appoint with an explicit override.
                </p>
              )}
            </div>

            {/* Box picker */}
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
                </SelectContent>
              </Select>
              {alreadyInBox && (
                <p className="text-xs text-amber-600 mt-1">
                  Already appointed in this Box — submitting will refresh the
                  appointment.
                </p>
              )}
            </div>

            {/* Override */}
            {requireOverride && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Override required
                </div>
                <p className="text-xs text-muted-foreground">
                  This user is not eligible per <code>advisor_readiness</code>.
                  Provide a written reason; it will be logged to{" "}
                  <code>admin_overrides</code>.
                </p>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Founding cohort seed; eligibility waived for beta launch."
                  className="min-h-[80px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum 10 characters.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="teal"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : requireOverride ? (
              "Override & appoint"
            ) : (
              "Appoint advisor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

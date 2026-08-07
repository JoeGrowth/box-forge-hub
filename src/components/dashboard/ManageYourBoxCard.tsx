import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Boxes, ShieldCheck, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BoxRow {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
}

export function ManageYourBoxCard() {
  const { user } = useAuth();
  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [advisorBoxIds, setAdvisorBoxIds] = useState<string[]>([]);
  const [managedBoxIds, setManagedBoxIds] = useState<string[]>([]);
  const [pendingAdvisor, setPendingAdvisor] = useState<string[]>([]);
  const [pendingManager, setPendingManager] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [advisorSelection, setAdvisorSelection] = useState<string[]>([]);
  const [managerSelection, setManagerSelection] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [{ data: boxRows }, { data: advisorRows }, { data: adminRows }, { data: requestRows }] =
      await Promise.all([
        supabase.from("boxes").select("id, name, slug, domain").order("name"),
        supabase.from("box_advisors").select("box_id, status").eq("user_id", user.id),
        supabase.from("box_ecosystem_admins").select("box_id").eq("user_id", user.id),
        supabase
          .from("box_role_requests")
          .select("box_id, request_type, status")
          .eq("user_id", user.id)
          .eq("status", "pending"),
      ]);

    setBoxes((boxRows as BoxRow[]) ?? []);
    setAdvisorBoxIds(((advisorRows ?? []) as { box_id: string; status: string }[])
      .filter((r) => r.status === "active")
      .map((r) => r.box_id));
    setManagedBoxIds(((adminRows ?? []) as { box_id: string }[]).map((r) => r.box_id));
    const reqs = (requestRows ?? []) as { box_id: string; request_type: string }[];
    setPendingAdvisor(reqs.filter((r) => r.request_type === "advisor").map((r) => r.box_id));
    setPendingManager(reqs.filter((r) => r.request_type === "manager").map((r) => r.box_id));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const boxName = (id: string) => boxes.find((b) => b.id === id)?.name ?? "Box";

  const submitAdvisor = async () => {
    if (!user || advisorSelection.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from("box_role_requests").upsert(
      advisorSelection.map((box_id) => ({
        user_id: user.id,
        box_id,
        request_type: "advisor",
        status: "pending",
      })),
      { onConflict: "user_id,box_id,request_type" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Advisor request sent for admin review.");
    setAdvisorOpen(false);
    setAdvisorSelection([]);
    fetchData();
  };

  const submitManager = async () => {
    if (!user || !managerSelection) return;
    setSaving(true);
    const { error } = await supabase.from("box_role_requests").upsert(
      {
        user_id: user.id,
        box_id: managerSelection,
        request_type: "manager",
        status: "pending",
      },
      { onConflict: "user_id,box_id,request_type" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Management request sent for admin review.");
    setManagerOpen(false);
    setManagerSelection("");
    fetchData();
  };

  const advisorDone = advisorBoxIds.length > 0;
  const managerDone = managedBoxIds.length > 0;
  const progress = Math.round(((advisorDone ? 1 : 0) + (managerDone ? 1 : 0)) / 2 * 100);

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Manage your box</CardTitle>
          <Progress value={0} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Once both responsibilities are confirmed, the card is no longer needed.
  if (advisorDone && managerDone) {
    return null;
  }

  const rows = [
    {
      key: "advisor",
      icon: ShieldCheck,
      title: "Get assigned as advisor to a box",
      description: advisorDone
        ? `Advisor in ${advisorBoxIds.map(boxName).join(", ")}.`
        : "Pick the boxes where your expertise applies. An admin validates the appointment.",
      done: advisorDone,
      pending: pendingAdvisor,
      action: () => {
        setAdvisorSelection(pendingAdvisor);
        setAdvisorOpen(true);
      },
      label: pendingAdvisor.length > 0 ? "Update request" : "Choose boxes",
    },
    {
      key: "manager",
      icon: Boxes,
      title: "Choose one box to manage",
      description: managerDone
        ? `Managing ${managedBoxIds.map(boxName).join(", ")}.`
        : "Select the single box you commit to run end-to-end. One box only.",
      done: managerDone,
      pending: pendingManager,
      action: () => {
        setManagerSelection(pendingManager[0] ?? "");
        setManagerOpen(true);
      },
      label: pendingManager.length > 0 ? "Change box" : "Select box",
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">Manage your box</CardTitle>
            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">{progress}% ready</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your talent is shaped. Next: take responsibility inside the ecosystem — advise boxes and run one.
          </p>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.key}
                className={`group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${
                  row.done
                    ? "bg-b4-teal/5 border-b4-teal/30"
                    : "bg-muted/40 border-border/60 hover:border-b4-teal/40 hover:bg-muted/60"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${
                      row.done ? "bg-b4-teal text-white" : "bg-background border border-border text-muted-foreground"
                    }`}
                  >
                    {row.done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base flex items-center gap-2 flex-wrap">
                      {row.title}
                      {!row.done && row.pending.length > 0 && (
                        <Badge variant="outline" className="gap-1 text-[11px]">
                          <Clock className="w-3 h-3" /> Pending review
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground break-words">{row.description}</div>
                    {!row.done && row.pending.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Requested: {row.pending.map(boxName).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {!row.done && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={row.action}
                    className="w-full sm:w-auto sm:min-w-[130px] flex-shrink-0"
                  >
                    {row.label}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose the boxes you want to advise</DialogTitle>
            <DialogDescription>
              Select one or more boxes. An admin reviews your readiness before the appointment is confirmed.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {boxes.map((box) => (
              <label
                key={box.id}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={advisorSelection.includes(box.id)}
                  onCheckedChange={(checked) =>
                    setAdvisorSelection((prev) =>
                      checked ? [...prev, box.id] : prev.filter((id) => id !== box.id),
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{box.name}</span>
                  {box.domain && <span className="block text-xs text-muted-foreground">{box.domain}</span>}
                </span>
              </label>
            ))}
            {boxes.length === 0 && <p className="text-sm text-muted-foreground">No boxes available yet.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdvisorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAdvisor} disabled={saving || advisorSelection.length === 0}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose the box you want to manage</DialogTitle>
            <DialogDescription>One box only. Admins confirm the assignment.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={managerSelection} onValueChange={setManagerSelection} className="max-h-72 overflow-y-auto space-y-2">
            {boxes.map((box) => (
              <Label
                key={box.id}
                htmlFor={`manage-${box.id}`}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <RadioGroupItem value={box.id} id={`manage-${box.id}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{box.name}</span>
                  {box.domain && <span className="block text-xs text-muted-foreground">{box.domain}</span>}
                </span>
              </Label>
            ))}
            {boxes.length === 0 && <p className="text-sm text-muted-foreground">No boxes available yet.</p>}
          </RadioGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManagerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitManager} disabled={saving || !managerSelection}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

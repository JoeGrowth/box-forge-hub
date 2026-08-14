import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Target, CalendarClock, PlayCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  type Commitment,
  type CommitmentCheckpoint,
  listMyCommitments,
  listCheckpointsFor,
  startCommitment,
  completeCommitment,
  cancelCommitment,
  resetCommitment,
  addCheckpoint,
  createCommitment,
} from "@/lib/commitments";
import { CommitmentCard } from "./CommitmentCard";

const ACTIVE: Commitment["status"][] = ["pending", "active"];

const SUGGESTIONS = [
  "Complete 12 customer interviews",
  "Ship 3 blog posts",
  "Run 10 sales calls",
  "Close 5 deliverables end-to-end",
  "Build and publish a landing page",
];

export function CommitmentsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Commitment[]>([]);
  const [checkpoints, setCheckpoints] = useState<CommitmentCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [checkpointTarget, setCheckpointTarget] = useState<Commitment | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [cpLabel, setCpLabel] = useState("");
  const [cpNote, setCpNote] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const data = await listMyCommitments();
      setItems(data);
      const cps = await listCheckpointsFor(data.map((d) => d.id));
      setCheckpoints(cps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  const open = useMemo(() => items.filter((i) => ACTIVE.includes(i.status)), [items]);
  const closed = useMemo(() => items.filter((i) => !ACTIVE.includes(i.status)), [items]);

  const checkpointsByCommitment = useMemo(() => {
    const m = new Map<string, CommitmentCheckpoint[]>();
    for (const c of checkpoints) {
      const arr = m.get(c.commitment_id) ?? [];
      arr.push(c);
      m.set(c.commitment_id, arr);
    }
    return m;
  }, [checkpoints]);

  const stats = useMemo(() => {
    const active = open.filter((c) => c.status === "active");
    const today = new Date().toDateString();
    const dueToday = active.filter((c) => c.due_at && new Date(c.due_at).toDateString() === today).length;
    const dueSoon = active.filter((c) => {
      if (!c.due_at) return false;
      const days = Math.ceil((new Date(c.due_at).getTime() - Date.now()) / 86400000);
      return days <= 3 && days > 0;
    }).length;
    return { activeCount: active.length, dueToday, dueSoon };
  }, [open]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      await createCommitment({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        created_from: "self",
      });
      setNewTitle("");
      setNewDesc("");
      setCreateOpen(false);
      toast.success("Commitment created");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create");
    }
  }

  async function handleStart(id: string) {
    try {
      await startCommitment(id);
      toast.success("Commitment started");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function handleComplete(id: string) {
    try {
      await completeCommitment(id);
      toast.success("Commitment completed");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function handleCancel(id: string) {
    try {
      await cancelCommitment(id);
      toast.success("Commitment cancelled");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function handleRecover(id: string) {
    try {
      await resetCommitment(id);
      toast.success("Commitment reset");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function handleCheckpointSubmit() {
    if (!checkpointTarget || !user || !cpLabel.trim()) return;
    const started = checkpointTarget.started_at
      ? new Date(checkpointTarget.started_at).getTime()
      : Date.now();
    const dayOffset = Math.max(1, Math.ceil((Date.now() - started) / 86400000));
    try {
      await addCheckpoint({
        commitment_id: checkpointTarget.id,
        owner_id: user.id,
        day_offset: dayOffset,
        label: cpLabel.trim(),
        note: cpNote.trim() || undefined,
      });
      setCheckpointTarget(null);
      setCpLabel("");
      setCpNote("");
      toast.success("Checkpoint logged");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Target className="w-5 h-5 flex-shrink-0 text-b4-teal" />
            Your commitments
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Words become weight when you put a date on them. 14 days. Public to your future self.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && open.length > 0 && (
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5" />
                {stats.activeCount} active
              </span>
              {stats.dueToday > 0 && (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {stats.dueToday} due today
                </span>
              )}
              {stats.dueToday === 0 && stats.dueSoon > 0 && (
                <span className="flex items-center gap-1 text-b4-coral font-medium">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {stats.dueSoon} due soon
                </span>
              )}
            </div>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto flex-shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : open.length === 0 && closed.length === 0 ? (
          <div className="text-center border border-dashed border-border rounded-xl p-8 bg-muted/30">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-b4-teal/10 mb-4">
              <Target className="w-6 h-6 text-b4-teal" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Make your first commitment</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Pick one outcome. Give it 14 days. Log checkpoints to build momentum and prove it to
              your future self.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewTitle(s);
                    setCreateOpen(true);
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <div className="space-y-3">
                {open.map((c) => (
                  <CommitmentCard
                    key={c.id}
                    commitment={c}
                    checkpoints={checkpointsByCommitment.get(c.id) ?? []}
                    onStart={handleStart}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    onRecover={handleRecover}
                    onCheckpoint={(cm) => {
                      setCheckpointTarget(cm);
                      setCpLabel("");
                      setCpNote("");
                    }}
                  />
                ))}
              </div>
            )}
            {open.length === 0 && closed.length > 0 && (
              <p className="text-sm text-muted-foreground">
                No active commitments. Pick a new one or restart a past commitment.
              </p>
            )}
            {closed.length > 0 && (
              <details className="pt-2 group">
                <summary className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <span>History ({closed.length})</span>
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="space-y-3 mt-3">
                  {closed.map((c) => (
                    <CommitmentCard
                      key={c.id}
                      commitment={c}
                      checkpoints={checkpointsByCommitment.get(c.id) ?? []}
                      onRecover={handleRecover}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New 14-day commitment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ct">Title</Label>
              <Input
                id="ct"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Complete 12 customer interviews"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd">What does done look like?</Label>
              <Textarea
                id="cd"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                placeholder="Describe the measurable outcome you will hit in 14 days."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quick start</Label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    size="sm"
                    onClick={() => setNewTitle(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkpointTarget} onOpenChange={(o) => !o && setCheckpointTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log checkpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cpl">What did you accomplish?</Label>
              <Input
                id="cpl"
                value={cpLabel}
                onChange={(e) => setCpLabel(e.target.value)}
                placeholder="Day 7 — interviewed 6 users"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpn">Evidence or notes (optional)</Label>
              <Textarea
                id="cpn"
                value={cpNote}
                onChange={(e) => setCpNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckpointTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleCheckpointSubmit}>Log checkpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

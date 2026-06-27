import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  type Commitment,
  type CommitmentCheckpoint,
  listMyCommitments,
  listCheckpointsFor,
  startCommitment,
  completeCommitment,
  addCheckpoint,
  createCommitment,
} from "@/lib/commitments";
import { CommitmentCard } from "./CommitmentCard";

const ACTIVE: Commitment["status"][] = ["pending", "active"];

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
      const cps = await listCheckpointsFor(data.map(d => d.id));
      setCheckpoints(cps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) refresh(); }, [user]);

  const open = useMemo(() => items.filter(i => ACTIVE.includes(i.status)), [items]);
  const closed = useMemo(() => items.filter(i => !ACTIVE.includes(i.status)), [items]);

  const checkpointsByCommitment = useMemo(() => {
    const m = new Map<string, CommitmentCheckpoint[]>();
    for (const c of checkpoints) {
      const arr = m.get(c.commitment_id) ?? [];
      arr.push(c);
      m.set(c.commitment_id, arr);
    }
    return m;
  }, [checkpoints]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      await createCommitment({ title: newTitle.trim(), description: newDesc.trim() || undefined, created_from: "self" });
      setNewTitle(""); setNewDesc(""); setCreateOpen(false);
      toast.success("Commitment created");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create");
    }
  }

  async function handleStart(id: string) {
    try { await startCommitment(id); toast.success("Commitment started"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function handleComplete(id: string) {
    try { await completeCommitment(id); toast.success("Commitment completed"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function handleCheckpointSubmit() {
    if (!checkpointTarget || !user || !cpLabel.trim()) return;
    const started = checkpointTarget.started_at ? new Date(checkpointTarget.started_at).getTime() : Date.now();
    const dayOffset = Math.max(1, Math.ceil((Date.now() - started) / 86400000));
    try {
      await addCheckpoint({
        commitment_id: checkpointTarget.id,
        owner_id: user.id,
        day_offset: dayOffset,
        label: cpLabel.trim(),
        note: cpNote.trim() || undefined,
      });
      setCheckpointTarget(null); setCpLabel(""); setCpNote("");
      toast.success("Checkpoint logged");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Your commitments</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Words become weight when you put a date on them. 14 days. Public to your future self.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> New commitment</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : open.length === 0 && closed.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
            No commitments yet. Pick one outcome. Give it 14 days. Make progress impossible to ignore.
          </div>
        ) : (
          <>
            {open.map(c => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                checkpoints={checkpointsByCommitment.get(c.id) ?? []}
                onStart={handleStart}
                onComplete={handleComplete}
                onCheckpoint={(cm) => { setCheckpointTarget(cm); setCpLabel(""); setCpNote(""); }}
              />
            ))}
            {closed.length > 0 && (
              <details className="pt-2">
                <summary className="text-xs uppercase tracking-wide text-muted-foreground cursor-pointer">
                  History ({closed.length})
                </summary>
                <div className="space-y-3 mt-3">
                  {closed.map(c => (
                    <CommitmentCard
                      key={c.id}
                      commitment={c}
                      checkpoints={checkpointsByCommitment.get(c.id) ?? []}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New 14-day commitment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct">Title</Label>
              <Input id="ct" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Complete 12 customer interviews" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd">What does done look like?</Label>
              <Textarea id="cd" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkpointTarget} onOpenChange={(o) => !o && setCheckpointTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log checkpoint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cpl">What did you accomplish?</Label>
              <Input id="cpl" value={cpLabel} onChange={e => setCpLabel(e.target.value)} placeholder="Day 7 — interviewed 6 users" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpn">Evidence or notes (optional)</Label>
              <Textarea id="cpn" value={cpNote} onChange={e => setCpNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckpointTarget(null)}>Cancel</Button>
            <Button onClick={handleCheckpointSubmit}>Log checkpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

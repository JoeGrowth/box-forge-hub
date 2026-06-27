import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users } from "lucide-react";
import { createBoxRequest, rankAdvisors, transitionRequest, BoxRequestType } from "@/lib/boxRequests";

interface Box { id: string; slug: string; name: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: BoxRequestType;
  defaultTopic?: string;
  defaultBoxId?: string | null;
  subjectEntityType?: string | null;
  subjectEntityId?: string | null;
  /** "auto" assigns the top ranked advisor; "select" lets requester pick */
  assignmentPolicy?: "auto" | "select";
  onCreated?: (requestId: string) => void;
}

const TYPE_LABELS: Record<BoxRequestType, string> = {
  solution_signoff: "Solution sign-off",
  mentorship: "Mentorship",
  dispute: "Dispute",
  partnership: "Partnership",
  hiring: "Hiring",
  fundraising: "Fundraising",
  technical_review: "Technical review",
};

export function RequestAdvisorDrawer({
  open,
  onOpenChange,
  defaultType = "mentorship",
  defaultTopic = "",
  defaultBoxId = null,
  subjectEntityType = null,
  subjectEntityId = null,
  assignmentPolicy = "select",
  onCreated,
}: Props) {
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [type, setType] = useState<BoxRequestType>(defaultType);
  const [topic, setTopic] = useState(defaultTopic);
  const [context, setContext] = useState("");
  const [boxId, setBoxId] = useState<string | null>(defaultBoxId);
  const [submitting, setSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<Awaited<ReturnType<typeof rankAdvisors>>>([]);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setTopic(defaultTopic);
    setContext("");
    setBoxId(defaultBoxId);
    setCandidates([]);
    setCreatedRequestId(null);
    (async () => {
      const { data } = await (supabase as any).from("boxes").select("id,slug,name").order("name");
      setBoxes((data as Box[]) ?? []);
    })();
  }, [open, defaultType, defaultTopic, defaultBoxId]);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast({ title: "Add a topic", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const req = await createBoxRequest({
        request_type: type,
        topic: topic.trim(),
        context: context.trim() || undefined,
        box_id: boxId,
        subject_entity_type: subjectEntityType,
        subject_entity_id: subjectEntityId,
      });
      setCreatedRequestId(req.id);

      const ranked = await rankAdvisors(req.id, 5);
      setCandidates(ranked);

      if (assignmentPolicy === "auto" && ranked[0]) {
        await transitionRequest(req.id, "matched", ranked[0].advisor_id, { reason: "auto_top_match" });
        toast({ title: "Advisor matched", description: "We'll notify you when they respond." });
        onCreated?.(req.id);
        onOpenChange(false);
      } else if (ranked.length === 0) {
        toast({
          title: "No advisor available yet",
          description: "Your request is in the queue. An admin will route it.",
        });
        onCreated?.(req.id);
      }
    } catch (e: any) {
      toast({ title: "Could not send request", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePick = async (advisorId: string) => {
    if (!createdRequestId) return;
    setPicking(true);
    try {
      await transitionRequest(createdRequestId, "matched", advisorId, { reason: "requester_pick" });
      toast({ title: "Advisor matched" });
      onCreated?.(createdRequestId);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not assign", description: e.message, variant: "destructive" });
    } finally {
      setPicking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-b4-teal" /> Request an advisor
          </DialogTitle>
          <DialogDescription>
            Tell us what you need. We'll rank eligible advisors by domain, capacity, reputation and response time.
          </DialogDescription>
        </DialogHeader>

        {!createdRequestId ? (
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as BoxRequestType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as BoxRequestType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Box (ecosystem)</Label>
              <Select value={boxId ?? "none"} onValueChange={(v) => setBoxId(v === "none" ? null : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a box (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific box</SelectItem>
                  {boxes.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="One line. What is this about?" className="mt-1" />
            </div>
            <div>
              <Label>Context</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="What have you tried? What decision are you facing?"
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} variant="teal">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find advisor"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Top {candidates.length} eligible advisor{candidates.length === 1 ? "" : "s"} for your request.
            </p>
            {candidates.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No eligible advisor available right now. Your request is queued; an admin will route it.
              </div>
            ) : (
              <ul className="space-y-2">
                {candidates.map((c, i) => (
                  <li key={c.advisor_id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">#{i + 1} · Match {Math.round(Number(c.match_score))}</div>
                      <div className="text-xs text-muted-foreground">
                        Load {c.current_load}/{c.capacity} · Rep {Number(c.reputation_score).toFixed(1)}
                        {c.median_response_seconds != null
                          ? ` · ~${Math.round(c.median_response_seconds / 60)}m response`
                          : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="teal" disabled={picking} onClick={() => handlePick(c.advisor_id)}>
                      Pick
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

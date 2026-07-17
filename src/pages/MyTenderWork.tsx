// Contractor view — tenders they've been accepted for, with deliverable upload.
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, Clock, XCircle, DollarSign, RefreshCw, ExternalLink } from "lucide-react";

type Interaction = {
  id: string;
  opportunity_id: string;
  status: string;
  message: string | null;
  created_at: string;
};
type TenderRow = { id: string; title: string; description: string; organization_id: string | null };
type Submission = {
  id: string;
  tender_id: string;
  note: string | null;
  file_path: string | null;
  file_name: string | null;
  link_url: string | null;
  status: string;
  reviewer_notes: string | null;
  paid_at: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; icon: any; className: string }> = {
  submitted: { label: "Under review", icon: Clock, className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  changes_requested: { label: "Changes requested", icon: RefreshCw, className: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  paid: { label: "Paid", icon: DollarSign, className: "bg-primary/10 text-primary border-primary/30" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function MyTenderWork() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tenders, setTenders] = useState<Record<string, TenderRow>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: ints } = await supabase
      .from("opportunity_interactions")
      .select("id, opportunity_id, status, message, created_at")
      .eq("user_id", user.id)
      .in("status", ["accepted", "refused"])
      .order("created_at", { ascending: false });
    const rows = (ints as Interaction[]) ?? [];
    setInteractions(rows);

    const ids = [...new Set(rows.map((r) => r.opportunity_id))];
    if (ids.length) {
      const { data: ts } = await supabase.from("tenders").select("id, title, description, organization_id").in("id", ids);
      const map: Record<string, TenderRow> = {};
      for (const t of (ts as TenderRow[]) ?? []) map[t.id] = t;
      setTenders(map);

      const { data: subs } = await supabase
        .from("tender_submissions")
        .select("*")
        .eq("user_id", user.id)
        .in("tender_id", ids)
        .order("created_at", { ascending: false });
      const sMap: Record<string, Submission[]> = {};
      for (const s of (subs as Submission[]) ?? []) {
        (sMap[s.tender_id] ??= []).push(s);
      }
      setSubmissions(sMap);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) return <div className="p-8">Please sign in.</div>;

  const accepted = interactions.filter((i) => i.status === "accepted");
  const refused = interactions.filter((i) => i.status === "refused");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My tender work</h1>
        <p className="text-sm text-muted-foreground">Deliverables for tenders you've been accepted on.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold">Accepted ({accepted.length})</h2>
            {accepted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accepted tenders yet.</p>
            ) : accepted.map((i) => {
              const t = tenders[i.opportunity_id];
              return t ? (
                <TenderWorkCard
                  key={i.id}
                  tender={t}
                  submissions={submissions[t.id] ?? []}
                  userId={user.id}
                  onChange={load}
                />
              ) : null;
            })}
          </section>

          {refused.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-muted-foreground">Refused ({refused.length})</h2>
              {refused.map((i) => {
                const t = tenders[i.opportunity_id];
                return t ? (
                  <div key={i.id} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="font-medium">{t.title}</div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  </div>
                ) : null;
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TenderWorkCard({
  tender, submissions, userId, onChange,
}: { tender: TenderRow; submissions: Submission[]; userId: string; onChange: () => void }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const latest = submissions[0];
  const canSubmit = !latest || latest.status === "changes_requested";

  const submit = async () => {
    if (!note.trim() && !file) {
      toast({ title: "Add a note or file", variant: "destructive" });
      return;
    }
    setSaving(true);
    let file_path: string | null = null;
    let file_name: string | null = null;
    if (file) {
      const path = `${tender.id}/${userId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("tender-submissions").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      file_path = path;
      file_name = file.name;
    }
    const { error } = await supabase.from("tender_submissions").insert({
      tender_id: tender.id, user_id: userId, note: note.trim() || null, file_path, file_name, status: "submitted",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deliverable submitted" });
    setNote(""); setFile(null);
    onChange();
  };

  const download = async (s: Submission) => {
    if (!s.file_path) return;
    const { data, error } = await supabase.storage.from("tender-submissions").createSignedUrl(s.file_path, 60);
    if (error || !data) { toast({ title: "Download failed", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{tender.title}</div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{tender.description}</p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30" variant="outline">Accepted</Badge>
      </div>

      {submissions.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">History</div>
          {submissions.map((s) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.submitted;
            const Icon = meta.icon;
            return (
              <div key={s.id} className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={meta.className}><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                  {s.paid_at && <span className="text-xs text-primary">· Paid {new Date(s.paid_at).toLocaleDateString()}</span>}
                </div>
                {s.note && <p className="text-muted-foreground">{s.note}</p>}
                {s.file_name && (
                  <Button size="sm" variant="ghost" onClick={() => download(s)}>
                    <FileText className="w-3 h-3 mr-1" /> {s.file_name}
                  </Button>
                )}
                {s.reviewer_notes && (
                  <div className="rounded-md bg-muted/50 p-2 text-xs">
                    <span className="font-medium">Reviewer:</span> {s.reviewer_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canSubmit ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {latest?.status === "changes_requested" ? "Resubmit deliverable" : "Submit deliverable"}
          </Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Describe what you're delivering…" />
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button size="sm" onClick={submit} disabled={saving}>
            <Upload className="w-3 h-3 mr-1" /> {saving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      ) : latest?.status === "approved" ? (
        <p className="text-sm text-emerald-700">Approved — awaiting payment confirmation.</p>
      ) : latest?.status === "paid" ? (
        <p className="text-sm text-primary">Payment confirmed. Thank you.</p>
      ) : null}
    </div>
  );
}

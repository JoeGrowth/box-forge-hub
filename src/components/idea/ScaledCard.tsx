import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, UserPlus, Search, Loader2, Send, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ScaledCardProps {
  userId: string;
  title: string;
  tagline: string;
}

interface ProfileMatch {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_skills: string | null;
}

export function ScaledCard({ userId, title, tagline }: ScaledCardProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
      <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground break-words">{title}</h3>
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">Scaled</Badge>
            <Badge variant="outline" className="text-[10px]">Private · not listed in ecosystem</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{tagline}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" /> Invite Co-Builder
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        currentUserId={userId}
        entityLabel={title}
      />
      <MissionHistoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={userId}
      />
    </div>
  );
}

interface Mission {
  id: string;
  title: string;
  client_name: string | null;
  offer_date: string | null;
  number_of_days: number | null;
  amount_per_day: number | null;
  total_amount: number | null;
  currency: string;
  paid_amount: number | null;
  paid_at: string | null;
}

function MissionHistoryDialog({
  open, onOpenChange, userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Mission>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultant_opportunities")
        .select("id,title,client_name,offer_date,number_of_days,amount_per_day,total_amount,currency,paid_amount,paid_at")
        .eq("user_id", userId)
        .eq("stage", "closed")
        .order("offer_date", { ascending: false, nullsFirst: false });
      if (!error) setMissions((data as Mission[]) || []);
      setLoading(false);
    })();
  }, [open, userId]);

  const startEdit = (m: Mission) => {
    setEditingId(m.id);
    setDraft({
      client_name: m.client_name,
      offer_date: m.offer_date,
      number_of_days: m.number_of_days,
      amount_per_day: m.amount_per_day,
      currency: m.currency,
      paid_amount: m.paid_amount,
      paid_at: m.paid_at,
    });
  };

  const cancelEdit = () => { setEditingId(null); setDraft({}); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      client_name: draft.client_name ?? null,
      offer_date: draft.offer_date || null,
      number_of_days: draft.number_of_days ?? null,
      amount_per_day: draft.amount_per_day ?? null,
      currency: draft.currency || "TND",
      paid_amount: draft.paid_amount ?? null,
      paid_at: draft.paid_at || null,
    };
    const { error } = await supabase
      .from("consultant_opportunities")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mission updated");
    setMissions((prev) => prev.map((m) => m.id === id ? {
      ...m,
      ...payload,
      total_amount: (Number(payload.number_of_days) || 0) * (Number(payload.amount_per_day) || 0),
    } as Mission : m));
    cancelEdit();
  };

  const totalRevenue = missions.reduce((s, m) => s + Number(m.total_amount || 0), 0);
  const totalPaid = missions.reduce((s, m) => s + Number(m.paid_amount || 0), 0);
  const currency = missions[0]?.currency || "TND";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Mission History — Accounting
          </DialogTitle>
          <DialogDescription>
            The closed consulting missions that qualified you for Talent Monetized. Edit accounting details inline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 border-y border-border py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Missions closed</p>
            <p className="text-lg font-bold text-foreground">{missions.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total billed</p>
            <p className="text-lg font-bold text-foreground">{totalRevenue.toLocaleString()} {currency}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total paid</p>
            <p className="text-lg font-bold text-emerald-600">{totalPaid.toLocaleString()} {currency}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading missions…
            </div>
          ) : missions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No closed missions yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-medium py-2 px-2">Mission / Client</th>
                  <th className="text-left font-medium py-2 px-2">Date</th>
                  <th className="text-right font-medium py-2 px-2">Days</th>
                  <th className="text-right font-medium py-2 px-2">Rate</th>
                  <th className="text-right font-medium py-2 px-2">Total</th>
                  <th className="text-right font-medium py-2 px-2">Paid</th>
                  <th className="text-right font-medium py-2 px-2">Paid on</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => {
                  const isEditing = editingId === m.id;
                  return (
                    <tr key={m.id} className="border-b border-border/50 align-top">
                      <td className="py-2 px-2">
                        <div className="font-medium text-foreground">{m.title}</div>
                        {isEditing ? (
                          <Input
                            value={draft.client_name ?? ""}
                            onChange={(e) => setDraft({ ...draft, client_name: e.target.value })}
                            placeholder="Client"
                            className="h-7 text-xs mt-1"
                          />
                        ) : (
                          <div className="text-muted-foreground">{m.client_name || "—"}</div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <Input type="date" value={draft.offer_date ?? ""} onChange={(e) => setDraft({ ...draft, offer_date: e.target.value })} className="h-7 text-xs" />
                        ) : (m.offer_date || "—")}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {isEditing ? (
                          <Input type="number" value={draft.number_of_days ?? ""} onChange={(e) => setDraft({ ...draft, number_of_days: Number(e.target.value) })} className="h-7 text-xs w-16 ml-auto text-right" />
                        ) : (m.number_of_days ?? "—")}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {isEditing ? (
                          <Input type="number" step="0.01" value={draft.amount_per_day ?? ""} onChange={(e) => setDraft({ ...draft, amount_per_day: Number(e.target.value) })} className="h-7 text-xs w-24 ml-auto text-right" />
                        ) : (`${Number(m.amount_per_day || 0).toLocaleString()}`)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">{Number(m.total_amount || 0).toLocaleString()} {m.currency}</td>
                      <td className="py-2 px-2 text-right">
                        {isEditing ? (
                          <Input type="number" step="0.01" value={draft.paid_amount ?? ""} onChange={(e) => setDraft({ ...draft, paid_amount: Number(e.target.value) })} className="h-7 text-xs w-24 ml-auto text-right" />
                        ) : (`${Number(m.paid_amount || 0).toLocaleString()}`)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {isEditing ? (
                          <Input type="date" value={(draft.paid_at ?? "").toString().slice(0,10)} onChange={(e) => setDraft({ ...draft, paid_at: e.target.value })} className="h-7 text-xs" />
                        ) : (m.paid_at ? m.paid_at.slice(0,10) : "—")}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(m.id)} disabled={saving}>
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(m)}><Pencil className="w-3 h-3" /></Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  open, onOpenChange, currentUserId, entityLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  entityLabel: string;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, primary_skills")
        .ilike("full_name", `%${query.trim()}%`)
        .neq("user_id", currentUserId)
        .limit(10);
      setResults((data as ProfileMatch[]) || []);
      setSearching(false);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, currentUserId]);

  const handleInvite = async (target: ProfileMatch) => {
    setInviting(target.user_id);
    try {
      const { data: existing } = await supabase
        .from("direct_conversations")
        .select("id")
        .or(`and(participant_one_id.eq.${currentUserId},participant_two_id.eq.${target.user_id}),and(participant_one_id.eq.${target.user_id},participant_two_id.eq.${currentUserId})`)
        .maybeSingle();

      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase
          .from("direct_conversations")
          .insert({ participant_one_id: currentUserId, participant_two_id: target.user_id })
          .select("id")
          .single();
        if (error) throw error;
        convId = created.id;
      }

      const message = `Hi ${target.full_name || "there"} — I'm inviting you to co-build with me on my scaled entity "${entityLabel}". Interested in exploring a role together?`;
      const { error: msgErr } = await supabase.from("direct_messages").insert({
        conversation_id: convId,
        sender_id: currentUserId,
        content: message,
      });
      if (msgErr) throw msgErr;

      toast.success(`Invitation sent to ${target.full_name || "co-builder"}`);
      onOpenChange(false);
      navigate(`/messages/${convId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite a Co-Builder
          </DialogTitle>
          <DialogDescription>
            Search by name and send a direct invitation to co-build on your scaled entity.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search profiles by name…"
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-2 px-2">
          {searching && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…
            </div>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No profiles found.</p>
          )}
          {!searching && results.map((r) => (
            <div key={r.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar className="w-9 h-9">
                {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                <AvatarFallback>{(r.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.full_name || "Unnamed"}</p>
                {r.primary_skills && (
                  <p className="text-xs text-muted-foreground truncate">{r.primary_skills}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={inviting === r.user_id}
                onClick={() => handleInvite(r)}
              >
                {inviting === r.user_id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <><Send className="w-3.5 h-3.5 mr-1" /> Invite</>
                )}
              </Button>
            </div>
          ))}
          {query.trim().length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Type at least 2 characters to search.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

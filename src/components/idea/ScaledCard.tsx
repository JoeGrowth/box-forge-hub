import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, UserPlus, Search, Loader2, Send } from "lucide-react";
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
          </div>
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        currentUserId={userId}
        entityLabel={title}
      />
    </div>
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

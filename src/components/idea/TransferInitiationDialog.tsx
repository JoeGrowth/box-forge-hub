import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserCheck } from "lucide-react";

interface Initiator {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  professional_title: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: { id: string; title: string } | null;
  onTransferred: () => void;
}

export const TransferInitiationDialog = ({ open, onOpenChange, idea, onTransferred }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [initiators, setInitiators] = useState<Initiator[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setQuery("");
      return;
    }
    const load = async () => {
      setLoading(true);
      const [{ data: certs }, { data: ideas }] = await Promise.all([
        supabase.from("user_certifications").select("user_id").eq("certification_type", "initiator_b4"),
        supabase.from("startup_ideas").select("creator_id"),
      ]);
      const idSet = new Set<string>();
      (certs || []).forEach((c) => c.user_id && idSet.add(c.user_id));
      (ideas || []).forEach((i) => i.creator_id && idSet.add(i.creator_id));
      if (user?.id) idSet.delete(user.id);
      const ids = Array.from(idSet);
      if (!ids.length) {
        setInitiators([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, professional_title")
        .in("user_id", ids)
        .eq("is_deleted", false);
      setInitiators(profiles || []);
      setLoading(false);
    };
    load();
  }, [open, user?.id]);

  const filtered = initiators.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.professional_title || "").toLowerCase().includes(q)
    );
  });

  const handleTransfer = async () => {
    if (!idea || !selectedId) return;
    setTransferring(true);
    const { error } = await supabase.rpc("transfer_startup_initiation", {
      _startup_id: idea.id,
      _new_initiator_id: selectedId,
    });
    setTransferring(false);
    if (error) {
      toast({ title: "Transfer failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Initiation transferred",
      description: `"${idea.title}" now belongs to the new initiator. You've become a co-builder.`,
    });
    onOpenChange(false);
    onTransferred();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer initiation</DialogTitle>
          <DialogDescription>
            Hand off "{idea?.title}" to another certified initiator. You'll automatically become a
            co-builder on this idea.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search initiators by name or title"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-72 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {loading ? (
              <div className="p-6 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading initiators...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No other certified initiators found.
              </div>
            ) : (
              filtered.map((p) => {
                const selected = selectedId === p.user_id;
                return (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => setSelectedId(p.user_id)}
                    className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                      selected ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.full_name || "Unnamed initiator"}
                      </p>
                      {p.professional_title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {p.professional_title}
                        </p>
                      )}
                    </div>
                    {selected && <UserCheck className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transferring}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={!selectedId || transferring}>
            {transferring ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Transferring...</>
            ) : (
              "Transfer initiation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

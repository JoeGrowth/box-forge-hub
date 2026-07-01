import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useRequestLink, EntityRoleAssignment } from "@/hooks/useEntityRoleAssignments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment: EntityRoleAssignment | null;
  requiresEquity: boolean;
}

interface Candidate {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function LinkProfileDialog({ open, onOpenChange, assignment, requiresEquity }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [equity, setEquity] = useState<string>(
    assignment?.equity_pct != null ? String(assignment.equity_pct) : "",
  );
  const requestLink = useRequestLink();

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .ilike("full_name", `%${q}%`)
      .limit(10);
    setResults((data ?? []) as Candidate[]);
    setSearching(false);
  };

  const submit = async () => {
    if (!assignment || !selected) return;
    try {
      await requestLink.mutateAsync({
        assignmentId: assignment.id,
        linkedUserId: selected.user_id,
        equityPct: requiresEquity && equity ? Number(equity) : null,
      });
      toast.success("Link requested — awaiting acceptance");
      onOpenChange(false);
      setQuery("");
      setResults([]);
      setSelected(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to request link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link a profile to {assignment?.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Search users by name</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => search(e.target.value)} className="pl-8" placeholder="Name…" />
              {searching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {results.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border divide-y">
              {results.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-3 p-2 text-left hover:bg-muted/60 ${
                    selected?.user_id === c.user_id ? "bg-muted" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback>{(c.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{c.full_name ?? "Unnamed"}</span>
                </button>
              ))}
            </div>
          )}

          {requiresEquity && (
            <div>
              <Label htmlFor="equity" className="text-xs text-muted-foreground">
                Equity % (optional)
              </Label>
              <Input
                id="equity"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                placeholder="e.g. 70"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || requestLink.isPending}>
            {requestLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

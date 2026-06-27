import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RelationshipTimeline } from "./RelationshipTimeline";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Provide one of these. If `originRequestId` is given, the drawer resolves the relationship. */
  relationshipId?: string | null;
  originRequestId?: string | null;
  title?: string;
}

export function RelationshipDrawer({ open, onOpenChange, relationshipId, originRequestId, title }: Props) {
  const [resolvedId, setResolvedId] = useState<string | null>(relationshipId ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    if (relationshipId) { setResolvedId(relationshipId); return; }
    if (!originRequestId) { setResolvedId(null); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("advisor_relationships")
        .select("id")
        .eq("origin_request_id", originRequestId)
        .maybeSingle();
      if (!cancelled) {
        setResolvedId((data as any)?.id ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, relationshipId, originRequestId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title ?? "Relationship"}</SheetTitle>
          <SheetDescription>The canonical record of this collaboration.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : resolvedId ? (
            <RelationshipTimeline relationshipId={resolvedId} />
          ) : (
            <p className="text-sm text-muted-foreground">No relationship has been formed yet for this request.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

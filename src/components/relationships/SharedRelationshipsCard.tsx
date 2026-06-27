import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";
import { RelationshipDrawer } from "./RelationshipDrawer";

interface Row {
  id: string;
  advisor_id: string;
  user_id: string;
  relationship_type: string;
  status: string;
  started_at: string;
}

/**
 * Renders any advisor_relationship between the viewer and the profile owner,
 * with an entry point into the canonical relationship drawer.
 */
export function SharedRelationshipsCard({ profileUserId }: { profileUserId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.id === profileUserId) { setRows([]); return; }
    (async () => {
      const { data } = await supabase
        .from("advisor_relationships")
        .select("id, advisor_id, user_id, relationship_type, status, started_at")
        .or(`and(advisor_id.eq.${user.id},user_id.eq.${profileUserId}),and(advisor_id.eq.${profileUserId},user_id.eq.${user.id})`);
      setRows((data as Row[]) ?? []);
    })();
  }, [user?.id, profileUserId]);

  if (!user || rows.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Handshake className="w-4 h-4" /> Your shared history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium capitalize">{r.relationship_type}</span>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Started {new Date(r.started_at).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                Open timeline
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <RelationshipDrawer
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        relationshipId={openId}
        title="Shared relationship"
      />
    </>
  );
}

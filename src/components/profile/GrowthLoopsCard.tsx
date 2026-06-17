import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGrowthLoops, type GrowthLoopRun } from "@/hooks/useGrowthLoops";
import { USE_GROWTH_LOOPS } from "@/lib/featureFlags";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

// Phase 8 surface. Renders the user's active growth loop runs as concrete
// CTAs. The component itself contains no rule logic; every loop, condition
// and copy string lives in the growth_loops table on the backend.

export function GrowthLoopsCard() {
  const { user } = useAuth();
  const { active, engage, convert, dismiss, loading } = useGrowthLoops(user?.id);

  if (!USE_GROWTH_LOOPS || !user) return null;
  if (loading && active.length === 0) return null;
  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Growth Loops</CardTitle>
        <p className="text-sm text-muted-foreground">
          Automated next moves the system selected from your current graph state.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.map((run) => (
          <LoopRow
            key={run.id}
            run={run}
            onEngage={() => engage(run)}
            onConvert={() => convert(run)}
            onDismiss={() => dismiss(run)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function LoopRow({
  run, onEngage, onConvert, onDismiss,
}: {
  run: GrowthLoopRun;
  onEngage: () => void;
  onConvert: () => void;
  onDismiss: () => void;
}) {
  const title = (run.loop?.action_payload?.title as string) ?? run.loop?.description ?? run.loop_key;
  const link = (run.loop?.action_payload?.link as string) ?? "/profile";
  const category = (run.loop?.action_payload?.category as string) ?? "growth";

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase">{category}</Badge>
          <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
        </div>
        <div className="text-sm font-medium">{title}</div>
        {run.loop?.description && (
          <div className="text-xs text-muted-foreground">{run.loop.description}</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" onClick={onEngage}>
          <Link to={link}>Open</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onConvert}>Done</Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}

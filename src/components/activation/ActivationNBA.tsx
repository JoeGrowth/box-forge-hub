// Single Next Best Action card for the Activation Hub.
// Click → emit nba_executed, mark action completed in the projection,
// then call onExecuted so the hub marks activation completed.

import { ArrowRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { NextBestAction } from "@/hooks/useNextBestActions";

interface Props {
  action: NextBestAction | null;
  source: string;
  onExecuted: () => void;
}

export function ActivationNBA({ action, source, onExecuted }: Props) {
  const { user } = useAuth();

  if (!action) {
    return (
      <div className="rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground">
        Take any action above to unlock your next step.
      </div>
    );
  }

  const handleClick = async () => {
    if (!user) return;
    await supabase.from("graph_events").insert({
      user_id: user.id,
      event_type: "nba_executed",
      aggregate_type: "action",
      aggregate_id: action.action_id ?? action.action_type ?? "nba",
      source_module: source,
      payload: { source, action_type: action.action_type } as never,
      idempotency_key: `nba_executed:v1:${user.id}:${action.action_id ?? action.action_type}`,
      weight: 1,
    });
    onExecuted();
  };

  const href = action.cta_href ?? "/dashboard";

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-b4-teal/10 p-2">
          <Target className="w-4 h-4 text-b4-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground">{action.title ?? "Next step"}</div>
          {action.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
          )}
        </div>
        <Button size="sm" asChild>
          <Link to={href} onClick={handleClick}>
            {action.cta_label ?? "Start"} <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

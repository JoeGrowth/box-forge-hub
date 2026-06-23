// Single Next Best Action card for the Activation Hub.
// Click → emit nba_executed, then onExecuted closes activation.

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

  const href =
    typeof action.payload?.link === "string" ? action.payload.link : "/dashboard";
  const label =
    typeof action.payload?.label === "string" ? action.payload.label : "Start";
  const titleText = action.action ?? "Next step";

  const handleClick = async () => {
    if (!user) return;
    const insert = {
      user_id: user.id,
      event_type: "nba_executed" as const,
      aggregate_type: "action",
      aggregate_id: action.rule,
      source_module: source,
      payload: { source, rule: action.rule, action: action.action } as never,
      idempotency_key: `nba_executed:v1:${user.id}:${action.rule}`,
      weight: 1,
    };
    await supabase.from("graph_events").insert(insert);
    onExecuted();
  };

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-b4-teal/10 p-2">
          <Target className="w-4 h-4 text-b4-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground">{titleText}</div>
          {action.target_stage && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Moves you toward: {action.target_stage}
            </p>
          )}
        </div>
        <Button size="sm" asChild>
          <Link to={href} onClick={handleClick}>
            {label} <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

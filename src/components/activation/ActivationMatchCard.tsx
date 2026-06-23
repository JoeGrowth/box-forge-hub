// One card in the Activation Hub. Renders either a personalized match
// (from opportunity_graph) or a fallback "Explore" item. Hierarchy:
// Save (primary) → Express Interest (secondary) → Apply (tertiary text).
//
// Every interaction emits a graph_event tagged with the source so we get a
// clean activation funnel later (zero schema work).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Heart, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";

export type FallbackMatch = {
  opportunityId: string;
  kind: string;
  title: string;
  subtitle: string | null;
  reason: string;
};

export type MatchCardData = {
  kind: "personalized" | "explore";
  opportunityId: string;
  opportunityKind: string;
  title: string;
  subtitle: string | null;
  reason: string;
  matchScore: number | null;
};

interface Props {
  data: MatchCardData;
  source: string;
  onMeaningfulAction: () => void;
}

// Lightweight title resolver for personalized cards (their constructor only
// has IDs — we look the title up here without bloating the recs hook).
async function resolveTitle(id: string, kind: string): Promise<{ title: string; subtitle: string | null } | null> {
  switch (kind) {
    case "job": {
      const { data } = await supabase
        .from("job_opportunities")
        .select("title, company_name")
        .eq("id", id)
        .maybeSingle();
      return data ? { title: data.title ?? "Open role", subtitle: data.company_name ?? null } : null;
    }
    case "training": {
      const { data } = await supabase
        .from("training_opportunities")
        .select("title, provider")
        .eq("id", id)
        .maybeSingle();
      return data ? { title: data.title ?? "Training", subtitle: data.provider ?? null } : null;
    }
    case "startup": {
      const { data } = await supabase
        .from("startup_ideas")
        .select("idea_title")
        .eq("id", id)
        .maybeSingle();
      return data ? { title: data.idea_title ?? "Startup idea", subtitle: null } : null;
    }
    case "consulting": {
      const { data } = await supabase
        .from("consulting_services")
        .select("title")
        .eq("id", id)
        .maybeSingle();
      return data ? { title: data.title ?? "Consulting", subtitle: null } : null;
    }
    default:
      return null;
  }
}

function detailHref(kind: string, id: string): string {
  return `/opportunities/${kind}/${id}`;
}

export function ActivationMatchCard({ data, source, onMeaningfulAction }: Props) {
  const { user } = useAuth();
  const { isSaved, toggle } = useSavedOpportunities(user?.id);
  const [title, setTitle] = useState(data.title);
  const [subtitle, setSubtitle] = useState<string | null>(data.subtitle);
  const [resolving, setResolving] = useState(data.kind === "personalized");
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (data.kind !== "personalized") return;
    let cancelled = false;
    (async () => {
      const r = await resolveTitle(data.opportunityId, data.opportunityKind);
      if (cancelled) return;
      if (r) {
        setTitle(r.title);
        setSubtitle(r.subtitle);
      }
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  async function emit(type: "opportunity_interested" | "opportunity_applied") {
    if (!user) return;
    await supabase.from("graph_events").insert({
      user_id: user.id,
      event_type: type,
      aggregate_type: "opportunity",
      aggregate_id: data.opportunityId,
      source_module: source,
      payload: { source, kind: data.opportunityKind } as never,
      idempotency_key: `${type}:v1:${user.id}:${data.opportunityId}`,
      weight: type === "opportunity_applied" ? 3 : 1,
    });
  }

  const saved = isSaved(data.opportunityId);

  const handleSave = () => {
    setSubmitting("save");
    const nowSaved = toggle(data.opportunityId, data.opportunityKind, source);
    setSubmitting(null);
    if (nowSaved) onMeaningfulAction();
  };

  const handleInterest = async () => {
    setSubmitting("interest");
    await emit("opportunity_interested");
    setSubmitting(null);
    onMeaningfulAction();
  };

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={data.kind === "personalized" ? "default" : "secondary"} className="text-[10px] uppercase">
              {data.kind === "personalized" ? "Matched" : "Explore"}
            </Badge>
            <span className="text-[10px] text-muted-foreground uppercase">{data.opportunityKind}</span>
          </div>
          <Link to={detailHref(data.opportunityKind, data.opportunityId)} className="block">
            <div className="font-semibold text-foreground truncate hover:underline">
              {resolving ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Loading…</span> : title}
            </div>
            {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
          </Link>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{data.reason}</p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={submitting === "save"}
          className="bg-b4-teal hover:bg-b4-teal/90 text-white"
        >
          {saved ? <BookmarkCheck className="w-4 h-4 mr-1" /> : <Bookmark className="w-4 h-4 mr-1" />}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleInterest} disabled={submitting === "interest"}>
          <Heart className="w-4 h-4 mr-1" /> Interested
        </Button>
        <Button asChild size="sm" variant="ghost" className="ml-auto">
          <Link to={detailHref(data.opportunityKind, data.opportunityId)} onClick={() => void emit("opportunity_applied")}>
            View <ArrowUpRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

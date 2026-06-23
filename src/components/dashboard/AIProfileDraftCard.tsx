// AI profile draft card — appears on the dashboard when an AI-generated
// draft exists and the user has not yet accepted, edited-and-saved, or
// dismissed it. Three actions: Accept, Edit, Regenerate (+ subtle Dismiss).
//
// Lifecycle is timestamp-driven, NOT visit-driven:
//   profile_draft_accepted_at  → set by promote_profile_draft RPC
//   profile_draft_dismissed_at → set by Dismiss button
// Either timestamp hides the card permanently; provenance (profile_draft_source)
// is preserved forever.

import { useEffect, useState } from "react";
import { Sparkles, Check, Pencil, RotateCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Draft = {
  draft_title: string | null;
  draft_summary: string | null;
  draft_skills: string[] | null;
  profile_draft_source: string | null;
  profile_draft_accepted_at: string | null;
  profile_draft_dismissed_at: string | null;
};

export function AIProfileDraftCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select(
        "draft_title, draft_summary, draft_skills, profile_draft_source, profile_draft_accepted_at, profile_draft_dismissed_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    setDraft((data as Draft | null) ?? null);
    if (data) {
      setTitle(data.draft_title ?? "");
      setSummary(data.draft_summary ?? "");
      setSkills((data.draft_skills ?? []).join(", "));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !draft) return null;
  if (
    draft.profile_draft_source !== "ai_v1" ||
    draft.profile_draft_accepted_at ||
    draft.profile_draft_dismissed_at ||
    !draft.draft_title
  )
    return null;

  const accept = async (overrides?: { title?: string; summary?: string; skills?: string[] }) => {
    setBusy("accept");
    const { error } = await supabase.rpc("promote_profile_draft", {
      _title: overrides?.title ?? null,
      _summary: overrides?.summary ?? null,
      _skills: overrides?.skills ?? null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    setEditing(false);
    await load();
  };

  const regenerate = async () => {
    setBusy("regen");
    const { error } = await supabase.functions.invoke("draft-profile", { body: { force: true } });
    setBusy(null);
    if (error) {
      toast({ title: "Regenerate failed", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  const dismiss = async () => {
    setBusy("dismiss");
    await supabase
      .from("profiles")
      .update({ profile_draft_dismissed_at: new Date().toISOString() })
      .eq("user_id", user!.id);
    setBusy(null);
    await load();
  };

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-b4-teal/10 p-2">
            <Sparkles className="w-4 h-4 text-b4-teal" />
          </div>
          <div>
            <div className="font-semibold text-foreground">We drafted your profile</div>
            <div className="text-xs text-muted-foreground">
              Generated from your onboarding answers. Accept, edit, or regenerate.
            </div>
          </div>
        </div>
        <button
          aria-label="Dismiss"
          onClick={dismiss}
          disabled={busy === "dismiss"}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!editing ? (
        <div className="space-y-2 mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Title</div>
            <div className="text-sm font-medium text-foreground">{draft.draft_title}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Summary</div>
            <div className="text-sm text-foreground">{draft.draft_summary}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Skills</div>
            <div className="flex flex-wrap gap-1">
              {(draft.draft_skills ?? []).map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Title</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Summary</div>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Skills (comma-separated)</div>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!editing ? (
          <>
            <Button
              size="sm"
              onClick={() => accept()}
              disabled={busy !== null}
              className="bg-b4-teal hover:bg-b4-teal/90 text-white"
            >
              {busy === "accept" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy !== null}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={regenerate} disabled={busy !== null}>
              {busy === "regen" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCw className="w-3 h-3 mr-1" />}
              Regenerate
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() =>
                accept({
                  title: title.trim() || undefined,
                  summary: summary.trim() || undefined,
                  skills: skills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              disabled={busy !== null}
              className="bg-b4-teal hover:bg-b4-teal/90 text-white"
            >
              {busy === "accept" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy !== null}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

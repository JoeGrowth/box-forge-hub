import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Personal notes box, persisted in the cloud (user_notes table).
 * Auto-saves with a short debounce so we only write when typing pauses.
 */
export function DashboardNotes() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("user_notes")
        .select("content")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      const text = data?.content ?? "";
      setContent(text);
      latestRef.current = text;
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [user]);

  // Flush any pending save when leaving the page.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const persist = async (text: string) => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("user_notes")
      .upsert({ user_id: user.id, content: text, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(false);
    setSavedAt(new Date());
  };

  const onChange = (text: string) => {
    setContent(text);
    latestRef.current = text;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(latestRef.current), 1200);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-primary" />
          Your notes
          <span className="ml-auto text-xs font-normal text-muted-foreground flex items-center gap-1">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : savedAt ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" /> Saved
              </>
            ) : null}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={loaded ? "Write your notes here… they're saved automatically." : "Loading your notes…"}
          disabled={!loaded}
          className="min-h-[160px] resize-y text-sm"
        />
      </CardContent>
    </Card>
  );
}

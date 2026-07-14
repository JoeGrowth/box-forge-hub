import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface DomainSuggestion {
  name: string;
  match: number;
  why: string;
  problems_solved: string[];
  careers: string[];
  businesses: string[];
}

interface SuggestionResult {
  primary_natural_role?: string;
  supporting_expressions?: string[];
  cognitive_function?: string;
  core_question?: string;
  recommended_domains?: DomainSuggestion[];
  transferability?: { other_domains?: string[]; reason?: string };
  business_models?: { domain: string; problem: string; solution: string; path: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  naturalRole: string | null;
  currentTitle?: string | null;
  primarySkills?: string | null;
  onApply?: (domain: string) => void;
}

export function SuggestDomainDialog({ open, onOpenChange, naturalRole, currentTitle, primarySkills, onApply }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const storageKey = user ? `suggest-domains:${user.id}` : "suggest-domains:anon";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.result) setResult(parsed.result);
        if (parsed?.savedAt) setSavedAt(parsed.savedAt);
      }
    } catch {}
  }, [open, storageKey]);

  const saveResult = () => {
    if (!result) return;
    const ts = new Date().toISOString();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ result, savedAt: ts }));
      setSavedAt(ts);
      toast({ title: "Saved", description: "Your recommendations are saved. Reopen this dialog to review them." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || "Could not save locally.", variant: "destructive" });
    }
  };

  const run = async () => {
    if (!naturalRole) {
      toast({ title: "Natural Role required", description: "Decode your Natural Role first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-domains", {
        body: { naturalRole, currentTitle, primarySkills },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as SuggestionResult);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to generate", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const apply = async (domain: string) => {
    if (!user) return;
    setSaving(domain);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ professional_title: domain })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Domain saved", description: `${domain} set as your professional domain.` });
      onApply?.(domain);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-b4-teal" />
            Suggest domain based on your Natural Role
          </DialogTitle>
          <DialogDescription>
            AI maps your Natural Role → cognitive function → core question → domains where it creates the highest value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 bg-muted/40 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your Natural Role</p>
            <p className="text-foreground">{naturalRole || "Not defined yet."}</p>
          </div>

          {!result && !loading && (
            <Button onClick={run} disabled={!naturalRole} variant="teal" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate recommendations
            </Button>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing your Natural Role…
            </div>
          )}

          {result && (
            <div className="space-y-5">
              {result.cognitive_function && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Cognitive function</p>
                    <p className="text-sm">{result.cognitive_function}</p>
                  </div>
                  {result.core_question && (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Core question</p>
                      <p className="text-sm italic">{result.core_question}</p>
                    </div>
                  )}
                </div>
              )}

              {result.supporting_expressions?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {result.supporting_expressions.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-sm font-semibold">Recommended domains</p>
                {result.recommended_domains?.map((d) => (
                  <div key={d.name} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">Match {d.match}%</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => apply(d.name)}
                        disabled={saving !== null}
                      >
                        {saving === d.name ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Use as my domain
                      </Button>
                    </div>
                    <p className="text-sm text-foreground/90">{d.why}</p>
                    {d.problems_solved?.length ? (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Problems: </span>
                        {d.problems_solved.join(" · ")}
                      </div>
                    ) : null}
                    {d.careers?.length ? (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Careers: </span>
                        {d.careers.join(", ")}
                      </div>
                    ) : null}
                    {d.businesses?.length ? (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Businesses: </span>
                        {d.businesses.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {result.transferability?.other_domains?.length ? (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Transferability</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {result.transferability.other_domains.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                  {result.transferability.reason && (
                    <p className="text-xs text-muted-foreground">{result.transferability.reason}</p>
                  )}
                </div>
              ) : null}

              {result.business_models?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Business model paths</p>
                  {result.business_models.map((b, i) => (
                    <div key={i} className="text-xs border border-border rounded-lg p-3">
                      <p><span className="text-muted-foreground">Domain:</span> {b.domain}</p>
                      <p><span className="text-muted-foreground">Problem:</span> {b.problem}</p>
                      <p><span className="text-muted-foreground">Solution:</span> {b.solution}</p>
                      <p className="font-medium mt-1">{b.path}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Button variant="outline" size="sm" onClick={run} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          {savedAt ? (
            <p className="text-xs text-muted-foreground">
              Saved {new Date(savedAt).toLocaleString()}
            </p>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button variant="teal" onClick={saveResult} disabled={!result}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

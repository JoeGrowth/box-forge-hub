import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Trash2, Sparkles, Check, Loader2, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  exportDomainSuggestionsToPdf,
  type DomainSuggestionResult,
} from "@/lib/domainSuggestionsPdfExport";
import { SuggestDomainDialog } from "@/components/domain/SuggestDomainDialog";

interface Row {
  id: string;
  label: string | null;
  natural_role: string | null;
  result: DomainSuggestionResult;
  created_at: string;
}

export default function SavedDomainSuggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [naturalRole, setNaturalRole] = useState<string | null>(null);
  const [profileTitle, setProfileTitle] = useState<string | null>(null);
  const [primarySkills, setPrimarySkills] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: saved }, { data: profile }, { data: nr }] = await Promise.all([
      (supabase as any)
        .from("domain_suggestions")
        .select("id, label, natural_role, result, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("full_name, professional_title, primary_skills")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("natural_roles")
        .select("description")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setRows((saved as Row[]) || []);
    setActiveId((saved as Row[])?.[0]?.id ?? null);
    setProfileName((profile as any)?.full_name || "");
    setProfileTitle((profile as any)?.professional_title || null);
    setPrimarySkills((profile as any)?.primary_skills || null);
    setNaturalRole((nr as any)?.description || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("domain_suggestions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await load();
  };

  const applyDomain = async (domain: string) => {
    if (!user) return;
    setApplying(domain);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ professional_title: domain })
        .eq("user_id", user.id);
      if (error) throw error;
      setProfileTitle(domain);
      toast({ title: "Domain applied", description: `${domain} set as your professional domain.` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setApplying(null);
    }
  };

  const active = rows.find((r) => r.id === activeId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/entrepreneurship">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Entrepreneurship
              </Link>
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookMarked className="w-7 h-7 text-b4-teal" />
              Saved domain suggestions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Up to 3 saved sets. Oldest is removed automatically when you save a 4th.
            </p>
          </div>
          <Button variant="teal" onClick={() => setDialogOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            New suggestion
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">No saved suggestions yet.</p>
              <Button variant="teal" onClick={() => setDialogOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate your first
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    activeId === r.id
                      ? "border-b4-teal bg-b4-teal/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="font-semibold text-sm line-clamp-1">{r.label || "Saved suggestion"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {r.result.recommended_domains?.length ?? 0} domains
                  </p>
                </button>
              ))}
            </div>

            {active && (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-lg">{active.label || "Saved suggestion"}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Saved {new Date(active.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportDomainSuggestionsToPdf(active.result, {
                          userName: profileName,
                          naturalRole: active.natural_role,
                          savedAt: active.created_at,
                        })
                      }
                    >
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(active.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {active.natural_role && (
                    <div className="rounded-lg border p-3 bg-muted/40 text-sm">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Natural Role
                      </p>
                      <p>{active.natural_role}</p>
                    </div>
                  )}

                  {(active.result.cognitive_function || active.result.core_question) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {active.result.cognitive_function && (
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Cognitive function
                          </p>
                          <p className="text-sm">{active.result.cognitive_function}</p>
                        </div>
                      )}
                      {active.result.core_question && (
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Core question
                          </p>
                          <p className="text-sm italic">{active.result.core_question}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Recommended domains</p>
                    {active.result.recommended_domains?.map((d) => (
                      <div key={d.name} className="border rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold">{d.name}</p>
                            <p className="text-xs text-muted-foreground">Match {d.match}%</p>
                          </div>
                          <Button
                            size="sm"
                            variant={profileTitle === d.name ? "secondary" : "outline"}
                            onClick={() => applyDomain(d.name)}
                            disabled={applying !== null || profileTitle === d.name}
                          >
                            {applying === d.name ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            {profileTitle === d.name ? "Current domain" : "Use as my domain"}
                          </Button>
                        </div>
                        <p className="text-sm text-foreground/90">{d.why}</p>
                        {d.problems_solved?.length ? (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Problems: </span>
                            {d.problems_solved.join(" · ")}
                          </p>
                        ) : null}
                        {d.careers?.length ? (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Careers: </span>
                            {d.careers.join(", ")}
                          </p>
                        ) : null}
                        {d.businesses?.length ? (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Businesses: </span>
                            {d.businesses.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {active.result.transferability?.other_domains?.length ? (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Transferability
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {active.result.transferability.other_domains.map((d) => (
                          <Badge key={d} variant="outline" className="text-xs">
                            {d}
                          </Badge>
                        ))}
                      </div>
                      {active.result.transferability.reason && (
                        <p className="text-xs text-muted-foreground">
                          {active.result.transferability.reason}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {active.result.business_models?.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Business model paths</p>
                      {active.result.business_models.map((b, i) => (
                        <div key={i} className="text-xs border rounded-lg p-3">
                          <p>
                            <span className="text-muted-foreground">Domain:</span> {b.domain}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Problem:</span> {b.problem}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Solution:</span> {b.solution}
                          </p>
                          <p className="font-medium mt-1">{b.path}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <SuggestDomainDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) load();
        }}
        naturalRole={naturalRole}
        currentTitle={profileTitle}
        primarySkills={primarySkills}
        onApply={(d) => setProfileTitle(d)}
      />
    </div>
  );
}

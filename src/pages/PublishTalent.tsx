import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTalentReadiness } from "@/hooks/useTalentReadiness";
import { useExpertise } from "@/hooks/useExpertise";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { exportResumeToPdf } from "@/lib/resumePdfExport";
import { profileSlug } from "./PublicProfile";
import {
  Check,
  X,
  Download,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  Brain,
  Award,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Stage 1 — "Publish your Talent"
// Single screen composing NR + Expertise + Skills → PDF + public URL + share.

interface ProfileRow {
  full_name: string | null;
  professional_title: string | null;
  bio: string | null;
  summary_statement: string | null;
  primary_skills: string | null;
  years_of_experience: number | null;
  key_projects: string | null;
  education_certifications: string | null;
}

export default function PublishTalent() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { talentReady, missing, loading: readinessLoading } = useTalentReadiness();
  const { expertise } = useExpertise(user?.id);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [naturalRole, setNaturalRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?next=/publish-talent", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [p, nr] = await Promise.all([
        supabase.from("profiles").select("full_name, professional_title, bio, summary_statement, primary_skills, years_of_experience, key_projects, education_certifications").eq("user_id", user.id).maybeSingle(),
        supabase.from("natural_roles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setProfile((p.data as ProfileRow) ?? null);
      setNaturalRole(nr.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const skills = useMemo(
    () => (profile?.primary_skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    [profile?.primary_skills],
  );

  const slug = user ? profileSlug(profile?.full_name ?? null, user.id) : "";
  const publicUrl = typeof window !== "undefined" && slug ? `${window.location.origin}/u/${slug}` : "";

  const checks = useMemo(() => {
    const nrDone = Boolean(naturalRole?.description);
    const expertiseDone = (expertise?.tags?.length ?? 0) > 0 || (expertise && expertise.level !== "novice");
    const skillsDone = skills.length >= 3;
    const resumeDone =
      Boolean(profile?.professional_title) &&
      Boolean(profile?.summary_statement || profile?.bio) &&
      Boolean(profile?.key_projects) &&
      Boolean(profile?.education_certifications) &&
      profile?.years_of_experience !== null && profile?.years_of_experience !== undefined;
    return { nrDone, expertiseDone, skillsDone, resumeDone };
  }, [naturalRole, expertise, skills.length, profile]);

  const allReady = checks.nrDone && checks.expertiseDone && checks.skillsDone && checks.resumeDone;

  const handleExport = async () => {
    setExporting(true);
    try {
      exportResumeToPdf({
        userName: profile?.full_name || undefined,
        professionalTitle: profile?.professional_title || undefined,
        bio: profile?.bio || undefined,
        primarySkills: profile?.primary_skills || undefined,
        yearsOfExperience: profile?.years_of_experience,
        keyProjects: profile?.key_projects || undefined,
        educationCertifications: profile?.education_certifications || undefined,
        summaryStatement: profile?.summary_statement || undefined,
        description: naturalRole?.description || undefined,
        servicesDescription: naturalRole?.services_description || undefined,
        promiseCheck: naturalRole?.promise_check ?? undefined,
        practiceCheck: naturalRole?.practice_check ?? undefined,
        practiceEntities: naturalRole?.practice_entities || undefined,
        practiceCaseStudies: naturalRole?.practice_case_studies,
        trainingCheck: naturalRole?.training_check ?? undefined,
        trainingContexts: naturalRole?.training_contexts || undefined,
        trainingCount: naturalRole?.training_count,
        consultingCheck: naturalRole?.consulting_check ?? undefined,
        consultingWithWhom: naturalRole?.consulting_with_whom || undefined,
        consultingCaseStudies: naturalRole?.consulting_case_studies || undefined,
        wantsToScale: naturalRole?.wants_to_scale ?? undefined,
      });
      toast.success("Resume PDF downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Public URL copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    if (!publicUrl) return;
    const shareData = {
      title: `${profile?.full_name ?? "My profile"} — Box4Solutions`,
      text: profile?.summary_statement ?? profile?.bio ?? "My professional talent profile",
      url: publicUrl,
    };
    try {
      if ((navigator as any).share) await (navigator as any).share(shareData);
      else await handleCopy();
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Could not share");
    }
  };

  useEffect(() => {
    document.title = "Publish your Talent | Box4Solutions";
  }, []);

  if (authLoading || loading || readinessLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const CheckRow = ({
    ok, label, hint, to,
  }: { ok: boolean; label: string; hint: string; to: string }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
          {ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {!ok && (
        <Button asChild size="sm" variant="outline">
          <Link to={to}>Fix</Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl flex-1 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/85 rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Publish your Talent</h1>
              <p className="text-white/80 max-w-xl">
                Talent = Natural Role + Expertise + Skills. Validate the three, download your Resume, share your public URL.
              </p>
            </div>
            <Badge variant="outline" className={allReady ? "bg-emerald-500/20 text-emerald-100 border-emerald-300/40" : "bg-white/10 text-white border-white/20"}>
              {allReady ? "Ready to publish" : "Foundation incomplete"}
            </Badge>
          </div>
        </div>

        {/* Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1 — Validate your Talent Foundation</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CheckRow
              ok={checks.nrDone}
              label="Natural Role defined"
              hint="Your unique approach to solving problems"
              to="/decoder"
            />
            <CheckRow
              ok={!!checks.expertiseDone}
              label={`Expertise — ${expertise?.level ?? "novice"}${expertise?.tags?.length ? ` · ${expertise.tags.length} tags` : ""}`}
              hint="The domain you practice, train and consult within"
              to="/track-record"
            />
            <CheckRow
              ok={checks.skillsDone}
              label={`Skills — ${skills.length} listed`}
              hint="At least 3 primary skills (related or lateral to your NR)"
              to="/resume"
            />
            <CheckRow
              ok={checks.resumeDone}
              label="Resume fields complete"
              hint="Title, summary, projects, education, years of experience"
              to="/resume"
            />
          </CardContent>
        </Card>

        {/* Composition preview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Natural Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-4">
                {naturalRole?.description ?? "Not defined yet."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">
                Level: <span className="font-semibold text-foreground capitalize">{expertise?.level ?? "novice"}</span>
                {typeof expertise?.score === "number" && <> · Score {Math.round(expertise.score)}</>}
              </div>
              <div className="flex flex-wrap gap-1">
                {(expertise?.tags ?? []).slice(0, 6).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
                {(expertise?.tags ?? []).length === 0 && <span className="text-xs text-muted-foreground">No expertise tags yet.</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 8).map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                {skills.length === 0 && <span className="text-xs text-muted-foreground">No skills listed yet.</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Publish actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2 — Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Button onClick={handleExport} disabled={exporting || !checks.resumeDone} className="justify-start h-auto py-3">
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                <div className="text-left">
                  <div className="font-semibold">Download Resume PDF</div>
                  <div className="text-xs opacity-80">{checks.resumeDone ? "Ready" : "Complete resume fields first"}</div>
                </div>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-3">
                <Link to={`/u/${slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">Open Public Profile</div>
                    <div className="text-xs opacity-70 truncate max-w-[220px]">/u/{slug}</div>
                  </div>
                </Link>
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Public URL</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-foreground truncate">{publicUrl || "—"}</code>
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-1" /> Share
                </Button>
              </div>
            </div>

            {!allReady && missing.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Still missing: {missing.join(" · ")}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

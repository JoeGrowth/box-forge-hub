import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { useTrust, trustLevelStyle } from "@/hooks/useTrust";
import { useReputation, reputationLevelStyle } from "@/hooks/useReputation";
import { useOwnership, ownershipLevelStyle } from "@/hooks/useOwnership";
import { useRevenue } from "@/hooks/useRevenue";
import { useExpertise } from "@/hooks/useExpertise";
import { ShieldCheck, Award, Briefcase, MapPin, Link as LinkIcon, Copy, Check } from "lucide-react";
import { toast } from "sonner";

// Public profile surface at /u/:slug.
// The slug is `<kebab-name>-<first-8-of-user-id>`. Anonymous and
// authenticated requests are both allowed (RLS exposes only approved,
// non-deleted profiles to anon/authenticated).

interface PublicProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  professional_title: string | null;
  bio: string | null;
  summary_statement: string | null;
  preferred_sector: string | null;
  primary_skills: string | null;
  years_of_experience: number | null;
  key_projects: string | null;
  education_certifications: string | null;
}

export function profileSlug(fullName: string | null, userId: string): string {
  const base = (fullName ?? "member")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "member";
  return `${base}-${userId.slice(0, 8)}`;
}

function parseSlug(slug: string): string | null {
  const m = slug.match(/-([0-9a-f]{8})$/i);
  return m ? m[1].toLowerCase() : null;
}

export default function PublicProfile() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const idPrefix = parseSlug(slug);
    if (!idPrefix) { setNotFound(true); setLoading(false); return; }

    (async () => {
      // Match user_id by text-prefix on the trailing 8 chars of the slug.
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, professional_title, bio, summary_statement, preferred_sector, primary_skills, years_of_experience, key_projects, education_certifications")
        .ilike("user_id" as any, `${idPrefix}%`)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setNotFound(true); }
      else setProfile(data as PublicProfile);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const userId = profile?.user_id ?? null;
  const { trust } = useTrust(userId);
  const { reputation } = useReputation(userId);
  const { ownership } = useOwnership(userId);
  const { revenue } = useRevenue(userId);
  const { expertise } = useExpertise(userId);

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}/u/${slug}` : `/u/${slug}`;
  const copy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Profile link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="h-32 bg-muted/40 rounded-2xl animate-pulse mb-6" />
          <div className="h-64 bg-muted/40 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container mx-auto px-4 py-24 max-w-2xl text-center flex-1">
          <h1 className="font-display text-3xl font-bold mb-3">Profile not available</h1>
          <p className="text-muted-foreground mb-6">
            This member's profile is private or doesn't exist.
          </p>
          <Button asChild><Link to="/cobuilders">Explore approved members</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const name = profile.full_name ?? "Member";
  const title = profile.professional_title ?? profile.preferred_sector ?? "Box4Solutions member";
  const description = (profile.summary_statement ?? profile.bio ?? `${name} on Box4Solutions`).slice(0, 160);
  const skills = (profile.primary_skills ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const trustStyle = trust && trust.level !== "unverified" ? trustLevelStyle(trust.level) : null;
  const repStyle = reputation ? reputationLevelStyle(reputation.reputation_level) : null;
  const ownStyle = ownership ? ownershipLevelStyle(ownership.ownership_level) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`${name} — ${title} | Box4Solutions`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`/u/${slug}`} />
        <meta property="og:title" content={`${name} — ${title}`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`/u/${slug}`} />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name,
          jobTitle: title,
          description,
          image: profile.avatar_url ?? undefined,
          url: fullUrl,
        })}</script>
      </Helmet>

      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-4xl flex-1 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/85 rounded-2xl p-8 text-white">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-white/10">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
              <AvatarFallback className="text-2xl bg-b4-teal text-white">
                {name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">{name}</h1>
              <p className="text-white/80 mb-4">{title}</p>
              <div className="flex flex-wrap gap-2">
                {trustStyle && (
                  <Badge variant="outline" className={`gap-1 ${trustStyle.className}`}>
                    <ShieldCheck className="w-3 h-3" /> Trust: {trustStyle.label}
                  </Badge>
                )}
                {repStyle && (
                  <Badge variant="outline" className={repStyle.className}>
                    <Award className="w-3 h-3 mr-1" /> {repStyle.label}
                  </Badge>
                )}
                {ownStyle && (
                  <Badge variant="outline" className={ownStyle.className}>
                    Ownership: {ownStyle.label}
                  </Badge>
                )}
                {profile.preferred_sector && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                    <MapPin className="w-3 h-3 mr-1" /> {profile.preferred_sector}
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={copy} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              {copied ? <><Check className="w-4 h-4 mr-2" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Share</>}
            </Button>
          </div>
        </div>

        {/* Summary */}
        {(profile.summary_statement || profile.bio) && (
          <Card>
            <CardHeader><CardTitle className="text-lg">About</CardTitle></CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-line leading-relaxed">
                {profile.summary_statement || profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Six-graph signals */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SignalCard label="Expertise" value={expertise ? `${expertise.tags?.length ?? 0} skills` : "—"} sub={expertise?.expertise_level ?? null} />
          <SignalCard label="Trust" value={trust?.level ?? "—"} sub={trust ? `${trust.signals?.length ?? 0} signals` : null} />
          <SignalCard label="Reputation" value={reputation?.reputation_level ?? "—"} sub={reputation ? `${Math.round(reputation.reputation_score)} pts` : null} />
          <SignalCard label="Revenue track" value={revenue ? `${Math.round(revenue.total_value)}` : "—"} sub={revenue?.revenue_level ?? null} />
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience */}
        {(profile.years_of_experience || profile.key_projects) && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Briefcase className="w-5 h-5" /> Experience</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {profile.years_of_experience != null && (
                <p className="text-sm text-muted-foreground">{profile.years_of_experience} years of experience</p>
              )}
              {profile.key_projects && (
                <p className="text-foreground whitespace-pre-line">{profile.key_projects}</p>
              )}
            </CardContent>
          </Card>
        )}

        {profile.education_certifications && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Education & Certifications</CardTitle></CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-line">{profile.education_certifications}</p>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground mb-3">Want a profile like this?</p>
          <Button asChild size="lg">
            <Link to="/onboarding"><LinkIcon className="w-4 h-4 mr-2" /> Join Box4Solutions</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SignalCard({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-xl font-bold text-foreground capitalize">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 capitalize">{sub}</div>}
    </div>
  );
}

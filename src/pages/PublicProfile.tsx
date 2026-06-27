import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { useTrust, trustLevelStyle } from "@/hooks/useTrust";
import { useReputation, reputationLevelStyle } from "@/hooks/useReputation";
import { useOwnership, ownershipLevelStyle } from "@/hooks/useOwnership";
import { useRevenue } from "@/hooks/useRevenue";
import { useExpertise } from "@/hooks/useExpertise";
import { ShieldCheck, Award, Briefcase, MapPin, Link as LinkIcon, Copy, Check, Share2, Loader2, Users, Sparkles, Handshake } from "lucide-react";
import { toast } from "sonner";
import { SharedRelationshipsCard } from "@/components/relationships/SharedRelationshipsCard";
import { TrustBlock } from "@/components/trust/TrustBlock";
import { ActivityFeed } from "@/components/profile/ActivityFeed";

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
  return `${base}-${userId}`;
}

const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
function parseSlug(slug: string): string | null {
  const m = slug.match(UUID_RE);
  return m ? m[1].toLowerCase() : null;
}

export default function PublicProfile() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contributions, setContributions] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const userId = parseSlug(slug);
    if (!userId) { setNotFound(true); setLoading(false); return; }

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, professional_title, bio, summary_statement, preferred_sector, primary_skills, years_of_experience, key_projects, education_certifications")
        .eq("user_id", userId)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setNotFound(true); }
      else setProfile(data as PublicProfile);
      setLoading(false);

      // Side projections
      const [cRes, oRes, rRes] = await Promise.all([
        supabase.from("contributions").select("id, kind, summary, verified_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("opportunity_applications").select("id, status, opportunity_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("advisor_relationships").select("id, kind, status, created_at, advisor_id, founder_id").or(`advisor_id.eq.${userId},founder_id.eq.${userId}`).limit(20),
      ]);
      if (cancelled) return;
      setContributions((cRes.data as any[]) ?? []);
      setOpportunities((oRes.data as any[]) ?? []);
      setRelationships((rRes.data as any[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const userId = profile?.user_id ?? null;
  const { trust } = useTrust(userId);
  const { reputation } = useReputation(userId);
  const { ownership } = useOwnership(userId);
  const { revenue } = useRevenue(userId);
  const { expertise } = useExpertise(userId);

  const name = profile?.full_name ?? "Member";
  const title = profile?.professional_title ?? profile?.preferred_sector ?? "Box4Solutions member";
  const description = (profile?.summary_statement ?? profile?.bio ?? `${name} on Box4Solutions`).slice(0, 160);
  const skills = (profile?.primary_skills ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const trustStyle = trust && trust.level !== "unverified" ? trustLevelStyle(trust.level) : null;
  const repStyle = reputation ? reputationLevelStyle(reputation.reputation_level) : null;
  const ownStyle = ownership ? ownershipLevelStyle(ownership.ownership_level) : null;

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}/u/${slug}` : `/u/${slug}`;
  const [sharing, setSharing] = useState(false);
  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — ${title}`, text: description, url: fullUrl });
      } else {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        toast.success("Profile link copied");
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Could not share");
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    document.title = `${name} — ${title} | Box4Solutions`;
    const setMeta = (sel: string, attr: string, value: string) => {
      let el = document.head.querySelector(sel) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el) {
        el = document.createElement(sel.startsWith("link") ? "link" : "meta");
        if (sel.includes("[name=")) (el as HTMLMetaElement).name = sel.match(/name="([^"]+)"/)![1];
        if (sel.includes("[property=")) (el as HTMLMetaElement).setAttribute("property", sel.match(/property="([^"]+)"/)![1]);
        if (sel.includes("[rel=")) (el as HTMLLinkElement).rel = sel.match(/rel="([^"]+)"/)![1];
        document.head.appendChild(el);
      }
      (el as any)[attr] = value;
    };
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", `/u/${slug}`);
    setMeta('meta[property="og:title"]', "content", `${name} — ${title}`);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", "profile");
    setMeta('meta[property="og:url"]', "content", `/u/${slug}`);
    if (profile.avatar_url) setMeta('meta[property="og:image"]', "content", profile.avatar_url);
  }, [profile, name, title, description, slug]);

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
          <p className="text-muted-foreground mb-6">This member's profile is private or doesn't exist.</p>
          <Button asChild><Link to="/cobuilders">Explore approved members</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const verifiedContributions = contributions.filter((c) => c.verified_at).length;
  const acceptedOpps = opportunities.filter((o) => o.status === "accepted").length;
  const collaborators = new Set(relationships.map((r) => r.advisor_id === profile.user_id ? r.founder_id : r.advisor_id)).size;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-5xl flex-1 space-y-6">
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
                {trustStyle && <Badge variant="outline" className={`gap-1 ${trustStyle.className}`}><ShieldCheck className="w-3 h-3" /> Trust: {trustStyle.label}</Badge>}
                {repStyle && <Badge variant="outline" className={repStyle.className}><Award className="w-3 h-3 mr-1" /> {repStyle.label}</Badge>}
                {ownStyle && <Badge variant="outline" className={ownStyle.className}>Ownership: {ownStyle.label}</Badge>}
                {profile.preferred_sector && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                    <MapPin className="w-3 h-3 mr-1" /> {profile.preferred_sector}
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleShare} variant="outline" className="border-white/20 text-white hover:bg-white/10" disabled={sharing}>
              {sharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : copied ? <><Check className="w-4 h-4 mr-2" />Copied</> : <><Share2 className="w-4 h-4 mr-2" />Share</>}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="track">Track Record</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview answers the four trust questions */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Why trust this person?</CardTitle></CardHeader>
                <CardContent>
                  <TrustBlock userId={profile.user_id} variant="inline" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" /> What have they built?</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{verifiedContributions}</div>
                  <p className="text-xs text-muted-foreground">verified contributions</p>
                  {contributions.length > 0 && (
                    <p className="text-sm text-foreground mt-2 line-clamp-2">
                      Latest: {contributions[0].summary ?? contributions[0].kind}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Who have they collaborated with?</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{collaborators}</div>
                  <p className="text-xs text-muted-foreground">collaborators</p>
                  <SharedRelationshipsCard profileUserId={profile.user_id} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" /> What opportunities have they earned?</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{acceptedOpps}</div>
                  <p className="text-xs text-muted-foreground">accepted opportunities</p>
                </CardContent>
              </Card>
            </div>

            {(profile.summary_statement || profile.bio) && (
              <Card>
                <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed">{profile.summary_statement || profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {skills.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Skills</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contributions" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Contributions</CardTitle></CardHeader>
              <CardContent>
                {contributions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contributions recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {contributions.map((c) => (
                      <li key={c.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.summary ?? c.kind}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{c.kind}</Badge>
                            {c.verified_at && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">verified</Badge>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships" className="mt-6 space-y-4">
            <SharedRelationshipsCard profileUserId={profile.user_id} />
            <Card>
              <CardHeader><CardTitle className="text-base">All relationships</CardTitle></CardHeader>
              <CardContent>
                {relationships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No relationships yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {relationships.map((r) => (
                      <li key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Handshake className="w-4 h-4 text-primary" />
                          <span className="text-sm">{r.kind ?? "relationship"}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Opportunities earned</CardTitle></CardHeader>
              <CardContent>
                {opportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No opportunity activity yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {opportunities.map((o) => (
                      <li key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm">Opportunity #{String(o.opportunity_id).slice(0, 8)}</span>
                        <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="track" className="mt-6 space-y-4">
            {(profile.years_of_experience || profile.key_projects) && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" /> Experience</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Education & Certifications</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line">{profile.education_certifications}</p>
                </CardContent>
              </Card>
            )}
            {!profile.years_of_experience && !profile.key_projects && !profile.education_certifications && (
              <p className="text-sm text-muted-foreground">No track record entries yet.</p>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Public activity stream</CardTitle></CardHeader>
              <CardContent>
                <ActivityFeed userId={profile.user_id} limit={50} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrgLogo } from "@/components/organization/OrgLogo";
import {
  Building2, Globe, ArrowRight, ArrowLeft, Rocket, Sparkles, TrendingUp, Trophy,
} from "lucide-react";

const STAGE_META: Record<string, { label: string; icon: typeof Rocket; className: string }> = {
  venture:  { label: "Venture",  icon: Rocket,     className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  business: { label: "Business", icon: Sparkles,   className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  startup:  { label: "Startup",  icon: TrendingUp, className: "bg-purple-500/10 text-purple-700 border-purple-200" },
  mature:   { label: "Mature",   icon: Trophy,     className: "bg-amber-500/10 text-amber-700 border-amber-200" },
};

type Org = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  lifecycle_stage: string | null;
  created_at: string;
};

export default function OrgPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, slug, name, type, description, website, logo_url, lifecycle_stage, created_at")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!cancelled && !sessionData.session) setLoggedOut(true);
        setNotFound(true);
      } else setOrg(data as Org);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {loggedOut
            ? "This page is available to signed-in members. Log in to view it."
            : <>No organization or page exists at <span className="font-mono">/{slug}</span>.</>}
        </p>
        <Button asChild className="mt-6">
          {loggedOut ? (
            <Link to="/auth"><ArrowLeft className="w-4 h-4 mr-1" /> Log in</Link>
          ) : (
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Back to home</Link>
          )}
        </Button>
      </div>
    );
  }

  const stage = STAGE_META[org.lifecycle_stage ?? "venture"] ?? STAGE_META.venture;
  const StageIcon = stage.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 max-w-3xl py-16 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
            <OrgLogo
              path={org.logo_url}
              alt={`${org.name} logo`}
              className="w-full h-full object-cover"
              iconClassName="w-10 h-10 text-primary"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{org.name.split(" — ")[0]}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="capitalize">{org.type}</Badge>
            <Badge variant="outline" className={stage.className}>
              <StageIcon className="w-3 h-3 mr-1" /> {stage.label}
            </Badge>
          </div>
          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <Globe className="w-4 h-4 mr-1" /> {org.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {/* About */}
        {org.description && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-2">About</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line break-words">{org.description}</p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild>
            <Link to={`/org/${org.slug}`}>
              Open workspace <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Member since {new Date(org.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

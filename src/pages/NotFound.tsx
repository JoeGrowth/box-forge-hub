import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Compass,
  Briefcase,
  Handshake,
  Rocket,
  Users,
  MessageSquare,
  ArrowRight,
  Home as HomeIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Known destinations the platform can route a lost user to. These map to
// the 6 professional states + the canonical growth-loop entry points.
const DESTINATIONS: Array<{
  path: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}> = [
  { path: "/opportunities", label: "Opportunities", description: "Jobs, startups, training and consulting matched to you", icon: Compass, keywords: ["opportunity", "opportunities", "match", "matches", "discover", "feed", "explore", "jobs", "job", "training", "trainings", "services", "consulting", "startup", "startups"] },
  { path: "/cobuilders", label: "Co-Builders", description: "Find people to build, hire and partner with", icon: Users, keywords: ["people", "network", "cobuilders", "co-builder", "team", "members", "directory"] },
  { path: "/start", label: "Build a Venture", description: "Scale an idea into a venture with a team", icon: Rocket, keywords: ["scale", "start", "venture", "project", "projects", "build", "company"] },
  { path: "/advisory", label: "Consulting", description: "Publish your expertise and earn", icon: Handshake, keywords: ["advisory", "consulting", "consult", "service", "services", "expert", "monetize"] },
  { path: "/career", label: "Career", description: "Roadmap for stability and progression", icon: Briefcase, keywords: ["career", "job", "stability", "resume", "cv"] },
  { path: "/messages", label: "Messages", description: "Conversations with your matches and team", icon: MessageSquare, keywords: ["messages", "message", "chat", "inbox", "conversation"] },
];

function suggest(pathname: string) {
  const tokens = pathname.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length) return DESTINATIONS.slice(0, 3);
  const scored = DESTINATIONS.map((d) => {
    let score = 0;
    for (const t of tokens) for (const k of d.keywords) if (k.includes(t) || t.includes(k)) score += 1;
    return { d, score };
  })
    .sort((a, b) => b.score - a.score);
  const best = scored.filter((s) => s.score > 0).map((s) => s.d);
  return best.length ? best.slice(0, 3) : DESTINATIONS.slice(0, 3);
}

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const suggestions = useMemo(() => suggest(location.pathname), [location.pathname]);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // Feed the growth-loop telemetry so we can see which guessed URLs need aliases.
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        await supabase.from("graph_events").insert({
          user_id: data.user?.id ?? null,
          event_type: "route_not_found" as never,
          event_version: 1,
          aggregate_type: "route",
          aggregate_id: location.pathname,
          source_module: "spa.router",
          idempotency_key: `route_not_found:${data.user?.id ?? "anon"}:${location.pathname}:${Date.now()}`,
          payload: {
            path: location.pathname,
            search: location.search,
            referrer: typeof document !== "undefined" ? document.referrer : null,
          },
          weight: 1,
          occurred_at: new Date().toISOString(),
        } as never);
      } catch {
        /* telemetry is best-effort */
      }
    })();
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-5xl font-bold text-primary">404</h1>
          <p className="text-lg text-muted-foreground">
            This page does not exist
            <span className="ml-2 rounded bg-muted-foreground/10 px-2 py-0.5 font-mono text-sm">
              {location.pathname}
            </span>
          </p>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-foreground">Closest matches</p>
          <div className="space-y-2">
            {suggestions.map(({ path, label, description, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="group flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button asChild>
            <Link to="/">
              <HomeIcon className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;

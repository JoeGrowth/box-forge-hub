import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  Leaf,
  GraduationCap,
  Utensils,
  Building2,
  Cpu,
  Shield,
  Banknote,
  Boxes as BoxesIcon,
  ArrowRight,
  Users,
  Loader2,
} from "lucide-react";

type BoxRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type AdvisorRow = {
  box_id: string;
  status: string;
  user_id: string;
  full_name: string | null;
};


const ICON_BY_KEYWORD: Array<{ match: RegExp; icon: typeof Heart; color: string; bg: string }> = [
  { match: /health|medical|wellness/i, icon: Heart, color: "from-rose-500 to-red-600", bg: "bg-rose-50" },
  { match: /agri|farm|food/i, icon: Leaf, color: "from-emerald-500 to-green-600", bg: "bg-emerald-50" },
  { match: /educ|learn/i, icon: GraduationCap, color: "from-blue-500 to-indigo-600", bg: "bg-blue-50" },
  { match: /restaurant|nutrition/i, icon: Utensils, color: "from-amber-500 to-orange-600", bg: "bg-amber-50" },
  { match: /real ?estate|property|construction/i, icon: Building2, color: "from-slate-500 to-gray-700", bg: "bg-slate-50" },
  { match: /security|cyber/i, icon: Shield, color: "from-zinc-700 to-slate-900", bg: "bg-zinc-50" },
  { match: /finance|fintech|capital|bank/i, icon: Banknote, color: "from-teal-500 to-cyan-600", bg: "bg-teal-50" },
  { match: /tech|software|ai|digital/i, icon: Cpu, color: "from-violet-500 to-purple-600", bg: "bg-violet-50" },
];

const themeFor = (name: string) =>
  ICON_BY_KEYWORD.find((t) => t.match.test(name)) ?? {
    icon: BoxesIcon,
    color: "from-primary to-primary/70",
    bg: "bg-muted",
  };

const abbrFor = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 5);

const Boxes = () => {
  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: boxRows }, { data: advRows }] = await Promise.all([
        supabase.from("boxes").select("id, slug, name, description").order("name"),
        supabase
          .from("box_advisors")
          .select("box_id, status, user_id")
          .eq("status", "active"),
      ]);
      if (cancelled) return;
      const userIds = Array.from(new Set((advRows ?? []).map((a: any) => a.user_id)));
      let profiles: Record<string, string | null> = {};
      if (userIds.length) {
        const { data: profRows } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profiles = Object.fromEntries((profRows ?? []).map((p: any) => [p.id, p.full_name]));
      }
      const enriched: AdvisorRow[] = (advRows ?? []).map((a: any) => ({
        box_id: a.box_id,
        status: a.status,
        user_id: a.user_id,
        full_name: profiles[a.user_id] ?? null,
      }));
      setBoxes((boxRows ?? []) as BoxRow[]);
      setAdvisors(enriched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          <section className="py-24 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl">
                <span className="inline-block px-4 py-1 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
                  Our Ecosystem
                </span>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Box For Entities
                </h1>
                <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
                  Specialized units focused on solving real-world problems. Each Box nurtures startups
                  within its domain, providing focused expertise and mentorship.
                </p>
              </div>
            </div>
          </section>

          <section className="py-24">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading boxes…
                </div>
              ) : boxes.length === 0 ? (
                <div className="text-center text-muted-foreground py-24">No boxes yet.</div>
              ) : (
                <div className="space-y-8">
                  {boxes.map((box, i) => {
                    const theme = themeFor(box.name);
                    const Icon = theme.icon;
                    const boxAdvisors = advisors.filter((a) => a.box_id === box.id);
                    return (
                      <div
                        key={box.id}
                        className="bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all duration-500 animate-fade-in"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        <div className={`h-2 bg-gradient-to-r ${theme.color}`} />
                        <div className="p-8 md:p-12">
                          <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                              <div className="flex items-start gap-4 mb-6">
                                <div
                                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.color} flex items-center justify-center flex-shrink-0`}
                                >
                                  <Icon className="w-8 h-8 text-primary-foreground" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h2 className="font-display font-bold text-2xl text-foreground">
                                      {box.name}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                      {abbrFor(box.name)}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    {box.description ?? "Specialized vertical inside the ecosystem."}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <strong className="text-foreground">{boxAdvisors.length}</strong> active advisor
                                {boxAdvisors.length === 1 ? "" : "s"}
                              </div>
                            </div>

                            <div className={`${theme.bg} rounded-2xl p-6`}>
                              <h4 className="font-semibold text-sm text-foreground mb-4">Advisors</h4>
                              {boxAdvisors.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No advisors assigned yet.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {boxAdvisors.map((a) => (
                                    <div
                                      key={a.user_id}
                                      className="flex items-center gap-3 bg-card rounded-lg p-2"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                        {(a.full_name ?? "?")
                                          .split(" ")
                                          .map((w) => w[0])
                                          .slice(0, 2)
                                          .join("")
                                          .toUpperCase()}
                                      </div>
                                      <div className="text-sm font-medium text-foreground">
                                        {a.full_name ?? "Advisor"}
                                      </div>
                                      <Badge variant="secondary" className="ml-auto text-xs">
                                        Advisor
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                                <Link to={`/boxes/${box.slug}`}>
                                  View Box <ArrowRight className="ml-2 w-3 h-3" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="py-24 bg-muted/50">
            <div className="container mx-auto px-4 text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Join a Box?
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                Whether you have a startup idea or want to contribute as a co-builder, there's a place
                for you in our ecosystem.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="default" size="lg" asChild>
                  <Link to="/join?role=entrepreneur">
                    Submit Your Startup <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/join?role=cobuilder">Become a Co-Builder</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Boxes;

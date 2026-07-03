import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  FileSpreadsheet,
  Briefcase,
  Trophy,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface MilestoneProgress {
  slug: string;
  current_value: number;
  threshold: number;
  percent_complete: number;
}

export default function ConsultingGrowth() {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState<MilestoneProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("progression_milestone_progress", {
        _uid: user.id,
        _slug: "first_ten_missions",
      });
      if (data && typeof data === "object") {
        setMilestone(data as unknown as MilestoneProgress);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <main className="container mx-auto max-w-5xl px-4 pt-24 pb-16 space-y-6">
      <header className="space-y-2">
        <Badge variant="outline" className="gap-1.5">
          <TrendingUp className="w-3 h-3" /> Consulting Growth
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Grow your consulting practice
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Turn your track record into paid missions. Source opportunities, prepare
          proposals, deliver work, and declare each mission so it counts toward your
          brand milestone.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-b4-teal" />
            Milestone — First 10 paid missions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : milestone ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-semibold">
                  {milestone.current_value}
                  <span className="text-base text-muted-foreground"> / {milestone.threshold}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {milestone.percent_complete}% complete
                </span>
              </div>
              <Progress value={milestone.percent_complete} />
              <p className="text-xs text-muted-foreground">
                Reaching 10 paid missions unlocks the Brand Growth track.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No milestone data yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4" /> Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Track leads from LinkedIn, tenders and referrals through your
              proposal funnel.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/start">
                Open opportunities <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-4 h-4" /> Declarations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once a mission is paid, declare it — that's what counts toward the
              10-mission milestone and toward your revenue graph.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/declaration">
                Open declarations <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Revenue, active clients and average daily rate are computed from your
              paid declarations.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/distribution">
                Open distribution <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

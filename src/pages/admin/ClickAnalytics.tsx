import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, MousePointerClick } from "lucide-react";

interface ClickEvent {
  id: string;
  page_path: string;
  label: string;
  kind: string;
  target_path: string | null;
  created_at: string;
}

type Range = "24h" | "7d" | "30d" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function sinceIso(range: Range): string | null {
  const now = Date.now();
  const map: Record<Range, number | null> = {
    "24h": 24 * 3600 * 1000,
    "7d": 7 * 24 * 3600 * 1000,
    "30d": 30 * 24 * 3600 * 1000,
    all: null,
  };
  const offset = map[range];
  return offset ? new Date(now - offset).toISOString() : null;
}

export default function ClickAnalytics() {
  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("7d");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("click_events")
        .select("id, page_path, label, kind, target_path, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      const since = sinceIso(range);
      if (since) q = q.gte("created_at", since);
      const { data } = await q;
      if (cancelled) return;
      setEvents((data ?? []) as ClickEvent[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = useMemo(() => {
    const byPage = new Map<string, number>();
    const byLabel = new Map<string, { count: number; kind: string }>();
    const byNavbar = new Map<string, number>();
    for (const e of events) {
      byPage.set(e.page_path, (byPage.get(e.page_path) ?? 0) + 1);
      const k = `${e.label}`;
      const cur = byLabel.get(k);
      byLabel.set(k, { count: (cur?.count ?? 0) + 1, kind: e.kind });
      if (e.kind === "navbar") {
        byNavbar.set(e.label, (byNavbar.get(e.label) ?? 0) + 1);
      }
    }
    const sortDesc = (a: [string, any], b: [string, any]) =>
      (b[1].count ?? b[1]) - (a[1].count ?? a[1]);
    return {
      total: events.length,
      pages: [...byPage.entries()].sort((a, b) => b[1] - a[1]),
      labels: [...byLabel.entries()].sort(sortDesc as any),
      navbar: [...byNavbar.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [events]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
              <Link to="/admin">
                <ArrowLeft size={16} className="mr-1" />
                Back to Admin
              </Link>
            </Button>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <MousePointerClick className="text-b4-teal" /> Click Analytics
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track which buttons and navbar links users tap on each page.
            </p>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? "teal" : "outline"}
                size="sm"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-4xl font-bold">{totals.total}</div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Navbar clicks</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : totals.navbar.length === 0 ? (
                <p className="text-sm text-muted-foreground">No navbar clicks yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totals.navbar.map(([label, count]) => (
                      <TableRow key={label}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clicks per page</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : totals.pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page activity yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totals.pages.slice(0, 30).map(([page, count]) => (
                      <TableRow key={page}>
                        <TableCell className="font-mono text-xs">{page}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buttons & links (by label)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : totals.labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No button clicks yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totals.labels.slice(0, 100).map(([label, info]) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{info.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{info.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search, Users, RotateCcw, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActivityLogData } from "@/lib/activityLog";

export default function ActivityLog() {
  const { user } = useAuth();
  const [days, setDays] = useState("7");
  const [userId, setUserId] = useState("all");
  const [kind, setKind] = useState("all");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [returningOnly, setReturningOnly] = useState(false);
  const [tab, setTab] = useState("events");
  const query = useQuery({
    queryKey: ["admin-activity-log", user?.id, days, userId, kind, offset],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_activity_log", {
        _days: Number(days), _user_id: userId === "all" ? undefined : userId, _kind: kind, _offset: offset,
      });
      if (error) throw error;
      return data as unknown as ActivityLogData;
    },
    refetchInterval: 60_000,
  });
  const data = query.data;
  const people = data?.users.filter((p) => p.user_name.toLowerCase().includes(search.toLowerCase()) && (!returningOnly || p.returns > 0)) ?? [];
  const stats = [
    { label: "Active users", value: data?.stats.active_users, Icon: Users },
    { label: "Returning users", value: data?.stats.returning_users, Icon: RotateCcw },
    { label: "Visits", value: data?.stats.visits, Icon: Activity },
    { label: "Recorded actions", value: data?.stats.actions, Icon: MousePointerClick },
  ];

  return <div className="min-h-screen bg-background text-foreground">
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4"><Link to="/admin"><ArrowLeft />Admin Dashboard</Link></Button>
          <div className="flex items-center gap-3"><Activity className="h-7 w-7 text-b4-teal" /><h1 className="font-display text-3xl font-bold">Activity Log</h1><Badge variant="outline">Admin only</Badge></div>
          <p className="mt-2 text-sm text-muted-foreground">{data?.tracking_since ? `Visit tracking since ${format(new Date(data.tracking_since), "dd MMM yyyy, HH:mm")}` : "No visits recorded yet"} · Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={(v) => { setDays(v); setOffset(0); }}><SelectTrigger aria-label="Date range" className="w-40"><SelectValue /></SelectTrigger><SelectContent>{[["1","Last 24 hours"],["7","Last 7 days"],["30","Last 30 days"],["90","Last 90 days"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="icon" title="Refresh activity" aria-label="Refresh activity" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map(({label,value,Icon}) => <div key={label} className="rounded-lg border border-border bg-card p-5"><Icon className="mb-3 h-5 w-5 text-b4-teal" /><p className="text-3xl font-semibold tabular-nums">{value ?? "—"}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>)}</div>
      {query.isError && <div role="alert" className="border-l-4 border-destructive bg-muted p-4 text-destructive">Activity could not be loaded. Refresh to try again.</div>}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="events">Events</TabsTrigger><TabsTrigger value="users">Users & return visits</TabsTrigger></TabsList>
        <TabsContent value="events" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={userId} onValueChange={(v) => { setUserId(v); setOffset(0); }}><SelectTrigger aria-label="Filter user" className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem>{data?.users.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.user_name}</SelectItem>)}</SelectContent></Select>
            <Select value={kind} onValueChange={(v) => { setKind(v); setOffset(0); }}><SelectTrigger aria-label="Activity type" className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All activity</SelectItem><SelectItem value="visit">Page visits</SelectItem><SelectItem value="click">Button & link clicks</SelectItem><SelectItem value="event">Platform events</SelectItem></SelectContent></Select>
          </div>
          <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Activity</TableHead><TableHead>Page</TableHead><TableHead>Type</TableHead></TableRow></TableHeader><TableBody>
            {query.isPending ? <TableRow><TableCell colSpan={5}>Loading activity…</TableCell></TableRow> : data?.events.length ? data.events.map((e) => <TableRow key={e.id}><TableCell className="whitespace-nowrap text-xs tabular-nums" title={e.occurred_at}>{format(new Date(e.occurred_at),"dd MMM yyyy HH:mm:ss")}</TableCell><TableCell><Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left" onClick={() => {setUserId(e.user_id);setOffset(0);}}>{e.user_name}</Button></TableCell><TableCell className="min-w-48 max-w-md break-words">{e.action}</TableCell><TableCell className="max-w-64 break-all font-mono text-xs">{e.page_path ?? "—"}</TableCell><TableCell><Badge variant="outline">{e.kind}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No recorded activity for these filters.</TableCell></TableRow>}
          </TableBody></Table>
          <div className="flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{data?.total ? `${offset+1}–${Math.min(offset+50,data.total)} of ${data.total}` : "0 events"}</p><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label="Previous page" disabled={offset===0 || query.isFetching} onClick={() => setOffset(Math.max(0,offset-50))}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Next page" disabled={!data || offset+50>=data.total || query.isFetching} onClick={() => setOffset(offset+50)}><ChevronRight /></Button></div></div>
        </TabsContent>
        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3"><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label="Search users" placeholder="Search users" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Button variant={returningOnly ? "secondary" : "ghost"} aria-pressed={returningOnly} onClick={() => setReturningOnly(!returningOnly)}><RotateCcw />Returning only</Button></div>
          <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Last activity</TableHead><TableHead>Visits</TableHead><TableHead title="New visit after 30 minutes without a recorded page visit">Return visits</TableHead><TableHead>Actions</TableHead><TableHead /></TableRow></TableHeader><TableBody>{people.length ? people.map((p) => <TableRow key={p.user_id}><TableCell className="font-medium">{p.user_name}</TableCell><TableCell title={format(new Date(p.last_seen),"dd MMM yyyy HH:mm:ss")}>{formatDistanceToNow(new Date(p.last_seen),{addSuffix:true})}</TableCell><TableCell className="tabular-nums">{p.visits}</TableCell><TableCell>{p.returns>0 ? <Badge variant="secondary">{p.returns}</Badge> : "—"}</TableCell><TableCell className="tabular-nums">{p.actions}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => {setUserId(p.user_id);setOffset(0);setTab("events");}}>View activity<ChevronRight /></Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">{query.isPending ? "Loading users…" : "No users in this selection."}</TableCell></TableRow>}</TableBody></Table>
        </TabsContent>
      </Tabs>
    </main>
  </div>;
}
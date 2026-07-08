import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Award, CheckCircle, Clock, Loader2, MinusCircle, RotateCcw, Search, XCircle } from "lucide-react";
import { sanitizeError } from "@/lib/errorHandler";

type JourneyType = "skill_ptc" | "idea_ptc" | "scaling_path";

const JOURNEY_COLS: { type: JourneyType; label: string; certType: string; certLabel: string }[] = [
  { type: "skill_ptc",    label: "Co-Builder",  certType: "cobuilder_b4",  certLabel: "Certified Co Builder" },
  { type: "idea_ptc",     label: "Initiator",   certType: "initiator_b4",  certLabel: "Certified Initiator" },
  { type: "scaling_path", label: "Consultant",  certType: "consultant_b4", certLabel: "Certified Consultant" },
];

type Journey = {
  id: string;
  user_id: string;
  journey_type: JourneyType;
  status: string;
  current_phase: number;
  updated_at: string;
};
type Profile = { user_id: string; full_name: string | null; email?: string | null };
type Cert = { user_id: string; certification_type: string; verified: boolean };

type Cell = {
  state: "not_started" | "in_progress" | "pending_approval" | "approved" | "rejected";
  journey?: Journey;
  certified: boolean;
};

export function AdminJourneyMatrix() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: j }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").order("full_name"),
        supabase.from("learning_journeys").select("id, user_id, journey_type, status, current_phase, updated_at"),
        supabase.from("user_certifications").select("user_id, certification_type, verified"),
      ]);
      setProfiles((p as Profile[]) ?? []);
      setJourneys((j as Journey[]) ?? []);
      setCerts((c as Cert[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? profiles.filter((p) => (p.full_name || "").toLowerCase().includes(q) || p.user_id.toLowerCase().includes(q))
      : profiles;
    return filtered.map((p) => {
      const cells: Record<JourneyType, Cell> = {} as any;
      for (const col of JOURNEY_COLS) {
        const j = journeys
          .filter((x) => x.user_id === p.user_id && x.journey_type === col.type)
          .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
        const cert = certs.find((c) => c.user_id === p.user_id && c.certification_type === col.certType && c.verified);
        let state: Cell["state"] = "not_started";
        if (cert || j?.status === "approved") state = "approved";
        else if (j?.status === "pending_approval") state = "pending_approval";
        else if (j?.status === "rejected") state = "rejected";
        else if (j) state = "in_progress";
        cells[col.type] = { state, journey: j, certified: !!cert };
      }
      return { profile: p, cells };
    });
  }, [profiles, journeys, certs, query]);

  const approve = async (userId: string, col: (typeof JOURNEY_COLS)[number], journey?: Journey) => {
    setBusy(`${userId}:${col.type}`);
    try {
      if (journey) {
        await supabase
          .from("learning_journeys")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", journey.id);
      }
      await supabase.from("user_certifications").upsert({
        user_id: userId,
        certification_type: col.certType,
        display_label: col.certLabel,
        verified: true,
      });
      await supabase.from("user_notifications").insert({
        user_id: userId,
        notification_type: "journey_approved",
        title: "Journey Approved!",
        message: `You've earned the "${col.certLabel}" certification.`,
        link: "/certifications",
      });
      toast({ title: "Certified", description: `${col.label} approved.` });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: sanitizeError(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const cancelCert = async (userId: string, col: (typeof JOURNEY_COLS)[number], journey?: Journey) => {
    setBusy(`${userId}:${col.type}`);
    try {
      await supabase
        .from("user_certifications")
        .delete()
        .eq("user_id", userId)
        .eq("certification_type", col.certType);
      if (journey) {
        await supabase
          .from("learning_journeys")
          .update({ status: "rejected", admin_notes: "Certification cancelled by admin." })
          .eq("id", journey.id);
      }
      await supabase.from("user_notifications").insert({
        user_id: userId,
        notification_type: "journey_rejected",
        title: "Certification cancelled",
        message: `Your "${col.certLabel}" certification has been cancelled by an admin.`,
        link: "/certifications",
      });
      toast({ title: "Cancelled", description: `${col.label} certification removed.` });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: sanitizeError(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const resetForRedo = async (userId: string, col: (typeof JOURNEY_COLS)[number], journey?: Journey) => {
    setBusy(`${userId}:${col.type}`);
    try {
      await supabase
        .from("user_certifications")
        .delete()
        .eq("user_id", userId)
        .eq("certification_type", col.certType);
      if (journey) {
        await supabase
          .from("learning_journeys")
          .update({ status: "in_progress", current_phase: 0, admin_notes: "Reset by admin to redo the path." })
          .eq("id", journey.id);
      }
      await supabase.from("user_notifications").insert({
        user_id: userId,
        notification_type: "journey_rejected",
        title: "Path reopened",
        message: `Your "${col.certLabel}" path has been reopened — redo it to regain the certification.`,
        link: "/certifications",
      });
      toast({ title: "Reopened", description: `${col.label} path reset for redo.` });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: sanitizeError(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const renderCell = (userId: string, col: (typeof JOURNEY_COLS)[number], cell: Cell) => {
    const key = `${userId}:${col.type}`;
    const isBusy = busy === key;
    if (isBusy) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;

    switch (cell.state) {
      case "approved":
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-emerald-500 text-white"><Award className="w-3 h-3 mr-1" />Certified</Badge>
            <ConfirmButton
              icon={RotateCcw}
              tone="default"
              label="Redo"
              title={`Reopen ${col.label} path for ${cell.journey ? "this user" : "the user"}?`}
              description="Removes the certification and resets the path to in-progress so the user can redo it."
              onConfirm={() => resetForRedo(userId, col, cell.journey)}
            />
            <ConfirmButton
              icon={MinusCircle}
              tone="destructive"
              label="Cancel"
              title={`Cancel ${col.label} certification?`}
              description="Removes the certification and marks the journey as rejected. The user is notified."
              onConfirm={() => cancelCert(userId, col, cell.journey)}
            />
          </div>
        );
      case "pending_approval":
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1" />To verify</Badge>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => approve(userId, col, cell.journey)}>
              <CheckCircle className="w-3 h-3 mr-1" /> Approve
            </Button>
          </div>
        );
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" /> Phase {(cell.journey?.current_phase ?? 0) + 1}
          </Badge>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => resetForRedo(userId, col, cell.journey)}>
              <RotateCcw className="w-3 h-3 mr-1" /> Reopen
            </Button>
          </div>
        );
      default:
        return <span className="text-xs text-muted-foreground">Not started</span>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="text-base">Users × Learning Paths</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Per-user status for every learning path. Approve to verify, cancel to revoke, or reopen to let a user redo the path.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user…"
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  {JOURNEY_COLS.map((c) => (
                    <TableHead key={c.type} className="min-w-[220px]">{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ profile, cells }) => (
                  <TableRow key={profile.user_id}>
                    <TableCell>
                      <div className="font-medium">{profile.full_name || "Unnamed user"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{profile.user_id.slice(0, 8)}</div>
                    </TableCell>
                    {JOURNEY_COLS.map((col) => (
                      <TableCell key={col.type}>{renderCell(profile.user_id, col, cells[col.type])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmButton({
  icon: Icon,
  label,
  tone,
  title,
  description,
  onConfirm,
}: {
  icon: any;
  label: string;
  tone: "default" | "destructive";
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant={tone === "destructive" ? "destructive" : "outline"}
          className="h-7 px-2"
        >
          <Icon className="w-3 h-3 mr-1" /> {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

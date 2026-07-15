import { useEffect, useState } from "react";
import { sanitizeError } from "@/lib/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw, Search, ExternalLink, Loader2, Bug, Eye } from "lucide-react";

interface BugReport {
  id: string;
  reporter_id: string | null;
  location: string;
  severity: "low" | "medium" | "high" | "critical";
  sub_task: string | null;
  description: string;
  screenshot_url: string | null;
  screenshot_path: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter_email?: string | null;
  reporter_name?: string | null;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/10 text-red-500 border-red-500/20",
  in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  closed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export function AdminBugsTab() {
  const { toast } = useToast();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BugReport["status"]>("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("beta_bug_reports" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reportsList = ((data || []) as unknown) as BugReport[];

      const reporterIds = Array.from(
        new Set(reportsList.map((r) => r.reporter_id).filter(Boolean))
      ) as string[];

      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};

      if (reporterIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id,full_name,email")
          .in("user_id", reporterIds);

        profileMap = (profiles || []).reduce((acc, p: any) => {
          acc[p.user_id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string | null }>);
      }

      setReports(
        reportsList.map((r) => ({
          ...r,
          reporter_name: r.reporter_id ? profileMap[r.reporter_id]?.full_name || null : null,
          reporter_email: r.reporter_id ? profileMap[r.reporter_id]?.email || null : null,
        }))
      );
    } catch (error: any) {
      toast({
        title: "Failed to load bug reports",
        description: sanitizeError(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleStatusChange = async (reportId: string, newStatus: BugReport["status"]) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("beta_bug_reports" as any)
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );

      if (selectedReport?.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus });
      }

      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: sanitizeError(error),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedReport) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("beta_bug_reports" as any)
        .update({ admin_notes: adminNotes.trim() || null })
        .eq("id", selectedReport.id);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id ? { ...r, admin_notes: adminNotes.trim() || null } : r
        )
      );

      setSelectedReport({ ...selectedReport, admin_notes: adminNotes.trim() || null });

      toast({ title: "Notes saved" });
    } catch (error: any) {
      toast({
        title: "Failed to save notes",
        description: sanitizeError(error),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const openDetail = (report: BugReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
  };

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      r.location.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      (r.sub_task && r.sub_task.toLowerCase().includes(query)) ||
      (r.reporter_email && r.reporter_email.toLowerCase().includes(query)) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-b4-coral" />
          <h2 className="text-xl font-semibold">Beta Bug Reports</h2>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadReports} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
          <Bug className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No bug reports found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-b4-teal/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className={SEVERITY_COLORS[report.severity]}>
                      {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                    </Badge>
                    <Badge variant="outline" className={STATUS_COLORS[report.status]}>
                      {report.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground mb-1">{report.location}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {report.description}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Sub-task: {report.sub_task || "General"}</span>
                    {report.reporter_email && <span>Reporter: {report.reporter_email}</span>}
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-2 items-center sm:items-end">
                  <Select
                    value={report.status}
                    onValueChange={(v) => handleStatusChange(report.id, v as BugReport["status"])}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => openDetail(report)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-b4-coral" />
              Bug Report Details
            </DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <span>Reported {new Date(selectedReport.created_at).toLocaleString()}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{selectedReport.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Severity:</span>
                  <p className="font-medium capitalize">{selectedReport.severity}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sub-task:</span>
                  <p className="font-medium">{selectedReport.sub_task || "General"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reporter:</span>
                  <p className="font-medium">
                    {selectedReport.reporter_name || selectedReport.reporter_email || "Anonymous"}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.screenshot_url && (
                <div>
                  <span className="text-sm text-muted-foreground">Screenshot:</span>
                  <a
                    href={selectedReport.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 group"
                  >
                    <img
                      src={selectedReport.screenshot_url}
                      alt="Bug screenshot"
                      className="max-h-64 rounded-lg border border-border object-cover"
                    />
                    <span className="inline-flex items-center text-xs text-b4-teal mt-1 group-hover:underline">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open screenshot
                    </span>
                  </a>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  placeholder="Internal notes about this issue..."
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveNotes} disabled={updating}>
                    {updating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

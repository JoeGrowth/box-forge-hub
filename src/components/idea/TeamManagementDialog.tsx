import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  UserPlus,
  DollarSign,
  PieChart,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Applicant {
  id: string;
  applicant_id: string;
  role_applied: string | null;
  cover_message: string | null;
  status: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
  natural_role: string | null;
}

interface TeamMemberData {
  id: string;
  member_user_id: string;
  role_type: string;
  added_at: string;
  full_name: string | null;
  avatar_url: string | null;
  compensation: {
    status: string;
    time_equity_percentage: number | null;
    performance_equity_percentage: number | null;
    monthly_salary: number | null;
    salary_currency: string | null;
    cliff_years: number | null;
    vesting_years: number | null;
    performance_milestone: string | null;
    current_proposer_id: string;
    version: number;
  } | null;
}

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: string;
  startupTitle: string;
  currentUserId: string;
}

const ROLE_LABELS: Record<string, string> = {
  MVCB: "Most Valuable Co-Builder",
  MMCB: "Most Matching Co-Builder",
  MLCB: "Most Loyal Co-Builder",
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "accepted":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
};

const getInitials = (name: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const TeamManagementDialog = ({
  open,
  onOpenChange,
  startupId,
  startupTitle,
  currentUserId,
}: TeamManagementDialogProps) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!startupId) return;
    setLoading(true);

    try {
      // Fetch applications
      const { data: apps } = await supabase
        .from("startup_applications")
        .select("id, applicant_id, role_applied, cover_message, status, created_at")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });

      // Fetch team members
      const { data: members } = await supabase
        .from("startup_team_members")
        .select("id, member_user_id, role_type, added_at")
        .eq("startup_id", startupId);

      // Collect all user IDs
      const appUserIds = apps?.map((a) => a.applicant_id) || [];
      const memberUserIds = members?.map((m) => m.member_user_id) || [];
      const allUserIds = [...new Set([...appUserIds, ...memberUserIds])];
      const memberIds = members?.map((m) => m.id) || [];

      // Fetch profiles, natural roles, and compensation in parallel
      const [profilesRes, naturalRolesRes, compensationRes] = await Promise.all([
        allUserIds.length > 0
          ? supabase
              .from("profiles")
              .select("user_id, full_name, avatar_url")
              .in("user_id", allUserIds)
          : { data: [] },
        allUserIds.length > 0
          ? supabase
              .from("natural_roles")
              .select("user_id, description")
              .in("user_id", allUserIds)
          : { data: [] },
        memberIds.length > 0
          ? supabase
              .from("team_compensation_offers")
              .select(
                "team_member_id, status, time_equity_percentage, performance_equity_percentage, monthly_salary, salary_currency, cliff_years, vesting_years, performance_milestone, current_proposer_id, version"
              )
              .in("team_member_id", memberIds)
          : { data: [] },
      ]);

      const profiles = profilesRes.data || [];
      const naturalRoles = naturalRolesRes.data || [];
      const compensations = compensationRes.data || [];

      // Enrich applicants
      const enrichedApplicants: Applicant[] = (apps || []).map((app) => {
        const profile = profiles.find((p) => p.user_id === app.applicant_id);
        const nr = naturalRoles.find((r) => r.user_id === app.applicant_id);
        return {
          ...app,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          natural_role: nr?.description || null,
        };
      });

      // Enrich team members
      const enrichedMembers: TeamMemberData[] = (members || []).map((m) => {
        const profile = profiles.find((p) => p.user_id === m.member_user_id);
        const comp = compensations.find((c) => c.team_member_id === m.id);
        return {
          ...m,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          compensation: comp
            ? {
                status: comp.status,
                time_equity_percentage: comp.time_equity_percentage,
                performance_equity_percentage: comp.performance_equity_percentage,
                monthly_salary: comp.monthly_salary,
                salary_currency: comp.salary_currency,
                cliff_years: comp.cliff_years,
                vesting_years: comp.vesting_years,
                performance_milestone: comp.performance_milestone,
                current_proposer_id: comp.current_proposer_id,
                version: comp.version,
              }
            : null,
        };
      });

      setApplicants(enrichedApplicants);
      setTeamMembers(enrichedMembers);
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const acceptedCount = applicants.filter((a) => a.status === "accepted").length;
  const pendingCount = applicants.filter((a) => a.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-b4-teal" />
            Team — {startupTitle}
          </DialogTitle>
          <DialogDescription>
            {applicants.length} applicant{applicants.length !== 1 ? "s" : ""} · {teamMembers.length} team member
            {teamMembers.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="applicants" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-6 mt-2 justify-start bg-muted/50">
              <TabsTrigger value="applicants" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Applicants
                {applicants.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {applicants.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="w-4 h-4" />
                Team
                {teamMembers.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {teamMembers.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Applicants Tab */}
            <TabsContent value="applicants" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full" style={{ maxHeight: "calc(85vh - 220px)" }}>
                <div className="p-6 pt-4 space-y-3">
                  {applicants.length === 0 ? (
                    <div className="text-center py-8">
                      <UserPlus className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No applications received yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Quick stats */}
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 rounded-lg border bg-emerald-500/5 p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-600">{acceptedCount}</p>
                          <p className="text-xs text-muted-foreground">Accepted</p>
                        </div>
                        <div className="flex-1 rounded-lg border bg-amber-500/5 p-3 text-center">
                          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="flex-1 rounded-lg border bg-muted/50 p-3 text-center">
                          <p className="text-2xl font-bold text-foreground">{applicants.length}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                      </div>

                      {applicants.map((applicant) => (
                        <div
                          key={applicant.id}
                          className="rounded-lg border bg-card p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-b4-teal/10 flex items-center justify-center text-b4-teal text-sm font-semibold shrink-0">
                                {applicant.avatar_url ? (
                                  <img
                                    src={applicant.avatar_url}
                                    alt={applicant.full_name || ""}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(applicant.full_name)
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {applicant.full_name || "Unknown User"}
                                </p>
                                {applicant.natural_role && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {applicant.natural_role}
                                  </p>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(applicant.status)}
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">Role Applied:</span>{" "}
                              <span className="font-medium text-foreground">
                                {applicant.role_applied || "Not specified"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Applied:</span>{" "}
                              <span className="font-medium text-foreground">
                                {format(new Date(applicant.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>

                          {applicant.cover_message && (
                            <div className="text-xs bg-muted/50 rounded-md p-3">
                              <p className="text-muted-foreground font-medium mb-1">Cover Message:</p>
                              <p className="text-foreground line-clamp-3">{applicant.cover_message}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full" style={{ maxHeight: "calc(85vh - 220px)" }}>
                <div className="p-6 pt-4 space-y-3">
                  {teamMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No team members added yet.</p>
                    </div>
                  ) : (
                    teamMembers.map((member) => {
                      const hasComp = !!member.compensation;
                      const isAgreed = member.compensation?.status === "accepted";
                      const totalEquity =
                        (member.compensation?.time_equity_percentage || 0) +
                        (member.compensation?.performance_equity_percentage || 0);
                      const isMyTurn =
                        hasComp && member.compensation!.current_proposer_id !== currentUserId;

                      return (
                        <div
                          key={member.id}
                          className="rounded-lg border bg-card p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-b4-teal/10 flex items-center justify-center text-b4-teal text-sm font-semibold shrink-0">
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.full_name || ""}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(member.full_name)
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {member.full_name || "Unknown User"}
                                </p>
                                <Badge variant="outline" className="text-xs mt-0.5">
                                  {ROLE_LABELS[member.role_type] || member.role_type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isAgreed ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Agreed
                                </Badge>
                              ) : hasComp ? (
                                <Badge
                                  variant="secondary"
                                  className={
                                    isMyTurn
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  }
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {isMyTurn ? "Your Turn" : "Waiting on Co-builder"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  No Offer Yet
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Added {format(new Date(member.added_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>

                          {/* Compensation Details */}
                          {hasComp && (
                            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                                <PieChart className="w-3 h-3" />
                                Compensation (v{member.compensation!.version})
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Time Equity:</span>{" "}
                                  <span className="font-semibold text-foreground">
                                    {member.compensation!.time_equity_percentage || 0}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Performance Equity:</span>{" "}
                                  <span className="font-semibold text-foreground">
                                    {member.compensation!.performance_equity_percentage || 0}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Equity:</span>{" "}
                                  <span className="font-bold text-b4-teal">{totalEquity}%</span>
                                </div>
                                {member.compensation!.monthly_salary != null &&
                                  member.compensation!.monthly_salary > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">Salary:</span>{" "}
                                      <span className="font-semibold text-foreground">
                                        {member.compensation!.monthly_salary}{" "}
                                        {member.compensation!.salary_currency || "USD"}/mo
                                      </span>
                                    </div>
                                  )}
                                <div>
                                  <span className="text-muted-foreground">Cliff:</span>{" "}
                                  <span className="font-medium text-foreground">
                                    {member.compensation!.cliff_years ?? 1} yr
                                    {(member.compensation!.cliff_years ?? 1) !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Vesting:</span>{" "}
                                  <span className="font-medium text-foreground">
                                    {member.compensation!.vesting_years ?? 4} yr
                                    {(member.compensation!.vesting_years ?? 4) !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                              {member.compensation!.performance_milestone && (
                                <div className="text-xs mt-1">
                                  <span className="text-muted-foreground">Milestone:</span>{" "}
                                  <span className="text-foreground">
                                    {member.compensation!.performance_milestone}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

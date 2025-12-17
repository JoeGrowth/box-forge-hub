import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserWithDetails } from "@/hooks/useAdmin";
import { 
  RefreshCw, 
  Search, 
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  Lightbulb,
  Users,
  HelpCircle
} from "lucide-react";

interface AdminUsersTabProps {
  users: UserWithDetails[];
  onRefresh: () => Promise<any>;
}

export function AdminUsersTab({ users, onRefresh }: AdminUsersTabProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "entrepreneur" | "cobuilder">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress" | "needs_help">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    toast({ title: "Users refreshed" });
  };

  const filteredUsers = users
    .filter((u) => {
      if (roleFilter === "all") return true;
      return u.onboarding?.primary_role === roleFilter;
    })
    .filter((u) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "completed") return u.onboarding?.onboarding_completed;
      if (statusFilter === "in_progress") return !u.onboarding?.onboarding_completed && !u.naturalRole?.status?.includes("assistance");
      if (statusFilter === "needs_help") return u.naturalRole?.status === "assistance_requested";
      return true;
    })
    .filter((u) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        u.profile?.full_name?.toLowerCase().includes(query) ||
        u.profile?.primary_skills?.toLowerCase().includes(query)
      );
    });

  const getUserStatus = (user: UserWithDetails) => {
    if (user.naturalRole?.status === "assistance_requested") {
      return { label: "Needs Help", color: "text-amber-500", icon: HelpCircle };
    }
    if (user.onboarding?.onboarding_completed) {
      return { label: "Completed", color: "text-b4-teal", icon: CheckCircle };
    }
    if (user.onboarding?.current_step && user.onboarding.current_step > 1) {
      return { label: "In Progress", color: "text-blue-500", icon: Clock };
    }
    return { label: "Not Started", color: "text-muted-foreground", icon: AlertCircle };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground py-1">Role:</span>
          <Button
            variant={roleFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("all")}
          >
            All
          </Button>
          <Button
            variant={roleFilter === "entrepreneur" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("entrepreneur")}
          >
            <Lightbulb className="w-4 h-4 mr-1" />
            Entrepreneurs
          </Button>
          <Button
            variant={roleFilter === "cobuilder" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("cobuilder")}
          >
            <Users className="w-4 h-4 mr-1" />
            Co-Builders
          </Button>
          
          <span className="text-sm text-muted-foreground py-1 ml-4">Status:</span>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </Button>
          <Button
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("in_progress")}
          >
            <Clock className="w-4 h-4 mr-1" />
            In Progress
          </Button>
          <Button
            variant={statusFilter === "needs_help" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("needs_help")}
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Needs Help
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Journey Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Progress</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = getUserStatus(user);
                  const journeyStatus = user.onboarding?.journey_status || "not_started";
                  
                  const getJourneyBadge = () => {
                    switch (journeyStatus) {
                      case "approved":
                        return { label: "Approved", className: "bg-b4-teal/10 text-b4-teal border-b4-teal/20" };
                      case "pending_approval":
                        return { label: "Pending Approval", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
                      case "rejected":
                        return { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20" };
                      case "in_progress":
                        return { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
                      default:
                        return { label: "Not Started", className: "bg-muted text-muted-foreground border-border" };
                    }
                  };
                  
                  const journeyBadge = getJourneyBadge();
                  
                  return (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-b4-teal/20 to-b4-coral/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {user.profile?.full_name || "Unnamed User"}
                            </p>
                            {user.profile?.primary_skills && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {user.profile.primary_skills}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.onboarding?.primary_role ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${
                            user.onboarding.primary_role === "entrepreneur" 
                              ? "bg-b4-teal/10 text-b4-teal border-b4-teal/20"
                              : "bg-b4-coral/10 text-b4-coral border-b4-coral/20"
                          }`}>
                            {user.onboarding.primary_role === "entrepreneur" ? (
                              <Lightbulb className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {user.onboarding.primary_role}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${journeyBadge.className}`}>
                            {journeyStatus === "approved" && <CheckCircle className="w-3 h-3" />}
                            {journeyStatus === "pending_approval" && <Clock className="w-3 h-3" />}
                            {journeyStatus === "rejected" && <AlertCircle className="w-3 h-3" />}
                            {journeyStatus === "in_progress" && <Clock className="w-3 h-3" />}
                            {journeyBadge.label}
                          </span>
                          {user.naturalRole?.wants_to_scale && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-600 border-purple-500/20">
                              Scaling Journey
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-b4-teal to-b4-coral rounded-full transition-all"
                              style={{ width: `${((user.onboarding?.current_step || 1) / 8) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {user.onboarding?.current_step || 1}/8
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}

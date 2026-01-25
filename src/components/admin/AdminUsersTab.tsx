import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserWithDetails } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  RefreshCw, 
  Search, 
  User,
  Lightbulb,
  Users,
} from "lucide-react";

interface AdminUsersTabProps {
  users: UserWithDetails[];
  onRefresh: () => Promise<any>;
}

type StatusFilter = "all" | "joined" | "resume" | "boost" | "scale";

export function AdminUsersTab({ users, onRefresh }: AdminUsersTabProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    toast({ title: "Users refreshed" });
  };

  // Determine user status based on user_status field
  const getUserStatusLevel = (user: UserWithDetails): "joined" | "resume" | "boost" | "scale" => {
    const userStatus = user.onboarding?.user_status;
    
    if (userStatus === "scaled") return "scale";
    if (userStatus === "boosted") return "boost";
    if (userStatus === "approved") return "resume";
    return "joined";
  };

  const filteredUsers = users
    .filter((u) => {
      if (statusFilter === "all") return true;
      return getUserStatusLevel(u) === statusFilter;
    })
    .filter((u) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        u.profile?.full_name?.toLowerCase().includes(query) ||
        u.profile?.primary_skills?.toLowerCase().includes(query)
      );
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getVisionLabel = (user: UserWithDetails) => {
    const potentialRole = user.onboarding?.potential_role;
    if (potentialRole === "potential_entrepreneur") return "Initiator";
    if (potentialRole === "potential_co_builder") return "Co Builder";
    return "—";
  };

  const getStatusLabel = (user: UserWithDetails) => {
    const level = getUserStatusLevel(user);
    switch (level) {
      case "scale": return "Scale";
      case "boost": return "Boost";
      case "resume": return "Resume";
      default: return "Joined";
    }
  };

  const getStatusBadgeClass = (user: UserWithDetails) => {
    const level = getUserStatusLevel(user);
    switch (level) {
      case "scale": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "boost": return "bg-b4-teal/10 text-b4-teal border-b4-teal/20";
      case "resume": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCertificationLabel = (user: UserWithDetails) => {
    const count = user.certificationCount;
    if (count === 0) return null;
    return `C${count}`;
  };

  const getScalingLabel = (user: UserWithDetails) => {
    const total = user.ideasAsInitiator + user.ideasAsCoBuilder + (user.hasConsultantScaling ? 1 : 0);
    if (total === 0) return null;
    return `S${total}`;
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
          <span className="text-sm text-muted-foreground py-1">Status:</span>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "joined" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("joined")}
          >
            Joined
          </Button>
          <Button
            variant={statusFilter === "resume" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("resume")}
          >
            Resume
          </Button>
          <Button
            variant={statusFilter === "boost" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("boost")}
          >
            Boost
          </Button>
          <Button
            variant={statusFilter === "scale" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("scale")}
          >
            Scale
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User Name</TableHead>
                <TableHead>Vision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Boost</TableHead>
                <TableHead>Scaling</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const statusLevel = getUserStatusLevel(user);
                  const showBoost = statusLevel === "boost" || statusLevel === "scale";
                  const showScaling = statusLevel === "scale";
                  const certLabel = getCertificationLabel(user);
                  const scalingLabel = getScalingLabel(user);
                  const visionLabel = getVisionLabel(user);

                  return (
                    <TableRow key={user.id}>
                      {/* User Name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-b4-teal/20 to-b4-coral/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-foreground" />
                          </div>
                          <span className="font-medium text-foreground">
                            {user.profile?.full_name || "Unnamed User"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Vision */}
                      <TableCell>
                        {visionLabel !== "—" ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            visionLabel === "Initiator" 
                              ? "bg-b4-teal/10 text-b4-teal border-b4-teal/20"
                              : "bg-b4-coral/10 text-b4-coral border-b4-coral/20"
                          }`}>
                            {visionLabel === "Initiator" ? (
                              <Lightbulb className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {visionLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(user)}`}>
                          {getStatusLabel(user)}
                        </span>
                      </TableCell>

                      {/* Boost (Certifications) */}
                      <TableCell>
                        {showBoost && certLabel ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Boost {certLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Scaling */}
                      <TableCell>
                        {showScaling && scalingLabel ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-600 border-purple-500/20">
                            {scalingLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Joined */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}

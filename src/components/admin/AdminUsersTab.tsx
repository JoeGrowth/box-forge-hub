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

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No users found
          </div>
        ) : (
          filteredUsers.map((user) => {
            const status = getUserStatus(user);
            
            return (
              <div
                key={user.id}
                className="bg-card rounded-xl border border-border p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-foreground">
                        {user.profile?.full_name || "Unnamed User"}
                      </h3>
                      {user.onboarding?.primary_role && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          user.onboarding.primary_role === "entrepreneur" 
                            ? "bg-b4-teal/10 text-b4-teal"
                            : "bg-b4-coral/10 text-b4-coral"
                        }`}>
                          {user.onboarding.primary_role}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color} bg-muted`}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        {user.profile?.primary_skills && (
                          <p className="text-muted-foreground">
                            Skills: {user.profile.primary_skills}
                          </p>
                        )}
                        {user.profile?.startup_name && (
                          <p className="text-muted-foreground">
                            Startup: {user.profile.startup_name}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          Joined: {formatDate(user.created_at)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        {user.onboarding && (
                          <p className="text-muted-foreground">
                            Onboarding Step: {user.onboarding.current_step} / 8
                          </p>
                        )}
                        {user.naturalRole?.is_ready && (
                          <p className="text-b4-teal font-medium">
                            ✓ Co-Builder Ready
                          </p>
                        )}
                      </div>
                    </div>

                    {user.naturalRole?.description && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-4">
                        <p className="text-sm italic text-foreground">
                          "{user.naturalRole.description}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, AdminNotification } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw, 
  Search, 
  Check, 
  X,
  User,
  Mail,
  Clock,
  Lightbulb,
  Users,
  Building2,
  Briefcase,
  GraduationCap
} from "lucide-react";

interface AdminApplicationsTabProps {
  applications: AdminNotification[];
  onRefresh: () => Promise<any>;
}

export function AdminApplicationsTab({ applications, onRefresh }: AdminApplicationsTabProps) {
  const { toast } = useToast();
  const { markNotificationAsRead } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "entrepreneur" | "cobuilder" | "partner">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    toast({ title: "Applications refreshed" });
  };

  const handleApprove = async (id: string, notification: AdminNotification) => {
    try {
      const data = parseApplicationData(notification);
      
      // If this is an entrepreneur application and we have a user_id (not placeholder)
      // We need to grant them entrepreneur role (which makes them an "initiator")
      if (data.role === "entrepreneur" && notification.user_id !== "00000000-0000-0000-0000-000000000000") {
        // Add entrepreneur role to user_roles table
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: notification.user_id,
            role: "entrepreneur" as const
          });
        
        if (roleError && !roleError.message.includes("duplicate")) {
          throw roleError;
        }
      }
      
      // Mark notification as read
      await markNotificationAsRead(id);
      
      toast({ 
        title: "Application Approved",
        description: data.role === "entrepreneur" 
          ? "Entrepreneur approved! They now have initiator privileges."
          : "The applicant will be notified.",
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error approving application",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    await markNotificationAsRead(id);
    toast({ 
      title: "Application Rejected",
      description: "The applicant will be notified.",
      variant: "destructive",
    });
    onRefresh();
  };

  const parseApplicationData = (notification: AdminNotification) => {
    try {
      return JSON.parse(notification.message || "{}");
    } catch {
      return {};
    }
  };

  const filteredApplications = applications
    .filter((a) => {
      if (roleFilter === "all") return true;
      const data = parseApplicationData(a);
      return data.role === roleFilter;
    })
    .filter((a) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        a.user_name?.toLowerCase().includes(query) ||
        a.user_email?.toLowerCase().includes(query)
      );
    });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "entrepreneur":
        return <Lightbulb className="w-5 h-5 text-b4-teal" />;
      case "cobuilder":
        return <Users className="w-5 h-5 text-b4-coral" />;
      case "partner":
        return <Building2 className="w-5 h-5 text-amber-500" />;
      default:
        return <User className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <Button
            variant={roleFilter === "partner" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("partner")}
          >
            <Building2 className="w-4 h-4 mr-1" />
            Partners
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No applications found
          </div>
        ) : (
          filteredApplications.map((application) => {
            const data = parseApplicationData(application);
            
            return (
              <div
                key={application.id}
                className={`bg-card rounded-xl border p-6 ${
                  application.is_read ? "border-border" : "border-b4-teal"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getRoleIcon(data.role)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        data.role === "entrepreneur" 
                          ? "bg-b4-teal/10 text-b4-teal"
                          : data.role === "cobuilder"
                          ? "bg-b4-coral/10 text-b4-coral"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {data.role}
                      </span>
                      {!application.is_read && (
                        <span className="px-2 py-0.5 rounded-full bg-b4-coral text-white text-xs font-medium">
                          New
                        </span>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground font-medium">
                            {data.firstName} {data.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{data.email}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {data.role === "entrepreneur" && (
                          <>
                            {data.startupName && (
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{data.startupName}</span>
                              </div>
                            )}
                            {data.preferredSector && (
                              <div className="text-sm text-muted-foreground">
                                Sector: {data.preferredSector}
                              </div>
                            )}
                          </>
                        )}
                        {data.role === "cobuilder" && (
                          <>
                            {data.primarySkills && (
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{data.primarySkills}</span>
                              </div>
                            )}
                            {data.yearsOfExperience && (
                              <div className="flex items-center gap-2 text-sm">
                                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{data.yearsOfExperience} years exp.</span>
                              </div>
                            )}
                          </>
                        )}
                        {data.role === "partner" && (
                          <>
                            {data.organizationName && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{data.organizationName}</span>
                              </div>
                            )}
                            {data.partnershipInterest && (
                              <div className="text-sm text-muted-foreground">
                                Interest: {data.partnershipInterest}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {data.bio && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-4">
                        <p className="text-sm text-foreground">{data.bio}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(application.created_at || "")}
                    </div>
                  </div>

                  {!application.is_read && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="teal"
                        size="sm"
                        onClick={() => handleApprove(application.id, application)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(application.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

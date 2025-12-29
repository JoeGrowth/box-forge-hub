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
  AlertCircle, 
  HelpCircle,
  User,
  Mail,
  Clock,
  Play
} from "lucide-react";

interface AdminNotificationsTabProps {
  notifications: AdminNotification[];
  onRefresh: () => Promise<any>;
}

export function AdminNotificationsTab({ notifications, onRefresh }: AdminNotificationsTabProps) {
  const { toast } = useToast();
  const { markNotificationAsRead } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    toast({ title: "Notifications refreshed" });
  };

  const handleMarkAsRead = async (id: string) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      toast({ title: "Marked as read" });
    }
  };

  const handleAllowNaturalRoleRetry = async (notification: AdminNotification) => {
    setProcessingUserId(notification.user_id);
    try {
      // Reset the natural role status so user can try again
      const { error: nrError } = await supabase
        .from("natural_roles")
        .update({ 
          status: "pending",
          description: null 
        })
        .eq("user_id", notification.user_id);

      if (nrError) throw nrError;

      // Reset onboarding step to Natural Role definition step (step 2)
      // Also reset onboarding_completed to false so user can access onboarding
      const { error: osError } = await supabase
        .from("onboarding_state")
        .update({ 
          current_step: 2,
          journey_status: "in_progress",
          onboarding_completed: false
        })
        .eq("user_id", notification.user_id);

      if (osError) throw osError;

      // Send user notification that they can retry
      await supabase.from("user_notifications").insert({
        user_id: notification.user_id,
        notification_type: "natural_role_retry",
        title: "You can now define your Natural Role",
        message: "An admin has enabled you to retry defining your Natural Role. Please log in to continue your onboarding journey.",
        link: "/onboarding"
      });

      // Mark admin notification as read
      await markNotificationAsRead(notification.id);

      toast({ 
        title: "User enabled for retry",
        description: `${notification.user_name || "User"} can now retry defining their Natural Role.`
      });

      await onRefresh();
    } catch (error) {
      console.error("Error enabling retry:", error);
      toast({ 
        title: "Error",
        description: "Failed to enable retry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const filteredNotifications = notifications
    .filter((n) => {
      if (filter === "unread") return !n.is_read;
      if (filter === "read") return n.is_read;
      return true;
    })
    .filter((n) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        n.user_name?.toLowerCase().includes(query) ||
        n.user_email?.toLowerCase().includes(query) ||
        n.notification_type.toLowerCase().includes(query) ||
        n.step_name?.toLowerCase().includes(query)
      );
    })
    // Exclude application submissions (shown in Applications tab)
    .filter((n) => n.notification_type !== "application_submission");

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assistance_requested":
      case "nr_help_requested":
        return <HelpCircle className="w-5 h-5 text-amber-500" />;
      case "onboarding_stuck":
        return <AlertCircle className="w-5 h-5 text-b4-coral" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
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
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread
          </Button>
          <Button
            variant={filter === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("read")}
          >
            Read
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

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No notifications found
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card rounded-xl border p-6 transition-all ${
                notification.is_read ? "border-border" : "border-b4-teal bg-b4-teal/5"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                      {notification.notification_type.replace(/_/g, " ")}
                    </span>
                    {notification.step_name && (
                      <span className="px-2 py-0.5 rounded-full bg-b4-teal/10 text-b4-teal text-xs font-medium">
                        {notification.step_name}
                      </span>
                    )}
                    {!notification.is_read && (
                      <span className="px-2 py-0.5 rounded-full bg-b4-coral text-white text-xs font-medium">
                        New
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {notification.user_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{notification.user_name}</span>
                      </div>
                    )}
                    {notification.user_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{notification.user_email}</span>
                      </div>
                    )}
                    {notification.nr_description && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-2">
                        <p className="text-sm italic text-foreground">
                          "{notification.nr_description}"
                        </p>
                      </div>
                    )}
                    {notification.message && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {notification.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(notification.created_at || "")}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {notification.notification_type === "nr_help_requested" && (
                    <Button
                      variant="teal"
                      size="sm"
                      onClick={() => handleAllowNaturalRoleRetry(notification)}
                      disabled={processingUserId === notification.user_id}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      {processingUserId === notification.user_id ? "Processing..." : "Enable Retry"}
                    </Button>
                  )}
                  {!notification.is_read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

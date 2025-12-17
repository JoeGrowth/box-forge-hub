import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendNotificationEmail } from "@/lib/emailNotifications";
import {
  User,
  Mail,
  Clock,
  Check,
  X,
  MessageSquare,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Application {
  id: string;
  applicant_id: string;
  role_applied: string | null;
  cover_message: string | null;
  status: string;
  created_at: string;
  applicant_profile?: {
    full_name: string | null;
  };
  applicant_email?: string;
}

interface IdeaApplicationsViewerProps {
  ideaId: string;
  ideaTitle: string;
}

export function IdeaApplicationsViewer({ ideaId, ideaTitle }: IdeaApplicationsViewerProps) {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch applications for this idea
      const { data: apps, error } = await supabase
        .from("startup_applications")
        .select("*")
        .eq("startup_id", ideaId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each applicant
      const applicationsWithProfiles = await Promise.all(
        (apps || []).map(async (app) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", app.applicant_id)
            .maybeSingle();

          // Get email from auth (we can't directly access auth.users, so we'll show profile name)
          return {
            ...app,
            applicant_profile: profile,
          };
        })
      );

      setApplications(applicationsWithProfiles);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [ideaId]);

  const handleUpdateStatus = async (
    applicationId: string,
    newStatus: "accepted" | "rejected",
    applicantId: string,
    applicantName: string | null
  ) => {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from("startup_applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) throw error;

      // Create in-app notification for applicant
      await supabase.from("user_notifications").insert({
        user_id: applicantId,
        title: newStatus === "accepted" 
          ? "Application Accepted! 🎉" 
          : "Application Update",
        message: newStatus === "accepted"
          ? `Your application to join "${ideaTitle}" has been accepted! The initiator will reach out to you.`
          : `Your application to join "${ideaTitle}" was not accepted at this time.`,
        notification_type: `application_${newStatus}`,
        link: "/opportunities",
      });

      toast({
        title: newStatus === "accepted" ? "Application Accepted" : "Application Rejected",
        description: `The applicant has been notified.`,
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No applications yet</p>
        <p className="text-xs mt-1">Co-builders will be able to apply once your idea is approved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Applications Received
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-b4-coral text-white text-xs">
              {pendingCount} pending
            </span>
          )}
        </h4>
        <Button variant="ghost" size="sm" onClick={fetchApplications}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {applications.map((application) => (
          <div
            key={application.id}
            className={`rounded-lg border p-4 ${
              application.status === "pending"
                ? "border-b4-teal/50 bg-b4-teal/5"
                : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {application.applicant_profile?.full_name || "Anonymous User"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      application.status === "pending"
                        ? "bg-amber-500/10 text-amber-600"
                        : application.status === "accepted"
                        ? "bg-b4-teal/10 text-b4-teal"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </div>

                {application.role_applied && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    Applying for: <span className="text-foreground">{application.role_applied}</span>
                  </div>
                )}

                {application.cover_message && (
                  <div className="bg-background/50 rounded-md p-3 mt-2">
                    <p className="text-sm text-foreground">{application.cover_message}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                </div>
              </div>

              {application.status === "pending" && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() =>
                      handleUpdateStatus(
                        application.id,
                        "accepted",
                        application.applicant_id,
                        application.applicant_profile?.full_name || null
                      )
                    }
                    disabled={processingId === application.id}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleUpdateStatus(
                        application.id,
                        "rejected",
                        application.applicant_id,
                        application.applicant_profile?.full_name || null
                      )
                    }
                    disabled={processingId === application.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

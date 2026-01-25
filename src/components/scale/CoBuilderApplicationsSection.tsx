import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MessageSquare,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  ExternalLink,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { IdeaProgressViewDialog } from "@/components/idea/IdeaProgressViewDialog";

interface Application {
  id: string;
  startup_id: string;
  role_applied: string | null;
  cover_message: string | null;
  status: string;
  created_at: string;
  startup?: {
    id: string;
    title: string;
    description: string;
    sector: string | null;
  };
  has_conversation: boolean;
  unread_count: number;
}

interface TeamMembership {
  id: string;
  startup_id: string;
  role_type: string;
  added_at: string;
  startup?: {
    id: string;
    title: string;
    description: string;
    sector: string | null;
  };
}

interface CoBuilderApplicationsSectionProps {
  userId: string;
}

export function CoBuilderApplicationsSection({ userId }: CoBuilderApplicationsSectionProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<{ id: string; title: string } | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch applications where user is the applicant (not initiator)
      const { data: apps, error } = await supabase
        .from("startup_applications")
        .select(`
          id,
          startup_id,
          role_applied,
          cover_message,
          status,
          created_at,
          startup:startup_ideas(id, title, description, sector)
        `)
        .eq("applicant_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check for conversations and unread messages for each application
      const applicationsWithChat = await Promise.all(
        (apps || []).map(async (app) => {
          const { data: conversation } = await supabase
            .from("chat_conversations")
            .select("id")
            .eq("application_id", app.id)
            .maybeSingle();

          let unreadCount = 0;
          if (conversation) {
            const { count } = await supabase
              .from("chat_messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conversation.id)
              .eq("is_read", false)
              .neq("sender_id", userId);
            unreadCount = count || 0;
          }

          return {
            ...app,
            startup: app.startup as Application["startup"],
            has_conversation: !!conversation,
            unread_count: unreadCount,
          };
        })
      );

      setApplications(applicationsWithChat);

      // Fetch team memberships where user was directly added
      const { data: memberships, error: membershipError } = await supabase
        .from("startup_team_members")
        .select(`
          id,
          startup_id,
          role_type,
          added_at,
          startup:startup_ideas(id, title, description, sector)
        `)
        .eq("member_user_id", userId)
        .order("added_at", { ascending: false });

      if (membershipError) throw membershipError;

      // Filter out memberships for startups where user already has an application
      const applicationStartupIds = new Set(applicationsWithChat.map(a => a.startup_id));
      const filteredMemberships = (memberships || [])
        .filter(m => !applicationStartupIds.has(m.startup_id))
        .map(m => ({
          ...m,
          startup: m.startup as TeamMembership["startup"],
        }));

      setTeamMemberships(filteredMemberships);
    } catch (error) {
      console.error("Error fetching co-builder applications:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchApplications();
  }, [fetchApplications]);

  // Real-time subscription for application status changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("cobuilder-applications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "startup_applications",
          filter: `applicant_id=eq.${userId}`,
        },
        () => {
          fetchApplications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          // Refresh to update unread counts
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchApplications]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-b4-teal text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (applications.length === 0 && teamMemberships.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Applications Yet</h3>
          <p className="text-muted-foreground mb-4">
            You haven't applied to any opportunities yet. Explore available startups and join a team!
          </p>
          <Button variant="teal" asChild>
            <Link to="/opportunities">
              <Briefcase className="w-4 h-4 mr-2" />
              Browse Opportunities
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const acceptedCount = applications.filter((a) => a.status === "accepted").length;
  const totalTeamCount = teamMemberships.length + acceptedCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Your Co-Builder Journey</h2>
          <p className="text-muted-foreground mt-1">
            Teams you're part of and opportunities you've applied to
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/opportunities">
            <Briefcase className="w-4 h-4 mr-2" />
            Browse More
          </Link>
        </Button>
      </div>

      {totalTeamCount > 0 && (
        <div className="p-4 rounded-lg bg-b4-teal/10 border border-b4-teal/20">
          <div className="flex items-center gap-2 text-b4-teal">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              You're part of {totalTeamCount} team{totalTeamCount > 1 ? "s" : ""}!
            </span>
          </div>
        </div>
      )}

      {/* Team Memberships - Direct additions */}
      {teamMemberships.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-b4-teal" />
            Teams You're Part Of
          </h3>
          <div className="grid gap-4">
            {teamMemberships.map((membership) => (
              <Card
                key={membership.id}
                className="border-b4-teal/30 bg-b4-teal/5 transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {membership.startup?.title || "Unknown Startup"}
                        </h3>
                        <Badge className="bg-b4-teal text-white">
                          <Users className="w-3 h-3 mr-1" />
                          Team Member
                        </Badge>
                      </div>

                      {membership.startup?.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {membership.startup.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          <span>Role: <span className="text-foreground font-medium">{membership.role_type}</span></span>
                        </div>
                        {membership.startup?.sector && (
                          <Badge variant="outline">{membership.startup.sector}</Badge>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Added {formatDistanceToNow(new Date(membership.added_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStartup({
                            id: membership.startup_id,
                            title: membership.startup?.title || "Startup",
                          });
                          setProgressDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        View Progress
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/opportunities/${membership.startup_id}`}>
                          <ExternalLink className="w-4 h-4 mr-1.5" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {applications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-muted-foreground" />
            Your Applications
          </h3>
          <div className="grid gap-4">
            {applications.map((application) => (
              <Card
                key={application.id}
                className={`border-border/50 transition-all hover:shadow-md ${
                  application.status === "accepted" ? "border-b4-teal/30 bg-b4-teal/5" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {application.startup?.title || "Unknown Opportunity"}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>

                      {application.startup?.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {application.startup.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {application.role_applied && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Briefcase className="w-4 h-4" />
                            <span>Applied as: <span className="text-foreground font-medium">{application.role_applied}</span></span>
                          </div>
                        )}
                        {application.startup?.sector && (
                          <Badge variant="outline">{application.startup.sector}</Badge>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {application.status === "accepted" && application.has_conversation && (
                        <Button variant="teal" size="sm" asChild className="relative">
                          <Link to={`/chat/${application.id}`}>
                            <MessageSquare className="w-4 h-4 mr-1.5" />
                            Open Chat
                            {application.unread_count > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-b4-coral text-white text-xs font-medium px-1">
                                {application.unread_count}
                              </span>
                            )}
                          </Link>
                        </Button>
                      )}
                      {application.status === "accepted" && !application.has_conversation && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/chat/${application.id}`}>
                            <MessageSquare className="w-4 h-4 mr-1.5" />
                            Start Chat
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStartup({
                            id: application.startup_id,
                            title: application.startup?.title || "Startup",
                          });
                          setProgressDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        View Progress
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/opportunities/${application.startup_id}`}>
                          <ExternalLink className="w-4 h-4 mr-1.5" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Progress View Dialog */}
      {selectedStartup && (
        <IdeaProgressViewDialog
          open={progressDialogOpen}
          onOpenChange={setProgressDialogOpen}
          startupId={selectedStartup.id}
          startupTitle={selectedStartup.title}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User, Eye, Award, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LearningJourney {
  id: string;
  user_id: string;
  journey_type: string;
  current_phase: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface JourneyPhaseResponse {
  id: string;
  journey_id: string;
  phase_number: number;
  phase_name: string;
  responses: Record<string, any>;
  completed_tasks: string[];
  is_completed: boolean;
}

interface Profile {
  full_name: string | null;
  user_id: string;
}

export const AdminLearningJourneysTab = () => {
  const { toast } = useToast();
  const [journeys, setJourneys] = useState<LearningJourney[]>([]);
  const [phaseResponses, setPhaseResponses] = useState<Record<string, JourneyPhaseResponse[]>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchJourneys = async () => {
    setLoading(true);
    try {
      // Fetch pending journeys
      const { data: journeysData, error: journeysError } = await supabase
        .from("learning_journeys")
        .select("*")
        .in("status", ["pending_approval", "in_progress", "approved", "rejected"])
        .order("updated_at", { ascending: false });

      if (journeysError) throw journeysError;

      setJourneys(journeysData || []);

      // Fetch profiles for all users
      const userIds = [...new Set((journeysData || []).map((j) => j.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profilesMap: Record<string, Profile> = {};
        (profilesData || []).forEach((p) => {
          profilesMap[p.user_id] = p;
        });
        setProfiles(profilesMap);
      }

      // Fetch phase responses for all journeys
      const journeyIds = (journeysData || []).map((j) => j.id);
      if (journeyIds.length > 0) {
        const { data: responsesData } = await supabase
          .from("journey_phase_responses")
          .select("*")
          .in("journey_id", journeyIds);

        const responsesMap: Record<string, JourneyPhaseResponse[]> = {};
        (responsesData || []).forEach((r) => {
          if (!responsesMap[r.journey_id]) {
            responsesMap[r.journey_id] = [];
          }
          responsesMap[r.journey_id].push(r as JourneyPhaseResponse);
        });
        setPhaseResponses(responsesMap);
      }
    } catch (error) {
      console.error("Error fetching journeys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  const handleApprove = async (journey: LearningJourney) => {
    setProcessing(journey.id);
    try {
      // Update journey status
      const { error: updateError } = await supabase
        .from("learning_journeys")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes[journey.id] || null,
        })
        .eq("id", journey.id);

      if (updateError) throw updateError;

      // Create certification
      const certType =
        journey.journey_type === "skill_ptc"
          ? "cobuilder_b4"
          : journey.journey_type === "idea_ptc"
            ? "initiator_b4"
            : journey.journey_type === "scaling_path"
              ? "consultant_b4"
              : "scaling_complete";

      const certLabel =
        journey.journey_type === "skill_ptc"
          ? "Vaccinated Co Builder"
          : journey.journey_type === "idea_ptc"
            ? "Vaccinated Initiator"
            : journey.journey_type === "scaling_path"
              ? "Certified Consultant"
              : "Scaled";

      await supabase.from("user_certifications").upsert({
        user_id: journey.user_id,
        certification_type: certType,
        display_label: certLabel,
        verified: true,
      });

      // Determine boost_type based on journey
      const boostType =
        journey.journey_type === "skill_ptc"
          ? "boosted_co_builder"
          : journey.journey_type === "idea_ptc"
            ? "boosted_initiator"
            : journey.journey_type === "scaling_path"
              ? "boosted_talent"
              : null;

      // Update user_status to boosted (only for skill_ptc and idea_ptc)
      // For scaling_path, update to scaled
      if (journey.journey_type === "scaling_path") {
        await supabase
          .from("onboarding_state")
          .update({
            user_status: "scaled",
            scale_type: "personal_promise",
          })
          .eq("user_id", journey.user_id);
      } else {
        await supabase
          .from("onboarding_state")
          .update({
            user_status: "boosted",
            boost_type: boostType,
          })
          .eq("user_id", journey.user_id);
      }

      // Notify user
      await supabase.from("user_notifications").insert({
        user_id: journey.user_id,
        notification_type: "journey_approved",
        title: "Journey Approved!",
        message: `Congratulations! Your ${journey.journey_type.replace("_", " ").toUpperCase()} journey has been approved. You've earned the "${certLabel}" certification!`,
        link: journey.journey_type === "scaling_path" ? "/scale" : "/journey",
      });

      toast({
        title: "Journey Approved",
        description: "User has been certified, status updated, and notified.",
      });

      fetchJourneys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (journey: LearningJourney) => {
    if (!adminNotes[journey.id]?.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide feedback notes before rejecting.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(journey.id);
    try {
      await supabase
        .from("learning_journeys")
        .update({
          status: "rejected",
          admin_notes: adminNotes[journey.id],
        })
        .eq("id", journey.id);

      await supabase.from("user_notifications").insert({
        user_id: journey.user_id,
        notification_type: "journey_rejected",
        title: "Journey Needs Revision",
        message: `Your ${journey.journey_type.replace("_", " ").toUpperCase()} journey needs revision. Please check the feedback and try again.`,
        link: "/profile",
      });

      toast({
        title: "Journey Rejected",
        description: "User has been notified with feedback.",
      });

      fetchJourneys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return (
          <Badge className="bg-amber-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-b4-teal text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getJourneyTypeLabel = (type: string) => {
    switch (type) {
      case "skill_ptc":
        return "Learn to be a Co-Builder";
      case "idea_ptc":
        return "Learn to be an Initiator";
      case "scaling_path":
        return "Learn to be a Consultant";
      default:
        return type;
    }
  };

  const renderQuizResponse = (key: string, value: any) => {
    // Handle quiz response format
    if (key.startsWith("quiz_") && typeof value === "object" && value !== null) {
      const quizData = value as { question?: string; type?: string; answer?: any; isCorrect?: boolean | null };
      return (
        <div key={key} className="mb-4 p-3 rounded-lg bg-background border">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-foreground">{quizData.question || key}</p>
            {quizData.isCorrect !== null && quizData.isCorrect !== undefined && (
              <Badge variant={quizData.isCorrect ? "default" : "secondary"} className={quizData.isCorrect ? "bg-green-500" : ""}>
                {quizData.isCorrect ? "Correct" : "Incorrect"}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mb-1">Type: {quizData.type || "unknown"}</div>
          <div className="text-sm">
            <span className="text-muted-foreground">Answer: </span>
            <span className="text-foreground">
              {typeof quizData.answer === "object" 
                ? JSON.stringify(quizData.answer, null, 2)
                : String(quizData.answer || "No answer")}
            </span>
          </div>
        </div>
      );
    }
    
    // Default display for non-quiz responses
    return (
      <div key={key} className="mb-2">
        <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</p>
        <p className="text-sm">{String(value)}</p>
      </div>
    );
  };

  const pendingJourneys = journeys.filter((j) => j.status === "pending_approval");
  const otherJourneys = journeys.filter((j) => j.status !== "pending_approval");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approval Section */}
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Pending Approval ({pendingJourneys.length})
        </h3>

        {pendingJourneys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No journeys pending approval</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingJourneys.map((journey) => (
              <Card key={journey.id} className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">
                          {profiles[journey.user_id]?.full_name || "Unknown User"}
                        </CardTitle>
                        <CardDescription>{getJourneyTypeLabel(journey.journey_type)}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(journey.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Collapsible
                    open={expandedJourney === journey.id}
                    onOpenChange={() => setExpandedJourney(expandedJourney === journey.id ? null : journey.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View Responses
                        {expandedJourney === journey.id ? (
                          <ChevronUp className="w-4 h-4 ml-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-2" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4">
                      {(phaseResponses[journey.id] || [])
                        .sort((a, b) => a.phase_number - b.phase_number)
                        .map((response) => (
                          <div key={response.id} className="p-4 rounded-lg border bg-muted/50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">
                                Phase {response.phase_number + 1}: {response.phase_name}
                              </h4>
                              {response.is_completed && (
                                <Badge className="bg-green-500">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>

                            {/* Questions/Responses */}
                            <div className="space-y-2">
                              {Object.entries(response.responses || {}).map(([key, value]) => 
                                renderQuizResponse(key, value)
                              )}
                            </div>

                            {/* Completed Tasks */}
                            {(response.completed_tasks || []).length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Completed Tasks:</p>
                                <div className="flex flex-wrap gap-2">
                                  {response.completed_tasks.map((task) => (
                                    <Badge key={task} variant="outline" className="capitalize">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {task.replace(/_/g, " ")}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </CollapsibleContent>
                  </Collapsible>

                  <div>
                    <label className="text-sm font-medium">Admin Notes / Feedback</label>
                    <Textarea
                      value={adminNotes[journey.id] || ""}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({
                          ...prev,
                          [journey.id]: e.target.value,
                        }))
                      }
                      placeholder="Add notes or feedback for the user..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(journey)}
                      disabled={processing === journey.id}
                      className="flex-1"
                    >
                      {processing === journey.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Award className="w-4 h-4 mr-2" />
                      )}
                      Approve & Certify
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(journey)}
                      disabled={processing === journey.id}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Other Journeys */}
      <div>
        <h3 className="font-semibold text-lg mb-4">All Journeys ({otherJourneys.length})</h3>

        {otherJourneys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No other journeys</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {otherJourneys.map((journey) => (
              <Card key={journey.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{profiles[journey.user_id]?.full_name || "Unknown User"}</p>
                        <p className="text-sm text-muted-foreground">
                          {getJourneyTypeLabel(journey.journey_type)} • Phase {journey.current_phase + 1}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(journey.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

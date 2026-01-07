import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  History, 
  Edit2, 
  X, 
  ChevronDown, 
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface AnswerVersion {
  id: string;
  version_number: number;
  description: string | null;
  practice_entities: string | null;
  practice_case_studies: number | null;
  training_contexts: string | null;
  training_count: number | null;
  consulting_with_whom: string | null;
  consulting_case_studies: string | null;
  promise_check: boolean | null;
  practice_check: boolean | null;
  training_check: boolean | null;
  consulting_check: boolean | null;
  wants_to_scale: boolean | null;
  created_at: string;
  change_notes: string | null;
}

const Resume = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { naturalRole, onboardingState, refetch } = useOnboarding();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<AnswerVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [editData, setEditData] = useState({
    description: "",
    practice_entities: "",
    training_contexts: "",
    consulting_with_whom: "",
    consulting_case_studies: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (naturalRole) {
      setEditData({
        description: naturalRole.description || "",
        practice_entities: naturalRole.practice_entities || "",
        training_contexts: naturalRole.training_contexts || "",
        consulting_with_whom: naturalRole.consulting_with_whom || "",
        consulting_case_studies: naturalRole.consulting_case_studies || "",
      });
    }
  }, [naturalRole]);

  useEffect(() => {
    const fetchVersions = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("onboarding_answer_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version_number", { ascending: false });
      
      if (!error && data) {
        setVersions(data);
      }
    };
    
    fetchVersions();
  }, [user]);

  const handleSave = async () => {
    if (!user || !naturalRole) return;
    
    setIsSaving(true);
    try {
      // Get next version number
      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
      
      // Save current state as a version
      const { error: versionError } = await supabase
        .from("onboarding_answer_versions")
        .insert({
          user_id: user.id,
          version_number: nextVersion,
          description: editData.description,
          practice_entities: editData.practice_entities,
          practice_case_studies: naturalRole.practice_case_studies,
          training_contexts: editData.training_contexts,
          training_count: naturalRole.training_count,
          consulting_with_whom: editData.consulting_with_whom,
          consulting_case_studies: editData.consulting_case_studies,
          promise_check: naturalRole.promise_check,
          practice_check: naturalRole.practice_check,
          training_check: naturalRole.training_check,
          consulting_check: naturalRole.consulting_check,
          wants_to_scale: naturalRole.wants_to_scale,
          change_notes: changeNotes || null,
        });
      
      if (versionError) throw versionError;
      
      // Update the natural_roles table
      const { error: updateError } = await supabase
        .from("natural_roles")
        .update(editData)
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Resume Updated",
        description: `Version ${nextVersion} saved successfully.`,
      });
      
      setIsEditing(false);
      setChangeNotes("");
      refetch();
      
      // Refresh versions
      const { data } = await supabase
        .from("onboarding_answer_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version_number", { ascending: false });
      
      if (data) setVersions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const restoreVersion = async (version: AnswerVersion) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const nextVersionNum = versions.length > 0 ? versions[0].version_number + 1 : 1;
      
      // Create a new version with restored data
      const { error: versionError } = await supabase
        .from("onboarding_answer_versions")
        .insert({
          user_id: user.id,
          version_number: nextVersionNum,
          description: version.description,
          practice_entities: version.practice_entities,
          practice_case_studies: version.practice_case_studies,
          training_contexts: version.training_contexts,
          training_count: version.training_count,
          consulting_with_whom: version.consulting_with_whom,
          consulting_case_studies: version.consulting_case_studies,
          promise_check: version.promise_check,
          practice_check: version.practice_check,
          training_check: version.training_check,
          consulting_check: version.consulting_check,
          wants_to_scale: version.wants_to_scale,
          change_notes: `Restored from version ${version.version_number}`,
        });
      
      if (versionError) throw versionError;
      
      // Update natural_roles
      const { error: updateError } = await supabase
        .from("natural_roles")
        .update({
          description: version.description,
          practice_entities: version.practice_entities,
          training_contexts: version.training_contexts,
          consulting_with_whom: version.consulting_with_whom,
          consulting_case_studies: version.consulting_case_studies,
        })
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}.`,
      });
      
      refetch();
      
      // Refresh versions
      const { data } = await supabase
        .from("onboarding_answer_versions")
        .select("*")
        .eq("user_id", user.id)
        .order("version_number", { ascending: false });
      
      if (data) setVersions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore version.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const StatusBadge = ({ checked }: { checked: boolean | null }) =>
    checked ? (
      <Badge variant="default" className="bg-b4-teal text-white">
        <CheckCircle className="w-3 h-3 mr-1" /> Complete
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
      </Badge>
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Your Resume</h1>
              <p className="text-muted-foreground mt-1">
                Your onboarding journey answers with version history
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                History ({versions.length})
              </Button>
              {!isEditing ? (
                <Button variant="teal" onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button variant="teal" onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Version History Panel */}
          {showHistory && (
            <Card className="mb-6 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Version History
                </CardTitle>
                <CardDescription>
                  View and restore previous versions of your answers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No versions yet. Save your first edit to create a version.
                  </p>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {versions.map((version, index) => (
                        <Collapsible key={version.id}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Version {version.version_number}</span>
                                  {index === 0 && (
                                    <Badge variant="outline" className="text-xs">Current</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </div>
                                {version.change_notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    {version.change_notes}
                                  </p>
                                )}
                              </div>
                            </CollapsibleTrigger>
                            {index !== 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreVersion(version)}
                                disabled={isSaving}
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                          <CollapsibleContent className="pl-10 pr-4 pb-3">
                            <div className="space-y-2 text-sm mt-2">
                              <div>
                                <span className="text-muted-foreground">Description:</span>
                                <p className="bg-background rounded p-2 mt-1">
                                  {version.description || "Not provided"}
                                </p>
                              </div>
                              {version.practice_check && version.practice_entities && (
                                <div>
                                  <span className="text-muted-foreground">Practice:</span>
                                  <p className="bg-background rounded p-2 mt-1">
                                    {version.practice_entities}
                                  </p>
                                </div>
                              )}
                              {version.training_check && version.training_contexts && (
                                <div>
                                  <span className="text-muted-foreground">Training:</span>
                                  <p className="bg-background rounded p-2 mt-1">
                                    {version.training_contexts}
                                  </p>
                                </div>
                              )}
                              {version.consulting_check && (
                                <div>
                                  <span className="text-muted-foreground">Consulting:</span>
                                  <p className="bg-background rounded p-2 mt-1">
                                    {version.consulting_with_whom || "Not provided"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Answers */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-b4-teal" />
                <CardTitle className="text-xl">Your Onboarding Answers</CardTitle>
              </div>
              {onboardingState?.journey_status === "approved" && (
                <Badge className="w-fit bg-b4-teal text-white">
                  <CheckCircle className="w-3 h-3 mr-1" /> Approved
                </Badge>
              )}
              {onboardingState?.journey_status === "pending_approval" && (
                <Badge className="w-fit" variant="secondary">
                  <Clock className="w-3 h-3 mr-1" /> Pending Approval
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Notes (only when editing) */}
              {isEditing && (
                <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Label className="text-sm font-medium">Change Notes (optional)</Label>
                  <Textarea
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="Describe what you changed..."
                    rows={2}
                  />
                </div>
              )}

              {/* Natural Role Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Natural Role Description</Label>
                {isEditing ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Your natural role description..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                    {naturalRole?.description || "Not provided"}
                  </p>
                )}
              </div>

              {/* Assessment Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Promise</p>
                  <StatusBadge checked={naturalRole?.promise_check ?? null} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Practice</p>
                  <StatusBadge checked={naturalRole?.practice_check ?? null} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Training</p>
                  <StatusBadge checked={naturalRole?.training_check ?? null} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Consulting</p>
                  <StatusBadge checked={naturalRole?.consulting_check ?? null} />
                </div>
              </div>

              {/* Practice Details */}
              {naturalRole?.practice_check && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Practice Experience</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.practice_entities}
                      onChange={(e) => setEditData({ ...editData, practice_entities: e.target.value })}
                      placeholder="Your practice experience..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                      {naturalRole.practice_entities || "Not provided"}
                    </p>
                  )}
                  {naturalRole.practice_case_studies && (
                    <p className="text-xs text-muted-foreground">
                      Case studies: {naturalRole.practice_case_studies}
                    </p>
                  )}
                </div>
              )}

              {/* Training Details */}
              {naturalRole?.training_check && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Training Experience</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.training_contexts}
                      onChange={(e) => setEditData({ ...editData, training_contexts: e.target.value })}
                      placeholder="Your training contexts..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                      {naturalRole.training_contexts || "Not provided"}
                    </p>
                  )}
                  {naturalRole.training_count && (
                    <p className="text-xs text-muted-foreground">
                      Training count: {naturalRole.training_count}
                    </p>
                  )}
                </div>
              )}

              {/* Consulting Details */}
              {naturalRole?.consulting_check && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Consulting Experience</Label>
                  {isEditing ? (
                    <>
                      <Textarea
                        value={editData.consulting_with_whom}
                        onChange={(e) => setEditData({ ...editData, consulting_with_whom: e.target.value })}
                        placeholder="Who you consulted with..."
                        rows={2}
                      />
                      <Textarea
                        value={editData.consulting_case_studies}
                        onChange={(e) => setEditData({ ...editData, consulting_case_studies: e.target.value })}
                        placeholder="Case studies..."
                        rows={3}
                        className="mt-2"
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                        <strong>With whom:</strong> {naturalRole.consulting_with_whom || "Not provided"}
                      </p>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 mt-2">
                        <strong>Case studies:</strong> {naturalRole.consulting_case_studies || "Not provided"}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Scaling Interest */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Interested in Scaling:</span>
                  <Badge variant={naturalRole?.wants_to_scale ? "default" : "secondary"}>
                    {naturalRole?.wants_to_scale ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Resume;

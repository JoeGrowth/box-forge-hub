import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportJourneyToPdf } from "@/lib/journeyPdfExport";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Download,
  FileText,
  Loader2,
  Target,
  Lightbulb,
  Users,
  Rocket,
  RefreshCw,
} from "lucide-react";

interface JourneyResponse {
  id: string;
  user_id: string;
  idea_id: string | null;
  vision: string | null;
  problem: string | null;
  market: string | null;
  business_model: string | null;
  roles_needed: string | null;
  cobuilder_plan: string | null;
  execution_plan: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

interface StartupIdea {
  id: string;
  title: string;
}

interface JourneyWithDetails extends JourneyResponse {
  profile?: Profile;
  idea?: StartupIdea;
}

export function AdminJourneyResponsesTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<JourneyWithDetails[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<JourneyWithDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const { data: journeyData, error } = await supabase
        .from("entrepreneur_journey_responses")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (!journeyData || journeyData.length === 0) {
        setResponses([]);
        return;
      }

      // Fetch profiles for all users
      const userIds = [...new Set(journeyData.map((j) => j.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Fetch startup ideas
      const ideaIds = journeyData.map((j) => j.idea_id).filter(Boolean) as string[];
      let ideas: StartupIdea[] = [];
      if (ideaIds.length > 0) {
        const { data: ideaData } = await supabase
          .from("startup_ideas")
          .select("id, title")
          .in("id", ideaIds);
        ideas = ideaData || [];
      }

      // Combine data
      const enrichedData: JourneyWithDetails[] = journeyData.map((response) => ({
        ...response,
        profile: profiles?.find((p) => p.user_id === response.user_id),
        idea: ideas.find((i) => i.id === response.idea_id),
      }));

      setResponses(enrichedData);
    } catch (error: any) {
      toast({
        title: "Error loading journey responses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleViewResponse = (response: JourneyWithDetails) => {
    setSelectedResponse(response);
    setViewDialogOpen(true);
  };

  const handleExportPdf = (response: JourneyWithDetails) => {
    exportJourneyToPdf({
      vision: response.vision || "",
      problem: response.problem || "",
      market: response.market || "",
      business_model: response.business_model || "",
      roles_needed: response.roles_needed || "",
      cobuilder_plan: response.cobuilder_plan || "",
      execution_plan: response.execution_plan || "",
      userName: response.profile?.full_name || "Unknown User",
      ideaTitle: response.idea?.title,
    });
    toast({
      title: "PDF Exported",
      description: "Journey responses downloaded successfully.",
    });
  };

  const hasContent = (response: JourneyResponse) => {
    return (
      response.vision ||
      response.problem ||
      response.market ||
      response.business_model ||
      response.roles_needed ||
      response.cobuilder_plan ||
      response.execution_plan
    );
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-b4-teal" />
          <h3 className="font-semibold text-foreground">
            Entrepreneur Journey Responses ({responses.length})
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={fetchResponses}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {responses.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No journey responses found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Startup Idea</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => {
              const filledFields = [
                response.vision,
                response.problem,
                response.market,
                response.business_model,
                response.roles_needed,
                response.cobuilder_plan,
                response.execution_plan,
              ].filter(Boolean).length;
              const progressPercent = Math.round((filledFields / 7) * 100);

              return (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">
                    {response.profile?.full_name || "Unknown User"}
                  </TableCell>
                  <TableCell>
                    {response.idea?.title || (
                      <span className="text-muted-foreground">No linked idea</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(response.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-b4-teal transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {progressPercent}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResponse(response)}
                        disabled={!hasContent(response)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportPdf(response)}
                        disabled={!hasContent(response)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-b4-teal" />
              Journey Responses - {selectedResponse?.profile?.full_name || "Unknown User"}
            </DialogTitle>
          </DialogHeader>

          {selectedResponse && (
            <div className="space-y-6 py-4">
              {/* Step 1 */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-b4-teal" />
                  Step 1: Vision
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Vision</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedResponse.vision || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Problem</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedResponse.problem || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Market</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedResponse.market || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-b4-teal" />
                  Step 2: Business Model
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Business Model</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedResponse.business_model || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Key Roles Needed</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedResponse.roles_needed || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-b4-teal" />
                  Step 3: Co-Builders
                </h4>
                <div>
                  <Label className="text-xs text-muted-foreground">Co-Builder Plan</Label>
                  <p className="text-sm text-foreground mt-1">
                    {selectedResponse.cobuilder_plan || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-b4-teal" />
                  Step 4: Execution
                </h4>
                <div>
                  <Label className="text-xs text-muted-foreground">Execution Plan</Label>
                  <p className="text-sm text-foreground mt-1">
                    {selectedResponse.execution_plan || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Export Button */}
              <Button
                variant="teal"
                className="w-full"
                onClick={() => handleExportPdf(selectedResponse)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

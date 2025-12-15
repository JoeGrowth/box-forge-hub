import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  ArrowUpDown,
  CheckSquare,
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
  progressPercent?: number;
}

type SortField = "date" | "progress" | "user";
type SortDirection = "asc" | "desc";

export function AdminJourneyResponsesTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<JourneyWithDetails[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<JourneyWithDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);

  // Calculate progress for a response
  const getProgress = (response: JourneyResponse) => {
    const filledFields = [
      response.vision,
      response.problem,
      response.market,
      response.business_model,
      response.roles_needed,
      response.cobuilder_plan,
      response.execution_plan,
    ].filter(Boolean).length;
    return Math.round((filledFields / 7) * 100);
  };

  // Filter and sort responses
  const filteredAndSortedResponses = useMemo(() => {
    let result = responses.map(r => ({
      ...r,
      progressPercent: getProgress(r),
    }));

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((response) => {
        const userName = response.profile?.full_name?.toLowerCase() || "";
        const ideaTitle = response.idea?.title?.toLowerCase() || "";
        return userName.includes(query) || ideaTitle.includes(query);
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case "progress":
          comparison = (a.progressPercent || 0) - (b.progressPercent || 0);
          break;
        case "user":
          const nameA = a.profile?.full_name || "";
          const nameB = b.profile?.full_name || "";
          comparison = nameA.localeCompare(nameB);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [responses, searchQuery, sortField, sortDirection]);

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

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select journey responses to export.",
        variant: "destructive",
      });
      return;
    }

    setBulkExporting(true);
    try {
      const selectedResponses = responses.filter(r => selectedIds.has(r.id));
      
      // Export each PDF with a small delay to avoid browser issues
      for (let i = 0; i < selectedResponses.length; i++) {
        const response = selectedResponses[i];
        if (hasContent(response)) {
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
          // Small delay between downloads
          if (i < selectedResponses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      toast({
        title: "Bulk Export Complete",
        description: `${selectedIds.size} journey response(s) exported.`,
      });
      setSelectedIds(new Set());
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkExporting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedResponses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedResponses.map(r => r.id)));
    }
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
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-b4-teal" />
            <h3 className="font-semibold text-foreground">
              Entrepreneur Journey Responses ({filteredAndSortedResponses.length})
            </h3>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or idea..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchResponses}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Sort and Bulk Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="user">User Name</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as SortDirection)}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <Button 
              variant="teal" 
              size="sm" 
              onClick={handleBulkExport}
              disabled={bulkExporting}
            >
              {bulkExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {filteredAndSortedResponses.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery ? "No matching journey responses found." : "No journey responses found."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === filteredAndSortedResponses.length && filteredAndSortedResponses.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Startup Idea</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedResponses.map((response) => {
              const progressPercent = response.progressPercent || 0;

              return (
                <TableRow key={response.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(response.id)}
                      onCheckedChange={() => toggleSelection(response.id)}
                      disabled={!hasContent(response)}
                    />
                  </TableCell>
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
              {selectedResponse?.idea?.title && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({selectedResponse.idea.title})
                </span>
              )}
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

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CheckCircle,
  Loader2,
  Lightbulb,
  Briefcase,
  Users,
  Rocket,
  Target,
  Shield,
  Settings,
  RefreshCw,
  TrendingUp,
  Handshake,
  DollarSign,
  UsersRound,
  Play,
  Download,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IdeaEpisodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: string;
  startupTitle: string;
  currentEpisode: string;
}

interface PhaseProgress {
  phase_number: number;
  phase_name: string;
  responses: Record<string, string>;
  is_completed: boolean;
  completed_at?: string;
  episode: string;
}

const EPISODES = [
  {
    id: "development",
    number: 1,
    name: "Part 1: Foundation",
    description: "Ideation, Structuring, Role Definition, Equity & Responsibility, Team Building, Launch",
    color: "from-violet-500 to-purple-500",
    icon: Rocket,
    phases: [
      { name: "Ideation", icon: Lightbulb },
      { name: "Structuring", icon: Briefcase },
      { name: "Role Definition", icon: Target },
      { name: "E&R", displayName: "Equity & Responsibility", icon: Shield },
      { name: "Team Building", icon: Users },
      { name: "Launch", icon: Rocket },
    ],
  },
  {
    id: "validation",
    number: 2,
    name: "Part 2: Validation",
    description: "Validation, Execution & Operations, Iteration & Improvement",
    color: "from-amber-500 to-orange-500",
    icon: Shield,
    phases: [
      { name: "Validation", icon: Shield },
      { name: "Execution & Operations", icon: Settings },
      { name: "Iteration & Improvement", icon: RefreshCw },
    ],
  },
  {
    id: "growth",
    number: 3,
    name: "Part 3: Growth",
    description: "Customer Acquisition, Partnerships, Revenue Growth, Team Scaling",
    color: "from-emerald-500 to-teal-500",
    icon: TrendingUp,
    phases: [
      { name: "Customer Acquisition", icon: UsersRound },
      { name: "Partnerships", icon: Handshake },
      { name: "Revenue Growth", icon: DollarSign },
      { name: "Team Scaling", icon: UsersRound },
    ],
  },
];

export const IdeaEpisodesDialog = ({
  open,
  onOpenChange,
  startupId,
  startupTitle,
  currentEpisode,
}: IdeaEpisodesDialogProps) => {
  const [episodeProgress, setEpisodeProgress] = useState<Record<string, PhaseProgress[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEpisodes, setExpandedEpisodes] = useState<string[]>([]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!open || !startupId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("idea_journey_progress")
          .select("*")
          .eq("startup_id", startupId)
          .order("phase_number", { ascending: true });

        if (error) throw error;

        // Group by episode
        const grouped: Record<string, PhaseProgress[]> = {
          development: [],
          validation: [],
          growth: [],
        };

        data?.forEach((p) => {
          const episode = p.episode || "development";
          // Normalize legacy phase names
          let phaseName = p.phase_name;
          if (phaseName === "1st Role") phaseName = "Role Definition";
          
          if (grouped[episode]) {
            // Merge responses if same phase_name already exists (handles duplicate phase numbers)
            const existing = grouped[episode].find((x) => x.phase_name === phaseName);
            if (existing) {
              existing.responses = { ...existing.responses, ...((p.responses as Record<string, string>) || {}) };
              if (p.is_completed) existing.is_completed = true;
              if (p.completed_at) existing.completed_at = p.completed_at;
            } else {
              grouped[episode].push({
                phase_number: p.phase_number,
                phase_name: phaseName,
                responses: (p.responses as Record<string, string>) || {},
                is_completed: p.is_completed || false,
                completed_at: p.completed_at || undefined,
                episode: episode,
              });
            }
          }
        });

        setEpisodeProgress(grouped);
      } catch (error) {
        console.error("Error loading episodes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [open, startupId]);

  const isEpisodeCompleted = (episodeId: string) => {
    const episode = EPISODES.find((e) => e.id === episodeId);
    if (!episode) return false;
    
    const progress = episodeProgress[episodeId] || [];
    return episode.phases.every((phase) =>
      progress.some((p) => p.phase_name === phase.name && p.is_completed)
    );
  };

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes((prev) =>
      prev.includes(episodeId)
        ? prev.filter((id) => id !== episodeId)
        : [...prev, episodeId]
    );
  };

  const handleDownloadEpisode = (episodeId: string) => {
    const episode = EPISODES.find((e) => e.id === episodeId);
    if (!episode) return;

    const progress = episodeProgress[episodeId] || [];
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    // Brand palette
    const NAVY: [number, number, number] = [15, 30, 60];
    const TEAL: [number, number, number] = [0, 128, 128];
    const CORAL: [number, number, number] = [255, 111, 97];
    const MUTED: [number, number, number] = [110, 110, 120];
    const BORDER: [number, number, number] = [220, 224, 230];

    // ---------- Cover header ----------
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 42, "F");
    doc.setFillColor(...TEAL);
    doc.rect(0, 42, pageWidth, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(episode.name, margin, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(startupTitle, margin, 32);

    doc.setFontSize(9);
    doc.setTextColor(200, 210, 220);
    doc.text(
      `Generated ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      32,
      { align: "right" }
    );

    let yPosition = 58;

    // Episode description
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    const descLines = doc.splitTextToSize(episode.description, contentWidth);
    doc.text(descLines, margin, yPosition);
    yPosition += descLines.length * 5 + 6;

    const ensureSpace = (needed: number) => {
      if (yPosition + needed > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
    };

    const formatLabel = (key: string) =>
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    const tryParse = (v: any) => {
      if (v && typeof v === "object") return v;
      if (typeof v === "string" && (v.trim().startsWith("{") || v.trim().startsWith("["))) {
        try { return JSON.parse(v); } catch { return null; }
      }
      return null;
    };

    const renderEquityStages = (stages: any[]) => {
      stages.forEach((stage) => {
        ensureSpace(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...NAVY);
        doc.text(stage.label || "Stage", margin, yPosition);
        yPosition += 4;

        const rows = (stage.rows || []).map((r: any) => [
          r.role || "-",
          r.responsibility || "-",
          r.equityRange || "-",
          r.vestingTrigger || "-",
        ]);

        autoTable(doc, {
          startY: yPosition + 2,
          head: [["Role", "Responsibility", "Equity", "Vesting Trigger"]],
          body: rows.length ? rows : [["-", "-", "-", "-"]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 50], lineColor: BORDER, lineWidth: 0.2 },
          headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 248, 250] },
          columnStyles: {
            0: { cellWidth: 34, fontStyle: "bold" },
            2: { cellWidth: 22, halign: "center" },
            3: { cellWidth: 34 },
          },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 6;
      });
    };

    const renderKeyValueTable = (obj: Record<string, any>) => {
      const body = Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => [
          formatLabel(k),
          typeof v === "object" ? JSON.stringify(v, null, 2) : String(v),
        ]);
      if (!body.length) return;
      autoTable(doc, {
        startY: yPosition,
        body,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 50], lineColor: BORDER, lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold", fillColor: [245, 248, 250], textColor: NAVY },
        },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 6;
    };

    const renderArrayTable = (arr: any[]) => {
      if (!arr.length) return;
      if (typeof arr[0] === "object" && arr[0] !== null) {
        const cols = Array.from(new Set(arr.flatMap((r) => Object.keys(r))));
        const body = arr.map((r) =>
          cols.map((c) => (r[c] == null ? "-" : typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c])))
        );
        autoTable(doc, {
          startY: yPosition,
          head: [cols.map(formatLabel)],
          body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3, lineColor: BORDER, lineWidth: 0.2 },
          headStyles: { fillColor: TEAL, textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 248, 250] },
        });
      } else {
        autoTable(doc, {
          startY: yPosition,
          body: arr.map((v) => [String(v)]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3, lineColor: BORDER, lineWidth: 0.2 },
        });
      }
      yPosition = (doc as any).lastAutoTable.finalY + 6;
    };

    const renderTextBlock = (label: string, value: string) => {
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(label, margin, yPosition);
      yPosition += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 55, 65);
      const lines = doc.splitTextToSize(value, contentWidth);
      lines.forEach((line: string) => {
        ensureSpace(6);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    };

    // ---------- Phases ----------
    episode.phases.forEach((phase, idx) => {
      const phaseProgress = progress.find((p) => p.phase_name === phase.name);
      const completed = !!phaseProgress?.is_completed;

      ensureSpace(22);

      // Phase header bar
      doc.setFillColor(245, 248, 250);
      doc.rect(margin, yPosition - 5, contentWidth, 11, "F");
      doc.setFillColor(...TEAL);
      doc.rect(margin, yPosition - 5, 2.5, 11, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...NAVY);
      const title = `${idx + 1}. ${(phase as any).displayName || phase.name}`;
      doc.text(title, margin + 6, yPosition + 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...(completed ? TEAL : CORAL));
      doc.text(
        completed ? "Completed" : "In Progress",
        pageWidth - margin - 2,
        yPosition + 2,
        { align: "right" }
      );
      yPosition += 12;

      if (!phaseProgress || Object.keys(phaseProgress.responses).length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text("No responses recorded", margin, yPosition + 2);
        yPosition += 12;
        return;
      }

      Object.entries(phaseProgress.responses).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") return;
        const parsed = tryParse(value);

        // Equity & Responsibility stages table
        if (parsed && parsed.stages && Array.isArray(parsed.stages)) {
          ensureSpace(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(...NAVY);
          doc.text(formatLabel(key), margin, yPosition);
          yPosition += 4;
          renderEquityStages(parsed.stages);
          return;
        }

        // Array of objects → table
        if (Array.isArray(parsed)) {
          ensureSpace(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(...NAVY);
          doc.text(formatLabel(key), margin, yPosition);
          yPosition += 4;
          renderArrayTable(parsed);
          return;
        }

        // Object → key/value table
        if (parsed && typeof parsed === "object") {
          ensureSpace(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(...NAVY);
          doc.text(formatLabel(key), margin, yPosition);
          yPosition += 4;
          renderKeyValueTable(parsed);
          return;
        }

        // Plain text
        renderTextBlock(formatLabel(key), String(value));
      });

      yPosition += 2;
    });

    // ---------- Footer on every page ----------
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDER);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(startupTitle, margin, pageHeight - 8);
      doc.text(episode.name, pageWidth / 2, pageHeight - 8, { align: "center" });
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    const fileName = `${startupTitle.toLowerCase().replace(/\s+/g, "-")}-${episodeId}.pdf`;
    doc.save(fileName);
    toast.success(`${episode.name} downloaded as PDF`);
  };

  const getEpisodeStatusBadge = (episodeId: string) => {
    if (isEpisodeCompleted(episodeId)) {
      return (
        <Badge className="bg-b4-teal text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (currentEpisode === episodeId) {
      return (
        <Badge variant="secondary">
          <Play className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Started
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            Episodes: {startupTitle}
          </DialogTitle>
          <DialogDescription>
            View your startup journey progress across all episodes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {EPISODES.map((episode) => {
                const Icon = episode.icon;
                const isCompleted = isEpisodeCompleted(episode.id);
                const isExpanded = expandedEpisodes.includes(episode.id);
                const progress = episodeProgress[episode.id] || [];

                return (
                  <Collapsible
                    key={episode.id}
                    open={isExpanded}
                    onOpenChange={() => toggleEpisode(episode.id)}
                  >
                     <Card className={`border-border/50 ${isCompleted ? "border-b4-teal/30" : ""}`}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${episode.color} flex items-center justify-center`}
                            >
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base font-semibold">
                                  {episode.name}
                                </CardTitle>
                                {getEpisodeStatusBadge(episode.id)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {episode.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {isCompleted && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-b4-teal hover:text-b4-teal hover:bg-b4-teal/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadEpisode(episode.id);
                                        }}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download as PDF</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <ChevronDown
                                className={`w-5 h-5 text-muted-foreground transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t border-border/50">
                          <div className="space-y-3 pt-4">
                            {episode.phases.map((phase) => {
                              const PhaseIcon = phase.icon;
                              const phaseProgress = progress.find(
                                (p) => p.phase_name === phase.name
                              );
                              const hasResponses =
                                phaseProgress &&
                                Object.keys(phaseProgress.responses).length > 0;

                              return (
                                <div
                                  key={phase.name}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                                >
                                  <PhaseIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {(phase as any).displayName || phase.name}
                                      </span>
                                      {phaseProgress?.is_completed ? (
                                        <CheckCircle className="w-4 h-4 text-b4-teal" />
                                      ) : hasResponses ? (
                                        <Badge variant="secondary" className="text-xs">
                                          In Progress
                                        </Badge>
                                      ) : null}
                                    </div>
                                    {hasResponses && (
                                      <div className="mt-2 space-y-2">
                                        {Object.entries(phaseProgress.responses).map(
                                          ([key, value]) => {
                                            if (!value) return null;
                                            
                                            // Check if value is a JSON object/array (like equity_responsibility)
                                            let displayValue = String(value);
                                            let isStructured = false;
                                            if (typeof value === 'object' || (typeof value === 'string' && (value.startsWith('{') || value.startsWith('[')))) {
                                              try {
                                                const parsed = typeof value === 'object' ? value : JSON.parse(value);
                                                if (parsed && typeof parsed === 'object') {
                                                  isStructured = true;
                                                  // Format equity_responsibility stages
                                                  if (parsed.stages && Array.isArray(parsed.stages)) {
                                                    displayValue = parsed.stages.map((stage: any) => {
                                                      const roles = stage.rows?.map((r: any) => 
                                                        `${r.role}: ${r.responsibility} (${r.equityRange})`
                                                      ).join('; ') || '';
                                                      return `${stage.label} — ${roles}`;
                                                    }).join(' | ');
                                                  } else {
                                                    displayValue = JSON.stringify(parsed, null, 2);
                                                  }
                                                }
                                              } catch {
                                                // Not valid JSON, use as string
                                              }
                                            }

                                            return (
                                              <div
                                                key={key}
                                                className="text-xs text-muted-foreground"
                                              >
                                                <span className="font-medium capitalize">
                                                  {key.replace(/_/g, " ")}:
                                                </span>{" "}
                                                <span className={isStructured ? "line-clamp-3" : "line-clamp-2"}>
                                                  {displayValue}
                                                </span>
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

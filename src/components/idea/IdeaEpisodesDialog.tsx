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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

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
    name: "Part 1: Development",
    description: "Ideation, Structuring, Role Definition, Team Building, Launch",
    color: "from-violet-500 to-purple-500",
    icon: Rocket,
    phases: [
      { number: 0, name: "Ideation", icon: Lightbulb },
      { number: 1, name: "Structuring", icon: Briefcase },
      { number: 2, name: "Role Definition", icon: Target },
      { number: 3, name: "Team Building", icon: Users },
      { number: 4, name: "Launch", icon: Rocket },
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
      { number: 0, name: "Validation", icon: Shield },
      { number: 1, name: "Execution & Operations", icon: Settings },
      { number: 2, name: "Iteration & Improvement", icon: RefreshCw },
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
      { number: 0, name: "Customer Acquisition", icon: UsersRound },
      { number: 1, name: "Partnerships", icon: Handshake },
      { number: 2, name: "Revenue Growth", icon: DollarSign },
      { number: 3, name: "Team Scaling", icon: UsersRound },
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
          if (grouped[episode]) {
            grouped[episode].push({
              phase_number: p.phase_number,
              phase_name: p.phase_name,
              responses: (p.responses as Record<string, string>) || {},
              is_completed: p.is_completed || false,
              completed_at: p.completed_at || undefined,
              episode: episode,
            });
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
      progress.some((p) => p.phase_number === phase.number && p.is_completed)
    );
  };

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes((prev) =>
      prev.includes(episodeId)
        ? prev.filter((id) => id !== episodeId)
        : [...prev, episodeId]
    );
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
                            <ChevronDown
                              className={`w-5 h-5 text-muted-foreground transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t border-border/50">
                          <div className="space-y-3 pt-4">
                            {episode.phases.map((phase) => {
                              const PhaseIcon = phase.icon;
                              const phaseProgress = progress.find(
                                (p) => p.phase_number === phase.number
                              );
                              const hasResponses =
                                phaseProgress &&
                                Object.keys(phaseProgress.responses).length > 0;

                              return (
                                <div
                                  key={phase.number}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                                >
                                  <PhaseIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {phase.name}
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
                                          ([key, value]) =>
                                            value && (
                                              <div
                                                key={key}
                                                className="text-xs text-muted-foreground"
                                              >
                                                <span className="font-medium capitalize">
                                                  {key.replace(/_/g, " ")}:
                                                </span>{" "}
                                                <span className="line-clamp-2">
                                                  {value}
                                                </span>
                                              </div>
                                            )
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

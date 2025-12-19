import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLearningJourneys, JourneyType } from "@/hooks/useLearningJourneys";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Users, Lightbulb, Rocket, ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface JourneySelectionProps {
  onSelectJourney: (journeyType: JourneyType) => void;
}

export const JourneySelection = ({ onSelectJourney }: JourneySelectionProps) => {
  const { journeys, startJourney, certifications } = useLearningJourneys();
  const { naturalRole } = useOnboarding();
  const [isStarting, setIsStarting] = useState<JourneyType | null>(null);

  const getJourneyStatus = (journeyType: JourneyType) => {
    const journey = journeys.find((j) => j.journey_type === journeyType);
    if (!journey) return null;
    return journey.status;
  };

  const getStatusBadge = (journeyType: JourneyType) => {
    const status = getJourneyStatus(journeyType);
    const cert = certifications.find(
      (c) =>
        (journeyType === "skill_ptc" && c.certification_type === "cobuilder_b4") ||
        (journeyType === "idea_ptc" && c.certification_type === "initiator_b4") ||
        (journeyType === "scaling_path" && c.certification_type === "scaling_complete"),
    );

    if (cert) {
      return (
        <Badge className="bg-b4-teal text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Certified
        </Badge>
      );
    }

    switch (status) {
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge className="bg-amber-500 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Approval
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
        return <Badge variant="destructive">Needs Revision</Badge>;
      default:
        return null;
    }
  };

  const handleStartOrContinue = async (journeyType: JourneyType) => {
    const existingJourney = journeys.find((j) => j.journey_type === journeyType);

    if (existingJourney) {
      onSelectJourney(journeyType);
    } else {
      setIsStarting(journeyType);
      const journey = await startJourney(journeyType);
      setIsStarting(null);
      if (journey) {
        onSelectJourney(journeyType);
      }
    }
  };

  const journeyOptions = [
    {
      type: "skill_ptc" as JourneyType,
      title: "Co-Build a Startup",
      subtitle: "Skill PTC Journey",
      description:
        "Practice, Training, Consulting based on the B4 model. Learn the fundamentals, apply through case studies, and become a certified Co-Builder.",
      icon: Users,
      color: "b4-teal",
      phases: ["Skills Assessment", "Practice (4-6 weeks)", "Train (6-8 weeks)", "Consult (Ongoing)"],
      result: "Co Builder B4 Model Based + Verified Badge",
    },
    {
      type: "idea_ptc" as JourneyType,
      title: "Be an Initiator",
      subtitle: "Idea PTC Journey",
      description:
        "Ideation, Structuring, Team Building, and Launch. Transform your idea into a structured startup with the right team.",
      icon: Lightbulb,
      color: "b4-coral",
      phases: ["Ideation", "Structuring", "Team Building", "Launch"],
      result: "Initiator B4 Model Based",
    },
  ];

  // Only show scaling path if user wants to scale
  const showScalingPath = naturalRole?.wants_to_scale === true;

  // Check if user has all main certifications
  const hasAllMainCertifications =
    certifications.some((c) => c.certification_type === "cobuilder_b4") &&
    certifications.some((c) => c.certification_type === "initiator_b4");

  // Check scaling status
  const scalingCertified = certifications.some((c) => c.certification_type === "scaling_complete");
  const scalingStatus = getJourneyStatus("scaling_path");
  const scalingCompleted = scalingStatus === "approved" || scalingCertified;

  // Hide entire section only if user has all main certifications AND doesn't want to scale
  // OR if they have all certs AND scaling is completed
  if (hasAllMainCertifications && !showScalingPath) {
    return null;
  }

  if (hasAllMainCertifications && scalingCompleted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Only show header and main journey cards if user doesn't have all main certifications */}
      {!hasAllMainCertifications && (
        <>
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Choose Your Journey</h2>
            <p className="text-muted-foreground">Select a path to continue your development</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {journeyOptions.map((option) => {
              const status = getJourneyStatus(option.type);
              const isActive = status === "in_progress" || status === "pending_approval";
              const isCertified = certifications.some(
                (c) => c.certification_type === (option.type === "skill_ptc" ? "cobuilder_b4" : "initiator_b4"),
              );
              const isCompleted = status === "approved" || isCertified;

              return (
                <Card
                  key={option.type}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    isActive ? `ring-2 ring-${option.color}` : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-xl bg-${option.color}/10 text-${option.color} flex items-center justify-center`}
                      >
                        <option.icon className="w-6 h-6" />
                      </div>
                      {getStatusBadge(option.type)}
                    </div>
                    <CardTitle className="font-display text-xl">{option.title}</CardTitle>
                    {!isCertified && (
                      <CardDescription className="text-sm font-medium text-muted-foreground">
                        {option.subtitle}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isCertified && (
                      <>
                        <p className="text-sm text-muted-foreground">{option.description}</p>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Phases</p>
                          <div className="flex flex-wrap gap-1">
                            {option.phases.map((phase, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {phase}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Upon completion:</p>
                          <Badge className={`bg-${option.color}/10 text-${option.color} border-${option.color}/20`}>
                            {option.result}
                          </Badge>
                        </div>
                      </>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => handleStartOrContinue(option.type)}
                      disabled={isStarting === option.type || isCompleted}
                      variant={isCompleted ? "secondary" : "default"}
                    >
                      {isStarting === option.type ? (
                        "Starting..."
                      ) : isCompleted ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : status ? (
                        <>
                          Continue Journey
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Start Journey
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {showScalingPath && !scalingCompleted && (
        <Card className="relative overflow-hidden transition-all hover:shadow-lg border-b4-purple/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-b4-purple/10 text-b4-purple flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              {getStatusBadge("scaling_path")}
            </div>
            <CardTitle className="font-display text-xl">Scale Your Natural Role</CardTitle>
            {!scalingCertified && (
              <CardDescription className="text-sm font-medium text-muted-foreground">
                Process Formalization Journey
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!scalingCertified && (
              <>
                <p className="text-sm text-muted-foreground">
                  Personal journey towards structure and growth. Build your entity, form a company, implement processes,
                  and achieve scalability.
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">5 Progressive Steps</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Personal Entity",
                      "Company Formation",
                      "Process Implementation",
                      "Optimization",
                      "Scalability",
                    ].map((phase, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {phase}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button
              className="w-full"
              variant={scalingCompleted ? "secondary" : "outline"}
              onClick={() => handleStartOrContinue("scaling_path")}
              disabled={isStarting === "scaling_path" || scalingCompleted}
            >
              {isStarting === "scaling_path" ? (
                "Starting..."
              ) : scalingCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completed
                </>
              ) : scalingStatus ? (
                <>
                  Continue Journey
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Start Journey
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

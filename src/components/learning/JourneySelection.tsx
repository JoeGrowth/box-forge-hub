import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLearningJourneys, JourneyType } from "@/hooks/useLearningJourneys";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Users, Lightbulb, Rocket, ArrowRight, CheckCircle, Clock, AlertCircle, Sparkles, Target, Trophy } from "lucide-react";

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
        <Badge className="bg-b4-teal text-white border-0 shadow-sm">
          <CheckCircle className="w-3 h-3 mr-1" />
          Certified
        </Badge>
      );
    }

    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-gradient-to-r from-b4-teal/20 to-b4-teal/10 text-b4-teal border border-b4-teal/30">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge className="bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-600 border border-amber-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-b4-teal text-white border-0 shadow-sm">
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
      gradientFrom: "from-b4-teal",
      gradientTo: "to-emerald-500",
      bgGlow: "bg-b4-teal/5",
      accentColor: "b4-teal",
      phases: ["Skills Assessment", "Practice (4-6 weeks)", "Train (6-8 weeks)", "Consult (Ongoing)"],
      result: "Co Builder B4 Model Based + Verified Badge",
      resultIcon: Trophy,
    },
    {
      type: "idea_ptc" as JourneyType,
      title: "Be an Initiator",
      subtitle: "Idea PTC Journey",
      description:
        "Ideation, Structuring, Team Building, and Launch. Transform your idea into a structured startup with the right team.",
      icon: Lightbulb,
      gradientFrom: "from-b4-coral",
      gradientTo: "to-orange-500",
      bgGlow: "bg-b4-coral/5",
      accentColor: "b4-coral",
      phases: ["Ideation", "Structuring", "Team Building", "Launch"],
      result: "Initiator B4 Model Based",
      resultIcon: Sparkles,
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
    <div className="space-y-8">
      {/* Only show header and main journey cards if user doesn't have all main certifications */}
      {!hasAllMainCertifications && (
        <>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Learning Paths</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Choose Your Journey</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Select a path to continue your development and unlock new opportunities</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {journeyOptions.map((option) => {
              const status = getJourneyStatus(option.type);
              const isActive = status === "in_progress" || status === "pending_approval";
              const isCertified = certifications.some(
                (c) => c.certification_type === (option.type === "skill_ptc" ? "cobuilder_b4" : "initiator_b4"),
              );
              const isCompleted = status === "approved" || isCertified;

              return (
                <div
                  key={option.type}
                  className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    isActive ? "ring-2 ring-offset-2 ring-" + option.accentColor : ""
                  }`}
                >
                  {/* Background gradient glow effect */}
                  <div className={`absolute inset-0 ${option.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  {/* Card content */}
                  <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
                    {/* Header with gradient strip */}
                    <div className={`h-2 bg-gradient-to-r ${option.gradientFrom} ${option.gradientTo}`} />
                    
                    <div className="p-6">
                      {/* Top section with icon and status */}
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradientFrom}/10 ${option.gradientTo}/5 flex items-center justify-center border border-${option.accentColor}/20 shadow-sm`}>
                          <option.icon className={`w-7 h-7 text-${option.accentColor}`} />
                        </div>
                        {getStatusBadge(option.type)}
                      </div>

                      {/* Title section */}
                      <div className="mb-4">
                        <h3 className="font-display text-xl font-bold text-foreground mb-1">{option.title}</h3>
                        {!isCertified && (
                          <p className={`text-sm font-medium text-${option.accentColor}`}>{option.subtitle}</p>
                        )}
                      </div>

                      {!isCertified && (
                        <>
                          {/* Description */}
                          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{option.description}</p>

                          {/* Phases section */}
                          <div className="mb-6">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Journey Phases</p>
                            <div className="space-y-2">
                              {option.phases.map((phase, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${option.gradientFrom}/20 ${option.gradientTo}/10 flex items-center justify-center text-xs font-semibold text-${option.accentColor} border border-${option.accentColor}/20`}>
                                    {i + 1}
                                  </div>
                                  <span className="text-sm text-foreground">{phase}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Result badge */}
                          <div className={`p-4 rounded-xl bg-gradient-to-r ${option.gradientFrom}/5 ${option.gradientTo}/5 border border-${option.accentColor}/10 mb-6`}>
                            <div className="flex items-center gap-2 mb-2">
                              <option.resultIcon className={`w-4 h-4 text-${option.accentColor}`} />
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upon Completion</p>
                            </div>
                            <Badge className={`bg-gradient-to-r ${option.gradientFrom}/10 ${option.gradientTo}/5 text-${option.accentColor} border border-${option.accentColor}/20 shadow-sm`}>
                              {option.result}
                            </Badge>
                          </div>
                        </>
                      )}

                      {/* Action button */}
                      <Button
                        className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                          isCompleted 
                            ? "bg-muted text-muted-foreground" 
                            : `bg-gradient-to-r ${option.gradientFrom} ${option.gradientTo} hover:opacity-90 text-white shadow-md hover:shadow-lg`
                        }`}
                        onClick={() => handleStartOrContinue(option.type)}
                        disabled={isStarting === option.type || isCompleted}
                      >
                        {isStarting === option.type ? (
                          "Starting..."
                        ) : isCompleted ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Completed
                          </>
                        ) : status ? (
                          <>
                            Continue Journey
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        ) : (
                          <>
                            Start Journey
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showScalingPath && !scalingCompleted && (
        <div className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
          {/* Background glow */}
          <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header gradient */}
            <div className="h-2 bg-gradient-to-r from-purple-500 to-violet-500" />
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 flex items-center justify-center border border-purple-500/20 shadow-sm">
                  <Rocket className="w-7 h-7 text-purple-500" />
                </div>
                {getStatusBadge("scaling_path")}
              </div>

              <div className="mb-4">
                <h3 className="font-display text-xl font-bold text-foreground mb-1">Scale Your Natural Role</h3>
                {!scalingCertified && (
                  <p className="text-sm font-medium text-purple-500">Process Formalization Journey</p>
                )}
              </div>

              {!scalingCertified && (
                <>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Personal journey towards structure and growth. Build your entity, form a company, implement processes,
                    and achieve scalability.
                  </p>

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">5 Progressive Steps</p>
                    <div className="space-y-2">
                      {["Personal Entity", "Company Formation", "Process Implementation", "Optimization", "Scalability"].map((phase, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/10 flex items-center justify-center text-xs font-semibold text-purple-500 border border-purple-500/20">
                            {i + 1}
                          </div>
                          <span className="text-sm text-foreground">{phase}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                  scalingCompleted 
                    ? "bg-muted text-muted-foreground" 
                    : "bg-gradient-to-r from-purple-500 to-violet-500 hover:opacity-90 text-white shadow-md hover:shadow-lg"
                }`}
                onClick={() => handleStartOrContinue("scaling_path")}
                disabled={isStarting === "scaling_path" || scalingCompleted}
              >
                {isStarting === "scaling_path" ? (
                  "Starting..."
                ) : scalingCompleted ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Completed
                  </>
                ) : scalingStatus ? (
                  <>
                    Continue Journey
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Start Journey
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

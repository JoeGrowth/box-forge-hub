import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  CheckCircle, 
  Circle, 
  AlertCircle,
  Lightbulb,
  Users,
  Target,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Rocket,
  Award
} from "lucide-react";
import { OnboardingState, NaturalRole } from "@/hooks/useOnboarding";

interface JourneyOverviewProps {
  onboardingState: OnboardingState;
  naturalRole: NaturalRole | null;
  onContinue: () => void;
}

export function JourneyOverview({ onboardingState, naturalRole, onContinue }: JourneyOverviewProps) {
  const isEntrepreneur = onboardingState.primary_role === "entrepreneur";
  const isCoBuilder = onboardingState.primary_role === "cobuilder";

  const getCoBuilderSteps = () => [
    {
      id: 1,
      label: "Path Selection",
      icon: Target,
      completed: !!onboardingState.primary_role,
      current: onboardingState.current_step === 1,
    },
    {
      id: 2,
      label: "Natural Role Definition",
      icon: Lightbulb,
      completed: !!naturalRole?.description,
      current: onboardingState.current_step === 2,
      needsHelp: naturalRole?.status === "assistance_requested",
    },
    {
      id: 3,
      label: "Promise Check",
      icon: Target,
      completed: naturalRole?.promise_check !== null,
      current: onboardingState.current_step === 3,
    },
    {
      id: 4,
      label: "Practice Check",
      icon: Briefcase,
      completed: naturalRole?.practice_check !== null,
      current: onboardingState.current_step === 4,
      needsHelp: naturalRole?.practice_needs_help,
    },
    {
      id: 5,
      label: "Training Check",
      icon: GraduationCap,
      completed: naturalRole?.training_check !== null,
      current: onboardingState.current_step === 5,
      needsHelp: naturalRole?.training_needs_help,
    },
    {
      id: 6,
      label: "Consulting Check",
      icon: MessageSquare,
      completed: naturalRole?.consulting_check !== null,
      current: onboardingState.current_step === 6,
    },
    {
      id: 7,
      label: "Scaling Decision",
      icon: Rocket,
      completed: naturalRole?.wants_to_scale !== null,
      current: onboardingState.current_step === 7,
    },
    {
      id: 8,
      label: "Activation",
      icon: Award,
      completed: onboardingState.onboarding_completed,
      current: onboardingState.current_step === 8,
    },
  ];

  const getEntrepreneurSteps = () => [
    {
      id: 1,
      label: "Path Selection",
      icon: Target,
      completed: !!onboardingState.primary_role,
      current: onboardingState.current_step === 1,
    },
    {
      id: 2,
      label: "Application Review",
      icon: Lightbulb,
      completed: false,
      current: onboardingState.current_step === 2,
      pending: true,
    },
  ];

  const steps = isCoBuilder ? getCoBuilderSteps() : getEntrepreneurSteps();
  const completedSteps = steps.filter(s => s.completed).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-4">
            {isEntrepreneur ? (
              <>
                <Lightbulb className="w-4 h-4" />
                Entrepreneur Journey
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Co-Builder Journey
              </>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your Journey Overview
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {isCoBuilder 
              ? "Track your progress through the Co-Builder certification process."
              : "Your entrepreneur application is being reviewed by our team."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{completedSteps} of {steps.length} steps</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-b4-teal rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm text-muted-foreground">{progress}% complete</div>
        </div>

        {/* Steps List */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Journey Steps</h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                  step.current 
                    ? "bg-b4-teal/10 border border-b4-teal/20" 
                    : step.completed 
                    ? "bg-muted/50" 
                    : "bg-muted/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.completed 
                    ? "bg-b4-teal text-primary-foreground" 
                    : step.current 
                    ? "bg-b4-teal/20 text-b4-teal border-2 border-b4-teal" 
                    : step.needsHelp
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : step.needsHelp ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      step.completed || step.current ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                    {step.current && (
                      <span className="px-2 py-0.5 rounded-full bg-b4-teal/20 text-b4-teal text-xs font-medium">
                        Current
                      </span>
                    )}
                    {step.needsHelp && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
                        Pending Help
                      </span>
                    )}
                    {(step as any).pending && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
                        Under Review
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Step {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Natural Role Summary (for Co-Builders) */}
        {isCoBuilder && naturalRole?.description && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Your Natural Role</h2>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-foreground italic">"{naturalRole.description}"</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2">
                {naturalRole.promise_check ? (
                  <CheckCircle className="w-5 h-5 text-b4-teal" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm">Promise</span>
              </div>
              <div className="flex items-center gap-2">
                {naturalRole.practice_check ? (
                  <CheckCircle className="w-5 h-5 text-b4-teal" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm">Practice</span>
              </div>
              <div className="flex items-center gap-2">
                {naturalRole.training_check ? (
                  <CheckCircle className="w-5 h-5 text-b4-teal" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm">Training</span>
              </div>
              <div className="flex items-center gap-2">
                {naturalRole.consulting_check ? (
                  <CheckCircle className="w-5 h-5 text-b4-teal" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm">Consulting</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            variant="teal" 
            size="lg" 
            className="flex-1"
            onClick={onContinue}
          >
            Continue Journey <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            asChild
          >
            <Link to="/profile">View Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

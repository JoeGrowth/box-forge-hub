import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { PathSelectionStep } from "@/components/onboarding/steps/PathSelectionStep";
import { NaturalRoleDefinitionStep } from "@/components/onboarding/steps/NaturalRoleDefinitionStep";
import { PromiseCheckStep, NotReadyStep, PracticeCheckStep, TrainingCheckStep, ConsultingCheckStep } from "@/components/onboarding/steps/AssessmentSteps";
import { ScalingStep } from "@/components/onboarding/steps/ScalingStep";
import { CompletionStep } from "@/components/onboarding/steps/CompletionStep";
import { EntrepreneurPlaceholder } from "@/components/onboarding/steps/EntrepreneurPlaceholder";
import { PendingHelpStep } from "@/components/onboarding/steps/PendingHelpStep";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showNotReady, setShowNotReady] = useState(false);
  const [showPendingHelp, setShowPendingHelp] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (onboardingState) {
      setCurrentStep(onboardingState.current_step);
      if (onboardingState.onboarding_completed) {
        navigate("/", { replace: true });
      }
    }
  }, [onboardingState, navigate]);

  useEffect(() => {
    if (naturalRole?.status === "assistance_requested") {
      setShowPendingHelp(true);
    }
    if (naturalRole?.promise_check === false && currentStep >= 4) {
      setShowNotReady(true);
    }
  }, [naturalRole, currentStep]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isEntrepreneur = onboardingState?.primary_role === "entrepreneur";
  const totalSteps = isEntrepreneur ? 2 : 8;

  const getStepLabel = () => {
    const labels: Record<number, string> = {
      1: "Choose your path",
      2: isEntrepreneur ? "Getting started" : "Define your Natural Role",
      3: "Assessment: Promise",
      4: "Assessment: Practice",
      5: "Assessment: Training",
      6: "Assessment: Consulting",
      7: "Scaling your impact",
      8: "Activation",
    };
    return labels[currentStep] || "";
  };

  const renderStep = () => {
    if (showPendingHelp) return <PendingHelpStep />;
    if (showNotReady) return <NotReadyStep onNeedHelp={() => navigate("/")} />;

    if (currentStep === 1) {
      return <PathSelectionStep onNext={() => setCurrentStep(2)} />;
    }

    if (isEntrepreneur) {
      return <EntrepreneurPlaceholder />;
    }

    switch (currentStep) {
      case 2:
        return (
          <NaturalRoleDefinitionStep 
            onNext={() => setCurrentStep(3)} 
            onNeedHelp={() => setShowPendingHelp(true)} 
          />
        );
      case 3:
        return (
          <PromiseCheckStep 
            onNext={() => {
              if (naturalRole?.promise_check === false) {
                setShowNotReady(true);
              } else {
                setCurrentStep(4);
              }
            }} 
            onNeedHelp={() => setShowNotReady(true)} 
          />
        );
      case 4:
        return <PracticeCheckStep onNext={() => setCurrentStep(5)} onNeedHelp={() => {}} />;
      case 5:
        return <TrainingCheckStep onNext={() => setCurrentStep(6)} onNeedHelp={() => {}} />;
      case 6:
        return <ConsultingCheckStep onNext={() => setCurrentStep(7)} onNeedHelp={() => {}} />;
      case 7:
        return <ScalingStep onNext={() => setCurrentStep(8)} />;
      case 8:
        return <CompletionStep />;
      default:
        return <PathSelectionStep onNext={() => setCurrentStep(2)} />;
    }
  };

  return (
    <OnboardingLayout 
      currentStep={currentStep} 
      totalSteps={totalSteps}
      stepLabel={getStepLabel()}
    >
      {renderStep()}
    </OnboardingLayout>
  );
};

export default Onboarding;

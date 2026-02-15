import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { PathSelectionStep } from "@/components/onboarding/steps/PathSelectionStep";
import { NaturalRoleDefinitionStep } from "@/components/onboarding/steps/NaturalRoleDefinitionStep";
import { PromiseCheckStep, NotReadyStep, PracticeCheckStep, TrainingCheckStep, ConsultingCheckStep } from "@/components/onboarding/steps/AssessmentSteps";
import { ScalingStep } from "@/components/onboarding/steps/ScalingStep";
import { ProfileInfoStep } from "@/components/onboarding/steps/ProfileInfoStep";
import { CompletionStep } from "@/components/onboarding/steps/CompletionStep";
import { PendingHelpStep } from "@/components/onboarding/steps/PendingHelpStep";
import { useOnboarding } from "@/hooks/useOnboarding";

import { useAuth } from "@/hooks/useAuth";

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, updateOnboardingState, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showNotReady, setShowNotReady] = useState(false);
  const [showPendingHelp, setShowPendingHelp] = useState(false);
  const [showFormDirectly, setShowFormDirectly] = useState(false);
  const [hasRestarted, setHasRestarted] = useState(false);
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (onboardingState) {
      // If user has assistance_requested status but came back to define their NR,
      // start them at step 2 (NR definition) — only if they haven't restarted
      if (naturalRole?.status === "assistance_requested" && onboardingState.onboarding_completed && !hasRestarted) {
        setCurrentStep(2);
        return;
      }
      
      // If current_step is 1, user is starting fresh (e.g. came from choose-path)
      if (onboardingState.current_step <= 1) {
        setHasRestarted(true);
      }
      
      setCurrentStep(onboardingState.current_step);
      // Redirect if truly completed (step 9 for both paths) and not needing support
      if (onboardingState.current_step >= 9 && 
          onboardingState.onboarding_completed && 
          naturalRole?.status !== "assistance_requested") {
        navigate("/", { replace: true });
      }
    }
  }, [onboardingState, naturalRole, navigate, hasRestarted]);

  useEffect(() => {
    // Only show pending help if they just requested it in this session, not from stale DB state
    if (naturalRole?.status === "assistance_requested" && !onboardingState?.onboarding_completed && currentStep > 1 && !hasRestarted) {
      setShowPendingHelp(true);
    }
    if (naturalRole?.promise_check === false && currentStep >= 4) {
      setShowNotReady(true);
    }
  }, [naturalRole, currentStep, onboardingState, hasRestarted]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalSteps = 9; // Same steps for both entrepreneurs and co-builders

  const handleBack = async () => {
    if (showPendingHelp) {
      setShowPendingHelp(false);
      return;
    }
    if (showNotReady) {
      setShowNotReady(false);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // Reset state in both DB and context so ChoosePath doesn't redirect back
      try {
        await updateOnboardingState({ current_step: 1, primary_role: null, onboarding_completed: false });
      } catch (e) {
        console.error("Failed to reset onboarding state:", e);
      }
      navigate("/choose-path");
    }
  };

  const canGoBack = currentStep >= 1 || showPendingHelp || showNotReady;

  const getStepLabel = () => {
    const labels: Record<number, string> = {
      1: "Choose your path",
      2: "Define your Natural Role",
      3: "Assessment: Promise",
      4: "Assessment: Practice",
      5: "Assessment: Training",
      6: "Assessment: Consulting",
      7: "Scaling your impact",
      8: "Your Profile",
      9: "Activation",
    };
    return labels[currentStep] || "";
  };

  const handleDefineNowFromPendingHelp = () => {
    setShowPendingHelp(false);
    setShowFormDirectly(true);
  };

  const handleBackToHelpScreen = () => {
    setShowFormDirectly(false);
    setShowPendingHelp(true);
  };

  const handleBackToChoiceScreen = () => {
    setShowPendingHelp(false);
  };

  const renderStep = () => {
    if (showPendingHelp) return <PendingHelpStep onDefineNow={handleDefineNowFromPendingHelp} onBack={handleBackToChoiceScreen} />;
    if (showNotReady) return <NotReadyStep onNeedHelp={() => navigate("/")} />;

    if (currentStep === 1) {
      return <PathSelectionStep onNext={() => setCurrentStep(2)} />;
    }

    // Both entrepreneurs and co-builders go through the same Natural Role journey
    switch (currentStep) {
      case 2:
        return (
          <NaturalRoleDefinitionStep 
            onNext={() => {
              setShowFormDirectly(false);
              setCurrentStep(3);
            }} 
            onNeedHelp={() => setShowPendingHelp(true)}
            showFormDirectly={showFormDirectly}
            onBackToHelp={handleBackToHelpScreen}
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
        return <ProfileInfoStep onNext={() => setCurrentStep(9)} />;
      case 9:
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
      onBack={handleBack}
      canGoBack={canGoBack}
    >
      {renderStep()}
    </OnboardingLayout>
  );
};

export default Onboarding;

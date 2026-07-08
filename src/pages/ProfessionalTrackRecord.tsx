import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { NaturalRoleDefinitionStep } from "@/components/onboarding/steps/NaturalRoleDefinitionStep";
import { PromiseCheckStep, NotReadyStep, PracticeCheckStep, TrainingCheckStep, ConsultingCheckStep } from "@/components/onboarding/steps/AssessmentSteps";
import { ScalingStep } from "@/components/onboarding/steps/ScalingStep";
import { ProfileInfoStep } from "@/components/onboarding/steps/ProfileInfoStep";
import { CompletionStep } from "@/components/onboarding/steps/CompletionStep";
import { PendingHelpStep } from "@/components/onboarding/steps/PendingHelpStep";
import { useOnboarding } from "@/hooks/useOnboarding";

import { useAuth } from "@/hooks/useAuth";

// Step mapping — legacy "choose path" step removed.
// Wizard step (1..8)  <->  stored current_step in DB (2..9)
const WIZARD_TO_STORED = (n: number) => n + 1;
const STORED_TO_WIZARD = (n: number) => Math.max(1, n - 1);
const TOTAL_STEPS = 8;

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, naturalRole, updateOnboardingState, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawForcedStep = parseInt(searchParams.get("step") || "", 10);
  // ?step= is expressed in wizard steps (1..8). Convert to stored steps for DB.
  const forcedStoredStep = Number.isFinite(rawForcedStep) && rawForcedStep >= 1 && rawForcedStep <= TOTAL_STEPS
    ? WIZARD_TO_STORED(rawForcedStep)
    : NaN;
  const hasForcedStepParam = Number.isFinite(forcedStoredStep);

  const [currentStep, setCurrentStep] = useState(hasForcedStepParam ? forcedStoredStep : 2);
  const [showNotReady, setShowNotReady] = useState(false);
  const [showPendingHelp, setShowPendingHelp] = useState(false);
  const [showFormDirectly, setShowFormDirectly] = useState(false);
  const [hasRestarted, setHasRestarted] = useState(false);
  const [hasAppliedForcedStep, setHasAppliedForcedStep] = useState(!hasForcedStepParam);
  const [usedForcedStep, setUsedForcedStep] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (onboardingState) {
      if (!hasAppliedForcedStep && hasForcedStepParam) {
        setCurrentStep(forcedStoredStep);
        setHasAppliedForcedStep(true);
        setUsedForcedStep(true);
        updateOnboardingState({ current_step: forcedStoredStep, onboarding_completed: false });
        searchParams.delete("step");
        setSearchParams(searchParams, { replace: true });
        return;
      }

      if (usedForcedStep) return;

      if (naturalRole?.status === "assistance_requested" && onboardingState.onboarding_completed && !hasRestarted) {
        setCurrentStep(2);
        return;
      }

      if (onboardingState.current_step <= 1) {
        setHasRestarted(true);
      }

      if (onboardingState.current_step <= 1) {
        navigate("/onboarding", { replace: true });
        return;
      }

      setCurrentStep(onboardingState.current_step);
      if (onboardingState.current_step >= 9 &&
          onboardingState.onboarding_completed &&
          naturalRole?.status !== "assistance_requested") {
        navigate("/", { replace: true });
      }
    }
  }, [onboardingState, naturalRole, navigate, hasRestarted, hasAppliedForcedStep, hasForcedStepParam, forcedStoredStep, searchParams, setSearchParams, updateOnboardingState, usedForcedStep]);

  useEffect(() => {
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

  const handleBack = async () => {
    if (showPendingHelp) { setShowPendingHelp(false); return; }
    if (showNotReady) { setShowNotReady(false); return; }
    if (currentStep > 2) {
      setCurrentStep(currentStep - 1);
    } else {
      if (window.history.length > 1) navigate(-1);
      else navigate("/dashboard");
    }
  };

  const canGoBack = currentStep >= 2 || showPendingHelp || showNotReady;

  const getStepLabel = () => {
    const labels: Record<number, string> = {
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

  const handleDefineNowFromPendingHelp = () => { setShowPendingHelp(false); setShowFormDirectly(true); };
  const handleBackToHelpScreen = () => { setShowFormDirectly(false); setShowPendingHelp(true); };
  const handleBackToChoiceScreen = () => { setShowPendingHelp(false); };

  const renderStep = () => {
    if (showPendingHelp) return <PendingHelpStep onDefineNow={handleDefineNowFromPendingHelp} onBack={handleBackToChoiceScreen} />;
    if (showNotReady) return <NotReadyStep onNeedHelp={() => navigate("/")} />;

    switch (currentStep) {
      case 2:
        return (
          <NaturalRoleDefinitionStep
            onNext={() => { setShowFormDirectly(false); setCurrentStep(3); }}
            onNeedHelp={() => setShowPendingHelp(true)}
            showFormDirectly={showFormDirectly}
            onBackToHelp={handleBackToHelpScreen}
          />
        );
      case 3:
        return (
          <PromiseCheckStep
            onNext={() => {
              if (naturalRole?.promise_check === false) setShowNotReady(true);
              else setCurrentStep(4);
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
        return null;
    }
  };

  return (
    <OnboardingLayout
      currentStep={STORED_TO_WIZARD(currentStep)}
      totalSteps={TOTAL_STEPS}
      stepLabel={getStepLabel()}
      onBack={handleBack}
      canGoBack={canGoBack}
    >
      {renderStep()}
    </OnboardingLayout>
  );
};

export default Onboarding;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { EntrepreneurialExperienceStep } from "@/components/onboarding/steps/EntrepreneurialExperienceStep";
import { EntrepreneurialReviewStep } from "@/components/onboarding/steps/EntrepreneurialReviewStep";
import { ProfileInfoStep } from "@/components/onboarding/steps/ProfileInfoStep";

export interface EntrepreneurialData {
  // Project
  has_developed_project: boolean | null;
  project_description: string;
  project_count: string;
  project_needs_help: boolean;
  // Product
  has_built_product: boolean | null;
  product_description: string;
  product_count: string;
  product_needs_help: boolean;
  // Business
  has_run_business: boolean | null;
  business_description: string;
  business_count: string;
  business_needs_help: boolean;
  // Board
  has_served_on_board: boolean | null;
  board_description: string;
  board_count: string;
  board_needs_help: boolean;
}

const initialData: EntrepreneurialData = {
  has_developed_project: null,
  project_description: "",
  project_count: "",
  project_needs_help: false,
  has_built_product: null,
  product_description: "",
  product_count: "",
  product_needs_help: false,
  has_run_business: null,
  business_description: "",
  business_count: "",
  business_needs_help: false,
  has_served_on_board: null,
  board_description: "",
  board_count: "",
  board_needs_help: false,
};

const EntrepreneurialOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, updateOnboardingState, sendAdminNotification, sendMilestoneNotification, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<EntrepreneurialData>(initialData);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (onboardingState) {
      if (onboardingState.primary_role === "entrepreneur" && onboardingState.onboarding_completed) {
        navigate("/", { replace: true });
      }
    }
  }, [onboardingState, navigate]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Set entrepreneur role on first interaction
  const ensureEntrepreneurRole = async () => {
    if (!onboardingState?.primary_role || onboardingState.primary_role !== "entrepreneur") {
      await updateOnboardingState({ primary_role: "entrepreneur", potential_role: "potential_entrepreneur" });
    }
  };

  const totalSteps = 6; // 4 experience steps + profile + review

  const stepLabels: Record<number, string> = {
    1: "Project Development",
    2: "Product Building",
    3: "Business Experience",
    4: "Board Service",
    5: "Your Profile",
    6: "Review & Submit",
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else navigate("/choose-path");
  };

  const updateField = <K extends keyof EntrepreneurialData>(key: K, value: EntrepreneurialData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const experienceSteps: Array<{
    question: string;
    hasKey: keyof EntrepreneurialData;
    descKey: keyof EntrepreneurialData;
    countKey: keyof EntrepreneurialData;
    helpKey: keyof EntrepreneurialData;
    countLabel: string;
    descPlaceholder: string;
  }> = [
    {
      question: "Have you developed a project before?",
      hasKey: "has_developed_project",
      descKey: "project_description",
      countKey: "project_count",
      helpKey: "project_needs_help",
      countLabel: "Number of projects",
      descPlaceholder: "Describe the projects you've worked on...",
    },
    {
      question: "Have you built a product (sold or not)?",
      hasKey: "has_built_product",
      descKey: "product_description",
      countKey: "product_count",
      helpKey: "product_needs_help",
      countLabel: "Number of products",
      descPlaceholder: "Describe the products you've built...",
    },
    {
      question: "Have you run a business?",
      hasKey: "has_run_business",
      descKey: "business_description",
      countKey: "business_count",
      helpKey: "business_needs_help",
      countLabel: "Number of businesses",
      descPlaceholder: "Describe the businesses you've run...",
    },
    {
      question: "Have you served on a board?",
      hasKey: "has_served_on_board",
      descKey: "board_description",
      countKey: "board_count",
      helpKey: "board_needs_help",
      countLabel: "Number of boards",
      descPlaceholder: "Describe your board service experience...",
    },
  ];

  const renderStep = () => {
    if (currentStep >= 1 && currentStep <= 4) {
      const config = experienceSteps[currentStep - 1];
      return (
        <EntrepreneurialExperienceStep
          question={config.question}
          hasExperience={data[config.hasKey] as boolean | null}
          description={data[config.descKey] as string}
          count={data[config.countKey] as string}
          needsHelp={data[config.helpKey] as boolean}
          countLabel={config.countLabel}
          descPlaceholder={config.descPlaceholder}
          onHasExperienceChange={(val) => {
            updateField(config.hasKey, val);
            if (!val) {
              updateField(config.descKey, "" as any);
              updateField(config.countKey, "" as any);
            }
          }}
          onDescriptionChange={(val) => updateField(config.descKey, val as any)}
          onCountChange={(val) => updateField(config.countKey, val as any)}
          onNeedsHelpChange={(val) => updateField(config.helpKey, val)}
          onNext={async () => {
            await ensureEntrepreneurRole();
            setCurrentStep(currentStep + 1);
          }}
        />
      );
    }

    if (currentStep === 5) {
      return <ProfileInfoStep onNext={() => setCurrentStep(6)} />;
    }

    if (currentStep === 6) {
      return (
        <EntrepreneurialReviewStep
          data={data}
          onSubmit={async () => {
            // Save to database handled inside the review step
          }}
        />
      );
    }

    return null;
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      stepLabel={stepLabels[currentStep] || ""}
      onBack={handleBack}
      canGoBack={true}
    >
      {renderStep()}
    </OnboardingLayout>
  );
};

export default EntrepreneurialOnboarding;

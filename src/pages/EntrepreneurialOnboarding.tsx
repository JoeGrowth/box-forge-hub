import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { EntrepreneurialExperienceStep, ExtraField } from "@/components/onboarding/steps/EntrepreneurialExperienceStep";
import { EntrepreneurialReviewStep } from "@/components/onboarding/steps/EntrepreneurialReviewStep";
import { ProfileInfoStep } from "@/components/onboarding/steps/ProfileInfoStep";

export interface EntrepreneurialData {
  // Projects / Initiatives
  has_developed_project: boolean | null;
  project_description: string;
  project_count: string;
  project_needs_help: boolean;
  project_role: string;
  project_outcome: string;
  // Products / Prototypes
  has_built_product: boolean | null;
  product_description: string;
  product_count: string;
  product_needs_help: boolean;
  product_stage: string;
  product_users_count: string;
  // Team Experience
  has_led_team: boolean | null;
  team_description: string;
  team_size: string;
  team_role: string;
  team_needs_help: boolean;
  // Business / Commercial
  has_run_business: boolean | null;
  business_description: string;
  business_count: string;
  business_needs_help: boolean;
  business_revenue: string;
  business_duration: string;
  // Equity / Value Contributions
  has_served_on_board: boolean | null;
  board_description: string;
  board_count: string;
  board_needs_help: boolean;
  board_role_type: string;
  board_equity_details: string;
}

const initialData: EntrepreneurialData = {
  has_developed_project: null,
  project_description: "",
  project_count: "",
  project_needs_help: false,
  project_role: "",
  project_outcome: "",
  has_built_product: null,
  product_description: "",
  product_count: "",
  product_needs_help: false,
  product_stage: "",
  product_users_count: "",
  has_led_team: null,
  team_description: "",
  team_size: "",
  team_role: "",
  team_needs_help: false,
  has_run_business: null,
  business_description: "",
  business_count: "",
  business_needs_help: false,
  business_revenue: "",
  business_duration: "",
  has_served_on_board: null,
  board_description: "",
  board_count: "",
  board_needs_help: false,
  board_role_type: "",
  board_equity_details: "",
};

const EntrepreneurialOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState, updateOnboardingState, loading: onboardingLoading } = useOnboarding();
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

  const ensureEntrepreneurRole = async () => {
    if (!onboardingState?.primary_role || onboardingState.primary_role !== "entrepreneur") {
      await updateOnboardingState({ primary_role: "entrepreneur", potential_role: "potential_entrepreneur" });
    }
  };

  const totalSteps = 7; // 5 experience steps + profile + review

  const stepLabels: Record<number, string> = {
    1: "Initiatives & Projects",
    2: "Products & Prototypes",
    3: "Team Experience",
    4: "Business & Commercial",
    5: "Equity & Value",
    6: "Your Profile",
    7: "Review & Submit",
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
    subtitle: string;
    hasKey: keyof EntrepreneurialData;
    descKey: keyof EntrepreneurialData;
    countKey: keyof EntrepreneurialData;
    helpKey: keyof EntrepreneurialData;
    countLabel: string;
    descPlaceholder: string;
    extraFields: ExtraField[];
    extraKeys: string[];
  }> = [
    {
      question: "Have you initiated or led any projects?",
      subtitle: "Include any initiative you started — personal, academic, community, or professional. We want to understand your ability to take the lead.",
      hasKey: "has_developed_project",
      descKey: "project_description",
      countKey: "project_count",
      helpKey: "project_needs_help",
      countLabel: "Number of initiatives/projects",
      descPlaceholder: "Describe the initiatives or projects you've started or led — what was the goal, your role, and the context...",
      extraFields: [
        {
          key: "project_role",
          label: "Your role in these projects",
          type: "select",
          placeholder: "Select your role...",
          options: [
            { value: "founder", label: "Founder / Initiator" },
            { value: "co-founder", label: "Co-Founder" },
            { value: "project_lead", label: "Project Lead" },
            { value: "core_contributor", label: "Core Contributor" },
          ],
        },
        {
          key: "project_outcome",
          label: "Measurable outcomes or results",
          type: "textarea",
          placeholder: "What were the tangible results? (e.g., users reached, revenue generated, partnerships formed, awards received...)",
        },
      ],
      extraKeys: ["project_role", "project_outcome"],
    },
    {
      question: "Have you built a product or prototype?",
      subtitle: "This includes physical products, software, apps, MVPs, or any tangible output — whether sold, launched, or still in progress.",
      hasKey: "has_built_product",
      descKey: "product_description",
      countKey: "product_count",
      helpKey: "product_needs_help",
      countLabel: "Number of products/prototypes",
      descPlaceholder: "Describe the products or prototypes you've built — what problem did they solve, and what technology or approach did you use...",
      extraFields: [
        {
          key: "product_stage",
          label: "Furthest stage reached",
          type: "select",
          placeholder: "Select stage...",
          options: [
            { value: "idea", label: "Idea / Concept" },
            { value: "prototype", label: "Prototype / PoC" },
            { value: "mvp", label: "MVP (Minimum Viable Product)" },
            { value: "launched", label: "Launched / Live" },
            { value: "revenue", label: "Revenue-Generating" },
          ],
        },
        {
          key: "product_users_count",
          label: "Users, customers, or testers reached",
          type: "text",
          placeholder: "e.g., 500 beta users, 50 paying customers, 10 pilot clients...",
        },
      ],
      extraKeys: ["product_stage", "product_users_count"],
    },
    {
      question: "Have you led or been part of a team building a product or venture?",
      subtitle: "This captures your experience working in or leading teams — in startups, corporate projects, hackathons, or collaborative ventures.",
      hasKey: "has_led_team",
      descKey: "team_description",
      countKey: "team_size",
      helpKey: "team_needs_help",
      countLabel: "Largest team size you managed",
      descPlaceholder: "Describe the team context — what was the venture or project, how was the team structured, and what was your contribution...",
      extraFields: [
        {
          key: "team_role",
          label: "Your role in the team",
          type: "select",
          placeholder: "Select your role...",
          options: [
            { value: "team_lead", label: "Team Lead / Manager" },
            { value: "cto_coo", label: "CTO / COO / C-Level" },
            { value: "co-founder", label: "Co-Founder" },
            { value: "key_member", label: "Key Team Member" },
            { value: "advisor", label: "Advisor / Mentor" },
          ],
        },
      ],
      extraKeys: ["team_role"],
    },
    {
      question: "Have you run a business or commercial activity?",
      subtitle: "Include any revenue-generating activity — freelancing, a registered business, e-commerce, consulting, or service-based ventures with measurable outcomes.",
      hasKey: "has_run_business",
      descKey: "business_description",
      countKey: "business_count",
      helpKey: "business_needs_help",
      countLabel: "Number of businesses/activities",
      descPlaceholder: "Describe the business(es) you've operated — industry, business model, and what you achieved...",
      extraFields: [
        {
          key: "business_revenue",
          label: "Revenue or impact achieved",
          type: "textarea",
          placeholder: "Describe your measurable outcomes — revenue range, clients served, market share, growth metrics...",
        },
        {
          key: "business_duration",
          label: "Duration of activity",
          type: "text",
          placeholder: "e.g., 2 years, 6 months, ongoing since 2020...",
        },
      ],
      extraKeys: ["business_revenue", "business_duration"],
    },
    {
      question: "Have you made equity or value-based contributions?",
      subtitle: "This includes board membership, advisory roles, angel investing, equity partnerships, or any contribution where you received or provided value beyond a salary.",
      hasKey: "has_served_on_board",
      descKey: "board_description",
      countKey: "board_count",
      helpKey: "board_needs_help",
      countLabel: "Number of contributions",
      descPlaceholder: "Describe your equity or value-based contributions — what was the context, your role, and the value exchanged...",
      extraFields: [
        {
          key: "board_role_type",
          label: "Type of contribution",
          type: "select",
          placeholder: "Select type...",
          options: [
            { value: "board_member", label: "Board Member" },
            { value: "advisor", label: "Advisor / Mentor" },
            { value: "angel_investor", label: "Angel Investor" },
            { value: "equity_partner", label: "Equity Partner / Co-Founder" },
            { value: "pro_bono", label: "Pro Bono / Value Contributor" },
          ],
        },
        {
          key: "board_equity_details",
          label: "Value details",
          type: "textarea",
          placeholder: "Describe the value exchange — equity held, impact of advisory, investment outcomes, strategic contributions...",
        },
      ],
      extraKeys: ["board_role_type", "board_equity_details"],
    },
  ];

  const renderStep = () => {
    if (currentStep >= 1 && currentStep <= 5) {
      const config = experienceSteps[currentStep - 1];
      const extraValues: Record<string, string> = {};
      config.extraKeys.forEach((key) => {
        extraValues[key] = (data as any)[key] || "";
      });

      return (
        <EntrepreneurialExperienceStep
          question={config.question}
          subtitle={config.subtitle}
          hasExperience={data[config.hasKey] as boolean | null}
          description={data[config.descKey] as string}
          count={data[config.countKey] as string}
          needsHelp={data[config.helpKey] as boolean}
          countLabel={config.countLabel}
          descPlaceholder={config.descPlaceholder}
          extraFields={config.extraFields}
          extraValues={extraValues}
          onHasExperienceChange={(val) => {
            updateField(config.hasKey, val);
            if (!val) {
              updateField(config.descKey, "" as any);
              updateField(config.countKey, "" as any);
              config.extraKeys.forEach((key) => {
                updateField(key as keyof EntrepreneurialData, "" as any);
              });
            }
          }}
          onDescriptionChange={(val) => updateField(config.descKey, val as any)}
          onCountChange={(val) => updateField(config.countKey, val as any)}
          onNeedsHelpChange={(val) => updateField(config.helpKey, val)}
          onExtraFieldChange={(key, val) => updateField(key as keyof EntrepreneurialData, val as any)}
          onNext={async () => {
            await ensureEntrepreneurRole();
            setCurrentStep(currentStep + 1);
          }}
        />
      );
    }

    if (currentStep === 6) {
      return <ProfileInfoStep onNext={() => setCurrentStep(7)} />;
    }

    if (currentStep === 7) {
      return (
        <EntrepreneurialReviewStep
          data={data}
          onSubmit={async () => {}}
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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOnboarding } from "./useOnboarding";
import { useNextBestActions } from "./useNextBestActions";

// Persona = derived navigation brain for /opportunities.
// Inputs: progression stage (system truth) + onboarding journey_status + presence
// of approved startup_ideas (venture creator override). No user UI preference.
export type OpportunityPersona =
  | "explorer"
  | "builder"
  | "validated_expert"
  | "professional_operator"
  | "cobuilder"
  | "venture_creator";

export type OpportunityCategory = "job" | "training" | "consulting" | "tender" | "startup";

interface PersonaConfig {
  persona: OpportunityPersona;
  label: string;
  defaultTab: OpportunityCategory;
  banner: { title: string; body: string; ctaLabel: string; ctaRoute: string } | null;
  hasApprovedStartupIdea: boolean;
  loading: boolean;
}

const STAGE_TO_PERSONA: Record<string, OpportunityPersona> = {
  novice: "explorer",
  emerging: "explorer",
  capable: "builder",
  monetizing: "validated_expert",
  building: "professional_operator",
  founder: "professional_operator",
};

export function useOpportunityPersona(): PersonaConfig {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();
  const { progression, loading: progressionLoading } = useNextBestActions(user?.id);
  const [hasApprovedStartup, setHasApprovedStartup] = useState(false);
  const [startupCheckDone, setStartupCheckDone] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasApprovedStartup(false);
      setStartupCheckDone(true);
      return;
    }
    supabase
      .from("startup_ideas")
      .select("id")
      .eq("creator_id", user.id)
      .eq("review_status", "approved")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setHasApprovedStartup(!!data);
        setStartupCheckDone(true);
      });
  }, [user]);

  return useMemo<PersonaConfig>(() => {
    const stage = progression?.current_state ?? "novice";
    const cobuilderApproved = onboardingState?.journey_status === "approved";
    const entrepreneurApproved = onboardingState?.journey_status === "entrepreneur_approved";

    // Venture Creator override — wins over progression stage.
    if (hasApprovedStartup || entrepreneurApproved) {
      return {
        persona: "venture_creator",
        label: "Venture Creator",
        defaultTab: "job",
        banner: {
          title: "You're operating as a Venture Creator",
          body: "Browse to benchmark, or publish a role, tender, or job to grow your venture.",
          ctaLabel: "Post an opportunity",
          ctaRoute: "/create-idea",
        },
        hasApprovedStartupIdea: hasApprovedStartup,
        loading: progressionLoading || !startupCheckDone,
      };
    }

    if (cobuilderApproved && (stage === "capable" || stage === "monetizing" || stage === "building" || stage === "founder")) {
      return {
        persona: "cobuilder",
        label: "Co-Builder",
        defaultTab: "job",
        banner: {
          title: "Find a startup to co-build",
          body: "Approved co-builders are matched to startup roles by skill graph overlap.",
          ctaLabel: "View co-builder directory",
          ctaRoute: "/co-builders",
        },
        hasApprovedStartupIdea: false,
        loading: progressionLoading || !startupCheckDone,
      };
    }

    const persona = STAGE_TO_PERSONA[stage] ?? "explorer";

    const cfg: Record<OpportunityPersona, PersonaConfig> = {
      explorer: {
        persona: "explorer",
        label: "Explorer",
        defaultTab: "job",
        banner: {
          title: "Build signals first",
          body: "Complete one validated training or practice journey to unlock paid missions.",
          ctaLabel: "Open Learning",
          ctaRoute: "/certifications",
        },
        hasApprovedStartupIdea: false,
        loading: false,
      },
      builder: {
        persona: "builder",
        label: "Builder",
        defaultTab: "job",
        banner: {
          title: "Convert your skills into paid work",
          body: "Best-matched jobs and consulting missions are ranked first.",
          ctaLabel: "Refine your profile",
          ctaRoute: "/resume",
        },
        hasApprovedStartupIdea: false,
        loading: false,
      },
      validated_expert: {
        persona: "validated_expert",
        label: "Validated Expert",
        defaultTab: "job",
        banner: {
          title: "Take on consulting missions",
          body: "Your verified expertise unlocks consulting requests and qualifying tenders.",
          ctaLabel: "Publish a service",
          ctaRoute: "/publish-consulting",
        },
        hasApprovedStartupIdea: false,
        loading: false,
      },
      professional_operator: {
        persona: "professional_operator",
        label: "Professional Operator",
        defaultTab: "job",
        banner: {
          title: "High-value contracts",
          body: "Tenders and senior roles aligned with your sector experience.",
          ctaLabel: "Open Advisory",
          ctaRoute: "/advisory",
        },
        hasApprovedStartupIdea: false,
        loading: false,
      },
      cobuilder: {
        persona: "cobuilder",
        label: "Co-Builder",
        defaultTab: "job",
        banner: null,
        hasApprovedStartupIdea: false,
        loading: false,
      },
      venture_creator: {
        persona: "venture_creator",
        label: "Venture Creator",
        defaultTab: "job",
        banner: null,
        hasApprovedStartupIdea: hasApprovedStartup,
        loading: false,
      },
    };

    return { ...cfg[persona], loading: progressionLoading || !startupCheckDone };
  }, [progression, onboardingState, hasApprovedStartup, startupCheckDone, progressionLoading]);
}

// Single source of truth for the Dashboard hero CTAs.
// Primary (green) CTA = derived from the user's current direction (onboarding "goal" — answer to "What do you want next?").
// Secondary CTA = derived from the user's onboarding intent (answer to "Where are you today?").
//
// Both are pure functions so they can be unit-tested without React.

import {
  Lightbulb, Search, Users, GraduationCap, DollarSign,
  Briefcase, Compass, ShieldCheck, Rocket, BadgeCheck, Sparkles,
} from "lucide-react";

export type CtaSpec = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** Primary CTA — driven by current direction (goal). */
export function primaryCtaForGoal(goal: string | null, primaryRole: string | null): CtaSpec {
  switch (goal) {
    case "find_opportunities":
      return { to: "/opportunities", label: "Browse Opportunities", icon: Search };
    case "join_startup":
      return { to: "/opportunities?category=startup", label: "Browse Ideas", icon: Search };
    case "build_venture":
      return { to: "/entrepreneurship?new=1", label: "Post an Idea", icon: Lightbulb };
    case "monetize_expertise":
      return { to: "/publish-consulting", label: "Publish a Service", icon: DollarSign };
    case "learn_skills":
      return { to: "/journey", label: "Open Learning", icon: GraduationCap };
    default:
      if (primaryRole === "entrepreneur") {
        return { to: "/entrepreneurship?new=1", label: "Post an Idea", icon: Lightbulb };
      }
      return { to: "/opportunities?category=startup", label: "Browse Ideas", icon: Search };
  }
}

/** Secondary CTA — driven by onboarding intent ("Where are you today?"). */
export function secondaryCtaForIntent(intent: string | null): CtaSpec {
  switch (intent) {
    case "Validated Expert":
      return { to: "/people?tab=advisors", label: "Open Advisor Hub", icon: BadgeCheck };
    case "Builder":
      return { to: "/opportunities?category=startup", label: "Find a Builder Mission", icon: Rocket };
    case "Co-Builder":
      return { to: "/people?tab=cobuilders", label: "Meet Co-Builders", icon: Users };
    case "Venture Creator":
      return { to: "/entrepreneurship", label: "Manage My Venture", icon: Lightbulb };
    case "Professional Operator":
      return { to: "/career", label: "Open Career Tools", icon: Briefcase };
    case "Explorer":
      return { to: "/opportunities", label: "Explore the Ecosystem", icon: Compass };
    default:
      return { to: "/people", label: "Connect with People", icon: Users };
  }
}

export function ctasFor(
  goal: string | null,
  intent: string | null,
  primaryRole: string | null,
): { primary: CtaSpec; secondary: CtaSpec } {
  return {
    primary: primaryCtaForGoal(goal, primaryRole),
    secondary: secondaryCtaForIntent(intent),
  };
}

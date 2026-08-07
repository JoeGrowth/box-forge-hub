import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

export interface ShapeYourTalentCompleteState {
  loading: boolean;
  shapeYourTalentComplete: boolean;
}

const DEFAULT: ShapeYourTalentCompleteState = {
  loading: true,
  shapeYourTalentComplete: false,
};

const cacheKey = (uid?: string | null) =>
  uid ? `b4:shape-your-talent-complete:${uid}` : null;

const readCached = (uid?: string | null): boolean => {
  try {
    const key = cacheKey(uid);
    if (!key || typeof window === "undefined") return false;
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const writeCached = (uid: string, complete: boolean) => {
  try {
    const key = cacheKey(uid);
    if (key && typeof window !== "undefined") {
      window.localStorage.setItem(key, complete ? "1" : "0");
    }
  } catch {
    /* ignore */
  }
};

/**
 * Mirrors the completion logic in DashboardProgress so other components
 * (e.g. the navbar) can react when the "Manage your box" card appears.
 */
export function useShapeYourTalentComplete(): ShapeYourTalentCompleteState {
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const [state, setState] = useState<ShapeYourTalentCompleteState>(() => ({
    ...DEFAULT,
    shapeYourTalentComplete: readCached(user?.id),
  }));

  const compute = useCallback(async () => {
    if (authLoading || !user) {
      setState({ loading: false, shapeYourTalentComplete: false });
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      shapeYourTalentComplete:
        prev.shapeYourTalentComplete || readCached(user.id),
    }));

    const uid = user.id;

    const [
      { data: nrDecoder },
      { data: naturalRole },
      { data: profile },
      { data: entOnboarding },
      { count: consultingCount },
      { data: ownedOrgs },
      { data: adminMemberships },
      { count: teamCount },
      { count: approvedIdeasCount },
    ] = await Promise.all([
      supabase
        .from("nr_decoder_submissions")
        .select("status")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("natural_roles")
        .select(
          "description, status, is_ready, promise_check, practice_check, training_check, consulting_check"
        )
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(
          "professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications"
        )
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("entrepreneurial_onboarding")
        .select("is_completed")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("consultant_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("stage", "closed"),
      supabase.from("organizations").select("id").eq("created_by", uid),
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", uid)
        .eq("role", "admin"),
      supabase
        .from("startup_team_members")
        .select("id", { count: "exact", head: true })
        .eq("member_user_id", uid),
      supabase
        .from("startup_ideas")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", uid)
        .eq("review_status", "approved"),
    ]);

    const isOnboardingTrulyComplete = Boolean(
      onboardingState?.onboarding_completed &&
        (onboardingState?.current_step ?? 0) >= 5
    );

    const filled = (v: unknown) =>
      v !== null && v !== undefined && String(v).trim().length > 0;

    const p = (profile || {}) as Record<string, unknown>;
    const resumeDone = Boolean(
      filled(p.professional_title) &&
        filled(p.bio) &&
        filled(p.summary_statement) &&
        filled(p.primary_skills) &&
        filled(p.key_projects) &&
        filled(p.education_certifications) &&
        p.years_of_experience !== null &&
        p.years_of_experience !== undefined
    );

    const trackRecordDone = Boolean(entOnboarding?.is_completed);

    const nrDefined = Boolean(
      (typeof p.description === "string" &&
        p.description?.trim().length > 0) ||
        p.is_ready === true ||
        p.status === "defined" ||
        p.promise_check === true ||
        p.practice_check === true ||
        p.training_check === true ||
        p.consulting_check === true
    );

    const decoderDone = !!nrDecoder || nrDefined;
    const proTrackDone = nrDefined;

    const foundationDone =
      isOnboardingTrulyComplete && decoderDone && proTrackDone && resumeDone;

    const talentMonetized = (consultingCount ?? 0) >= 10;

    const adminOrgIds = Array.from(
      new Set([
        ...((ownedOrgs ?? []) as any[]).map((o) => o.id),
        ...((adminMemberships ?? []) as any[]).map((m) => m.organization_id),
      ])
    );

    let orgFunded = false;
    if (adminOrgIds.length > 0) {
      const { data: entities } = await supabase
        .from("declaration_entities")
        .select("id")
        .in("organization_id", adminOrgIds);
      const entityIds = ((entities ?? []) as any[]).map((e) => e.id);
      if (entityIds.length > 0) {
        const { data: missions } = await supabase
          .from("declaration_missions")
          .select("budget, currency, client_paid")
          .in("entity_id", entityIds)
          .eq("client_paid", true);
        const totals: Record<string, number> = {};
        ((missions ?? []) as any[]).forEach((m) => {
          const cur = m.currency || "TND";
          totals[cur] = (totals[cur] ?? 0) + Number(m.budget || 0);
        });
        orgFunded = Object.values(totals).some((v) => v > 100);
      }
    }

    const ventureDone =
      ((teamCount ?? 0) >= 3) && ((approvedIdeasCount ?? 0) >= 2);

    const complete =
      foundationDone && talentMonetized && orgFunded && ventureDone;

    writeCached(uid, complete);
    setState({ loading: false, shapeYourTalentComplete: complete });
  }, [authLoading, user, onboardingState]);

  useEffect(() => {
    compute();
  }, [compute]);

  useEffect(() => {
    if (!user) return;

    const tables = [
      "profiles",
      "natural_roles",
      "nr_decoder_submissions",
      "entrepreneurial_onboarding",
      "consultant_opportunities",
      "organizations",
      "organization_members",
      "declaration_entities",
      "declaration_missions",
      "startup_team_members",
      "startup_ideas",
    ];

    const channel = supabase.channel(`shape-your-talent-${user.id}`);
    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` },
        () => compute()
      );
    });
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") compute();
    };
    const onFocus = () => compute();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, compute]);

  return state;
}

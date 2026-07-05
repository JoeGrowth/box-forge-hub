// Access gates for the top-nav actions that require the user to have shaped
// their talent (intent + natural role + professional track record + resume)
// and for org-admin-only publishing surfaces.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

export interface TalentReadiness {
  loading: boolean;
  /** Intent declared + natural role decoded + pro track record + resume sharpened. */
  talentReady: boolean;
  /** User is admin/owner of at least one organization in /organizations. */
  isOrgAdmin: boolean;
  missing: string[];
  /** Sub-tasks completed toward talent foundation. */
  talentCompleted: number;
  /** Total sub-tasks for talent foundation. */
  talentTotal: number;
}

const TALENT_TOTAL = 4;

const DEFAULT: TalentReadiness = {
  loading: true,
  talentReady: false,
  isOrgAdmin: false,
  missing: [],
  talentCompleted: 0,
  talentTotal: TALENT_TOTAL,
};

export function useTalentReadiness(): TalentReadiness {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [state, setState] = useState<TalentReadiness>(DEFAULT);

  useEffect(() => {
    let alive = true;
    if (authLoading || adminLoading) return;
    if (!user) {
      setState({ ...DEFAULT, loading: false });
      return;
    }

    // Platform admins bypass every gate.
    if (isAdmin) {
      setState({ loading: false, talentReady: true, isOrgAdmin: true, missing: [], talentCompleted: TALENT_TOTAL, talentTotal: TALENT_TOTAL });
      return;
    }

    (async () => {
      const uid = user.id;
      const [onbRes, nrRes, decoderRes, profileRes, orgMemberRes, ownedOrgRes] =
        await Promise.all([
          supabase
            .from("onboarding_state")
            .select("onboarding_completed, current_step, journey_status")
            .eq("user_id", uid)
            .maybeSingle(),
          supabase
            .from("natural_roles")
            .select("description")
            .eq("user_id", uid)
            .maybeSingle(),
          supabase
            .from("nr_decoder_submissions")
            .select("id")
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
            .from("organization_members")
            .select("organization_id, role")
            .eq("user_id", uid)
            .eq("role", "admin")
            .limit(1),
          supabase
            .from("organizations")
            .select("id")
            .eq("created_by", uid)
            .limit(1),
        ]);

      if (!alive) return;

      const filled = (v: unknown) =>
        v !== null && v !== undefined && String(v).trim().length > 0;

      const intentDone = Boolean(
        onbRes.data?.onboarding_completed && (onbRes.data?.current_step ?? 0) >= 5
      );
      const decoderDone = Boolean(decoderRes.data);
      const proTrackDone = Boolean(nrRes.data?.description);
      const p = (profileRes.data ?? {}) as Record<string, unknown>;
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

      const missing: string[] = [];
      if (!intentDone) missing.push("Declare your intent");
      if (!decoderDone) missing.push("Decode your natural role");
      if (!proTrackDone) missing.push("Fill your Professional Track Record");
      if (!resumeDone) missing.push("Sharpen your resume");

      const isOrgAdmin =
        (orgMemberRes.data?.length ?? 0) > 0 || (ownedOrgRes.data?.length ?? 0) > 0;

      setState({
        loading: false,
        talentReady: missing.length === 0,
        isOrgAdmin,
        missing,
      });
    })();

    return () => {
      alive = false;
    };
  }, [user, isAdmin, authLoading, adminLoading]);

  return useMemo(() => state, [state]);
}

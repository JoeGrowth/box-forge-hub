// Engine-level access gating, driven by the existing graph projections.
// Career stays open as the on-ramp. Consulting and Entrepreneurship require
// evidence in the graphs (expertise / revenue / advisor readiness / ownership
// / reputation / certifications) or grandfathering by existing activity.
//
// Components must read engine access through this hook — never re-implement
// the rules locally.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

export type EngineKey = "career" | "consulting" | "entrepreneurship";

export interface EngineSignal {
  /** Short human-readable evidence label, e.g. "1 verified expertise". */
  label: string;
  /** Where the user can go to earn this signal. */
  cta?: { label: string; to: string };
}

export interface EngineAccess {
  unlocked: boolean;
  /** Signals already satisfied (for the locked panel checklist). */
  met: EngineSignal[];
  /** Signals still missing — any one of these unlocks the engine. */
  missing: EngineSignal[];
}

export interface EngineAccessMap {
  career: EngineAccess;
  consulting: EngineAccess;
  entrepreneurship: EngineAccess;
}

const EMPTY_ACCESS: EngineAccess = { unlocked: false, met: [], missing: [] };

const DEFAULT_MAP: EngineAccessMap = {
  career: EMPTY_ACCESS,
  consulting: EMPTY_ACCESS,
  entrepreneurship: EMPTY_ACCESS,
};

export function useEngineAccess() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [engines, setEngines] = useState<EngineAccessMap>(DEFAULT_MAP);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (authLoading || adminLoading) return;

    if (!user) {
      setEngines(DEFAULT_MAP);
      setLoading(false);
      return;
    }

    // Admins unlock everything.
    if (isAdmin) {
      setEngines({
        career: { unlocked: true, met: [{ label: "Admin access" }], missing: [] },
        consulting: { unlocked: true, met: [{ label: "Admin access" }], missing: [] },
        entrepreneurship: { unlocked: true, met: [{ label: "Admin access" }], missing: [] },
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      const uid = user.id;

      const [
        expertiseRes,
        revenueRes,
        readinessRes,
        ownershipRes,
        reputationRes,
        certsRes,
        ownIdeasRes,
        teamRes,
        onbRes,
        nrRes,
        decoderRes,
        profileRes,
      ] = await Promise.all([
        supabase
          .from("expertise_graph")
          .select("expertise_score, verified_expertise_count")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("revenue_graph")
          .select("completed_value_count")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("advisor_readiness")
          .select("eligible")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("ownership_graph")
          .select("total_allocated_equity")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("reputation_graph")
          .select("reputation_level")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("user_certifications")
          .select("certification_type, verified")
          .eq("user_id", uid),
        supabase
          .from("startup_ideas")
          .select("id")
          .eq("creator_id", uid)
          .limit(1),
        supabase
          .from("startup_team_members")
          .select("startup_id")
          .eq("member_user_id", uid)
          .limit(1),
        supabase
          .from("onboarding_state")
          .select("onboarding_completed, current_step")
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
          .select("professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      if (!alive) return;

      const expertiseScore = Number(expertiseRes.data?.expertise_score ?? 0);
      const verifiedExpertise = Number(expertiseRes.data?.verified_expertise_count ?? 0);
      const completedTx = Number(revenueRes.data?.completed_value_count ?? 0);
      const advisorReady = Boolean(readinessRes.data?.eligible);
      const allocatedEquity = Number(ownershipRes.data?.total_allocated_equity ?? 0);
      const repLevel = String(reputationRes.data?.reputation_level ?? "verified");

      const certs = (certsRes.data ?? []) as Array<{ certification_type: string; verified: boolean | null }>;
      const hasCoBuilderCert = certs.some((c) => c.certification_type === "cobuilder_b4");
      const hasInitiatorCert = certs.some((c) => c.certification_type === "initiator_b4");
      const ownsIdea = (ownIdeasRes.data ?? []).length > 0;
      const isOnTeam = (teamRes.data ?? []).length > 0;

      const filled = (v: unknown) => v !== null && v !== undefined && String(v).trim().length > 0;
      const intentDone = Boolean(onbRes.data?.onboarding_completed && (onbRes.data?.current_step ?? 0) >= 5);
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
      const talentFoundationSet = intentDone && decoderDone && proTrackDone && resumeDone;

      // ---------- Career: always open for signed-in users ----------
      const career: EngineAccess = {
        unlocked: true,
        met: [{ label: "Signed in — Career is your starting engine" }],
        missing: [],
      };

      // ---------- Consulting ----------
      const consultingChecks: Array<{ ok: boolean; sig: EngineSignal }> = [
        {
          ok: verifiedExpertise >= 1,
          sig: {
            label: "At least 1 verified expertise",
            cta: { label: "Add a certification", to: "/resume" },
          },
        },
        {
          ok: expertiseScore >= 8,
          sig: {
            label: `Expertise score ≥ 8 (current: ${expertiseScore})`,
            cta: { label: "Build your track record", to: "/track-record" },
          },
        },
        {
          ok: completedTx >= 1,
          sig: {
            label: "At least 1 completed transaction",
            cta: { label: "Browse paid opportunities", to: "/opportunities" },
          },
        },
        {
          ok: advisorReady,
          sig: {
            label: "Recognised as advisor-ready",
            cta: { label: "Visit Advisory hub", to: "/advisory" },
          },
        },
      ];

      const consulting: EngineAccess = {
        unlocked: consultingChecks.some((c) => c.ok),
        met: consultingChecks.filter((c) => c.ok).map((c) => c.sig),
        missing: consultingChecks.filter((c) => !c.ok).map((c) => c.sig),
      };

      // ---------- Entrepreneurship ----------
      const entChecks: Array<{ ok: boolean; sig: EngineSignal }> = [
        {
          ok: hasCoBuilderCert,
          sig: {
            label: "Vaccinated Co-Builder certification",
            cta: { label: "Start the Co-Builder journey", to: "/learning-journeys" },
          },
        },
        {
          ok: hasInitiatorCert,
          sig: {
            label: "Vaccinated Initiator certification",
            cta: { label: "Start the Initiator journey", to: "/learning-journeys" },
          },
        },
        {
          ok: allocatedEquity > 0,
          sig: {
            label: `Allocated equity in a venture (current: ${allocatedEquity}%)`,
            cta: { label: "Join a venture", to: "/opportunities?v=discover&kind=startup" },
          },
        },
        {
          ok: ["recognized", "expert", "authority"].includes(repLevel),
          sig: {
            label: `Reputation ≥ Recognized (current: ${repLevel})`,
            cta: { label: "Grow your reputation", to: "/profile" },
          },
        },
        {
          ok: ownsIdea || isOnTeam,
          sig: {
            label: "Already involved in a venture",
            cta: { label: "Find ventures to join", to: "/opportunities?v=discover&kind=startup" },
          },
        },
      ];

      const entrepreneurship: EngineAccess = {
        unlocked: entChecks.some((c) => c.ok),
        met: entChecks.filter((c) => c.ok).map((c) => c.sig),
        missing: entChecks.filter((c) => !c.ok).map((c) => c.sig),
      };

      setEngines({ career, consulting, entrepreneurship });
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [user, isAdmin, authLoading, adminLoading]);

  return useMemo(() => ({ engines, loading, isAdmin }), [engines, loading, isAdmin]);
}

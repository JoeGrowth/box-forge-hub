import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserMilestones {
  /** Talent Foundation set — intent, decoder, professional track record, resume */
  tfs: boolean;
  /** Talent Monetization — solo + contractor missions delivered (target 10) */
  tm: boolean;
  tmCount: number;
  /** Register Your Organization — admin of an org with >100 client-paid inflow */
  ryo: boolean;
  /** Launch or Join a Venture — 3 team memberships and 2 approved ideas */
  ljv: boolean;
}

const EMPTY: UserMilestones = { tfs: false, tm: false, tmCount: 0, ryo: false, ljv: false };

/**
 * Bulk-computes the four "Shape your talent" milestones for every user so the
 * admin table can show, at a glance, who is checked and who is not.
 * Mirrors the per-user logic in DashboardProgress.
 */
export function useAdminUserMilestones(
  users: { id: string; onboarding?: { onboarding_completed: boolean; current_step: number } | null }[],
) {
  const [milestones, setMilestones] = useState<Record<string, UserMilestones>>({});
  const [loading, setLoading] = useState(false);

  const userKey = users.map((u) => u.id).join(",");

  const fetchAll = useCallback(async () => {
    if (users.length === 0) {
      setMilestones({});
      return;
    }
    setLoading(true);
    const ids = users.map((u) => u.id);

    const [
      { data: profiles },
      { data: naturalRoles },
      { data: decoders },
      { data: closedOpps },
      { data: ownedOrgs },
      { data: adminMemberships },
      { data: teamMembers },
      { data: approvedIdeas },
      { data: onboardingSessions },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "user_id, professional_title, bio, primary_skills, summary_statement, key_projects, years_of_experience, education_certifications",
        )
        .in("user_id", ids),
      supabase
        .from("natural_roles")
        .select("user_id, description, is_ready, status, promise_check, practice_check, training_check, consulting_check")
        .in("user_id", ids),
      supabase.from("nr_decoder_submissions").select("user_id").in("user_id", ids),
      supabase.from("consultant_opportunities").select("id, user_id").in("user_id", ids).eq("stage", "closed"),
      supabase.from("organizations").select("id, created_by").in("created_by", ids),
      supabase.from("organization_members").select("organization_id, user_id").in("user_id", ids).eq("role", "admin"),
      supabase.from("startup_team_members").select("member_user_id").in("member_user_id", ids),
      supabase.from("startup_ideas").select("creator_id").in("creator_id", ids).eq("review_status", "approved"),
      supabase.from("onboarding_sessions").select("user_id, completed_steps, completed_at").in("user_id", ids),
    ]);

    // --- Talent Monetization: classify closed missions per user
    const oppIds = ((closedOpps ?? []) as any[]).map((o) => o.id);
    const oppOwner: Record<string, string> = {};
    ((closedOpps ?? []) as any[]).forEach((o) => {
      oppOwner[o.id] = o.user_id;
    });
    const distByOpp: Record<string, { name: string; note: string | null }[]> = {};
    if (oppIds.length > 0) {
      const { data: dists } = await supabase
        .from("consultant_opportunity_distributions")
        .select("opportunity_id, recipient_name, note")
        .in("opportunity_id", oppIds);
      ((dists ?? []) as any[]).forEach((d) => {
        (distByOpp[d.opportunity_id] ||= []).push({ name: d.recipient_name || "", note: d.note });
      });
    }
    const deliveredCount: Record<string, number> = {};
    oppIds.forEach((id) => {
      const owner = oppOwner[id];
      const list = distByOpp[id] || [];
      const hasEquity = list.some((r) => /associé|associe|equity|partner|co[- ]?builder/i.test(`${r.name} ${r.note ?? ""}`));
      // solo (<=1 recipient) or contractor deliveries count; equity splits do not
      if (list.length <= 1 || !hasEquity) deliveredCount[owner] = (deliveredCount[owner] ?? 0) + 1;
    });

    // --- Register Your Organization: admin orgs with client-paid inflow > 100
    const orgsByUser: Record<string, string[]> = {};
    ((ownedOrgs ?? []) as any[]).forEach((o) => {
      (orgsByUser[o.created_by] ||= []).push(o.id);
    });
    ((adminMemberships ?? []) as any[]).forEach((m) => {
      (orgsByUser[m.user_id] ||= []).push(m.organization_id);
    });
    const allOrgIds = Array.from(new Set(Object.values(orgsByUser).flat()));
    const fundedOrgIds = new Set<string>();
    if (allOrgIds.length > 0) {
      const { data: entities } = await supabase
        .from("declaration_entities")
        .select("id, organization_id")
        .in("organization_id", allOrgIds);
      const entityOrg: Record<string, string> = {};
      ((entities ?? []) as any[]).forEach((e) => {
        entityOrg[e.id] = e.organization_id;
      });
      const entityIds = Object.keys(entityOrg);
      if (entityIds.length > 0) {
        const { data: missions } = await supabase
          .from("declaration_missions")
          .select("entity_id, budget, currency, client_paid")
          .in("entity_id", entityIds)
          .eq("client_paid", true);
        const totals: Record<string, Record<string, number>> = {};
        ((missions ?? []) as any[]).forEach((m) => {
          const orgId = entityOrg[m.entity_id];
          if (!orgId) return;
          const cur = m.currency || "TND";
          (totals[orgId] ||= {})[cur] = (totals[orgId][cur] ?? 0) + Number(m.budget || 0);
        });
        Object.entries(totals).forEach(([orgId, byCur]) => {
          if (Object.values(byCur).some((v) => v > 100)) fundedOrgIds.add(orgId);
        });
      }
    }

    // --- Launch or Join a Venture
    const teamCount: Record<string, number> = {};
    ((teamMembers ?? []) as any[]).forEach((t) => {
      teamCount[t.member_user_id] = (teamCount[t.member_user_id] ?? 0) + 1;
    });
    const ideaCount: Record<string, number> = {};
    ((approvedIdeas ?? []) as any[]).forEach((i) => {
      ideaCount[i.creator_id] = (ideaCount[i.creator_id] ?? 0) + 1;
    });

    // --- Talent Foundation set
    const profileById: Record<string, any> = {};
    ((profiles ?? []) as any[]).forEach((p) => (profileById[p.user_id] = p));
    const nrById: Record<string, any> = {};
    ((naturalRoles ?? []) as any[]).forEach((n) => (nrById[n.user_id] = n));
    const decoderSet = new Set(((decoders ?? []) as any[]).map((d) => d.user_id));
    const filled = (v: any) => v !== null && v !== undefined && String(v).trim().length > 0;

    const next: Record<string, UserMilestones> = {};
    users.forEach((u) => {
      const p = profileById[u.id] || {};
      const nr = nrById[u.id] || {};
      const nrDefined = Boolean(
        (typeof nr.description === "string" && nr.description.trim().length > 0) ||
          nr.is_ready === true ||
          nr.status === "defined" ||
          nr.promise_check === true ||
          nr.practice_check === true ||
          nr.training_check === true ||
          nr.consulting_check === true,
      );
      // Mirrors useOnboarding: a finished 5-question session counts as completed
      // intent even when the legacy onboarding_state flag was never flipped.
      const intentDone =
        sessionDone.has(u.id) ||
        Boolean(u.onboarding?.onboarding_completed && (u.onboarding?.current_step ?? 0) >= 5);
      const resumeDone = Boolean(
        filled(p.professional_title) &&
          filled(p.bio) &&
          filled(p.summary_statement) &&
          filled(p.primary_skills) &&
          filled(p.key_projects) &&
          filled(p.education_certifications) &&
          p.years_of_experience !== null &&
          p.years_of_experience !== undefined,
      );
      const tmCount = deliveredCount[u.id] ?? 0;
      next[u.id] = {
        tfs: intentDone && (decoderSet.has(u.id) || nrDefined) && nrDefined && resumeDone,
        tm: tmCount >= 10,
        tmCount,
        ryo: (orgsByUser[u.id] ?? []).some((id) => fundedOrgIds.has(id)),
        ljv: (teamCount[u.id] ?? 0) >= 3 && (ideaCount[u.id] ?? 0) >= 2,
      };
    });

    setMilestones(next);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const get = (userId: string): UserMilestones => milestones[userId] ?? EMPTY;

  return { milestones, get, loading, refresh: fetchAll };
}

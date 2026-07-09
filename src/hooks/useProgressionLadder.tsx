// Six-stage progression ladder.
// Reads existing tables — no schema change. Every stage is computed live.
// Any UI that surfaces "next goal" must consume this hook, not recompute.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAdmin } from "./useAdmin";
import { useTalentReadiness } from "./useTalentReadiness";

export type LadderStageKey =
  | "discovery"    // Stage 0 — default unlock for everyone
  | "talent"       // Stage 1
  | "advisor"      // Stage 2 — 10 paid missions
  | "cobuilder"    // Stage 3 — 3 startup memberships
  | "founder"      // Stage 4 — 2 approved ideas
  | "box_admin"    // Stage 5 — assigned to a box
  | "platform_admin"; // Stage 6

export interface LadderStage {
  key: LadderStageKey;
  index: number;
  label: string;
  intent: string;
  current: number;
  target: number;
  unlocked: boolean;
  achieved: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export interface ProgressionLadder {
  stages: LadderStage[];
  currentStage: LadderStage; // furthest unlocked-not-achieved, or last achieved
  nextGoal: LadderStage | null; // first unlocked-not-achieved stage
  loading: boolean;
}

const EMPTY_LADDER: ProgressionLadder = {
  stages: [],
  currentStage: {} as LadderStage,
  nextGoal: null,
  loading: true,
};

export function useProgressionLadder(): ProgressionLadder {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { talentReady, talentCompleted, talentTotal, loading: talentLoading } = useTalentReadiness();
  const [state, setState] = useState<ProgressionLadder>(EMPTY_LADDER);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("ladder:refresh", handler);
    return () => window.removeEventListener("ladder:refresh", handler);
  }, []);

  useEffect(() => {
    if (authLoading || adminLoading || talentLoading) return;
    if (!user) { setState({ ...EMPTY_LADDER, loading: false }); return; }
    let alive = true;


    (async () => {
      const uid = user.id;
      // Paid missions: count closed consultant_opportunities for this user.
      const [paidRes, teamRes, ideasRes, boxRes] = await Promise.all([
        supabase.from("consultant_opportunities").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("stage", "closed"),
        supabase.from("startup_team_members").select("id", { count: "exact", head: true }).eq("member_user_id", uid),
        supabase.from("startup_ideas").select("id", { count: "exact", head: true }).eq("creator_id", uid).eq("review_status", "approved"),
        supabase.from("box_ecosystem_admins").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);

      if (!alive) return;

      const paidCount = (paidRes as any).count ?? 0;
      const teamCount = (teamRes as any).count ?? 0;
      const foundedCount = (ideasRes as any).count ?? 0;
      const boxCount = (boxRes as any).count ?? 0;

      const talentDone = talentReady;
      const advisorDone = paidCount >= 10;
      const cobuilderDone = teamCount >= 3;
      const founderDone = foundedCount >= 2;
      const boxAdminDone = boxCount >= 1;
      const platformAdminDone = isAdmin;

      // Stage unlocks are cumulative: previous stage must be achieved OR foundation ready.
      const stages: LadderStage[] = [
        {
          key: "talent", index: 1, label: "Talent Foundation",
          intent: "Natural Role + Expertise + Skills → Resume + Public Profile",
          current: talentCompleted, target: talentTotal,
          unlocked: true, achieved: talentDone,
          ctaLabel: talentDone ? "View public profile" : "Complete foundation",
          ctaHref: "/publish-talent",
        },
        {
          key: "advisor", index: 2, label: "Talent Monetized",
          intent: "Deliver 10 paid consulting missions to unlock Advisor status",
          current: Math.min(paidCount, 10), target: 10,
          unlocked: talentDone, achieved: advisorDone,
          ctaLabel: advisorDone ? "Manage brand entity" : "Grow consulting practice",
          ctaHref: advisorDone ? "/brand-entity" : "/consulting-growth",
        },
        {
          key: "cobuilder", index: 3, label: "Co-Builder Mastery",
          intent: "Join 3 startups as a team member — earn equity as capital",
          current: Math.min(teamCount, 3), target: 3,
          unlocked: talentDone, achieved: cobuilderDone,
          ctaLabel: "Browse ideas to join",
          ctaHref: "/opportunities?tab=startup",
        },
        {
          key: "founder", index: 4, label: "Initiation Mastery",
          intent: "Publish 2 approved ideas and recruit co-builders",
          current: Math.min(foundedCount, 2), target: 2,
          unlocked: talentDone, achieved: founderDone,
          ctaLabel: foundedCount > 0 ? "Manage your ideas" : "Create your first idea",
          ctaHref: foundedCount > 0 ? "/start" : "/create-idea",
        },
        {
          key: "box_admin", index: 5, label: "Box Admin",
          intent: "Advisor + Co-Builder + Founder → run a vertical Box ecosystem",
          current: boxAdminDone ? 1 : 0, target: 1,
          unlocked: advisorDone && cobuilderDone && founderDone,
          achieved: boxAdminDone,
          ctaLabel: boxAdminDone ? "Open your box" : "Explore boxes",
          ctaHref: "/boxes",
        },
        {
          key: "platform_admin", index: 6, label: "Platform Admin",
          intent: "Successful Box Admins become candidates for platform administration",
          current: platformAdminDone ? 1 : 0, target: 1,
          unlocked: boxAdminDone, achieved: platformAdminDone,
          ctaLabel: platformAdminDone ? "Open admin console" : "Locked",
          ctaHref: platformAdminDone ? "/admin" : "/ladder",
        },
      ];

      const nextGoal = stages.find((s) => s.unlocked && !s.achieved) ?? null;
      const lastAchieved = [...stages].reverse().find((s) => s.achieved);
      const currentStage = nextGoal ?? lastAchieved ?? stages[0];

      setState({ stages, currentStage, nextGoal, loading: false });
    })();

    return () => { alive = false; };
  }, [user, authLoading, isAdmin, adminLoading, talentReady, talentLoading, tick]);

  return state;
}

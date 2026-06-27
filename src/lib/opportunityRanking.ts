// Sprint 4A — opportunity ranking.
// Consumes EXISTING primitives only. Does not create a second reputation system.
//
// Inputs (per candidate, vs opportunity):
//   - Trust Block (advisor_metrics / reputation_graph projection)
//   - Verified contributions count
//   - Milestones earned count
//   - Relationship health (avg)
//   - Skill overlap with opportunity tags
//   - Track-record density
//   - Box overlap
//
// Output: ordered candidates with a rank score + an `evidence` breakdown so
// the UI can render evidence, not a single opaque score.

import { supabase } from "@/integrations/supabase/client";

export interface RankedCandidate {
  user_id: string;
  rank: number; // 0..1 monotonic, NOT user-facing
  evidence: {
    contributions: number;
    milestones: number;
    relationship_health: number | null;
    skill_overlap: number;
    box_overlap: boolean;
    track_record_density: number | null;
  };
}

interface RankInput {
  candidateIds: string[];
  opportunity: {
    id: string;
    type: string;
    box_id: string | null;
    metadata: Record<string, unknown>;
  };
}

const required = (o: Record<string, unknown>, k: string): string[] =>
  Array.isArray(o[k]) ? (o[k] as string[]) : [];

export async function rankCandidates({
  candidateIds,
  opportunity,
}: RankInput): Promise<RankedCandidate[]> {
  if (candidateIds.length === 0) return [];

  const wantedSkills = required(opportunity.metadata, "skills");

  const [
    contribRes,
    milestoneRes,
    relHealthRes,
    skillsRes,
    trackRes,
    boxRes,
  ] = await Promise.all([
    supabase
      .from("contributions")
      .select("user_id")
      .in("user_id", candidateIds),
    supabase
      .from("milestones")
      .select("user_id")
      .in("user_id", candidateIds),
    supabase
      .from("relationship_health")
      .select("user_id, score")
      .in("user_id", candidateIds),
    supabase
      .from("user_skills")
      .select("user_id, skill_id")
      .in("user_id", candidateIds),
    supabase
      .from("entrepreneurial_onboarding")
      .select("user_id, completion_score")
      .in("user_id", candidateIds),
    opportunity.box_id
      ? supabase
          .from("box_advisors")
          .select("user_id")
          .eq("box_id", opportunity.box_id)
          .in("user_id", candidateIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const bag = (rows: { user_id: string }[] | null | undefined) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return m;
  };

  const contributions = bag(contribRes.data as { user_id: string }[]);
  const milestones = bag(milestoneRes.data as { user_id: string }[]);

  const health = new Map<string, number>();
  (relHealthRes.data ?? []).forEach((r: any) => {
    const prev = health.get(r.user_id);
    health.set(
      r.user_id,
      prev == null ? r.score : (prev + r.score) / 2,
    );
  });

  const skillsByUser = new Map<string, Set<string>>();
  (skillsRes.data ?? []).forEach((r: any) => {
    const set = skillsByUser.get(r.user_id) ?? new Set<string>();
    set.add(r.skill_id);
    skillsByUser.set(r.user_id, set);
  });

  const track = new Map<string, number>();
  (trackRes.data ?? []).forEach((r: any) => {
    if (r.completion_score != null) track.set(r.user_id, r.completion_score);
  });

  const boxOverlap = new Set<string>(
    ((boxRes as { data: { user_id: string }[] | null }).data ?? []).map(
      (r) => r.user_id,
    ),
  );

  const scored = candidateIds.map((uid) => {
    const cContrib = contributions.get(uid) ?? 0;
    const cMilestones = milestones.get(uid) ?? 0;
    const cHealth = health.get(uid) ?? null;
    const userSkills = skillsByUser.get(uid) ?? new Set();
    const overlap = wantedSkills.filter((s) => userSkills.has(s)).length;
    const cTrack = track.get(uid) ?? null;
    const inBox = boxOverlap.has(uid);

    // Bounded, monotonic. NOT shown to the user. Used only for ordering.
    const rank =
      Math.min(cContrib, 10) * 0.08 +
      Math.min(cMilestones, 10) * 0.07 +
      (cHealth ?? 0) * 0.25 +
      Math.min(overlap, 5) * 0.08 +
      (cTrack ?? 0) * 0.15 +
      (inBox ? 0.1 : 0);

    return {
      user_id: uid,
      rank,
      evidence: {
        contributions: cContrib,
        milestones: cMilestones,
        relationship_health: cHealth,
        skill_overlap: overlap,
        box_overlap: inBox,
        track_record_density: cTrack,
      },
    } satisfies RankedCandidate;
  });

  return scored.sort((a, b) => b.rank - a.rank);
}

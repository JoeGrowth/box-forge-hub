// Sprint 4A — opportunity ranking.
// Consumes EXISTING primitives only. Does not create a second reputation system.
// Output: candidates ordered by an internal score + an `evidence` breakdown so
// the UI can render evidence, not a single opaque score.

import { supabase } from "@/integrations/supabase/client";

// Untyped alias — the supabase generated types are union-heavy and trip
// TS2589 when we run many .in() queries in parallel.
const sb = supabase as any;

export interface RankedCandidate {
  user_id: string;
  rank: number; // internal ordering signal, NOT user-facing
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
    relRes,
    skillsRes,
    trackRes,
    boxRes,
  ] = await Promise.all([
    sb.from("contributions").select("actor_id").in("actor_id", candidateIds),
    sb.from("milestones").select("achieved_by").in("achieved_by", candidateIds),
    sb
      .from("advisor_relationships")
      .select("id, advisor_id, user_id, relationship_health(health_score)")
      .or(
        `advisor_id.in.(${candidateIds.join(",")}),user_id.in.(${candidateIds.join(",")})`,
      ),
    sb.from("user_skills").select("user_id, skill_id").in("user_id", candidateIds),
    sb
      .from("entrepreneurial_onboarding")
      .select("user_id, completion_score")
      .in("user_id", candidateIds),
    opportunity.box_id
      ? sb
          .from("box_advisors")
          .select("user_id")
          .eq("box_id", opportunity.box_id)
          .in("user_id", candidateIds)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);

  const countBy = <T extends Record<string, any>>(rows: T[] | null, key: keyof T) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      const k = r[key] as unknown as string;
      if (!k) return;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  };

  const contributions = countBy<{ actor_id: string }>(contribRes.data, "actor_id");
  const milestones = countBy<{ achieved_by: string }>(milestoneRes.data, "achieved_by");

  // Average relationship_health per candidate across all their relationships.
  const healthAgg = new Map<string, { sum: number; n: number }>();
  (relRes.data ?? []).forEach((r: any) => {
    const score = r?.relationship_health?.[0]?.health_score;
    if (score == null) return;
    [r.advisor_id, r.user_id].forEach((uid: string) => {
      if (!candidateIds.includes(uid)) return;
      const cur = healthAgg.get(uid) ?? { sum: 0, n: 0 };
      cur.sum += Number(score);
      cur.n += 1;
      healthAgg.set(uid, cur);
    });
  });

  const skillsByUser = new Map<string, Set<string>>();
  (skillsRes.data ?? []).forEach((r: any) => {
    const set = skillsByUser.get(r.user_id) ?? new Set<string>();
    set.add(r.skill_id);
    skillsByUser.set(r.user_id, set);
  });

  const track = new Map<string, number>();
  (trackRes.data ?? []).forEach((r: any) => {
    if (r.completion_score != null) track.set(r.user_id, Number(r.completion_score));
  });

  const boxOverlap = new Set<string>(
    (boxRes.data ?? []).map((r: any) => r.user_id),
  );

  const scored = candidateIds.map((uid) => {
    const cContrib = contributions.get(uid) ?? 0;
    const cMilestones = milestones.get(uid) ?? 0;
    const agg = healthAgg.get(uid);
    const cHealth = agg ? agg.sum / agg.n : null;
    const userSkills = skillsByUser.get(uid) ?? new Set<string>();
    const overlap = wantedSkills.filter((s) => userSkills.has(s)).length;
    const cTrack = track.get(uid) ?? null;
    const inBox = boxOverlap.has(uid);

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

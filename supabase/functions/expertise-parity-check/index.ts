// Parity check — compares the new graph projection (expertise_graph)
// against the legacy direct-from-tables calculation. Used as a Phase 1
// completion gate BEFORE swapping UI read sites.
//
// Returns per-user deltas. Pass `?user_id=<uuid>` to check one user,
// otherwise checks up to `limit` users (default 25).
//
// Pass criterion (per user):
//   - same skill count, certification count, verified count, contribution count
//   - score_partial difference within tolerance (default 0)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const singleUser = url.searchParams.get("user_id");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 200);
  const tolerance = Number(url.searchParams.get("tolerance") ?? "0");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Pick the sample.
  let userIds: string[] = [];
  if (singleUser) {
    userIds = [singleUser];
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .order("created_at", { ascending: false })
      .limit(limit);
    userIds = (data ?? []).map((r: { user_id: string }) => r.user_id);
  }

  const results: Array<Record<string, unknown>> = [];
  let pass = 0;
  let fail = 0;

  for (const uid of userIds) {
    const [legacyRes, projRes] = await Promise.all([
      supabase.rpc("legacy_expertise_calc", { _user_id: uid }),
      supabase
        .from("expertise_graph")
        .select("expertise_score, score_breakdown, monetizable_expertise, verified_expertise_count")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    const legacy = (legacyRes.data ?? {}) as Record<string, number>;
    const proj = projRes.data;
    const me = proj?.monetizable_expertise as Record<string, number> | null;

    const skillsMatch  = (legacy.skills        ?? 0) === (me?.skills ?? 0);
    const certsMatch   = (legacy.certifications ?? 0) === (me?.certifications ?? 0);
    const verifiedMatch = (legacy.verified     ?? 0) === (proj?.verified_expertise_count ?? 0);
    const contribsMatch = (legacy.contributions ?? 0) === (me?.contributions ?? 0);

    const projPartial =
      (me?.skills ?? 0) * 1.0
      + (me?.certifications ?? 0) * 3.0
      + (proj?.verified_expertise_count ?? 0) * 2.0
      + (me?.contributions ?? 0) * 5.0;
    const scoreDelta = Math.abs((legacy.score_partial ?? 0) - projPartial);
    const scoreOk = scoreDelta <= tolerance;

    const ok = skillsMatch && certsMatch && verifiedMatch && contribsMatch && scoreOk;
    if (ok) pass++; else fail++;

    results.push({
      user_id: uid,
      ok,
      legacy,
      projection: {
        skills: me?.skills ?? 0,
        certifications: me?.certifications ?? 0,
        verified: proj?.verified_expertise_count ?? 0,
        contributions: me?.contributions ?? 0,
        score_partial: projPartial,
        score_total: proj?.expertise_score ?? 0,
      },
      deltas: {
        skills: (me?.skills ?? 0) - (legacy.skills ?? 0),
        certifications: (me?.certifications ?? 0) - (legacy.certifications ?? 0),
        verified: (proj?.verified_expertise_count ?? 0) - (legacy.verified ?? 0),
        contributions: (me?.contributions ?? 0) - (legacy.contributions ?? 0),
        score_partial: projPartial - (legacy.score_partial ?? 0),
      },
    });
  }

  return new Response(
    JSON.stringify({
      total: userIds.length,
      pass,
      fail,
      tolerance,
      ready_for_ui_migration: fail === 0,
      results,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

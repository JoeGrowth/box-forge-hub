// Background AI profile draft.
// Triggered on onboarding completion. Writes ONLY to the draft_* columns —
// never touches the live profile fields (professional_title, summary_statement,
// primary_skills). Promotion happens via the promote_profile_draft RPC after
// the user explicitly accepts.
//
// Idempotent unless { force: true } is passed in the body.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      return json(500, { error: "LOVABLE_API_KEY missing" });

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user)
      return json(401, { error: "Not authenticated" });
    const userId = userData.user.id;

    let body: { force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      /* empty body is fine */
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Idempotency — skip if a draft already exists and force !== true.
    const { data: existing } = await admin
      .from("profiles")
      .select(
        "draft_title, draft_summary, draft_skills, profile_draft_source, full_name, professional_title, summary_statement, primary_skills",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (
      !body.force &&
      existing?.profile_draft_source === "ai_v1" &&
      existing?.draft_title
    ) {
      return json(200, { skipped: true, reason: "already_drafted" });
    }

    // Gather context: onboarding session + natural role.
    const [{ data: session }, { data: nr }] = await Promise.all([
      admin
        .from("onboarding_sessions")
        .select(
          "onboarding_intent, goal, availability, completed_steps",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("natural_roles")
        .select(
          "description, practice_entities, training_contexts, consulting_with_whom",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const { data: tagsRow } = await admin
      .from("cold_start_profiles")
      .select("estimated_expertise")
      .eq("user_id", userId)
      .maybeSingle();

    const seedTags: string[] = Array.isArray(tagsRow?.estimated_expertise)
      ? (tagsRow!.estimated_expertise as string[])
      : [];

    const ctx: string[] = [];
    if (existing?.full_name) ctx.push(`Name: ${existing.full_name}`);
    if (nr?.description) ctx.push(`Natural Role: ${nr.description}`);
    if (session?.onboarding_intent)
      ctx.push(`Where they are today: ${session.onboarding_intent}`);
    if (session?.goal) ctx.push(`Goal: ${session.goal}`);
    if (seedTags.length) ctx.push(`Expertise tags: ${seedTags.join(", ")}`);
    if (nr?.practice_entities) ctx.push(`Practice: ${nr.practice_entities}`);
    if (nr?.training_contexts) ctx.push(`Training: ${nr.training_contexts}`);
    if (nr?.consulting_with_whom)
      ctx.push(`Consulting: ${nr.consulting_with_whom}`);

    const system = `You draft a professional identity for a builder platform.
Return STRICT JSON only, no prose, no markdown, with this shape:
{"title": string (3-7 words), "summary": string (max 240 chars, first person), "skills": string[] (5 to 8 short skill tags), "confidence": number (0..1)}.
Tone: concrete, builder-y, no buzzwords, no emojis.`;

    const user = `Draft an identity for this person:\n\n${ctx.join("\n") || "(very little context — infer a generalist builder identity)"}\n\nReturn only JSON.`;

    const r = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      },
    );

    if (!r.ok) {
      if (r.status === 429)
        return json(429, { error: "rate_limited" });
      if (r.status === 402)
        return json(402, { error: "credits_exhausted" });
      const t = await r.text();
      console.error("AI gateway error", r.status, t);
      return json(500, { error: "ai_failed" });
    }

    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      title?: string;
      summary?: string;
      skills?: string[];
      confidence?: number;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Bad JSON from AI:", raw);
      return json(500, { error: "bad_ai_json" });
    }

    const title = (parsed.title ?? "").toString().trim().slice(0, 120);
    const summary = (parsed.summary ?? "").toString().trim().slice(0, 240);
    const skills = Array.isArray(parsed.skills)
      ? parsed.skills
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    if (!title || !summary || skills.length === 0)
      return json(500, { error: "incomplete_draft", raw: parsed });

    // Upsert into the draft slots. profile_draft_source is set once and kept
    // forever (provenance), regenerations bump generated_at but keep source.
    const updatePayload: Record<string, unknown> = {
      draft_title: title,
      draft_summary: summary,
      draft_skills: skills,
      profile_draft_source: "ai_v1",
      profile_draft_confidence: confidence,
      profile_draft_generated_at: new Date().toISOString(),
    };

    // If the user has already accepted a previous draft, regeneration must
    // not silently clear the accepted timestamp — we leave it intact. Only
    // promotion via promote_profile_draft updates accepted_at.
    const generatedAt = new Date().toISOString();
    updatePayload.profile_draft_generated_at = generatedAt;
    const { error: upErr } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId);

    if (upErr) {
      console.error("profile update failed", upErr);
      return json(500, { error: "db_update_failed" });
    }

    // Implicit feedback — draft_generated event (DB-deduped by idempotency_key).
    await admin.from("graph_events").upsert(
      {
        user_id: userId,
        event_type: "draft_generated",
        aggregate_type: "profile_draft",
        aggregate_id: userId,
        source_module: "ai_profile_draft",
        payload: {
          canonical_name: "draft.generated",
          generated_at: generatedAt,
          confidence,
          forced: !!body.force,
        },
        idempotency_key: `draft_generated:v1:${userId}:${generatedAt}`,
        weight: 0.5,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    );

    return json(200, {
      ok: true,
      draft: { title, summary, skills, confidence, generated_at: generatedAt },
    });
  } catch (e) {
    console.error("draft-profile error", e);
    return json(500, {
      error: e instanceof Error ? e.message : "unknown",
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI Domain Recommendation Engine.

A Natural Role is a stable cognitive mechanism for creating value. It is NOT a job title, industry, skill, or personality label. Your job is to discover where this cognitive mechanism creates the highest societal/economic value.

Never match domains by keyword. Follow this reasoning chain strictly:
Natural Role -> Cognitive Function (the underlying value-creation mechanism) -> Core Question (the fundamental problem this person solves) -> Recommended Domains -> Transferability -> Business Models.

Return STRICT JSON only. No prose outside JSON. Schema:
{
  "primary_natural_role": string,
  "supporting_expressions": string[],
  "cognitive_function": string,
  "core_question": string,
  "recommended_domains": [
    {
      "name": string,
      "match": number,           // 0-100
      "why": string,
      "problems_solved": string[],
      "careers": string[],
      "businesses": string[]
    }
  ],
  "transferability": {
    "other_domains": string[],
    "reason": string
  },
  "business_models": [
    { "domain": string, "problem": string, "solution": string, "path": string }
  ]
}

Rules:
- Generate 5 to 8 recommended domains, ranked by match score descending.
- Match scores must be realistic (not all 95+). Differentiate.
- Careers: 3-5 items. Businesses: 2-4 items. Problems solved: 3-5 items.
- Keep each string concise (one line).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { naturalRole, supportingExpressions, currentTitle, primarySkills } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!naturalRole || String(naturalRole).trim().length === 0) {
      return new Response(JSON.stringify({ error: "Natural Role is required. Decode it first from your profile." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: string[] = [`Primary Natural Role: ${naturalRole}`];
    if (supportingExpressions) ctx.push(`Supporting expressions: ${supportingExpressions}`);
    if (currentTitle) ctx.push(`Current professional title (context only, not a domain): ${currentTitle}`);
    if (primarySkills) ctx.push(`Primary skills (context only): ${primarySkills}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze and recommend domains:\n\n${ctx.join("\n")}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate domain recommendations" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-domains error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

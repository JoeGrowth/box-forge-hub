import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entityName, entitySubtitle, productName, hint } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!productName) {
      return new Response(JSON.stringify({ error: "productName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a portfolio strategist mapping a group's solution ecosystem.
Write in Absolute Mode: blunt, directive, logic-driven. NO emojis, NO motivational filler. Institutional third-person voice. Never mention personal names.

For the given product/unit, produce:
- core_engine_title: 2-3 words ending in "Engine" (e.g. "Trust Engine"). Optional but preferred.
- core_engine_flow: a short transformation "X → Y".
- functional_product: ONE sentence describing what the product functionally does and for whom.
- business_engine: 2-4 short revenue/business mechanisms (2-5 words each).
- similar_entities: exactly 3 real, well-known companies with a short lowercase note on why they are comparable.

Return ONLY strict JSON:
{"core_engine_title":"...","core_engine_flow":"...","functional_product":"...","business_engine":["..."],"similar_entities":[{"name":"...","note":"..."}]}`;

    const user = `Group entity: ${entityName || "(unknown)"}${entitySubtitle ? ` — ${entitySubtitle}` : ""}
Product / unit name: ${productName}
Additional context: ${hint || "(none)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "supabase-edge-function",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Failed to generate portfolio content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch { /* ignore */ }
      }
    }

    const out = {
      core_engine_title: typeof parsed.core_engine_title === "string" ? parsed.core_engine_title.trim() : "",
      core_engine_flow: typeof parsed.core_engine_flow === "string" ? parsed.core_engine_flow.trim() : "",
      functional_product:
        typeof parsed.functional_product === "string" && parsed.functional_product.trim()
          ? parsed.functional_product.trim()
          : `${productName} delivers a structured solution within ${entityName || "the group"}.`,
      business_engine: Array.isArray(parsed.business_engine)
        ? parsed.business_engine.filter((b: any) => typeof b === "string" && b.trim()).map((b: string) => b.trim()).slice(0, 4)
        : [],
      similar_entities: Array.isArray(parsed.similar_entities)
        ? parsed.similar_entities
            .filter((s: any) => s && typeof s.name === "string")
            .map((s: any) => ({ name: String(s.name).trim(), note: String(s.note || "").trim() }))
            .slice(0, 3)
        : [],
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-portfolio-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

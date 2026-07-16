import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandName, modelLabel, modelDesc, profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!brandName) {
      return new Response(JSON.stringify({ error: "brandName is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: string[] = [];
    if (profile?.full_name) ctx.push(`Founder: ${profile.full_name}`);
    if (profile?.professional_title) ctx.push(`Title: ${profile.professional_title}`);
    if (profile?.bio) ctx.push(`Bio: ${profile.bio}`);
    if (profile?.primary_skills) ctx.push(`Skills: ${profile.primary_skills}`);
    if (profile?.natural_role) ctx.push(`Natural role: ${profile.natural_role}`);
    if (profile?.services_description) ctx.push(`Service description: ${profile.services_description}`);
    if (profile?.sector) ctx.push(`Sector: ${profile.sector}`);
    if (modelLabel) ctx.push(`Business model: ${modelLabel}${modelDesc ? " — " + modelDesc : ""}`);

    const system = `You are a brand strategist. Given a brand name, a business model, and the founder's profile, produce:
1) A crisp, branded description (3–5 sentences) written in Absolute Mode: blunt, directive, logic-driven. NO emojis, NO motivational filler. It must anchor the brand to the founder's expertise and the chosen business model. Speak in third person about the brand. End with a one-line positioning statement.
2) Exactly 3 "Roles Needed" — short role titles (2–5 words each) that a founder in this model should recruit first. Tailor them to the founder's expertise and sector.

Return ONLY strict JSON of the form:
{"description":"...","roles_needed":["...","...","..."]}
No prose outside the JSON.`;

    const user = `Brand name: ${brandName}\n\nContext:\n${ctx.join("\n") || "(no additional context)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "supabase-edge-function",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate brand content" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    let roles: string[] = Array.isArray(parsed.roles_needed) ? parsed.roles_needed.filter((r: any) => typeof r === "string") : [];
    roles = roles.map(r => r.trim()).filter(Boolean).slice(0, 3);
    while (roles.length < 3) roles.push(["Co-Founder", "Lead Consultant", "Operations Lead"][roles.length]);

    return new Response(JSON.stringify({ description, roles_needed: roles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brand-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

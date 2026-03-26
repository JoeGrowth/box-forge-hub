import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profileData, naturalRoleData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextParts: string[] = [];
    if (profileData?.full_name) contextParts.push(`Name: ${profileData.full_name}`);
    if (profileData?.bio) contextParts.push(`Bio: ${profileData.bio}`);
    if (profileData?.primary_skills) contextParts.push(`Skills: ${profileData.primary_skills}`);
    if (profileData?.years_of_experience) contextParts.push(`Years of Experience: ${profileData.years_of_experience}`);
    if (profileData?.key_projects) contextParts.push(`Key Projects: ${profileData.key_projects}`);
    if (profileData?.education_certifications) contextParts.push(`Education & Certifications: ${profileData.education_certifications}`);
    if (naturalRoleData?.description) contextParts.push(`Natural Role: ${naturalRoleData.description}`);
    if (naturalRoleData?.practice_entities) contextParts.push(`Practice Experience: ${naturalRoleData.practice_entities}`);
    if (naturalRoleData?.training_contexts) contextParts.push(`Training Experience: ${naturalRoleData.training_contexts}`);
    if (naturalRoleData?.consulting_with_whom) contextParts.push(`Consulting Experience: ${naturalRoleData.consulting_with_whom}`);
    if (naturalRoleData?.services_description) contextParts.push(`Services: ${naturalRoleData.services_description}`);

    if (contextParts.length === 0) {
      return new Response(JSON.stringify({ error: "Not enough profile data to generate a title. Please fill in some sections first (Natural Role, Bio, Skills, etc.)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional branding expert. Generate a concise, compelling professional title/headline (max 8 words) based on the user's profile data. The title should:
- Be a clear and specific job title or professional headline
- Reflect their natural role, expertise, and unique value
- Sound professional and marketable
- NOT include the person's name
- Return ONLY the title text, nothing else (no quotes, no explanation, no prefix)`
          },
          {
            role: "user",
            content: `Generate a professional title based on this profile:\n\n${contextParts.join("\n")}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate title" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-title error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Question {
  id: string;
  label: string;
  prompt: string;
}

interface Body {
  ideaTitle?: string;
  episode?: string;
  priorResponses?: Record<string, string>;
  questions?: Question[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { ideaTitle = "", episode = "", priorResponses = {}, questions = [] } =
      (await req.json()) as Body;

    if (!questions.length) {
      return new Response(JSON.stringify({ error: "No questions provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextLines = Object.entries(priorResponses)
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const questionBlock = questions
      .map((q, i) => `Q${i + 1} [id=${q.id}] ${q.label} — ${q.prompt}`)
      .join("\n");

    const system = `You are an Absolute-Mode startup analyst. Given the founder's prior responses for the "${episode}" episode of the venture "${ideaTitle}", write a concise, direct answer to each question below. Rules:
- One dense paragraph per question (3–6 sentences).
- Grounded strictly in the provided context. If the context is thin, extrapolate cautiously and mark assumptions with "Assumption:".
- No motivational filler, no emojis, no headers.
- Return ONLY valid JSON: {"summaries":[{"id":"<question_id>","text":"<answer>"}]} — one entry per question, same order.`;

    const user = `Venture: ${ideaTitle}
Episode: ${episode}

Prior responses:
${contextLines || "(none)"}

Answer these questions:
${questionBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate summary" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    let parsed: { summaries?: Array<{ id: string; text: string }> } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: attach the raw string to the first question.
      parsed = { summaries: [{ id: questions[0].id, text: raw }] };
    }

    return new Response(JSON.stringify({ summaries: parsed.summaries ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-episode-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

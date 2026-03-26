import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!title || !description) {
      return new Response(JSON.stringify({ error: "Title and description are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a startup analyst. Given a startup idea, produce exactly 5 elements. No filler, no emojis, no hype, no soft language, no questions, no calls to action, no motivational phrasing. Output must be structured, brief, and precise. Focus on underlying logic and cognitive clarity. Do not mirror user language. Maintain high-fidelity, independent reasoning.

Return a JSON object with exactly these keys: problem, solution, product, market, business_model. Each value is a string of 1-3 sentences maximum. No bullet points within values.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Startup: "${title}"\n\nDescription: ${description}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "output_five_elements",
              description: "Output the 5 elements of the startup idea.",
              parameters: {
                type: "object",
                properties: {
                  problem: { type: "string", description: "The core problem being addressed" },
                  solution: { type: "string", description: "The proposed solution" },
                  product: { type: "string", description: "The product or service" },
                  market: { type: "string", description: "The target market" },
                  business_model: { type: "string", description: "How money is made" },
                },
                required: ["problem", "solution", "product", "market", "business_model"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "output_five_elements" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured output returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const elements = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(elements), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-five-elements error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateResponse, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.11";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const KIND_LABEL: Record<string, string> = { service: "service", digital_product: "digital product (software/SaaS/app)", product: "physical product" };

const SHAPE = `{
 "subtitle": string,
 "checklist": [{"label": string, "desc": string}] (6 items: information to collect from the founder/provider),
 "identification": [{"element": string, "info": string}] (12 rows: name, category, type, purpose, target users, core functionalities/deliverables, key features, workflow, USP, reference, competitors (name real current competitors), status),
 "researchNote": string,
 "principle": string,
 "marketSignals": [{"headline": string, "insight": string, "source": string}] (4-6 recent market/news signals relevant to this offer, with source name or URL; only facts found via search),
 "avatar": string (segments separated by " · "),
 "addedValue": [{"angle": string, "value": string, "pain": string}] (10-12 rows),
 "priorities": [{"angle": string, "message": string}] (6 rows, proposed advertising message),
 "validation": [{"angle": string, "functionality": string, "status": "To confirm"}] (6 rows),
 "rule": string,
 "workflow": [string] (8-9 steps from founder input to advertising brief),
 "deliverableTitle": string,
 "deliverableItems": string (items separated by " · ")
}`;

function extractText(res: any): string {
  if (typeof res?.output_text === "string" && res.output_text) return res.output_text;
  const parts: string[] = [];
  for (const item of res?.output ?? []) {
    if (item?.type === "message") for (const c of item.content ?? []) if (c?.type === "output_text") parts.push(c.text);
  }
  return parts.join("\n");
}

function parseJson(text: string): any {
  const start = text.indexOf("{"); const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI returned no JSON");
  return JSON.parse(text.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const analysisId = typeof body?.analysisId === "string" ? body.analysisId : "";
    const mode = body?.mode === "cell" ? "cell" : "full";
    if (!/^[0-9a-f-]{36}$/i.test(analysisId)) return json({ error: "Invalid analysisId" }, 400);

    // RLS ensures the caller is a member of the analysis's organization.
    const { data: row } = await supabase
      .from("product_marketing_analyses")
      .select("id, title, offer_kind, content, organization_id")
      .eq("id", analysisId)
      .maybeSingle();
    if (!row) return json({ error: "Not found" }, 404);
    const { data: org } = await supabase.from("organizations").select("name, description").eq("id", row.organization_id).maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    const ctx = `Offer: "${row.title}". Type: ${KIND_LABEL[row.offer_kind]}. Organization: ${org?.name ?? ""}. ${org?.description ? "Organization description: " + String(org.description).slice(0, 600) : ""} Today's date: ${today}.`;
    const system = "You are LEAD, a blunt marketing intelligence analyst. No emojis, no filler. Use web search to ground competitors and market signals in current information as of today's date. Mark unverified product capabilities as 'to confirm'.";

    if (mode === "cell") {
      const section = String(body?.section ?? "").slice(0, 40);
      const field = String(body?.field ?? "").slice(0, 40);
      const rowCtx = JSON.stringify(body?.row ?? {}).slice(0, 1500);
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: system,
        input: `${ctx}\nRewrite ONLY the field "${field}" of this row in section "${section}": ${rowCtx}. Return JSON {"value": string} and nothing else. Keep it under 30 words.`,
        reasoning: { effort: "low" },
      } as any);
      const value = String(parseJson(extractText(res)).value ?? "").slice(0, 600);
      return json({ value });
    }

    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: system,
      tools: [{ type: "web_search" }],
      reasoning: { effort: "low" },
      input: `${ctx}\nProduce a Product & Service Analysis framework for this offer. Return ONLY valid JSON matching this shape:\n${SHAPE}`,
    } as any);
    const content = { ...parseJson(extractText(res)), researchedOn: today };
    const { error: upErr } = await supabase
      .from("product_marketing_analyses")
      .update({ content, generated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", analysisId);
    if (upErr) return json({ error: upErr.message }, 400);
    return json({ content });
  } catch (e) {
    if (e instanceof GatewayError) {
      console.error("gateway error", e.code, e.httpStatus);
      const status = e.httpStatus === 402 ? 402 : e.httpStatus === 429 ? 429 : 502;
      return json({ error: status === 402 ? "AI credits exhausted" : status === 429 ? "AI busy, try again shortly" : "AI request failed", code: e.code }, status);
    }
    console.error("marketing-intelligence failed", (e as Error)?.message);
    return json({ error: (e as Error)?.message || "Server error" }, 500);
  }
});

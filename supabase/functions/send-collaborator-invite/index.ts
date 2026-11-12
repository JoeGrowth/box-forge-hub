import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://box4solutions.com";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const access = body?.access === "edit" ? "edit" : "view";
    const entityId = typeof body?.entityId === "string" ? body.entityId : "";
    const orgSlug = typeof body?.orgSlug === "string" ? body.orgSlug.trim().slice(0, 120) : "";
    const json = (b: unknown, status: number) => new Response(JSON.stringify(b), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    if (!isValidEmail(email)) return json({ error: "Invalid email" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const callerId = userData.user.id;
    let entityName = "";

    if (entityId && UUID_RE.test(entityId)) {
      // Caller must own/edit the declaration entity, and the invitee must already be a listed collaborator.
      const { data: role } = await admin.rpc("declaration_entity_access", { _entity_id: entityId, _user_id: callerId });
      if (role !== "owner" && role !== "edit") return json({ error: "Forbidden" }, 403);
      const { data: collab } = await admin
        .from("declaration_entity_collaborators")
        .select("id")
        .eq("entity_id", entityId)
        .ilike("collaborator_email", email)
        .maybeSingle();
      if (!collab) return json({ error: "Invitee is not a collaborator of this entity" }, 403);
      const { data: ent } = await admin.from("declaration_entities").select("name").eq("id", entityId).maybeSingle();
      entityName = ent?.name || "";
    } else if (orgSlug) {
      // Caller must administer the organization.
      const { data: org } = await admin.from("organizations").select("id,name,created_by").eq("slug", orgSlug).maybeSingle();
      if (!org) return json({ error: "Forbidden" }, 403);
      const { data: isAdmin } = await admin.rpc("has_org_role", { _user: callerId, _org: org.id, _min_role: "admin" });
      if (!isAdmin && org.created_by !== callerId) return json({ error: "Forbidden" }, 403);
      entityName = org.name || "";
    } else {
      return json({ error: "entityId or orgSlug is required" }, 400);
    }

    const safeEntity = escapeHtml(entityName.slice(0, 120) || "an entity");
    const inviterName = escapeHtml(
      String((userData.user.user_metadata?.full_name as string) || "A collaborator").slice(0, 100),
    );
    const safeEmail = escapeHtml(email);

    const signupUrl = `${APP_URL}/auth?email=${encodeURIComponent(email)}`;
    const subject = `${inviterName.replace(/&[a-z#0-9]+;/g, "")} invited you to collaborate on "${entityName.slice(0, 120).replace(/[\r\n<>]/g, "")}"`;
    const ctaLabel = "Open B4 Platform";
    const ctaUrl = escapeHtml(signupUrl);
    const intro = `<strong>${inviterName}</strong> invited you to collaborate (<strong>${access}</strong>) on the entity <strong>"${safeEntity}"</strong> on B4 Platform. Sign in or create your account with this email (<strong>${safeEmail}</strong>) to access the shared workspace.`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Collaboration Invitation</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">${intro}</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${ctaUrl}" style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              ${ctaLabel}
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
            If the button doesn't work, copy this link:<br/>
            <a href="${ctaUrl}" style="color: #0d9488; word-break: break-all;">${ctaUrl}</a>
          </p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          B4 Platform - Building the Future Together
        </p>
      </div>
    `;

    const { error: sendErr } = await resend.emails.send({
      from: "B4 Platform <noreply@box4solutions.com>",
      to: [email],
      subject,
      html,
    });

    if (sendErr) {
      console.error("Resend error");
      return new Response(JSON.stringify({ error: "Email failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-collaborator-invite failed");
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

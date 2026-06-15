import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://box4solutions.com";

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
    const entityName = String(body?.entityName || "").trim().slice(0, 120) || "an entity";
    const access = body?.access === "edit" ? "edit" : "view";

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invitee already has an account (service role)
    const admin = createClient(supabaseUrl, serviceKey);
    let isRegistered = false;
    try {
      // listUsers paginates; we filter manually
      let page = 1;
      while (page <= 10) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        if (data.users.some((u) => (u.email || "").toLowerCase() === email)) {
          isRegistered = true; break;
        }
        if (!data.users.length || data.users.length < 200) break;
        page++;
      }
    } catch (e) {
      console.warn("listUsers failed", e);
    }

    const inviterName =
      (userData.user.user_metadata?.full_name as string) ||
      userData.user.email ||
      "A collaborator";

    const declarationUrl = `${APP_URL}/declaration`;
    const signupUrl = `${APP_URL}/auth?mode=signup&email=${encodeURIComponent(email)}`;

    const subject = isRegistered
      ? `You've been added to "${entityName}" on B4 Platform`
      : `${inviterName} invited you to collaborate on "${entityName}"`;

    const ctaLabel = isRegistered ? "Open Declaration" : "Create your account";
    const ctaUrl = isRegistered ? declarationUrl : signupUrl;

    const intro = isRegistered
      ? `<strong>${inviterName}</strong> added you as a <strong>${access}</strong> collaborator on the entity <strong>"${entityName}"</strong>. Sign in to access the Declaration workspace for this entity.`
      : `<strong>${inviterName}</strong> invited you to collaborate (<strong>${access}</strong>) on the entity <strong>"${entityName}"</strong> on B4 Platform. Create your account with this email (<strong>${email}</strong>) to unlock the shared Declaration workspace.`;

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
      console.error("Resend error", sendErr);
      return new Response(JSON.stringify({ error: sendErr.message || "Email failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, isRegistered }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

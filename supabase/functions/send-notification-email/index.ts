import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  userName: string;
  type: "opportunity_approved" | "opportunity_rejected" | "entrepreneur_step_complete" | "cobuilder_approved";
  data?: {
    ideaTitle?: string;
    stepNumber?: number;
    stepName?: string;
  };
}

const getEmailContent = (type: string, userName: string, data?: NotificationEmailRequest["data"]) => {
  switch (type) {
    case "opportunity_approved":
      return {
        subject: "🎉 Your Startup Opportunity Has Been Approved!",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations, ${userName}! 🚀</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Great news! Your startup opportunity <strong>"${data?.ideaTitle || 'Your Idea'}"</strong> has been approved by our admin team.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You now have access to the <strong>Entrepreneur Journey</strong> - a guided 4-step process to help you:
              </p>
              <ul style="color: #334155; line-height: 1.8;">
                <li>Define your vision, problem, and market opportunity</li>
                <li>Build your business model and identify key roles</li>
                <li>Find and onboard the right co-builders</li>
                <li>Execute your plan with structured guidance</li>
              </ul>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/profile" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Start Your Journey
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
      };

    case "opportunity_rejected":
      return {
        subject: "Update on Your Startup Opportunity",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #334155; padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Hi ${userName},</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Thank you for submitting your startup opportunity <strong>"${data?.ideaTitle || 'Your Idea'}"</strong>.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                After careful review, our admin team has requested some revisions. Don't worry - this is a normal part of the process!
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Please contact our admin team for more details on how to improve your submission.
              </p>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
      };

    case "entrepreneur_step_complete":
      return {
        subject: `🎯 Step ${data?.stepNumber} Complete - ${data?.stepName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Great Progress, ${userName}! 🎯</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You've completed <strong>Step ${data?.stepNumber}: ${data?.stepName}</strong> of your entrepreneur journey!
              </p>
              <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #166534; font-weight: 600;">
                  ✓ Step ${data?.stepNumber} of 4 Complete
                </p>
              </div>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Keep up the momentum! Continue to your next step to move closer to launching your venture.
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/profile" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Continue Journey
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
      };

    case "cobuilder_approved":
      return {
        subject: "🎉 You're Now an Approved Co-Builder!",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to the Community, ${userName}! 🎉</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Congratulations! You've been approved as a Co-Builder on B4 Platform.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You now have access to:
              </p>
              <ul style="color: #334155; line-height: 1.8;">
                <li><strong>Co-Build Opportunities</strong> - Browse and join startup projects</li>
                <li><strong>Be an Initiator</strong> - Create your own startup ideas</li>
                <li><strong>Request Entrepreneur Review</strong> - Unlock the full entrepreneur journey</li>
              </ul>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/profile" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  View Your Dashboard
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
      };

    default:
      return {
        subject: "B4 Platform Update",
        html: `<p>You have an update from B4 Platform.</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, userName, type, data }: NotificationEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${to} for user ${userName}`);

    const { subject, html } = getEmailContent(type, userName, data);

    const emailResponse = await resend.emails.send({
      from: "B4 Platform <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
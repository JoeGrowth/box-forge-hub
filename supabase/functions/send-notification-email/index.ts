import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type NotificationType = 
  // Onboarding achievements
  | "onboarding_path_selected"
  | "natural_role_defined"
  | "onboarding_step_complete"
  | "onboarding_complete"
  // Co-builder achievements
  | "cobuilder_submitted"
  | "cobuilder_approved"
  // Opportunity achievements
  | "opportunity_created"
  | "opportunity_submitted"
  | "opportunity_approved"
  | "opportunity_rejected"
  | "opportunity_declined"
  | "opportunity_needs_enhancement"
  // Entrepreneur journey achievements
  | "entrepreneur_step_complete"
  | "entrepreneur_journey_complete"
  // Application achievements
  | "application_submitted"
  | "application_received"
  | "application_accepted"
  | "application_rejected";

interface NotificationEmailRequest {
  to: string;
  userName: string;
  userId?: string;
  type: NotificationType;
  data?: {
    ideaTitle?: string;
    stepNumber?: number;
    stepName?: string;
    applicantName?: string;
    roleName?: string;
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
        inAppTitle: "Opportunity Approved!",
        inAppMessage: `Your opportunity "${data?.ideaTitle || 'Your Idea'}" has been approved! Start your entrepreneur journey.`,
        inAppLink: "/profile",
      };

    case "opportunity_declined":
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
                After careful review, our admin team was not able to approve this submission at this time.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Please contact our admin team for more details or consider submitting a new idea.
              </p>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
        inAppTitle: "Opportunity Update",
        inAppMessage: `Your opportunity "${data?.ideaTitle || 'Your Idea'}" was not approved. Contact admin for details.`,
      };

    case "opportunity_needs_enhancement":
      return {
        subject: "Your Startup Opportunity Needs Enhancement",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #f59e0b; padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Almost There, ${userName}! ✏️</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Your startup opportunity <strong>"${data?.ideaTitle || 'Your Idea'}"</strong> shows promise!
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Our admin team has reviewed your submission and believes it could benefit from some enhancements before approval.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Please update your submission with more details and resubmit for review.
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/profile" 
                   style="background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Update Your Idea
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
        inAppTitle: "Opportunity Needs Enhancement",
        inAppMessage: `Your opportunity "${data?.ideaTitle || 'Your Idea'}" needs some improvements before approval.`,
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
        inAppTitle: "Opportunity Needs Revisions",
        inAppMessage: `Your opportunity "${data?.ideaTitle || 'Your Idea'}" needs some revisions.`,
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
        inAppTitle: `Step ${data?.stepNumber} Complete!`,
        inAppMessage: `You've completed ${data?.stepName}. Keep up the momentum!`,
        inAppLink: "/profile",
      };

    case "entrepreneur_journey_complete":
      return {
        subject: "🎉 Entrepreneur Journey Complete!",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations, ${userName}! 🎉</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You've completed your entire <strong>Entrepreneur Journey</strong>! This is a major milestone.
              </p>
              <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #166534; font-weight: 600;">
                  ✓ All 4 Steps Complete
                </p>
              </div>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You've successfully documented your:
              </p>
              <ul style="color: #334155; line-height: 1.8;">
                <li>Vision, problem, and target market</li>
                <li>Business model and key roles</li>
                <li>Co-builder recruitment plan</li>
                <li>Execution strategy</li>
              </ul>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You can always revisit and update your journey responses from your profile.
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/profile" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  View Your Journey
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
        inAppTitle: "Entrepreneur Journey Complete!",
        inAppMessage: "You've completed all 4 steps of your entrepreneur journey. Great work!",
        inAppLink: "/profile",
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
        inAppTitle: "You're an Approved Co-Builder!",
        inAppMessage: "Congratulations! You can now browse opportunities or create your own startup ideas.",
        inAppLink: "/profile",
      };

    case "application_received":
      return {
        subject: `📩 New Application for "${data?.ideaTitle || 'Your Startup'}"`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Application Received! 📩</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Hi ${userName}! Someone is interested in joining <strong>"${data?.ideaTitle || 'your startup'}"</strong>.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                <strong>${data?.applicantName || 'A co-builder'}</strong> has applied for the <strong>${data?.roleName || 'team member'}</strong> role.
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/profile" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Review Application
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
        inAppTitle: "New Application Received!",
        inAppMessage: `${data?.applicantName || 'Someone'} applied to join "${data?.ideaTitle || 'your startup'}"`,
        inAppLink: "/profile",
      };

    case "application_accepted":
      return {
        subject: "🤝 Your Application Was Accepted!",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f172a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations, ${userName}! 🤝</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Great news! Your application to join <strong>"${data?.ideaTitle || 'the startup'}"</strong> has been accepted!
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                The initiator will reach out to you with next steps. Get ready to start building together!
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/opportunities" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  View Opportunities
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
        inAppTitle: "Application Accepted! 🎉",
        inAppMessage: `Your application to join "${data?.ideaTitle || 'the startup'}" was accepted!`,
        inAppLink: "/opportunities",
      };

    case "application_rejected":
      return {
        subject: "Update on Your Application",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #334155; padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Hi ${userName},</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Thank you for your interest in joining <strong>"${data?.ideaTitle || 'the startup'}"</strong>.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Unfortunately, the initiator has decided to move forward with other candidates at this time.
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Don't be discouraged! There are many other exciting opportunities waiting for you.
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://b4-platform.lovable.app/opportunities" 
                   style="background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Browse Other Opportunities
                </a>
              </div>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              B4 Platform - Building the Future Together
            </p>
          </div>
        `,
        inAppTitle: "Application Update",
        inAppMessage: `Your application to "${data?.ideaTitle || 'the startup'}" was not accepted.`,
        inAppLink: "/opportunities",
      };

    default:
      return {
        subject: "B4 Platform Update",
        html: `<p>You have an update from B4 Platform.</p>`,
        inAppTitle: "Platform Update",
        inAppMessage: "You have an update from B4 Platform.",
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
    const { to, userName, userId, type, data }: NotificationEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${to} for user ${userName}`);

    const emailContent = getEmailContent(type, userName, data);
    const { subject, html, inAppTitle, inAppMessage, inAppLink } = emailContent as any;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "B4 Platform <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Also create in-app notification if userId is provided
    if (userId && inAppTitle && inAppMessage) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: notifError } = await supabase
        .from("user_notifications")
        .insert({
          user_id: userId,
          title: inAppTitle,
          message: inAppMessage,
          notification_type: type,
          link: inAppLink || null,
        });

      if (notifError) {
        console.error("Error creating in-app notification:", notifError);
      } else {
        console.log("In-app notification created successfully");
      }
    }

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
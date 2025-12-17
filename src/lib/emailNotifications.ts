import { supabase } from "@/integrations/supabase/client";

// All notification types for user achievements
export type NotificationType = 
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

interface SendNotificationEmailParams {
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

export const sendNotificationEmail = async (params: SendNotificationEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification-email", {
      body: params,
    });

    if (error) {
      console.error("Error sending notification email:", error);
      return { success: false, error };
    }

    console.log("Notification email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error invoking email function:", error);
    return { success: false, error };
  }
};

// Helper to create in-app notification only (without email)
export const createInAppNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) => {
  try {
    const { error } = await supabase.from("user_notifications").insert({
      user_id: userId,
      title,
      message,
      notification_type: type,
      link: link || null,
    });

    if (error) {
      console.error("Error creating in-app notification:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
};
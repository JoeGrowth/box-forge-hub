import { supabase } from "@/integrations/supabase/client";

interface SendNotificationEmailParams {
  to: string;
  userName: string;
  userId?: string;
  type: "opportunity_approved" | "opportunity_rejected" | "opportunity_declined" | "opportunity_needs_enhancement" | "entrepreneur_step_complete" | "cobuilder_approved";
  data?: {
    ideaTitle?: string;
    stepNumber?: number;
    stepName?: string;
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
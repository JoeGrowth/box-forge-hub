import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { createInAppNotification, NotificationType } from "@/lib/emailNotifications";

export type PrimaryRole = "entrepreneur" | "cobuilder";
export type NaturalRoleStatus = "pending" | "defined" | "assistance_requested" | "not_ready";

export interface OnboardingState {
  id?: string;
  user_id: string;
  primary_role: PrimaryRole | null;
  potential_role: string | null;
  onboarding_completed: boolean;
  current_step: number;
  journey_status: 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'entrepreneur_approved' | 'entrepreneur_in_progress';
  entrepreneur_step?: number;
  retry_count?: number;
}

export interface NaturalRole {
  id?: string;
  user_id: string;
  description: string | null;
  status: NaturalRoleStatus;
  promise_check: boolean | null;
  practice_check: boolean | null;
  practice_entities: string | null;
  practice_case_studies: number | null;
  practice_needs_help: boolean;
  training_check: boolean | null;
  training_count: number | null;
  training_contexts: string | null;
  training_needs_help: boolean;
  consulting_check: boolean | null;
  consulting_with_whom: string | null;
  consulting_case_studies: string | null;
  is_ready: boolean;
  wants_to_scale: boolean | null;
}

interface OnboardingContextType {
  onboardingState: OnboardingState | null;
  naturalRole: NaturalRole | null;
  loading: boolean;
  needsOnboarding: boolean;
  updateOnboardingState: (updates: Partial<OnboardingState>) => Promise<void>;
  updateNaturalRole: (updates: Partial<NaturalRole>) => Promise<void>;
  sendAdminNotification: (type: string, stepName: string, message: string) => Promise<void>;
  sendMilestoneNotification: (type: NotificationType, title: string, message: string, link?: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refetch: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [naturalRole, setNaturalRole] = useState<NaturalRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOnboardingData = async () => {
    if (!user) {
      setOnboardingState(null);
      setNaturalRole(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch onboarding state
      const { data: stateData, error: stateError } = await supabase
        .from("onboarding_state")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stateError) throw stateError;

      if (stateData) {
        setOnboardingState(stateData as OnboardingState);
      } else {
        // Create initial onboarding state
        const newState = {
          user_id: user.id,
          primary_role: null,
          onboarding_completed: false,
          current_step: 1,
          journey_status: 'in_progress' as const,
        };
        
        const { data: insertedState, error: insertError } = await supabase
          .from("onboarding_state")
          .insert(newState)
          .select()
          .single();

        if (insertError) throw insertError;
        setOnboardingState(insertedState as OnboardingState);
      }

      // Fetch natural role
      const { data: nrData, error: nrError } = await supabase
        .from("natural_roles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (nrError) throw nrError;
      setNaturalRole(nrData as NaturalRole | null);

    } catch (error) {
      console.error("Error fetching onboarding data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOnboardingData();
    }
  }, [user, authLoading]);

  const updateOnboardingState = async (updates: Partial<OnboardingState>) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    if (!onboardingState) {
      // Create initial state if it doesn't exist
      const newState = {
        user_id: user.id,
        primary_role: null,
        onboarding_completed: false,
        current_step: 1,
        journey_status: 'in_progress' as const,
        ...updates,
      };
      
      const { data, error } = await supabase
        .from("onboarding_state")
        .insert(newState)
        .select()
        .single();

      if (error) throw error;
      setOnboardingState(data as OnboardingState);
      return;
    }

    const { error } = await supabase
      .from("onboarding_state")
      .update(updates)
      .eq("user_id", user.id);

    if (error) throw error;
    setOnboardingState({ ...onboardingState, ...updates });
  };

  const updateNaturalRole = async (updates: Partial<NaturalRole>) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    if (!naturalRole) {
      // Create new natural role
      const newNR = {
        user_id: user.id,
        status: "pending" as NaturalRoleStatus,
        practice_needs_help: false,
        training_needs_help: false,
        is_ready: false,
        ...updates,
      };

      console.log("Creating new natural role:", newNR);
      const { data, error } = await supabase
        .from("natural_roles")
        .insert(newNR)
        .select()
        .single();

      if (error) {
        console.error("Error inserting natural role:", error);
        throw error;
      }
      console.log("Natural role created:", data);
      setNaturalRole(data as NaturalRole);
    } else {
      console.log("Updating natural role:", updates);
      const { error } = await supabase
        .from("natural_roles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating natural role:", error);
        throw error;
      }
      setNaturalRole({ ...naturalRole, ...updates });
    }
  };

  const sendAdminNotification = async (type: string, stepName: string, message: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("admin_notifications")
      .insert({
        user_id: user.id,
        notification_type: type,
        user_name: user.user_metadata?.full_name || "Unknown",
        user_email: user.email,
        nr_description: naturalRole?.description || null,
        step_name: stepName,
        message,
      });

    if (error) throw error;
  };

  const sendMilestoneNotification = async (
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ) => {
    if (!user) return;
    await createInAppNotification(user.id, title, message, type, link);
  };

  const completeOnboarding = async () => {
    await updateOnboardingState({ 
      onboarding_completed: true,
      journey_status: 'pending_approval'
    });
  };

  const needsOnboarding = !loading && !!user && onboardingState && !onboardingState.onboarding_completed;

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        naturalRole,
        loading,
        needsOnboarding,
        updateOnboardingState,
        updateNaturalRole,
        sendAdminNotification,
        sendMilestoneNotification,
        completeOnboarding,
        refetch: fetchOnboardingData,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};

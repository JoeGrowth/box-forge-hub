import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AdminNotification {
  id: string;
  user_id: string;
  notification_type: string;
  user_name: string | null;
  user_email: string | null;
  nr_description: string | null;
  step_name: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UserWithDetails {
  id: string;
  email: string;
  created_at: string;
  profile: {
    full_name: string | null;
    startup_name: string | null;
    primary_skills: string | null;
  } | null;
  onboarding: {
    primary_role: string | null;
    onboarding_completed: boolean;
    current_step: number;
    journey_status: string | null;
    user_status: string | null;
    potential_role: string | null;
  } | null;
  naturalRole: {
    description: string | null;
    status: string | null;
    is_ready: boolean;
    wants_to_scale: boolean | null;
  } | null;
  certificationCount: number;
  ideasAsInitiator: number;
  ideasAsCoBuilder: number;
  hasConsultantScaling: boolean;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [users, setUsers] = useState<UserWithDetails[]>([]);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
    setLoading(false);
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data as AdminNotification[]);
    }
    return data;
  };

  const fetchUsers = async () => {
    // Fetch all data in parallel
    const [
      profilesResult,
      onboardingResult,
      naturalRolesResult,
      certificationsResult,
      startupIdeasResult,
      teamMembersResult,
      learningJourneysResult
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("onboarding_state").select("*"),
      supabase.from("natural_roles").select("*"),
      supabase.from("user_certifications").select("user_id, certification_type"),
      supabase.from("startup_ideas").select("id, creator_id, status"),
      supabase.from("startup_team_members").select("member_user_id, startup_id"),
      supabase.from("learning_journeys").select("user_id, journey_type, status")
    ]);

    if (profilesResult.error) {
      console.error("Error fetching profiles:", profilesResult.error);
      return [];
    }

    const profiles = profilesResult.data;
    const onboardingStates = onboardingResult.data || [];
    const naturalRoles = naturalRolesResult.data || [];
    const certifications = certificationsResult.data || [];
    const startupIdeas = startupIdeasResult.data || [];
    const teamMembers = teamMembersResult.data || [];
    const learningJourneys = learningJourneysResult.data || [];

    // Count certifications per user
    const certCountByUser: Record<string, number> = {};
    certifications.forEach((cert: any) => {
      certCountByUser[cert.user_id] = (certCountByUser[cert.user_id] || 0) + 1;
    });

    // Count ideas as initiator per user (only active ideas)
    const ideasAsInitiatorByUser: Record<string, number> = {};
    startupIdeas.forEach((idea: any) => {
      if (idea.status === "active") {
        ideasAsInitiatorByUser[idea.creator_id] = (ideasAsInitiatorByUser[idea.creator_id] || 0) + 1;
      }
    });

    // Count ideas as co-builder per user
    const ideasAsCoBuilderByUser: Record<string, number> = {};
    teamMembers.forEach((member: any) => {
      ideasAsCoBuilderByUser[member.member_user_id] = (ideasAsCoBuilderByUser[member.member_user_id] || 0) + 1;
    });

    // Check if user has consultant scaling journey (scaling_path type with in_progress or approved status)
    const hasConsultantScalingByUser: Record<string, boolean> = {};
    learningJourneys.forEach((journey: any) => {
      if (journey.journey_type === "scaling_path" && (journey.status === "in_progress" || journey.status === "approved")) {
        hasConsultantScalingByUser[journey.user_id] = true;
      }
    });

    // Combine the data
    const usersWithDetails: UserWithDetails[] = profiles.map((profile: any) => {
      const onboarding = onboardingStates.find((o: any) => o.user_id === profile.user_id);
      const nr = naturalRoles.find((n: any) => n.user_id === profile.user_id);

      return {
        id: profile.user_id,
        email: "",
        created_at: profile.created_at,
        profile: {
          full_name: profile.full_name,
          startup_name: profile.startup_name,
          primary_skills: profile.primary_skills,
        },
        onboarding: onboarding ? {
          primary_role: onboarding.primary_role,
          onboarding_completed: onboarding.onboarding_completed,
          current_step: onboarding.current_step,
          journey_status: onboarding.journey_status,
          user_status: onboarding.user_status,
          potential_role: onboarding.potential_role,
        } : null,
        naturalRole: nr ? {
          description: nr.description,
          status: nr.status,
          is_ready: nr.is_ready,
          wants_to_scale: nr.wants_to_scale,
        } : null,
        certificationCount: certCountByUser[profile.user_id] || 0,
        ideasAsInitiator: ideasAsInitiatorByUser[profile.user_id] || 0,
        ideasAsCoBuilder: ideasAsCoBuilderByUser[profile.user_id] || 0,
        hasConsultantScaling: hasConsultantScalingByUser[profile.user_id] || false,
      };
    });

    setUsers(usersWithDetails);
    return usersWithDetails;
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
    return !error;
  };

  return {
    isAdmin,
    loading,
    notifications,
    users,
    fetchNotifications,
    fetchUsers,
    markNotificationAsRead,
    checkAdminStatus,
  };
}

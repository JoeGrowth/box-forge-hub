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
  } | null;
  naturalRole: {
    description: string | null;
    status: string | null;
    is_ready: boolean;
  } | null;
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
    // Fetch all profiles first
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return [];
    }

    // Fetch all onboarding states
    const { data: onboardingStates, error: onboardingError } = await supabase
      .from("onboarding_state")
      .select("*");

    // Fetch all natural roles
    const { data: naturalRoles, error: nrError } = await supabase
      .from("natural_roles")
      .select("*");

    // Combine the data
    const usersWithDetails: UserWithDetails[] = profiles.map((profile: any) => {
      const onboarding = onboardingStates?.find((o: any) => o.user_id === profile.user_id);
      const nr = naturalRoles?.find((n: any) => n.user_id === profile.user_id);

      return {
        id: profile.user_id,
        email: "", // We don't have access to auth.users email from client
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
        } : null,
        naturalRole: nr ? {
          description: nr.description,
          status: nr.status,
          is_ready: nr.is_ready,
        } : null,
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

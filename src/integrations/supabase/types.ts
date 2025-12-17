export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_deletion_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          nr_description: string | null
          step_name: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          nr_description?: string | null
          step_name?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          nr_description?: string | null
          step_name?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      entrepreneur_journey_responses: {
        Row: {
          business_model: string | null
          cobuilder_plan: string | null
          created_at: string
          execution_plan: string | null
          id: string
          idea_id: string | null
          market: string | null
          problem: string | null
          roles_needed: string | null
          updated_at: string
          user_id: string
          vision: string | null
        }
        Insert: {
          business_model?: string | null
          cobuilder_plan?: string | null
          created_at?: string
          execution_plan?: string | null
          id?: string
          idea_id?: string | null
          market?: string | null
          problem?: string | null
          roles_needed?: string | null
          updated_at?: string
          user_id: string
          vision?: string | null
        }
        Update: {
          business_model?: string | null
          cobuilder_plan?: string | null
          created_at?: string
          execution_plan?: string | null
          id?: string
          idea_id?: string | null
          market?: string | null
          problem?: string | null
          roles_needed?: string | null
          updated_at?: string
          user_id?: string
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrepreneur_journey_responses_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      natural_roles: {
        Row: {
          consulting_case_studies: string | null
          consulting_check: boolean | null
          consulting_with_whom: string | null
          created_at: string | null
          description: string | null
          id: string
          is_ready: boolean | null
          practice_case_studies: number | null
          practice_check: boolean | null
          practice_entities: string | null
          practice_needs_help: boolean | null
          promise_check: boolean | null
          status: string | null
          training_check: boolean | null
          training_contexts: string | null
          training_count: number | null
          training_needs_help: boolean | null
          updated_at: string | null
          user_id: string
          wants_to_scale: boolean | null
        }
        Insert: {
          consulting_case_studies?: string | null
          consulting_check?: boolean | null
          consulting_with_whom?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ready?: boolean | null
          practice_case_studies?: number | null
          practice_check?: boolean | null
          practice_entities?: string | null
          practice_needs_help?: boolean | null
          promise_check?: boolean | null
          status?: string | null
          training_check?: boolean | null
          training_contexts?: string | null
          training_count?: number | null
          training_needs_help?: boolean | null
          updated_at?: string | null
          user_id: string
          wants_to_scale?: boolean | null
        }
        Update: {
          consulting_case_studies?: string | null
          consulting_check?: boolean | null
          consulting_with_whom?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ready?: boolean | null
          practice_case_studies?: number | null
          practice_check?: boolean | null
          practice_entities?: string | null
          practice_needs_help?: boolean | null
          promise_check?: boolean | null
          status?: string | null
          training_check?: boolean | null
          training_contexts?: string | null
          training_count?: number | null
          training_needs_help?: boolean | null
          updated_at?: string | null
          user_id?: string
          wants_to_scale?: boolean | null
        }
        Relationships: []
      }
      onboarding_state: {
        Row: {
          created_at: string | null
          current_step: number | null
          entrepreneur_step: number | null
          id: string
          journey_status: string | null
          onboarding_completed: boolean | null
          primary_role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          entrepreneur_step?: number | null
          id?: string
          journey_status?: string | null
          onboarding_completed?: boolean | null
          primary_role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          entrepreneur_step?: number | null
          id?: string
          journey_status?: string | null
          onboarding_completed?: boolean | null
          primary_role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          is_deleted: boolean | null
          organization_name: string | null
          partnership_interest: string | null
          preferred_sector: string | null
          primary_skills: string | null
          startup_name: string | null
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean | null
          organization_name?: string | null
          partnership_interest?: string | null
          preferred_sector?: string | null
          primary_skills?: string | null
          startup_name?: string | null
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean | null
          organization_name?: string | null
          partnership_interest?: string | null
          preferred_sector?: string | null
          primary_skills?: string | null
          startup_name?: string | null
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      startup_applications: {
        Row: {
          applicant_id: string
          cover_message: string | null
          created_at: string
          id: string
          role_applied: string | null
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_message?: string | null
          created_at?: string
          id?: string
          role_applied?: string | null
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_message?: string | null
          created_at?: string
          id?: string
          role_applied?: string | null
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_applications_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_ideas: {
        Row: {
          admin_notes: string | null
          created_at: string
          creator_id: string
          description: string
          id: string
          is_looking_for_cobuilders: boolean | null
          review_status: string | null
          reviewed_at: string | null
          roles_needed: string[] | null
          sector: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          creator_id: string
          description: string
          id?: string
          is_looking_for_cobuilders?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          roles_needed?: string[] | null
          sector?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          is_looking_for_cobuilders?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          roles_needed?: string[] | null
          sector?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "entrepreneur" | "cobuilder" | "box_manager" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["entrepreneur", "cobuilder", "box_manager", "admin"],
    },
  },
} as const

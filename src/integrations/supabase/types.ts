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
      chat_conversations: {
        Row: {
          applicant_id: string
          application_id: string
          created_at: string
          id: string
          initiator_id: string
          startup_id: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id: string
          created_at?: string
          id?: string
          initiator_id: string
          startup_id: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string
          created_at?: string
          id?: string
          initiator_id?: string
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "startup_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_opportunities: {
        Row: {
          amount_per_day: number
          client_name: string
          completed_at: string | null
          consulting_firm: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_completed: boolean
          number_of_days: number
          offer_date: string
          source: string
          source_other: string | null
          technical_offer_url: string | null
          title: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_per_day?: number
          client_name: string
          completed_at?: string | null
          consulting_firm: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          number_of_days?: number
          offer_date: string
          source: string
          source_other?: string | null
          technical_offer_url?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_per_day?: number
          client_name?: string
          completed_at?: string | null
          consulting_firm?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          number_of_days?: number
          offer_date?: string
          source?: string
          source_other?: string | null
          technical_offer_url?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          participant_one_id: string
          participant_two_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_one_id: string
          participant_two_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_one_id?: string
          participant_two_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      entrepreneurial_onboarding: {
        Row: {
          board_count: number | null
          board_description: string | null
          board_equity_details: string | null
          board_needs_help: boolean | null
          board_role_type: string | null
          business_count: number | null
          business_description: string | null
          business_duration: string | null
          business_needs_help: boolean | null
          business_revenue: string | null
          created_at: string
          has_built_product: boolean | null
          has_developed_project: boolean | null
          has_led_team: boolean | null
          has_run_business: boolean | null
          has_served_on_board: boolean | null
          id: string
          is_completed: boolean | null
          product_count: number | null
          product_description: string | null
          product_needs_help: boolean | null
          product_stage: string | null
          product_users_count: string | null
          project_count: number | null
          project_description: string | null
          project_needs_help: boolean | null
          project_outcome: string | null
          project_role: string | null
          team_description: string | null
          team_needs_help: boolean | null
          team_role: string | null
          team_size: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          board_count?: number | null
          board_description?: string | null
          board_equity_details?: string | null
          board_needs_help?: boolean | null
          board_role_type?: string | null
          business_count?: number | null
          business_description?: string | null
          business_duration?: string | null
          business_needs_help?: boolean | null
          business_revenue?: string | null
          created_at?: string
          has_built_product?: boolean | null
          has_developed_project?: boolean | null
          has_led_team?: boolean | null
          has_run_business?: boolean | null
          has_served_on_board?: boolean | null
          id?: string
          is_completed?: boolean | null
          product_count?: number | null
          product_description?: string | null
          product_needs_help?: boolean | null
          product_stage?: string | null
          product_users_count?: string | null
          project_count?: number | null
          project_description?: string | null
          project_needs_help?: boolean | null
          project_outcome?: string | null
          project_role?: string | null
          team_description?: string | null
          team_needs_help?: boolean | null
          team_role?: string | null
          team_size?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          board_count?: number | null
          board_description?: string | null
          board_equity_details?: string | null
          board_needs_help?: boolean | null
          board_role_type?: string | null
          business_count?: number | null
          business_description?: string | null
          business_duration?: string | null
          business_needs_help?: boolean | null
          business_revenue?: string | null
          created_at?: string
          has_built_product?: boolean | null
          has_developed_project?: boolean | null
          has_led_team?: boolean | null
          has_run_business?: boolean | null
          has_served_on_board?: boolean | null
          id?: string
          is_completed?: boolean | null
          product_count?: number | null
          product_description?: string | null
          product_needs_help?: boolean | null
          product_stage?: string | null
          product_users_count?: string | null
          project_count?: number | null
          project_description?: string | null
          project_needs_help?: boolean | null
          project_outcome?: string | null
          project_role?: string | null
          team_description?: string | null
          team_needs_help?: boolean | null
          team_role?: string | null
          team_size?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idea_journey_progress: {
        Row: {
          completed_at: string | null
          completed_tasks: Json | null
          created_at: string
          episode: string
          id: string
          is_completed: boolean | null
          phase_name: string
          phase_number: number
          responses: Json | null
          startup_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_tasks?: Json | null
          created_at?: string
          episode?: string
          id?: string
          is_completed?: boolean | null
          phase_name: string
          phase_number?: number
          responses?: Json | null
          startup_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_tasks?: Json | null
          created_at?: string
          episode?: string
          id?: string
          is_completed?: boolean | null
          phase_name?: string
          phase_number?: number
          responses?: Json | null
          startup_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_journey_progress_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_phase_responses: {
        Row: {
          completed_at: string | null
          completed_tasks: Json | null
          created_at: string
          id: string
          is_completed: boolean | null
          journey_id: string
          notes: string | null
          phase_name: string
          phase_number: number
          responses: Json | null
          updated_at: string
          uploaded_files: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_tasks?: Json | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          journey_id: string
          notes?: string | null
          phase_name: string
          phase_number: number
          responses?: Json | null
          updated_at?: string
          uploaded_files?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_tasks?: Json | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          journey_id?: string
          notes?: string | null
          phase_name?: string
          phase_number?: number
          responses?: Json | null
          updated_at?: string
          uploaded_files?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_phase_responses_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "learning_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_journeys: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          current_phase: number
          id: string
          journey_type: Database["public"]["Enums"]["journey_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["journey_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_phase?: number
          id?: string
          journey_type: Database["public"]["Enums"]["journey_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["journey_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_phase?: number
          id?: string
          journey_type?: Database["public"]["Enums"]["journey_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["journey_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          services_description: string | null
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
          services_description?: string | null
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
          services_description?: string | null
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
      nr_decoder_submissions: {
        Row: {
          admin_notes: string | null
          answers: Json
          created_at: string
          id: string
          result_pdf_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          answers?: Json
          created_at?: string
          id?: string
          result_pdf_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          answers?: Json
          created_at?: string
          id?: string
          result_pdf_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_answer_versions: {
        Row: {
          change_notes: string | null
          consulting_case_studies: string | null
          consulting_check: boolean | null
          consulting_with_whom: string | null
          created_at: string
          description: string | null
          id: string
          practice_case_studies: number | null
          practice_check: boolean | null
          practice_entities: string | null
          promise_check: boolean | null
          training_check: boolean | null
          training_contexts: string | null
          training_count: number | null
          user_id: string
          version_number: number
          wants_to_scale: boolean | null
        }
        Insert: {
          change_notes?: string | null
          consulting_case_studies?: string | null
          consulting_check?: boolean | null
          consulting_with_whom?: string | null
          created_at?: string
          description?: string | null
          id?: string
          practice_case_studies?: number | null
          practice_check?: boolean | null
          practice_entities?: string | null
          promise_check?: boolean | null
          training_check?: boolean | null
          training_contexts?: string | null
          training_count?: number | null
          user_id: string
          version_number?: number
          wants_to_scale?: boolean | null
        }
        Update: {
          change_notes?: string | null
          consulting_case_studies?: string | null
          consulting_check?: boolean | null
          consulting_with_whom?: string | null
          created_at?: string
          description?: string | null
          id?: string
          practice_case_studies?: number | null
          practice_check?: boolean | null
          practice_entities?: string | null
          promise_check?: boolean | null
          training_check?: boolean | null
          training_contexts?: string | null
          training_count?: number | null
          user_id?: string
          version_number?: number
          wants_to_scale?: boolean | null
        }
        Relationships: []
      }
      onboarding_state: {
        Row: {
          boost_type: string | null
          consultant_access: boolean | null
          created_at: string | null
          current_step: number | null
          entrepreneur_step: number | null
          id: string
          journey_status: string | null
          onboarding_completed: boolean | null
          potential_role: string | null
          primary_role: string | null
          retry_count: number | null
          scale_type: string | null
          updated_at: string | null
          user_id: string
          user_status: string | null
        }
        Insert: {
          boost_type?: string | null
          consultant_access?: boolean | null
          created_at?: string | null
          current_step?: number | null
          entrepreneur_step?: number | null
          id?: string
          journey_status?: string | null
          onboarding_completed?: boolean | null
          potential_role?: string | null
          primary_role?: string | null
          retry_count?: number | null
          scale_type?: string | null
          updated_at?: string | null
          user_id: string
          user_status?: string | null
        }
        Update: {
          boost_type?: string | null
          consultant_access?: boolean | null
          created_at?: string | null
          current_step?: number | null
          entrepreneur_step?: number | null
          id?: string
          journey_status?: string | null
          onboarding_completed?: boolean | null
          potential_role?: string | null
          primary_role?: string | null
          retry_count?: number | null
          scale_type?: string | null
          updated_at?: string | null
          user_id?: string
          user_status?: string | null
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
          proposed_cliff_years: number | null
          proposed_include_salary: boolean | null
          proposed_monthly_salary: number | null
          proposed_performance_equity_percentage: number | null
          proposed_performance_milestone: string | null
          proposed_salary_currency: string | null
          proposed_time_equity_percentage: number | null
          proposed_vesting_years: number | null
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
          proposed_cliff_years?: number | null
          proposed_include_salary?: boolean | null
          proposed_monthly_salary?: number | null
          proposed_performance_equity_percentage?: number | null
          proposed_performance_milestone?: string | null
          proposed_salary_currency?: string | null
          proposed_time_equity_percentage?: number | null
          proposed_vesting_years?: number | null
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
          proposed_cliff_years?: number | null
          proposed_include_salary?: boolean | null
          proposed_monthly_salary?: number | null
          proposed_performance_equity_percentage?: number | null
          proposed_performance_milestone?: string | null
          proposed_salary_currency?: string | null
          proposed_time_equity_percentage?: number | null
          proposed_vesting_years?: number | null
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
          current_episode: string
          description: string
          development_completed_at: string | null
          growth_completed_at: string | null
          id: string
          is_looking_for_cobuilders: boolean | null
          review_status: string | null
          reviewed_at: string | null
          roles_needed: string[] | null
          sector: string | null
          status: string | null
          title: string
          updated_at: string
          validation_completed_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          creator_id: string
          current_episode?: string
          description: string
          development_completed_at?: string | null
          growth_completed_at?: string | null
          id?: string
          is_looking_for_cobuilders?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          roles_needed?: string[] | null
          sector?: string | null
          status?: string | null
          title: string
          updated_at?: string
          validation_completed_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          creator_id?: string
          current_episode?: string
          description?: string
          development_completed_at?: string | null
          growth_completed_at?: string | null
          id?: string
          is_looking_for_cobuilders?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          roles_needed?: string[] | null
          sector?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          validation_completed_at?: string | null
        }
        Relationships: []
      }
      startup_team_members: {
        Row: {
          added_at: string
          added_by: string
          created_at: string
          id: string
          member_user_id: string
          role_type: string
          startup_id: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by: string
          created_at?: string
          id?: string
          member_user_id: string
          role_type: string
          startup_id: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string
          created_at?: string
          id?: string
          member_user_id?: string
          role_type?: string
          startup_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_team_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      team_compensation_history: {
        Row: {
          action: string
          cliff_years: number | null
          created_at: string
          id: string
          monthly_salary: number | null
          notes: string | null
          offer_id: string
          performance_equity_percentage: number | null
          performance_milestone: string | null
          proposer_id: string
          salary_currency: string | null
          time_equity_percentage: number | null
          version: number
          vesting_years: number | null
        }
        Insert: {
          action: string
          cliff_years?: number | null
          created_at?: string
          id?: string
          monthly_salary?: number | null
          notes?: string | null
          offer_id: string
          performance_equity_percentage?: number | null
          performance_milestone?: string | null
          proposer_id: string
          salary_currency?: string | null
          time_equity_percentage?: number | null
          version: number
          vesting_years?: number | null
        }
        Update: {
          action?: string
          cliff_years?: number | null
          created_at?: string
          id?: string
          monthly_salary?: number | null
          notes?: string | null
          offer_id?: string
          performance_equity_percentage?: number | null
          performance_milestone?: string | null
          proposer_id?: string
          salary_currency?: string | null
          time_equity_percentage?: number | null
          version?: number
          vesting_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_compensation_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "team_compensation_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_compensation_offers: {
        Row: {
          cancellation_reason: string | null
          cliff_years: number | null
          cobuilder_user_id: string
          created_at: string
          current_proposer_id: string
          id: string
          initiator_user_id: string
          monthly_salary: number | null
          performance_equity_percentage: number | null
          performance_milestone: string | null
          salary_currency: string | null
          startup_id: string
          status: string
          team_member_id: string
          time_equity_percentage: number | null
          updated_at: string
          version: number
          vesting_years: number | null
        }
        Insert: {
          cancellation_reason?: string | null
          cliff_years?: number | null
          cobuilder_user_id: string
          created_at?: string
          current_proposer_id: string
          id?: string
          initiator_user_id: string
          monthly_salary?: number | null
          performance_equity_percentage?: number | null
          performance_milestone?: string | null
          salary_currency?: string | null
          startup_id: string
          status?: string
          team_member_id: string
          time_equity_percentage?: number | null
          updated_at?: string
          version?: number
          vesting_years?: number | null
        }
        Update: {
          cancellation_reason?: string | null
          cliff_years?: number | null
          cobuilder_user_id?: string
          created_at?: string
          current_proposer_id?: string
          id?: string
          initiator_user_id?: string
          monthly_salary?: number | null
          performance_equity_percentage?: number | null
          performance_milestone?: string | null
          salary_currency?: string | null
          startup_id?: string
          status?: string
          team_member_id?: string
          time_equity_percentage?: number | null
          updated_at?: string
          version?: number
          vesting_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_compensation_offers_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_compensation_offers_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: true
            referencedRelation: "startup_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certifications: {
        Row: {
          certification_type: string
          created_at: string
          display_label: string
          earned_at: string
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          certification_type: string
          created_at?: string
          display_label: string
          earned_at?: string
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          certification_type?: string
          created_at?: string
          display_label?: string
          earned_at?: string
          id?: string
          user_id?: string
          verified?: boolean | null
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
      is_approved_cobuilder: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "entrepreneur" | "cobuilder" | "box_manager" | "admin"
      journey_status:
        | "not_started"
        | "in_progress"
        | "pending_approval"
        | "approved"
        | "rejected"
      journey_type: "skill_ptc" | "idea_ptc" | "scaling_path"
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
      journey_status: [
        "not_started",
        "in_progress",
        "pending_approval",
        "approved",
        "rejected",
      ],
      journey_type: ["skill_ptc", "idea_ptc", "scaling_path"],
    },
  },
} as const

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
      admin_overrides: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          overridden_rule: string
          reason: string
          snapshot: Json
          target_id: string
          target_kind: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          overridden_rule: string
          reason: string
          snapshot?: Json
          target_id: string
          target_kind: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          overridden_rule?: string
          reason?: string
          snapshot?: Json
          target_id?: string
          target_kind?: string
        }
        Relationships: []
      }
      advisor_metrics: {
        Row: {
          advisor_id: string
          approval_rate: number | null
          average_feedback: number | null
          computed_at: string
          last_request_at: string | null
          median_response_seconds: number | null
          requests_completed: number
          requests_received: number
        }
        Insert: {
          advisor_id: string
          approval_rate?: number | null
          average_feedback?: number | null
          computed_at?: string
          last_request_at?: string | null
          median_response_seconds?: number | null
          requests_completed?: number
          requests_received?: number
        }
        Update: {
          advisor_id?: string
          approval_rate?: number | null
          average_feedback?: number | null
          computed_at?: string
          last_request_at?: string | null
          median_response_seconds?: number | null
          requests_completed?: number
          requests_received?: number
        }
        Relationships: []
      }
      advisor_readiness: {
        Row: {
          computed_at: string
          eligibility_reason: string | null
          eligible: boolean
          last_activity_at: string | null
          nr_complete: boolean
          reputation_score: number
          track_record_count: number
          user_id: string
          verified_skills: number
        }
        Insert: {
          computed_at?: string
          eligibility_reason?: string | null
          eligible?: boolean
          last_activity_at?: string | null
          nr_complete?: boolean
          reputation_score?: number
          track_record_count?: number
          user_id: string
          verified_skills?: number
        }
        Update: {
          computed_at?: string
          eligibility_reason?: string | null
          eligible?: boolean
          last_activity_at?: string | null
          nr_complete?: boolean
          reputation_score?: number
          track_record_count?: number
          user_id?: string
          verified_skills?: number
        }
        Relationships: []
      }
      advisor_relationships: {
        Row: {
          advisor_id: string
          box_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json
          origin_request_id: string | null
          relationship_kind: string
          relationship_type: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_id: string
          box_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          origin_request_id?: string | null
          relationship_kind?: string
          relationship_type: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_id?: string
          box_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          origin_request_id?: string | null
          relationship_kind?: string
          relationship_type?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_relationships_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "advisor_relationships_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_relationships_origin_request_id_fkey"
            columns: ["origin_request_id"]
            isOneToOne: false
            referencedRelation: "box_inbound_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          accepted_at: string | null
          applicant_id: string
          completed_at: string | null
          created_at: string
          id: string
          message: string | null
          metadata: Json
          opportunity_id: string
          opportunity_type: Database["public"]["Enums"]["application_opportunity_kind"]
          owner_id: string | null
          rejected_at: string | null
          reviewed_at: string | null
          shortlisted_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          applicant_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json
          opportunity_id: string
          opportunity_type: Database["public"]["Enums"]["application_opportunity_kind"]
          owner_id?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          shortlisted_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          applicant_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json
          opportunity_id?: string
          opportunity_type?: Database["public"]["Enums"]["application_opportunity_kind"]
          owner_id?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          shortlisted_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      attribution_events: {
        Row: {
          amount: number | null
          assignment_id: string | null
          attributed_at: string
          currency: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          event_type: string
          expertise_weight: number
          failure_reason: string | null
          id: string
          idempotency_key: string
          occurred_at: string
          ownership_weight: number
          payload: Json
          policy_version: number
          processing_state: Database["public"]["Enums"]["attribution_processing_state"]
          revenue_weight: number
          role_slug: string
          role_type: string
          source_event_id: string
          source_event_type: string
          trust_weight: number
          user_id: string
        }
        Insert: {
          amount?: number | null
          assignment_id?: string | null
          attributed_at?: string
          currency?: string | null
          entity_id: string
          entity_type: string
          equity_pct?: number | null
          event_type: string
          expertise_weight?: number
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          occurred_at: string
          ownership_weight?: number
          payload?: Json
          policy_version: number
          processing_state?: Database["public"]["Enums"]["attribution_processing_state"]
          revenue_weight?: number
          role_slug: string
          role_type: string
          source_event_id: string
          source_event_type: string
          trust_weight?: number
          user_id: string
        }
        Update: {
          amount?: number | null
          assignment_id?: string | null
          attributed_at?: string
          currency?: string | null
          entity_id?: string
          entity_type?: string
          equity_pct?: number | null
          event_type?: string
          expertise_weight?: number
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          occurred_at?: string
          ownership_weight?: number
          payload?: Json
          policy_version?: number
          processing_state?: Database["public"]["Enums"]["attribution_processing_state"]
          revenue_weight?: number
          role_slug?: string
          role_type?: string
          source_event_id?: string
          source_event_type?: string
          trust_weight?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "entity_role_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      box_advisors: {
        Row: {
          accepting_requests: boolean
          approved_at: string | null
          approved_by: string | null
          box_id: string
          capacity: number
          created_at: string
          override_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepting_requests?: boolean
          approved_at?: string | null
          approved_by?: string | null
          box_id: string
          capacity?: number
          created_at?: string
          override_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepting_requests?: boolean
          approved_at?: string | null
          approved_by?: string | null
          box_id?: string
          capacity?: number
          created_at?: string
          override_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_advisors_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "box_advisors_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      box_ecosystem_admins: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          box_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          box_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          box_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_ecosystem_admins_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "box_ecosystem_admins_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      box_inbound_requests: {
        Row: {
          accepted_at: string | null
          archived_at: string | null
          assigned_advisor_id: string | null
          assigned_at: string | null
          box_id: string | null
          completed_at: string | null
          context: string | null
          created_at: string
          id: string
          metadata: Json
          request_type: string
          requester_id: string
          status: string
          subject_entity_id: string | null
          subject_entity_type: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          archived_at?: string | null
          assigned_advisor_id?: string | null
          assigned_at?: string | null
          box_id?: string | null
          completed_at?: string | null
          context?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          request_type?: string
          requester_id: string
          status?: string
          subject_entity_id?: string | null
          subject_entity_type?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          archived_at?: string | null
          assigned_advisor_id?: string | null
          assigned_at?: string | null
          box_id?: string | null
          completed_at?: string | null
          context?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          request_type?: string
          requester_id?: string
          status?: string
          subject_entity_id?: string | null
          subject_entity_type?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_inbound_requests_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "box_inbound_requests_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      box_request_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          metadata: Json
          reason: string | null
          request_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          request_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          request_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "box_request_audit_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "box_inbound_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      boxes: {
        Row: {
          created_at: string
          data_mode: string
          description: string | null
          domain: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_mode?: string
          description?: string | null
          domain?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_mode?: string
          description?: string | null
          domain?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
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
      click_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          page_path: string
          target_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          page_path: string
          target_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          page_path?: string
          target_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cold_start_profiles: {
        Row: {
          confidence: number
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          decoder_result: Json
          estimated_expertise: Json
          seed_source: string
          updated_at: string
          user_id: string
          verified_expertise: Json
        }
        Insert: {
          confidence?: number
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          decoder_result?: Json
          estimated_expertise?: Json
          seed_source?: string
          updated_at?: string
          user_id: string
          verified_expertise?: Json
        }
        Update: {
          confidence?: number
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          decoder_result?: Json
          estimated_expertise?: Json
          seed_source?: string
          updated_at?: string
          user_id?: string
          verified_expertise?: Json
        }
        Relationships: []
      }
      commitment_checkpoints: {
        Row: {
          commitment_id: string
          completed_at: string
          created_at: string
          day_offset: number
          evidence_id: string | null
          id: string
          label: string
          note: string | null
          owner_id: string
        }
        Insert: {
          commitment_id: string
          completed_at?: string
          created_at?: string
          day_offset: number
          evidence_id?: string | null
          id?: string
          label: string
          note?: string | null
          owner_id: string
        }
        Update: {
          commitment_id?: string
          completed_at?: string
          created_at?: string
          day_offset?: number
          evidence_id?: string | null
          id?: string
          label?: string
          note?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_checkpoints_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_checkpoints_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          box_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_from: string
          description: string | null
          due_at: string | null
          duration_days: number
          id: string
          idempotency_key: string | null
          metadata: Json
          owner_id: string
          relationship_id: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          box_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_from?: string
          description?: string | null
          due_at?: string | null
          duration_days?: number
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          owner_id: string
          relationship_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          box_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_from?: string
          description?: string | null
          due_at?: string | null
          duration_days?: number
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          owner_id?: string
          relationship_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "commitments_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "advisor_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_opportunities: {
        Row: {
          amount_per_day: number | null
          client_confirmed_at: string | null
          client_name: string | null
          completed_at: string | null
          consulting_firm: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          description: string | null
          driver_file_url: string | null
          driver_link: string | null
          driver_note: string | null
          id: string
          invoice_file_url: string | null
          invoice_link: string | null
          is_completed: boolean
          number_of_days: number | null
          offer_date: string | null
          opportunity_type: string | null
          paid_amount: number | null
          paid_at: string | null
          process_file_url: string | null
          process_link: string | null
          proposal_file_url: string | null
          proposal_link: string | null
          proposal_sent_at: string | null
          report_file_url: string | null
          report_invoice_sent_at: string | null
          report_link: string | null
          source: string
          source_other: string | null
          stage: Database["public"]["Enums"]["consulting_stage"]
          technical_offer_url: string | null
          title: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_per_day?: number | null
          client_confirmed_at?: string | null
          client_name?: string | null
          completed_at?: string | null
          consulting_firm?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          description?: string | null
          driver_file_url?: string | null
          driver_link?: string | null
          driver_note?: string | null
          id?: string
          invoice_file_url?: string | null
          invoice_link?: string | null
          is_completed?: boolean
          number_of_days?: number | null
          offer_date?: string | null
          opportunity_type?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          process_file_url?: string | null
          process_link?: string | null
          proposal_file_url?: string | null
          proposal_link?: string | null
          proposal_sent_at?: string | null
          report_file_url?: string | null
          report_invoice_sent_at?: string | null
          report_link?: string | null
          source: string
          source_other?: string | null
          stage?: Database["public"]["Enums"]["consulting_stage"]
          technical_offer_url?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_per_day?: number | null
          client_confirmed_at?: string | null
          client_name?: string | null
          completed_at?: string | null
          consulting_firm?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          description?: string | null
          driver_file_url?: string | null
          driver_link?: string | null
          driver_note?: string | null
          id?: string
          invoice_file_url?: string | null
          invoice_link?: string | null
          is_completed?: boolean
          number_of_days?: number | null
          offer_date?: string | null
          opportunity_type?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          process_file_url?: string | null
          process_link?: string | null
          proposal_file_url?: string | null
          proposal_link?: string | null
          proposal_sent_at?: string | null
          report_file_url?: string | null
          report_invoice_sent_at?: string | null
          report_link?: string | null
          source?: string
          source_other?: string | null
          stage?: Database["public"]["Enums"]["consulting_stage"]
          technical_offer_url?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consultant_opportunity_distributions: {
        Row: {
          amount: number | null
          created_at: string
          declared_at: string | null
          id: string
          note: string | null
          opportunity_id: string
          percent: number | null
          recipient_name: string
          recipient_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          declared_at?: string | null
          id?: string
          note?: string | null
          opportunity_id: string
          percent?: number | null
          recipient_name: string
          recipient_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          declared_at?: string | null
          id?: string
          note?: string | null
          opportunity_id?: string
          percent?: number | null
          recipient_name?: string
          recipient_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_opportunity_distributions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "consultant_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_service_proposals: {
        Row: {
          admin_notes: string | null
          created_at: string
          delivery_format: string | null
          description: string
          id: string
          pricing_model: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          sector: string | null
          service_type: string | null
          target_clients: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          delivery_format?: string | null
          description: string
          id?: string
          pricing_model?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          service_type?: string | null
          target_clients?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          delivery_format?: string | null
          description?: string
          id?: string
          pricing_model?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          service_type?: string | null
          target_clients?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consulting_services: {
        Row: {
          availability: string | null
          created_at: string
          currency: string
          delivery_type: string
          description: string | null
          id: string
          is_active: boolean
          price: number
          service_title: string
          skill_tag_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          currency?: string
          delivery_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price?: number
          service_title: string
          skill_tag_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          currency?: string
          delivery_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price?: number
          service_title?: string
          skill_tag_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulting_services_skill_tag_id_fkey"
            columns: ["skill_tag_id"]
            isOneToOne: false
            referencedRelation: "skill_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          document_url: string | null
          id: string
          parties: Json
          signed_at: string | null
          status: string
          terms: Json
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          id?: string
          parties?: Json
          signed_at?: string | null
          status?: string
          terms?: Json
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          id?: string
          parties?: Json
          signed_at?: string | null
          status?: string
          terms?: Json
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          actor_id: string
          created_at: string
          entity_id: string
          entity_type: string
          evidence_id: string | null
          id: string
          kind: string
          metadata: Json
          relationship_id: string | null
          weight: number
        }
        Insert: {
          actor_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          evidence_id?: string | null
          id?: string
          kind: string
          metadata?: Json
          relationship_id?: string | null
          weight?: number
        }
        Update: {
          actor_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          evidence_id?: string | null
          id?: string
          kind?: string
          metadata?: Json
          relationship_id?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "contributions_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "advisor_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_entities: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "declaration_entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_entity_collaborators: {
        Row: {
          access: string
          collaborator_email: string
          created_at: string
          entity_id: string
          id: string
        }
        Insert: {
          access: string
          collaborator_email: string
          created_at?: string
          entity_id: string
          id?: string
        }
        Update: {
          access?: string
          collaborator_email?: string
          created_at?: string
          entity_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "declaration_entity_collaborators_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "declaration_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_missions: {
        Row: {
          budget: number
          client: string
          client_paid: boolean
          created_at: string
          currency: string
          entity_id: string
          external: Json
          id: string
          internal: Json
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          budget?: number
          client?: string
          client_paid?: boolean
          created_at?: string
          currency?: string
          entity_id: string
          external?: Json
          id?: string
          internal?: Json
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          client?: string
          client_paid?: boolean
          created_at?: string
          currency?: string
          entity_id?: string
          external?: Json
          id?: string
          internal?: Json
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "declaration_missions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "declaration_entities"
            referencedColumns: ["id"]
          },
        ]
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
      distribution_records: {
        Row: {
          budget: number
          budget_label: string
          charges: Json
          created_at: string
          currency: string | null
          id: string
          kind: string
          people: Json
          tasks: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number
          budget_label?: string
          charges?: Json
          created_at?: string
          currency?: string | null
          id?: string
          kind: string
          people?: Json
          tasks?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number
          budget_label?: string
          charges?: Json
          created_at?: string
          currency?: string | null
          id?: string
          kind?: string
          people?: Json
          tasks?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entity_role_assignments: {
        Row: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          effective_from: string | null
          effective_until: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          id: string
          label: string
          linked_at: string | null
          linked_by: string | null
          linked_user_id: string | null
          revoked_at: string | null
          role_slug: string
          slot: number
          status: Database["public"]["Enums"]["entity_role_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          entity_id: string
          entity_type: string
          equity_pct?: number | null
          id?: string
          label: string
          linked_at?: string | null
          linked_by?: string | null
          linked_user_id?: string | null
          revoked_at?: string | null
          role_slug: string
          slot: number
          status?: Database["public"]["Enums"]["entity_role_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          entity_id?: string
          entity_type?: string
          equity_pct?: number | null
          id?: string
          label?: string
          linked_at?: string | null
          linked_by?: string | null
          linked_user_id?: string | null
          revoked_at?: string | null
          role_slug?: string
          slot?: number
          status?: Database["public"]["Enums"]["entity_role_status"]
          updated_at?: string
        }
        Relationships: []
      }
      entity_role_audit_log: {
        Row: {
          actor_user_id: string | null
          assignment_id: string
          at: string
          id: string
          payload: Json
          transition: Database["public"]["Enums"]["entity_role_transition"]
        }
        Insert: {
          actor_user_id?: string | null
          assignment_id: string
          at?: string
          id?: string
          payload?: Json
          transition: Database["public"]["Enums"]["entity_role_transition"]
        }
        Update: {
          actor_user_id?: string | null
          assignment_id?: string
          at?: string
          id?: string
          payload?: Json
          transition?: Database["public"]["Enums"]["entity_role_transition"]
        }
        Relationships: [
          {
            foreignKeyName: "entity_role_audit_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "entity_role_assignments"
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
      equity_allocations: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          percentage: number
          role: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
          venture_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          percentage?: number
          role?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
          venture_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          percentage?: number
          role?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          venture_id?: string
        }
        Relationships: []
      }
      equity_events: {
        Row: {
          actor_id: string | null
          equity_allocation_id: string
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          percentage: number
        }
        Insert: {
          actor_id?: string | null
          equity_allocation_id: string
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          percentage?: number
        }
        Update: {
          actor_id?: string | null
          equity_allocation_id?: string
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "equity_events_equity_allocation_id_fkey"
            columns: ["equity_allocation_id"]
            isOneToOne: false
            referencedRelation: "equity_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_catalog: {
        Row: {
          created_at: string
          deprecated: boolean
          description: string | null
          event_type: Database["public"]["Enums"]["graph_event_type"]
          event_version: number
          id: string
          payload_schema: Json
          source_module: string
        }
        Insert: {
          created_at?: string
          deprecated?: boolean
          description?: string | null
          event_type: Database["public"]["Enums"]["graph_event_type"]
          event_version?: number
          id?: string
          payload_schema?: Json
          source_module: string
        }
        Update: {
          created_at?: string
          deprecated?: boolean
          description?: string | null
          event_type?: Database["public"]["Enums"]["graph_event_type"]
          event_version?: number
          id?: string
          payload_schema?: Json
          source_module?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          captured_at: string
          captured_by: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: string
          payload: Json
          summary: string | null
          url: string | null
        }
        Insert: {
          captured_at?: string
          captured_by: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kind: string
          payload?: Json
          summary?: string | null
          url?: string | null
        }
        Update: {
          captured_at?: string
          captured_by?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          payload?: Json
          summary?: string | null
          url?: string | null
        }
        Relationships: []
      }
      expertise_graph: {
        Row: {
          computed_at: string
          confidence: number
          created_at: string
          expertise_level: string
          expertise_score: number
          expertise_tags: string[]
          monetizable_expertise: Json
          score_breakdown: Json
          source_event_version: number
          updated_at: string
          user_id: string
          verified_expertise_count: number
        }
        Insert: {
          computed_at?: string
          confidence?: number
          created_at?: string
          expertise_level?: string
          expertise_score?: number
          expertise_tags?: string[]
          monetizable_expertise?: Json
          score_breakdown?: Json
          source_event_version?: number
          updated_at?: string
          user_id: string
          verified_expertise_count?: number
        }
        Update: {
          computed_at?: string
          confidence?: number
          created_at?: string
          expertise_level?: string
          expertise_score?: number
          expertise_tags?: string[]
          monetizable_expertise?: Json
          score_breakdown?: Json
          source_event_version?: number
          updated_at?: string
          user_id?: string
          verified_expertise_count?: number
        }
        Relationships: []
      }
      goal_change_log: {
        Row: {
          created_at: string
          id: string
          new_goal: string
          old_goal: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_goal: string
          old_goal?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_goal?: string
          old_goal?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      graph_dead_letters: {
        Row: {
          attempt_count: number
          error: string
          event_id: string
          event_type: Database["public"]["Enums"]["graph_event_type"]
          failed_at: string
          id: string
          payload_snapshot: Json
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          attempt_count: number
          error: string
          event_id: string
          event_type: Database["public"]["Enums"]["graph_event_type"]
          failed_at?: string
          id?: string
          payload_snapshot: Json
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          error?: string
          event_id?: string
          event_type?: Database["public"]["Enums"]["graph_event_type"]
          failed_at?: string
          id?: string
          payload_snapshot?: Json
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "graph_dead_letters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "activity_stream"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "graph_dead_letters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "graph_events"
            referencedColumns: ["id"]
          },
        ]
      }
      graph_edges: {
        Row: {
          attributes: Json
          confidence: number
          created_at: string
          edge_type: Database["public"]["Enums"]["graph_edge_type"]
          from_node_id: string
          id: string
          occurred_at: string
          source_event_id: string | null
          to_node_id: string
          validated: boolean
          weight: number
        }
        Insert: {
          attributes?: Json
          confidence?: number
          created_at?: string
          edge_type: Database["public"]["Enums"]["graph_edge_type"]
          from_node_id: string
          id?: string
          occurred_at?: string
          source_event_id?: string | null
          to_node_id: string
          validated?: boolean
          weight?: number
        }
        Update: {
          attributes?: Json
          confidence?: number
          created_at?: string
          edge_type?: Database["public"]["Enums"]["graph_edge_type"]
          from_node_id?: string
          id?: string
          occurred_at?: string
          source_event_id?: string | null
          to_node_id?: string
          validated?: boolean
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "graph_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_edges_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "activity_stream"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "graph_edges_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "graph_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      graph_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempt_count: number
          created_at: string
          event_type: Database["public"]["Enums"]["graph_event_type"]
          event_version: number
          id: string
          idempotency_key: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          source_module: string
          user_id: string
          version: number
          weight: number
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempt_count?: number
          created_at?: string
          event_type: Database["public"]["Enums"]["graph_event_type"]
          event_version?: number
          id?: string
          idempotency_key?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          source_module: string
          user_id: string
          version?: number
          weight?: number
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempt_count?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["graph_event_type"]
          event_version?: number
          id?: string
          idempotency_key?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          source_module?: string
          user_id?: string
          version?: number
          weight?: number
        }
        Relationships: []
      }
      graph_nodes: {
        Row: {
          attributes: Json
          created_at: string
          external_id: string
          id: string
          label: string | null
          node_type: Database["public"]["Enums"]["graph_node_type"]
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          external_id: string
          id?: string
          label?: string | null
          node_type: Database["public"]["Enums"]["graph_node_type"]
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          external_id?: string
          id?: string
          label?: string | null
          node_type?: Database["public"]["Enums"]["graph_node_type"]
          updated_at?: string
        }
        Relationships: []
      }
      growth_loop_experiments: {
        Row: {
          action_payload_override: Json
          allocation_percentage: number
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          loop_key: string
          success_metric: string
          updated_at: string
          variant_key: string
        }
        Insert: {
          action_payload_override?: Json
          allocation_percentage?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          loop_key: string
          success_metric?: string
          updated_at?: string
          variant_key: string
        }
        Update: {
          action_payload_override?: Json
          allocation_percentage?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          loop_key?: string
          success_metric?: string
          updated_at?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_loop_experiments_loop_key_fkey"
            columns: ["loop_key"]
            isOneToOne: false
            referencedRelation: "growth_loops"
            referencedColumns: ["loop_key"]
          },
        ]
      }
      growth_loop_runs: {
        Row: {
          context: Json
          converted_at: string | null
          created_at: string
          dismissed_at: string | null
          engaged_at: string | null
          id: string
          loop_key: string
          notified_at: string | null
          scheduled_for: string
          status: string
          user_id: string
          variant_key: string | null
        }
        Insert: {
          context?: Json
          converted_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          engaged_at?: string | null
          id?: string
          loop_key: string
          notified_at?: string | null
          scheduled_for?: string
          status?: string
          user_id: string
          variant_key?: string | null
        }
        Update: {
          context?: Json
          converted_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          engaged_at?: string | null
          id?: string
          loop_key?: string
          notified_at?: string | null
          scheduled_for?: string
          status?: string
          user_id?: string
          variant_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_loop_runs_loop_key_fkey"
            columns: ["loop_key"]
            isOneToOne: false
            referencedRelation: "growth_loops"
            referencedColumns: ["loop_key"]
          },
        ]
      }
      growth_loops: {
        Row: {
          action_kind: string
          action_payload: Json
          condition: Json
          cooldown_hours: number
          created_at: string
          description: string
          enabled: boolean
          id: string
          loop_key: string
          priority: number
          trigger_source: string
          updated_at: string
        }
        Insert: {
          action_kind: string
          action_payload?: Json
          condition?: Json
          cooldown_hours?: number
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          loop_key: string
          priority?: number
          trigger_source?: string
          updated_at?: string
        }
        Update: {
          action_kind?: string
          action_payload?: Json
          condition?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          loop_key?: string
          priority?: number
          trigger_source?: string
          updated_at?: string
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
      idea_solution_canvas: {
        Row: {
          completed_at: string | null
          created_at: string
          current_alternatives: string | null
          evidence: string | null
          idea_id: string
          problem_statement: string | null
          signed_off_at: string | null
          signed_off_by: string | null
          signed_off_role: string | null
          updated_at: string
          who_suffers: string | null
          why_now: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_alternatives?: string | null
          evidence?: string | null
          idea_id: string
          problem_statement?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          signed_off_role?: string | null
          updated_at?: string
          who_suffers?: string | null
          why_now?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_alternatives?: string | null
          evidence?: string | null
          idea_id?: string
          problem_statement?: string | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          signed_off_role?: string | null
          updated_at?: string
          who_suffers?: string | null
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_solution_canvas_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_graph: {
        Row: {
          availability: string | null
          computed_at: string
          declared_intents: string[]
          intent_score: number
          signal_breakdown: Json
          source_event_version: number
          suppressed_loops: string[]
          top_categories: string[]
          user_id: string
        }
        Insert: {
          availability?: string | null
          computed_at?: string
          declared_intents?: string[]
          intent_score?: number
          signal_breakdown?: Json
          source_event_version?: number
          suppressed_loops?: string[]
          top_categories?: string[]
          user_id: string
        }
        Update: {
          availability?: string | null
          computed_at?: string
          declared_intents?: string[]
          intent_score?: number
          signal_breakdown?: Json
          source_event_version?: number
          suppressed_loops?: string[]
          top_categories?: string[]
          user_id?: string
        }
        Relationships: []
      }
      job_opportunities: {
        Row: {
          company: string | null
          contact_info: string | null
          created_at: string
          created_by_user_id: string | null
          description: string
          employment_type: string | null
          id: string
          location: string | null
          organization_id: string | null
          requirements: string | null
          salary_range: string | null
          sector: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          visibility_scope: string
        }
        Insert: {
          company?: string | null
          contact_info?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description: string
          employment_type?: string | null
          id?: string
          location?: string | null
          organization_id?: string | null
          requirements?: string | null
          salary_range?: string | null
          sector?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          visibility_scope?: string
        }
        Update: {
          company?: string | null
          contact_info?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          employment_type?: string | null
          id?: string
          location?: string | null
          organization_id?: string | null
          requirements?: string | null
          salary_range?: string | null
          sector?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      lifecycle_integrity_findings: {
        Row: {
          category: string | null
          check_name: string
          created_at: string
          details: Json
          id: string
          lifecycle_id: string | null
          message: string
          opportunity_id: string | null
          run_id: string
          severity: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          check_name: string
          created_at?: string
          details?: Json
          id?: string
          lifecycle_id?: string | null
          message: string
          opportunity_id?: string | null
          run_id: string
          severity: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          check_name?: string
          created_at?: string
          details?: Json
          id?: string
          lifecycle_id?: string | null
          message?: string
          opportunity_id?: string | null
          run_id?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          achieved_at: string
          achieved_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          evidence_id: string | null
          id: string
          kind: string
          metadata: Json
        }
        Insert: {
          achieved_at?: string
          achieved_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          evidence_id?: string | null
          id?: string
          kind: string
          metadata?: Json
        }
        Update: {
          achieved_at?: string
          achieved_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          evidence_id?: string | null
          id?: string
          kind?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "milestones_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
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
          is_self_declared: boolean
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
          weak_prior_weight: number
        }
        Insert: {
          consulting_case_studies?: string | null
          consulting_check?: boolean | null
          consulting_with_whom?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ready?: boolean | null
          is_self_declared?: boolean
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
          weak_prior_weight?: number
        }
        Update: {
          consulting_case_studies?: string | null
          consulting_check?: boolean | null
          consulting_with_whom?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ready?: boolean | null
          is_self_declared?: boolean
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
          weak_prior_weight?: number
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          opened_at: string | null
          payload: Json
          queued_at: string | null
          sent_at: string | null
          source_event_id: string | null
          state: Database["public"]["Enums"]["notification_delivery_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          channel?: string
          created_at?: string
          event_type: string
          failed_at?: string | null
          id?: string
          last_error?: string | null
          opened_at?: string | null
          payload?: Json
          queued_at?: string | null
          sent_at?: string | null
          source_event_id?: string | null
          state?: Database["public"]["Enums"]["notification_delivery_state"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          event_type?: string
          failed_at?: string | null
          id?: string
          last_error?: string | null
          opened_at?: string | null
          payload?: Json
          queued_at?: string | null
          sent_at?: string | null
          source_event_id?: string | null
          state?: Database["public"]["Enums"]["notification_delivery_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          link_template: string | null
          message_template: string
          notification_type: string
          priority: number
          recipient_type: string
          title_template: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          link_template?: string | null
          message_template: string
          notification_type?: string
          priority?: number
          recipient_type: string
          title_template: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          link_template?: string | null
          message_template?: string
          notification_type?: string
          priority?: number
          recipient_type?: string
          title_template?: string
          updated_at?: string
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
      onboarding_sessions: {
        Row: {
          abandoned_at: string | null
          availability: Json | null
          completed_at: string | null
          completed_steps: Json
          created_at: string
          current_step: number
          goal: string | null
          id: string
          onboarding_intent: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          availability?: Json | null
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          current_step?: number
          goal?: string | null
          id?: string
          onboarding_intent?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          availability?: Json | null
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          current_step?: number
          goal?: string | null
          id?: string
          onboarding_intent?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_state: {
        Row: {
          activation_completed_at: string | null
          activation_seen_at: string | null
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
          procuring_access: boolean
          retry_count: number | null
          scale_type: string | null
          updated_at: string | null
          user_id: string
          user_status: string | null
        }
        Insert: {
          activation_completed_at?: string | null
          activation_seen_at?: string | null
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
          procuring_access?: boolean
          retry_count?: number | null
          scale_type?: string | null
          updated_at?: string | null
          user_id: string
          user_status?: string | null
        }
        Update: {
          activation_completed_at?: string | null
          activation_seen_at?: string | null
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
          procuring_access?: boolean
          retry_count?: number | null
          scale_type?: string | null
          updated_at?: string | null
          user_id?: string
          user_status?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          box_id: string | null
          closed_at: string | null
          created_at: string
          creator_id: string
          description: string | null
          expires_at: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          opened_at: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          status: string
          title: string
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          box_id?: string | null
          closed_at?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          opened_at?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          box_id?: string | null
          closed_at?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          opened_at?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "opportunities_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_applications: {
        Row: {
          applicant_id: string
          created_at: string
          decided_at: string | null
          id: string
          idempotency_key: string | null
          message: string | null
          metadata: Json
          opportunity_id: string
          relationship_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          idempotency_key?: string | null
          message?: string | null
          metadata?: Json
          opportunity_id: string
          relationship_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          idempotency_key?: string | null
          message?: string | null
          metadata?: Json
          opportunity_id?: string
          relationship_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "advisor_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_graph: {
        Row: {
          computed_at: string
          confidence_score: number
          experience_points: number
          expertise_points: number
          explanation: Json
          freshness_points: number
          id: string
          intent_points: number
          match_score: number
          next_action: string | null
          opportunity_id: string
          opportunity_kind: string
          source_event_version: number | null
          trust_points: number
          user_id: string
        }
        Insert: {
          computed_at?: string
          confidence_score?: number
          experience_points?: number
          expertise_points?: number
          explanation?: Json
          freshness_points?: number
          id?: string
          intent_points?: number
          match_score?: number
          next_action?: string | null
          opportunity_id: string
          opportunity_kind: string
          source_event_version?: number | null
          trust_points?: number
          user_id: string
        }
        Update: {
          computed_at?: string
          confidence_score?: number
          experience_points?: number
          expertise_points?: number
          explanation?: Json
          freshness_points?: number
          id?: string
          intent_points?: number
          match_score?: number
          next_action?: string | null
          opportunity_id?: string
          opportunity_kind?: string
          source_event_version?: number | null
          trust_points?: number
          user_id?: string
        }
        Relationships: []
      }
      opportunity_interactions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          message: string | null
          opportunity_id: string
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          message?: string | null
          opportunity_id: string
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          message?: string | null
          opportunity_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunity_lifecycle_graph: {
        Row: {
          accepted_at: string | null
          application_id: string | null
          applied_at: string | null
          category: string
          completed_at: string | null
          created_at: string
          first_viewed_at: string | null
          id: string
          last_event_at: string | null
          last_event_id: string | null
          last_event_type: string | null
          last_viewed_at: string | null
          metadata: Json
          opportunity_id: string
          rejected_at: string | null
          reviewing_at: string | null
          saved_at: string | null
          shortlisted_at: string | null
          state: string
          state_rank: number
          updated_at: string
          user_id: string
          view_count: number
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          application_id?: string | null
          applied_at?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          first_viewed_at?: string | null
          id?: string
          last_event_at?: string | null
          last_event_id?: string | null
          last_event_type?: string | null
          last_viewed_at?: string | null
          metadata?: Json
          opportunity_id: string
          rejected_at?: string | null
          reviewing_at?: string | null
          saved_at?: string | null
          shortlisted_at?: string | null
          state?: string
          state_rank?: number
          updated_at?: string
          user_id: string
          view_count?: number
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          application_id?: string | null
          applied_at?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          first_viewed_at?: string | null
          id?: string
          last_event_at?: string | null
          last_event_id?: string | null
          last_event_type?: string | null
          last_viewed_at?: string | null
          metadata?: Json
          opportunity_id?: string
          rejected_at?: string | null
          reviewing_at?: string | null
          saved_at?: string | null
          shortlisted_at?: string | null
          state?: string
          state_rank?: number
          updated_at?: string
          user_id?: string
          view_count?: number
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      opportunity_weights: {
        Row: {
          created_at: string
          experience_weight: number
          expertise_weight: number
          freshness_weight: number
          id: string
          intent_weight: number
          is_active: boolean
          notes: string | null
          trust_weight: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          experience_weight?: number
          expertise_weight?: number
          freshness_weight?: number
          id?: string
          intent_weight?: number
          is_active?: boolean
          notes?: string | null
          trust_weight?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          experience_weight?: number
          expertise_weight?: number
          freshness_weight?: number
          id?: string
          intent_weight?: number
          is_active?: boolean
          notes?: string | null
          trust_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      ops_clients: {
        Row: {
          client_type: string | null
          created_at: string
          id: string
          name: string
          shareholder_count: number | null
          user_id: string
        }
        Insert: {
          client_type?: string | null
          created_at?: string
          id?: string
          name: string
          shareholder_count?: number | null
          user_id: string
        }
        Update: {
          client_type?: string | null
          created_at?: string
          id?: string
          name?: string
          shareholder_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ops_companies: {
        Row: {
          created_at: string
          id: string
          legal_form: string
          name: string
          shareholders: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          legal_form?: string
          name: string
          shareholders?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_form?: string
          name?: string
          shareholders?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ops_consultants: {
        Row: {
          created_at: string
          id: string
          name: string
          pattern: string | null
          skills: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pattern?: string | null
          skills?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pattern?: string | null
          skills?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      ops_offers: {
        Row: {
          client_id: string
          company_id: string
          consultant_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          price: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          consultant_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          price?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          consultant_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          price?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organization_legal_documents: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          organization_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_legal_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          lifecycle_stage: Database["public"]["Enums"]["org_lifecycle_stage"]
          logo_url: string | null
          name: string
          slug: string
          source_idea_id: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          lifecycle_stage?: Database["public"]["Enums"]["org_lifecycle_stage"]
          logo_url?: string | null
          name: string
          slug: string
          source_idea_id?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          lifecycle_stage?: Database["public"]["Enums"]["org_lifecycle_stage"]
          logo_url?: string | null
          name?: string
          slug?: string
          source_idea_id?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_source_idea_id_fkey"
            columns: ["source_idea_id"]
            isOneToOne: false
            referencedRelation: "startup_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_edges: {
        Row: {
          active: boolean
          created_at: string
          effective_from: string
          effective_until: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          id: string
          profile_id: string
          source_assignment_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          effective_from: string
          effective_until?: string | null
          entity_id: string
          entity_type: string
          equity_pct?: number | null
          id?: string
          profile_id: string
          source_assignment_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          entity_id?: string
          entity_type?: string
          equity_pct?: number | null
          id?: string
          profile_id?: string
          source_assignment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_edges_source_assignment_id_fkey"
            columns: ["source_assignment_id"]
            isOneToOne: false
            referencedRelation: "entity_role_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_graph: {
        Row: {
          active_allocations: number
          computed_at: string
          ownership_breakdown: Json
          ownership_level: string
          source_event_version: number
          total_allocated_equity: number
          total_vested_equity: number
          user_id: string
          venture_count: number
        }
        Insert: {
          active_allocations?: number
          computed_at?: string
          ownership_breakdown?: Json
          ownership_level?: string
          source_event_version?: number
          total_allocated_equity?: number
          total_vested_equity?: number
          user_id: string
          venture_count?: number
        }
        Update: {
          active_allocations?: number
          computed_at?: string
          ownership_breakdown?: Json
          ownership_level?: string
          source_event_version?: number
          total_allocated_equity?: number
          total_vested_equity?: number
          user_id?: string
          venture_count?: number
        }
        Relationships: []
      }
      platform_partners: {
        Row: {
          active: boolean
          created_at: string
          default_assignment_role: string
          id: string
          organization_id: string
          priority: number
          relationship_type: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_assignment_role: string
          id?: string
          organization_id: string
          priority?: number
          relationship_type: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_assignment_role?: string
          id?: string
          organization_id?: string
          priority?: number
          relationship_type?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_principals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_state_weights: {
        Row: {
          created_at: string
          min_ownership: number
          min_ventures: number
          sort_order: number
          state: string
          updated_at: string
          weight_activity: number
          weight_expertise: number
          weight_ownership: number
          weight_revenue: number
          weight_trust: number
        }
        Insert: {
          created_at?: string
          min_ownership?: number
          min_ventures?: number
          sort_order?: number
          state: string
          updated_at?: string
          weight_activity?: number
          weight_expertise?: number
          weight_ownership?: number
          weight_revenue?: number
          weight_trust?: number
        }
        Update: {
          created_at?: string
          min_ownership?: number
          min_ventures?: number
          sort_order?: number
          state?: string
          updated_at?: string
          weight_activity?: number
          weight_expertise?: number
          weight_ownership?: number
          weight_revenue?: number
          weight_trust?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_stage: string | null
          deleted_at: string | null
          draft_skills: string[] | null
          draft_summary: string | null
          draft_title: string | null
          education_certifications: string | null
          full_name: string | null
          id: string
          is_deleted: boolean | null
          key_projects: string | null
          organization_name: string | null
          partnership_interest: string | null
          preferred_sector: string | null
          primary_skills: string | null
          professional_title: string | null
          profile_draft_accepted_at: string | null
          profile_draft_confidence: number | null
          profile_draft_dismissed_at: string | null
          profile_draft_generated_at: string | null
          profile_draft_source: string | null
          startup_name: string | null
          summary_statement: string | null
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_stage?: string | null
          deleted_at?: string | null
          draft_skills?: string[] | null
          draft_summary?: string | null
          draft_title?: string | null
          education_certifications?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean | null
          key_projects?: string | null
          organization_name?: string | null
          partnership_interest?: string | null
          preferred_sector?: string | null
          primary_skills?: string | null
          professional_title?: string | null
          profile_draft_accepted_at?: string | null
          profile_draft_confidence?: number | null
          profile_draft_dismissed_at?: string | null
          profile_draft_generated_at?: string | null
          profile_draft_source?: string | null
          startup_name?: string | null
          summary_statement?: string | null
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_stage?: string | null
          deleted_at?: string | null
          draft_skills?: string[] | null
          draft_summary?: string | null
          draft_title?: string | null
          education_certifications?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean | null
          key_projects?: string | null
          organization_name?: string | null
          partnership_interest?: string | null
          preferred_sector?: string | null
          primary_skills?: string | null
          professional_title?: string | null
          profile_draft_accepted_at?: string | null
          profile_draft_confidence?: number | null
          profile_draft_dismissed_at?: string | null
          profile_draft_generated_at?: string | null
          profile_draft_source?: string | null
          startup_name?: string | null
          summary_statement?: string | null
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      progression_graph: {
        Row: {
          completed_actions_count: number
          computed_at: string
          current_state: string
          progression_score: number
          recommended_actions: Json
          source_event_version: number
          user_id: string
        }
        Insert: {
          completed_actions_count?: number
          computed_at?: string
          current_state?: string
          progression_score?: number
          recommended_actions?: Json
          source_event_version?: number
          user_id: string
        }
        Update: {
          completed_actions_count?: number
          computed_at?: string
          current_state?: string
          progression_score?: number
          recommended_actions?: Json
          source_event_version?: number
          user_id?: string
        }
        Relationships: []
      }
      progression_milestones: {
        Row: {
          aggregation: string
          created_at: string
          description: string | null
          id: string
          metric: string
          scope: string
          slug: string
          threshold: number
        }
        Insert: {
          aggregation: string
          created_at?: string
          description?: string | null
          id?: string
          metric: string
          scope?: string
          slug: string
          threshold: number
        }
        Update: {
          aggregation?: string
          created_at?: string
          description?: string | null
          id?: string
          metric?: string
          scope?: string
          slug?: string
          threshold?: number
        }
        Relationships: []
      }
      progression_predicates: {
        Row: {
          arg_type: string
          created_at: string
          description: string | null
          handler: string
          id: string
          slug: string
        }
        Insert: {
          arg_type: string
          created_at?: string
          description?: string | null
          handler: string
          id?: string
          slug: string
        }
        Update: {
          arg_type?: string
          created_at?: string
          description?: string | null
          handler?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      progression_rule_predicates: {
        Row: {
          argument: string | null
          evaluation_order: number
          id: string
          predicate_id: string
          rule_id: string
        }
        Insert: {
          argument?: string | null
          evaluation_order: number
          id?: string
          predicate_id: string
          rule_id: string
        }
        Update: {
          argument?: string | null
          evaluation_order?: number
          id?: string
          predicate_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_rule_predicates_predicate_id_fkey"
            columns: ["predicate_id"]
            isOneToOne: false
            referencedRelation: "progression_predicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_rule_predicates_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "progression_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_rules: {
        Row: {
          action_payload: Json
          action_type: string
          condition: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          priority: number
          source_stage: string | null
          target_stage: string | null
          updated_at: string
        }
        Insert: {
          action_payload?: Json
          action_type: string
          condition?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          priority?: number
          source_stage?: string | null
          target_stage?: string | null
          updated_at?: string
        }
        Update: {
          action_payload?: Json
          action_type?: string
          condition?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          priority?: number
          source_stage?: string | null
          target_stage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          context: Json
          created_at: string
          id: string
          rule: string
          source: string
          user_id: string
          verdict: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          rule: string
          source?: string
          user_id: string
          verdict: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          rule?: string
          source?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      recommendation_outcomes: {
        Row: {
          context: Json
          created_at: string
          id: string
          loop_key: string
          outcome: string
          run_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          loop_key: string
          outcome: string
          run_id?: string | null
          user_id: string
          value?: number
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          loop_key?: string
          outcome?: string
          run_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcomes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "growth_loop_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_health: {
        Row: {
          computed_at: string
          days_since_last_interaction: number | null
          health_score: number
          interaction_count: number
          last_interaction_at: string | null
          milestones_completed: number
          open_commitments: number
          relationship_id: string
        }
        Insert: {
          computed_at?: string
          days_since_last_interaction?: number | null
          health_score?: number
          interaction_count?: number
          last_interaction_at?: string | null
          milestones_completed?: number
          open_commitments?: number
          relationship_id: string
        }
        Update: {
          computed_at?: string
          days_since_last_interaction?: number | null
          health_score?: number
          interaction_count?: number
          last_interaction_at?: string | null
          milestones_completed?: number
          open_commitments?: number
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_health_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: true
            referencedRelation: "advisor_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_health_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: true
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_graph: {
        Row: {
          achievement_count: number
          community_score: number
          computed_at: string
          expertise_score: number
          impact_score: number
          reliability_score: number
          reputation_breakdown: Json
          reputation_level: string
          reputation_score: number
          revenue_score: number
          source_event_version: number
          trust_score: number
          user_id: string
        }
        Insert: {
          achievement_count?: number
          community_score?: number
          computed_at?: string
          expertise_score?: number
          impact_score?: number
          reliability_score?: number
          reputation_breakdown?: Json
          reputation_level?: string
          reputation_score?: number
          revenue_score?: number
          source_event_version?: number
          trust_score?: number
          user_id: string
        }
        Update: {
          achievement_count?: number
          community_score?: number
          computed_at?: string
          expertise_score?: number
          impact_score?: number
          reliability_score?: number
          reputation_breakdown?: Json
          reputation_level?: string
          reputation_score?: number
          revenue_score?: number
          source_event_version?: number
          trust_score?: number
          user_id?: string
        }
        Relationships: []
      }
      reputation_weights: {
        Row: {
          community_weight: number
          created_at: string
          expertise_weight: number
          id: string
          impact_weight: number
          is_active: boolean
          notes: string | null
          trust_weight: number
          updated_at: string
        }
        Insert: {
          community_weight?: number
          created_at?: string
          expertise_weight?: number
          id?: string
          impact_weight?: number
          is_active?: boolean
          notes?: string | null
          trust_weight?: number
          updated_at?: string
        }
        Update: {
          community_weight?: number
          created_at?: string
          expertise_weight?: number
          id?: string
          impact_weight?: number
          is_active?: boolean
          notes?: string | null
          trust_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      revenue_graph: {
        Row: {
          buyer_count: number
          completed_value_count: number
          computed_at: string
          revenue_breakdown: Json
          seller_count: number
          source_event_version: number
          total_revenue: number
          total_spent: number
          transaction_count: number
          user_id: string
        }
        Insert: {
          buyer_count?: number
          completed_value_count?: number
          computed_at?: string
          revenue_breakdown?: Json
          seller_count?: number
          source_event_version?: number
          total_revenue?: number
          total_spent?: number
          transaction_count?: number
          user_id: string
        }
        Update: {
          buyer_count?: number
          completed_value_count?: number
          computed_at?: string
          revenue_breakdown?: Json
          seller_count?: number
          source_event_version?: number
          total_revenue?: number
          total_spent?: number
          transaction_count?: number
          user_id?: string
        }
        Relationships: []
      }
      ritual_instances: {
        Row: {
          box_id: string | null
          created_at: string
          duration_minutes: number
          host_id: string
          id: string
          metadata: Json
          notes: string | null
          participants: string[]
          relationship_id: string | null
          scheduled_at: string
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          box_id?: string | null
          created_at?: string
          duration_minutes?: number
          host_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          participants?: string[]
          relationship_id?: string | null
          scheduled_at: string
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          box_id?: string | null
          created_at?: string
          duration_minutes?: number
          host_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          participants?: string[]
          relationship_id?: string | null
          scheduled_at?: string
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_instances_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "ritual_instances_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritual_instances_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "advisor_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritual_instances_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritual_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ritual_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_templates: {
        Row: {
          cadence: string
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          cadence: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_affinity_projection: {
        Row: {
          computed_at: string
          evidence_edges: Json
          id: string
          role: Database["public"]["Enums"]["role_affinity_kind"]
          score: number
          source_event_version: number | null
          user_id: string
        }
        Insert: {
          computed_at?: string
          evidence_edges?: Json
          id?: string
          role: Database["public"]["Enums"]["role_affinity_kind"]
          score?: number
          source_event_version?: number | null
          user_id: string
        }
        Update: {
          computed_at?: string
          evidence_edges?: Json
          id?: string
          role?: Database["public"]["Enums"]["role_affinity_kind"]
          score?: number
          source_event_version?: number | null
          user_id?: string
        }
        Relationships: []
      }
      role_attribution_policy: {
        Row: {
          created_at: string
          effective_from: string
          effective_until: string | null
          expertise_weight: number
          id: string
          ownership_weight: number
          revenue_weight: number
          role_type: string
          trust_weight: number
          version: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          expertise_weight?: number
          id?: string
          ownership_weight?: number
          revenue_weight?: number
          role_type: string
          trust_weight?: number
          version?: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          expertise_weight?: number
          id?: string
          ownership_weight?: number
          revenue_weight?: number
          role_type?: string
          trust_weight?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_attribution_policy_role_type_fkey"
            columns: ["role_type"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["code"]
          },
        ]
      }
      role_catalog: {
        Row: {
          applies_to: string[]
          created_at: string
          default_label: string
          effective_from: string
          effective_until: string | null
          id: string
          role_slug: string
          role_type: string
          version: number
        }
        Insert: {
          applies_to?: string[]
          created_at?: string
          default_label: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          role_slug: string
          role_type: string
          version?: number
        }
        Update: {
          applies_to?: string[]
          created_at?: string
          default_label?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          role_slug?: string
          role_type?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_catalog_role_type_fkey"
            columns: ["role_type"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["code"]
          },
        ]
      }
      role_types: {
        Row: {
          code: string
          created_at: string
          description: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requester_id: string
          service_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          service_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "consulting_services"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_tags: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
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
      startup_five_elements: {
        Row: {
          business_model: string
          created_at: string
          id: string
          market: string
          problem: string
          product: string
          solution: string
          startup_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_model?: string
          created_at?: string
          id?: string
          market?: string
          problem?: string
          product?: string
          solution?: string
          startup_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_model?: string
          created_at?: string
          id?: string
          market?: string
          problem?: string
          product?: string
          solution?: string
          startup_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_five_elements_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: true
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
          evidence_count: number
          growth_completed_at: string | null
          id: string
          is_looking_for_cobuilders: boolean | null
          ladder_business_at: string | null
          ladder_company_at: string | null
          ladder_product_at: string | null
          ladder_solution_at: string | null
          ladder_structure_at: string | null
          last_evidence_at: string | null
          review_status: string | null
          reviewed_at: string | null
          roles_needed: string[] | null
          sector: string | null
          solution_extended_until: string | null
          solution_stage: string
          status: string | null
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_completed_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          creator_id: string
          current_episode?: string
          description: string
          development_completed_at?: string | null
          evidence_count?: number
          growth_completed_at?: string | null
          id?: string
          is_looking_for_cobuilders?: boolean | null
          ladder_business_at?: string | null
          ladder_company_at?: string | null
          ladder_product_at?: string | null
          ladder_solution_at?: string | null
          ladder_structure_at?: string | null
          last_evidence_at?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          roles_needed?: string[] | null
          sector?: string | null
          solution_extended_until?: string | null
          solution_stage?: string
          status?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_completed_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          creator_id?: string
          current_episode?: string
          description?: string
          development_completed_at?: string | null
          evidence_count?: number
          growth_completed_at?: string | null
          id?: string
          is_looking_for_cobuilders?: boolean | null
          ladder_business_at?: string | null
          ladder_company_at?: string | null
          ladder_product_at?: string | null
          ladder_solution_at?: string | null
          ladder_structure_at?: string | null
          last_evidence_at?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          roles_needed?: string[] | null
          sector?: string | null
          solution_extended_until?: string | null
          solution_stage?: string
          status?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
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
          application_id: string | null
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
          team_member_id: string | null
          time_equity_percentage: number | null
          updated_at: string
          version: number
          vesting_years: number | null
        }
        Insert: {
          application_id?: string | null
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
          team_member_id?: string | null
          time_equity_percentage?: number | null
          updated_at?: string
          version?: number
          vesting_years?: number | null
        }
        Update: {
          application_id?: string | null
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
          team_member_id?: string | null
          time_equity_percentage?: number | null
          updated_at?: string
          version?: number
          vesting_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_compensation_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "startup_applications"
            referencedColumns: ["id"]
          },
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
      tenders: {
        Row: {
          budget_range: string | null
          contact_info: string | null
          created_at: string
          created_by_user_id: string | null
          deadline: string | null
          description: string
          id: string
          location: string | null
          organization_id: string | null
          requirements: string | null
          sector: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          visibility_scope: string
        }
        Insert: {
          budget_range?: string | null
          contact_info?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deadline?: string | null
          description: string
          id?: string
          location?: string | null
          organization_id?: string | null
          requirements?: string | null
          sector?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          visibility_scope?: string
        }
        Update: {
          budget_range?: string | null
          contact_info?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          organization_id?: string | null
          requirements?: string | null
          sector?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_missions: {
        Row: {
          consultants: string | null
          created_at: string
          id: string
          mission_name: string
          pipeline: string | null
          project_code: string
          status: string | null
          tjm: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consultants?: string | null
          created_at?: string
          id?: string
          mission_name: string
          pipeline?: string | null
          project_code: string
          status?: string | null
          tjm?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consultants?: string | null
          created_at?: string
          id?: string
          mission_name?: string
          pipeline?: string | null
          project_code?: string
          status?: string | null
          tjm?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracker_projects: {
        Row: {
          created_at: string
          id: string
          lifecycle_stages: string[] | null
          objectives: string[] | null
          partners: string[] | null
          product_name: string
          team_roles: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifecycle_stages?: string[] | null
          objectives?: string[] | null
          partners?: string[] | null
          product_name: string
          team_roles?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifecycle_stages?: string[] | null
          objectives?: string[] | null
          partners?: string[] | null
          product_name?: string
          team_roles?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_opportunities: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          duration: string | null
          format: string | null
          id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          sector: string | null
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          duration?: string | null
          format?: string | null
          id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          duration?: string | null
          format?: string | null
          id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_plan_shares: {
        Row: {
          can_edit: boolean
          created_at: string
          id: string
          plan_id: string
          shared_with_email: string
        }
        Insert: {
          can_edit?: boolean
          created_at?: string
          id?: string
          plan_id: string
          shared_with_email: string
        }
        Update: {
          can_edit?: boolean
          created_at?: string
          id?: string
          plan_id?: string
          shared_with_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_shares_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          broker_pct: number
          charge_mission: number
          client_name: string | null
          created_at: string
          id: string
          mission_sold_at: number
          name: string
          owner_id: string
          rows: Json
          service_name: string
          updated_at: string
        }
        Insert: {
          broker_pct?: number
          charge_mission?: number
          client_name?: string | null
          created_at?: string
          id?: string
          mission_sold_at?: number
          name?: string
          owner_id: string
          rows?: Json
          service_name?: string
          updated_at?: string
        }
        Update: {
          broker_pct?: number
          charge_mission?: number
          client_name?: string | null
          created_at?: string
          id?: string
          mission_sold_at?: number
          name?: string
          owner_id?: string
          rows?: Json
          service_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          opportunity_id: string | null
          opportunity_kind: string | null
          seller_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          opportunity_id?: string | null
          opportunity_kind?: string | null
          seller_id: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          opportunity_id?: string | null
          opportunity_kind?: string | null
          seller_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      trust_graph: {
        Row: {
          completion_score: number
          computed_at: string
          created_at: string
          review_score: number
          source_event_version: number
          trust_breakdown: Json
          trust_score: number
          updated_at: string
          user_id: string
          verification_level: string
          verified_count: number
        }
        Insert: {
          completion_score?: number
          computed_at?: string
          created_at?: string
          review_score?: number
          source_event_version?: number
          trust_breakdown?: Json
          trust_score?: number
          updated_at?: string
          user_id: string
          verification_level?: string
          verified_count?: number
        }
        Update: {
          completion_score?: number
          computed_at?: string
          created_at?: string
          review_score?: number
          source_event_version?: number
          trust_breakdown?: Json
          trust_score?: number
          updated_at?: string
          user_id?: string
          verification_level?: string
          verified_count?: number
        }
        Relationships: []
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
      user_intents: {
        Row: {
          context: Json
          created_at: string
          id: string
          intent_key: string
          signal: string
          source: string
          user_id: string
          weight: number
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          intent_key: string
          signal: string
          source?: string
          user_id: string
          weight?: number
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          intent_key?: string
          signal?: string
          source?: string
          user_id?: string
          weight?: number
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
      user_skills: {
        Row: {
          created_at: string
          id: string
          skill_tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_tag_id_fkey"
            columns: ["skill_tag_id"]
            isOneToOne: false
            referencedRelation: "skill_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_affiliations: {
        Row: {
          active: boolean
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          profile_id: string
          role_slug: string
          role_type: string
          source_assignment_id: string | null
          verified_since: string
          verified_until: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          profile_id: string
          role_slug: string
          role_type: string
          source_assignment_id?: string | null
          verified_since: string
          verified_until?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          profile_id?: string
          role_slug?: string
          role_type?: string
          source_assignment_id?: string | null
          verified_since?: string
          verified_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verified_affiliations_source_assignment_id_fkey"
            columns: ["source_assignment_id"]
            isOneToOne: false
            referencedRelation: "entity_role_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      vesting_schedules: {
        Row: {
          cliff_months: number
          created_at: string
          equity_allocation_id: string
          frequency: string
          id: string
          start_date: string
          total_percentage: number
          updated_at: string
          vested_percentage: number
          vesting_months: number
        }
        Insert: {
          cliff_months?: number
          created_at?: string
          equity_allocation_id: string
          frequency?: string
          id?: string
          start_date?: string
          total_percentage?: number
          updated_at?: string
          vested_percentage?: number
          vesting_months?: number
        }
        Update: {
          cliff_months?: number
          created_at?: string
          equity_allocation_id?: string
          frequency?: string
          id?: string
          start_date?: string
          total_percentage?: number
          updated_at?: string
          vested_percentage?: number
          vesting_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "vesting_schedules_equity_allocation_id_fkey"
            columns: ["equity_allocation_id"]
            isOneToOne: false
            referencedRelation: "equity_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_stream: {
        Row: {
          actor_id: string | null
          event_id: string | null
          event_type: string | null
          importance: string | null
          metadata: Json | null
          occurred_at: string | null
          primary_entity_id: string | null
          primary_entity_type: string | null
          secondary_entity_id: string | null
          secondary_entity_type: string | null
          summary: string | null
          visibility: string | null
        }
        Insert: {
          actor_id?: string | null
          event_id?: string | null
          event_type?: never
          importance?: never
          metadata?: Json | null
          occurred_at?: string | null
          primary_entity_id?: string | null
          primary_entity_type?: string | null
          secondary_entity_id?: never
          secondary_entity_type?: never
          summary?: never
          visibility?: never
        }
        Update: {
          actor_id?: string | null
          event_id?: string | null
          event_type?: never
          importance?: never
          metadata?: Json | null
          occurred_at?: string | null
          primary_entity_id?: string | null
          primary_entity_type?: string | null
          secondary_entity_id?: never
          secondary_entity_type?: never
          summary?: never
          visibility?: never
        }
        Relationships: []
      }
      admin_beta_health: {
        Row: {
          applications_accepted: number | null
          applications_completed: number | null
          applications_total: number | null
          dlq_size: number | null
          events_24h: number | null
          loops_7d: number | null
          loops_converted_7d: number | null
          notif_delivered: number | null
          notif_failed: number | null
          recommendation_rows: number | null
          total_users: number | null
          users_with_expertise: number | null
          users_with_recommendations: number | null
          users_with_trust: number | null
        }
        Relationships: []
      }
      beta_state_classification_audit: {
        Row: {
          derived_state: string | null
          full_name: string | null
          missing: Json | null
          next_state: string | null
          qualifying_states: Json | null
          reasons: Json | null
          runner_up: string | null
          scores: Json | null
          signals: Json | null
          user_id: string | null
        }
        Relationships: []
      }
      box_beta_readiness: {
        Row: {
          active_advisor_load: number | null
          active_advisors: number | null
          box_id: string | null
          capacity_available: number | null
          check_advisor: boolean | null
          check_capacity_available: boolean | null
          check_no_critical_alerts: boolean | null
          check_opportunity: boolean | null
          check_ritual: boolean | null
          check_validated_idea: boolean | null
          check_validation_queue: boolean | null
          critical_alerts: number | null
          name: string | null
          open_opportunities: number | null
          pending_validations: number | null
          recent_rituals: number | null
          slug: string | null
          total_capacity: number | null
          upcoming_rituals: number | null
          validated_ideas: number | null
        }
        Relationships: []
      }
      funnel_progress: {
        Row: {
          accepted_opportunity_at: string | null
          activated_at: string | null
          contribs_last_30d: number | null
          first_commitment_at: string | null
          first_contribution_at: string | null
          first_milestone_at: string | null
          first_opportunity_at: string | null
          first_relationship_at: string | null
          onboarded_at: string | null
          signup_at: string | null
          stage: string | null
          stage_rank: number | null
          user_id: string | null
        }
        Relationships: []
      }
      relationships: {
        Row: {
          box_id: string | null
          created_at: string | null
          ended_at: string | null
          id: string | null
          kind: string | null
          metadata: Json | null
          origin_request_id: string | null
          party_a_id: string | null
          party_b_id: string | null
          started_at: string | null
          status: string | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          box_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string | null
          kind?: string | null
          metadata?: Json | null
          origin_request_id?: string | null
          party_a_id?: string | null
          party_b_id?: string | null
          started_at?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          box_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string | null
          kind?: string | null
          metadata?: Json | null
          origin_request_id?: string | null
          party_a_id?: string | null
          party_b_id?: string | null
          started_at?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_relationships_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "box_beta_readiness"
            referencedColumns: ["box_id"]
          },
          {
            foreignKeyName: "advisor_relationships_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_relationships_origin_request_id_fkey"
            columns: ["origin_request_id"]
            isOneToOne: false
            referencedRelation: "box_inbound_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          code: string | null
          detected_at: string | null
          message: string | null
          severity: string | null
          subject_id: string | null
          subject_kind: string | null
        }
        Relationships: []
      }
      v_core_loop_metrics: {
        Row: {
          activated_at: string | null
          first_commitment_at: string | null
          first_completion_at: string | null
          first_contribution_at: string | null
          first_milestone_at: string | null
          user_id: string | null
          verified_contributor_30d: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      _slugify: { Args: { _txt: string }; Returns: string }
      accept_entity_role_link: {
        Args: { _assignment_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          effective_from: string | null
          effective_until: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          id: string
          label: string
          linked_at: string | null
          linked_by: string | null
          linked_user_id: string | null
          revoked_at: string | null
          role_slug: string
          slot: number
          status: Database["public"]["Enums"]["entity_role_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "entity_role_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      activity_importance: { Args: { _event_type: string }; Returns: string }
      activity_summary: {
        Args: { _event_type: string; _payload: Json }
        Returns: string
      }
      activity_visibility: {
        Args: { _aggregate_type: string; _event_type: string }
        Returns: string
      }
      apply_experience_validation: {
        Args: {
          _aggregate_external_id: string
          _aggregate_label: string
          _edge_type: Database["public"]["Enums"]["graph_edge_type"]
          _user_id: string
        }
        Returns: undefined
      }
      audit_graph_integrity: {
        Args: never
        Returns: {
          delta: number
          graph_count: number
          signal: string
          source_count: number
          user_id: string
        }[]
      }
      backfill_graph_events_v1: {
        Args: never
        Returns: {
          attempted: number
          newly_emitted: number
          source: string
        }[]
      }
      backfill_opportunity_events_v1: {
        Args: never
        Returns: {
          attempted: number
          newly_emitted: number
          source: string
        }[]
      }
      backfill_ownership_v1: {
        Args: never
        Returns: {
          attempted: number
          newly_emitted: number
          source: string
        }[]
      }
      backfill_revenue_events_v1: {
        Args: never
        Returns: {
          attempted: number
          newly_emitted: number
          source: string
        }[]
      }
      bootstrap_system_principal: { Args: { _user_id: string }; Returns: Json }
      can_access_entrepreneurial_layer: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_view_advisors_directory: { Args: never; Returns: boolean }
      can_view_entity: {
        Args: { _entity_id: string; _entity_type: string; _user_id: string }
        Returns: boolean
      }
      compute_user_state: { Args: { _user_id: string }; Returns: Json }
      compute_user_state_scores: { Args: { _user_id: string }; Returns: Json }
      current_user_email: { Args: never; Returns: string }
      declaration_entity_access: {
        Args: { _entity_id: string; _user_id: string }
        Returns: string
      }
      decline_entity_role_link: {
        Args: { _assignment_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          effective_from: string | null
          effective_until: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          id: string
          label: string
          linked_at: string | null
          linked_by: string | null
          linked_user_id: string | null
          revoked_at: string | null
          role_slug: string
          slot: number
          status: Database["public"]["Enums"]["entity_role_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "entity_role_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      derive_professional_state: { Args: { _user_id: string }; Returns: string }
      derived_equity_role: { Args: { _percentage: number }; Returns: string }
      dispatch_growth_loops: { Args: { _user_id: string }; Returns: number }
      dispatch_notifications_for_event: {
        Args: { _event_id: string }
        Returns: number
      }
      emit_opportunity_event: {
        Args: {
          _actor_id: string
          _event_type: Database["public"]["Enums"]["graph_event_type"]
          _idem: string
          _opportunity_id: string
          _payload: Json
        }
        Returns: undefined
      }
      ensure_declaration_role_slots: {
        Args: { _entity_id: string }
        Returns: undefined
      }
      evaluate_predicate: {
        Args: { _arg: string; _handler: string; _uid: string }
        Returns: boolean
      }
      get_admin_beta_health: {
        Args: never
        Returns: {
          applications_accepted: number | null
          applications_completed: number | null
          applications_total: number | null
          dlq_size: number | null
          events_24h: number | null
          loops_7d: number | null
          loops_converted_7d: number | null
          notif_delivered: number | null
          notif_failed: number | null
          recommendation_rows: number | null
          total_users: number | null
          users_with_expertise: number | null
          users_with_recommendations: number | null
          users_with_trust: number | null
        }
        SetofOptions: {
          from: "*"
          to: "admin_beta_health"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_beta_readiness: {
        Args: never
        Returns: {
          active_advisor_load: number
          active_advisors: number
          box_id: string
          capacity_available: number
          check_advisor: boolean
          check_capacity_available: boolean
          check_no_critical_alerts: boolean
          check_opportunity: boolean
          check_ritual: boolean
          check_validated_idea: boolean
          check_validation_queue: boolean
          checks_passed: number
          checks_total: number
          critical_alerts: number
          is_beta_ready: boolean
          name: string
          open_opportunities: number
          pending_validations: number
          recent_rituals: number
          slug: string
          total_capacity: number
          upcoming_rituals: number
          validated_ideas: number
        }[]
      }
      get_box_activity: {
        Args: { _box_id: string; _limit?: number }
        Returns: {
          actor_id: string
          event_id: string
          event_type: string
          importance: string
          metadata: Json
          occurred_at: string
          summary: string
        }[]
      }
      get_box_feed: {
        Args: { _box_id: string; _limit?: number }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          event_type: string
          occurred_at: string
          payload: Json
          user_id: string
        }[]
      }
      get_default_partner: {
        Args: { _relationship_type: string }
        Returns: {
          active: boolean
          created_at: string
          default_assignment_role: string
          id: string
          organization_id: string
          priority: number
          relationship_type: string
          slug: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "platform_partners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_event_audit: { Args: never; Returns: Json }
      get_global_activity: {
        Args: { _limit?: number; _min_importance?: string }
        Returns: {
          actor_id: string
          event_id: string
          event_type: string
          importance: string
          occurred_at: string
          primary_entity_id: string
          primary_entity_type: string
          summary: string
        }[]
      }
      get_ops_metrics: { Args: never; Returns: Json }
      get_profile_activity: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          event_id: string
          event_type: string
          importance: string
          metadata: Json
          occurred_at: string
          primary_entity_id: string
          primary_entity_type: string
          summary: string
        }[]
      }
      get_relationship_timeline: {
        Args: { _rel_id: string }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          event_type: string
          occurred_at: string
          payload: Json
          user_id: string
        }[]
      }
      get_system_alerts: {
        Args: never
        Returns: {
          code: string | null
          detected_at: string | null
          message: string | null
          severity: string | null
          subject_id: string | null
          subject_kind: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "system_alerts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_weekly_review: { Args: never; Returns: Json }
      grant_box_role: {
        Args: {
          _box_name: string
          _override_reason?: string
          _role: string
          _target_user: string
        }
        Returns: Json
      }
      graph_upsert_edge: {
        Args: {
          _attributes: Json
          _edge_type: Database["public"]["Enums"]["graph_edge_type"]
          _from: string
          _occurred_at: string
          _source_event_id: string
          _to: string
          _weight: number
        }
        Returns: string
      }
      graph_upsert_node: {
        Args: {
          _attributes: Json
          _external_id: string
          _label: string
          _node_type: Database["public"]["Enums"]["graph_node_type"]
        }
        Returns: string
      }
      has_org_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_org_role"]
          _org: string
          _user: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_cobuilder: { Args: { _user_id: string }; Returns: boolean }
      is_declaration_entity_collaborator: {
        Args: { _entity_id: string; _user_id: string }
        Returns: boolean
      }
      is_entity_admin: {
        Args: { _entity_id: string; _entity_type: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      is_plan_shared_with_me: { Args: { _plan_id: string }; Returns: boolean }
      legacy_expertise_calc: { Args: { _user_id: string }; Returns: Json }
      list_box_advisors_public: {
        Args: { _box_id: string }
        Returns: {
          accepting_requests: boolean
          advisor_id: string
          avatar_url: string
          capacity: number
          display_name: string
          eligible: boolean
          median_response_seconds: number
          natural_role: string
          remaining_capacity: number
          reputation_score: number
          response_rate: number
          status: string
          suitability_score: number
          track_record_count: number
          verified_skills_count: number
        }[]
      }
      match_advisors_for_request: {
        Args: { _limit?: number; _request_id: string }
        Returns: {
          advisor_id: string
          box_id: string
          capacity: number
          current_load: number
          match_score: number
          median_response_seconds: number
          reputation_score: number
        }[]
      }
      opportunity_lifecycle_rank: { Args: { _state: string }; Returns: number }
      p_brand_missing: { Args: { _uid: string }; Returns: boolean }
      p_milestone_reached: {
        Args: { _slug: string; _uid: string }
        Returns: boolean
      }
      p_onboarding_completed: { Args: { _uid: string }; Returns: boolean }
      p_paid_missions_count: { Args: { _uid: string }; Returns: number }
      p_paid_missions_count_min: {
        Args: { _min: number; _uid: string }
        Returns: boolean
      }
      pick_growth_loop_variant: {
        Args: { _loop_key: string; _user_id: string }
        Returns: {
          action_payload: Json
          variant_key: string
        }[]
      }
      progression_milestone_progress: {
        Args: { _slug: string; _uid: string }
        Returns: Json
      }
      promote_profile_draft: {
        Args: { _skills?: string[]; _summary?: string; _title?: string }
        Returns: undefined
      }
      recompute_advisor_metrics: {
        Args: { _advisor_id: string }
        Returns: undefined
      }
      recompute_advisor_readiness: {
        Args: { _user_id: string }
        Returns: undefined
      }
      recompute_expertise: { Args: { _user_id: string }; Returns: undefined }
      recompute_expertise_confidence: {
        Args: { _user_id: string }
        Returns: number
      }
      recompute_intent: { Args: { _user_id: string }; Returns: undefined }
      recompute_opportunity_matches: {
        Args: { _user_id: string }
        Returns: number
      }
      recompute_ownership: { Args: { _user_id: string }; Returns: undefined }
      recompute_progression: { Args: { _user_id: string }; Returns: undefined }
      recompute_reputation: { Args: { _user_id: string }; Returns: undefined }
      recompute_revenue: { Args: { _user_id: string }; Returns: undefined }
      recompute_role_affinity: { Args: { _user_id: string }; Returns: number }
      recompute_trust: { Args: { _user_id: string }; Returns: undefined }
      record_recommendation_outcome: {
        Args: {
          _context: Json
          _outcome: string
          _user_id: string
          _value: number
        }
        Returns: number
      }
      refresh_relationship_health: {
        Args: { _rel_id: string }
        Returns: undefined
      }
      render_template: { Args: { _ctx: Json; _tpl: string }; Returns: string }
      request_entity_role_link: {
        Args: {
          _assignment_id: string
          _equity_pct?: number
          _label?: string
          _linked_user_id: string
        }
        Returns: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          effective_from: string | null
          effective_until: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          id: string
          label: string
          linked_at: string | null
          linked_by: string | null
          linked_user_id: string | null
          revoked_at: string | null
          role_slug: string
          slot: number
          status: Database["public"]["Enums"]["entity_role_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "entity_role_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_role_catalog: {
        Args: { _at: string; _role_slug: string }
        Returns: {
          applies_to: string[]
          created_at: string
          default_label: string
          effective_from: string
          effective_until: string | null
          id: string
          role_slug: string
          role_type: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "role_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_role_policy: {
        Args: { _at: string; _role_type: string }
        Returns: {
          created_at: string
          effective_from: string
          effective_until: string | null
          expertise_weight: number
          id: string
          ownership_weight: number
          revenue_weight: number
          role_type: string
          trust_weight: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "role_attribution_policy"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_entity_role_link: {
        Args: { _assignment_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          effective_from: string | null
          effective_until: string | null
          entity_id: string
          entity_type: string
          equity_pct: number | null
          id: string
          label: string
          linked_at: string | null
          linked_by: string | null
          linked_user_id: string | null
          revoked_at: string | null
          role_slug: string
          slot: number
          status: Database["public"]["Enums"]["entity_role_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "entity_role_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rule_satisfied: {
        Args: { _rule_id: string; _uid: string }
        Returns: boolean
      }
      run_beta_simulation: { Args: never; Returns: Json }
      run_lifecycle_integrity_checks: { Args: never; Returns: string }
      seed_cold_start_expertise: { Args: { _user_id: string }; Returns: number }
      slugify_text: { Args: { _input: string }; Returns: string }
      test_growth_loop_dispatch: { Args: { _user_id: string }; Returns: Json }
      transfer_startup_initiation: {
        Args: { _new_initiator_id: string; _startup_id: string }
        Returns: undefined
      }
      transition_box_request: {
        Args: {
          _advisor?: string
          _meta?: Json
          _new_status: string
          _request_id: string
        }
        Returns: undefined
      }
      unique_org_slug: { Args: { _base: string }; Returns: string }
    }
    Enums: {
      app_org_role: "viewer" | "editor" | "admin"
      app_role: "entrepreneur" | "cobuilder" | "box_manager" | "admin"
      application_opportunity_kind:
        | "job"
        | "startup"
        | "tender"
        | "consulting"
        | "training"
      application_status:
        | "submitted"
        | "reviewing"
        | "shortlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "completed"
      attribution_processing_state: "queued" | "processed" | "failed"
      consulting_stage:
        | "identify"
        | "propose"
        | "confirm_prepare"
        | "deliver"
        | "payment_distribution"
        | "closed"
      entity_role_status: "pending" | "accepted" | "declined" | "revoked"
      entity_role_transition: "requested" | "accepted" | "declined" | "revoked"
      graph_edge_type:
        | "HAS_SKILL"
        | "HAS_CERTIFICATION"
        | "CONTRIBUTED_TO"
        | "DELIVERED"
        | "ENGAGED_IN"
        | "APPLIED_TO"
        | "OWNS_EQUITY_IN"
        | "CREATED"
        | "COMPLETED"
        | "MEMBER_OF"
        | "PUBLISHED"
        | "USER_RECEIVED_CERTIFICATION"
        | "USER_COMPLETED_TRANSACTION"
        | "USER_RECEIVED_REVIEW"
        | "USER_COMPLETED_PROJECT"
        | "USER_DELIVERED_OUTCOME"
        | "USER_MATCHES_OPPORTUNITY"
        | "OPPORTUNITY_REQUIRES_SKILL"
        | "USER_TRUSTED_FOR_DOMAIN"
        | "USER_INTERACTED_WITH_OPPORTUNITY"
        | "OPPORTUNITY_IN_CATEGORY"
        | "OPPORTUNITY_IN_DOMAIN"
        | "USER_CREATED_TRANSACTION"
        | "USER_PAID_USER"
        | "USER_DELIVERED_VALUE"
        | "USER_RECEIVED_VALUE"
        | "TRANSACTION_FOR_OPPORTUNITY"
        | "CONTRACT_BETWEEN_PARTIES"
        | "USER_EARNED_ACHIEVEMENT"
        | "USER_COMPLETED_OPPORTUNITY"
        | "USER_CREATED_VALUE"
        | "USER_RECEIVED_VALIDATION"
        | "USER_IMPROVED_EXPERTISE"
        | "USER_OWNS_EQUITY"
        | "USER_CONTRIBUTED_TO_VENTURE"
        | "EQUITY_ALLOCATED_FOR_CONTRIBUTION"
        | "USER_HAS_ROLE_IN_VENTURE"
        | "EQUITY_VESTED_FROM_ALLOCATION"
        | "USER_PRACTICE_EXPERIENCE"
        | "USER_TRAINING_EXPERIENCE"
        | "USER_CONSULTING_EXPERIENCE"
        | "ROLE_AFFINITY"
      graph_event_type:
        | "skill_added"
        | "skill_removed"
        | "certification_earned"
        | "certification_verified"
        | "startup_contribution_accepted"
        | "startup_member_added"
        | "training_delivered"
        | "training_published"
        | "consulting_engagement_completed"
        | "consulting_service_published"
        | "tender_won"
        | "tender_published"
        | "venture_created"
        | "equity_vested"
        | "journey_completed"
        | "job_published"
        | "job_applied"
        | "review_created"
        | "transaction_completed"
        | "training_completed"
        | "consulting_completed"
        | "job_completed"
        | "startup_contribution_completed"
        | "milestone_completed"
        | "opportunity_created"
        | "opportunity_updated"
        | "opportunity_published"
        | "opportunity_closed"
        | "user_viewed_opportunity"
        | "user_saved_opportunity"
        | "user_applied_opportunity"
        | "user_rejected_opportunity"
        | "user_accepted_opportunity"
        | "transaction_created"
        | "offer_sent"
        | "offer_accepted"
        | "contract_created"
        | "payment_initiated"
        | "payment_completed"
        | "payment_failed"
        | "refund_created"
        | "delivery_started"
        | "delivery_completed"
        | "invoice_created"
        | "expertise_score_updated"
        | "trust_score_updated"
        | "opportunity_completed"
        | "review_received"
        | "startup_milestone_completed"
        | "equity_offer_created"
        | "equity_offer_accepted"
        | "equity_offer_rejected"
        | "equity_allocation_created"
        | "vesting_started"
        | "vesting_milestone_completed"
        | "equity_transferred"
        | "equity_revoked"
        | "ownership_exit_requested"
        | "stage_transition_evaluated"
        | "recommendation_generated"
        | "action_completed"
        | "milestone_reached"
        | "goal_created"
        | "goal_completed"
        | "growth_loop_triggered"
        | "growth_loop_notified"
        | "growth_loop_engaged"
        | "growth_loop_converted"
        | "growth_loop_dismissed"
        | "recommendation_feedback_recorded"
        | "intent_declared"
        | "intent_signal_recorded"
        | "recommendation_outcome_recorded"
        | "experiment_assigned"
        | "experiment_converted"
        | "application_submitted"
        | "application_reviewing"
        | "application_shortlisted"
        | "application_accepted"
        | "application_rejected"
        | "application_withdrawn"
        | "application_completed"
        | "cold_start_seeded"
        | "cold_start_confirmed"
        | "notification_dispatched"
        | "notification_delivered"
        | "notification_failed"
        | "recommendation_available"
        | "onboarding_started"
        | "onboarding_step_completed"
        | "onboarding_completed"
        | "first_recommendations_viewed"
        | "first_recommendation_clicked"
        | "cold_start_updated"
        | "route_not_found"
        | "practice_verified"
        | "training_verified"
        | "consulting_verified"
        | "activation_hub_viewed"
        | "opportunity_interested"
        | "nba_executed"
        | "signal_completed"
        | "draft_generated"
        | "draft_viewed"
        | "draft_accepted"
        | "draft_edited"
        | "draft_regenerated"
        | "draft_dismissed"
        | "idea_solution_canvas_completed"
        | "idea_discovery_entered"
        | "idea_validation_approved"
        | "idea_validation_extended"
        | "idea_validation_revoked"
        | "idea_evidence_added"
        | "advisor_eligibility_changed"
        | "advisor_approved"
        | "advisor_paused"
        | "advisor_removed"
        | "box_request_created"
        | "box_request_accepted"
        | "box_request_matched"
        | "box_request_completed"
        | "box_request_archived"
        | "admin_override_recorded"
        | "commitment.created"
        | "commitment.started"
        | "commitment.progressed"
        | "commitment.completed"
        | "commitment.failed"
        | "commitment.cancelled"
        | "milestone.achieved"
        | "contribution.recorded"
        | "ritual.instance.scheduled"
        | "ritual.instance.completed"
        | "relationship.formed"
        | "idea.solution.validated"
        | "startup.team.joined"
        | "company.incorporated"
        | "commitment.checkpoint.completed"
        | "opportunity.created"
        | "opportunity.opened"
        | "opportunity.applied"
        | "opportunity.matched"
        | "opportunity.accepted"
        | "opportunity.closed"
      graph_node_type:
        | "user"
        | "skill"
        | "certification"
        | "training"
        | "consulting_service"
        | "startup"
        | "tender"
        | "venture"
        | "job"
        | "box"
        | "transaction"
        | "review"
        | "achievement"
        | "organization"
        | "project"
        | "opportunity"
        | "category"
        | "domain"
        | "location"
        | "contract"
        | "payment"
        | "invoice"
        | "role"
        | "equity_allocation"
        | "vesting_schedule"
        | "contribution"
      journey_status:
        | "not_started"
        | "in_progress"
        | "pending_approval"
        | "approved"
        | "rejected"
      journey_type:
        | "skill_ptc"
        | "idea_ptc"
        | "scaling_path"
        | "finance_literacy"
        | "security_literacy"
      notification_delivery_state:
        | "created"
        | "queued"
        | "sent"
        | "opened"
        | "failed"
      org_lifecycle_stage: "venture" | "business" | "startup" | "mature"
      role_affinity_kind: "builder" | "strategist" | "operator" | "connector"
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
      app_org_role: ["viewer", "editor", "admin"],
      app_role: ["entrepreneur", "cobuilder", "box_manager", "admin"],
      application_opportunity_kind: [
        "job",
        "startup",
        "tender",
        "consulting",
        "training",
      ],
      application_status: [
        "submitted",
        "reviewing",
        "shortlisted",
        "accepted",
        "rejected",
        "withdrawn",
        "completed",
      ],
      attribution_processing_state: ["queued", "processed", "failed"],
      consulting_stage: [
        "identify",
        "propose",
        "confirm_prepare",
        "deliver",
        "payment_distribution",
        "closed",
      ],
      entity_role_status: ["pending", "accepted", "declined", "revoked"],
      entity_role_transition: ["requested", "accepted", "declined", "revoked"],
      graph_edge_type: [
        "HAS_SKILL",
        "HAS_CERTIFICATION",
        "CONTRIBUTED_TO",
        "DELIVERED",
        "ENGAGED_IN",
        "APPLIED_TO",
        "OWNS_EQUITY_IN",
        "CREATED",
        "COMPLETED",
        "MEMBER_OF",
        "PUBLISHED",
        "USER_RECEIVED_CERTIFICATION",
        "USER_COMPLETED_TRANSACTION",
        "USER_RECEIVED_REVIEW",
        "USER_COMPLETED_PROJECT",
        "USER_DELIVERED_OUTCOME",
        "USER_MATCHES_OPPORTUNITY",
        "OPPORTUNITY_REQUIRES_SKILL",
        "USER_TRUSTED_FOR_DOMAIN",
        "USER_INTERACTED_WITH_OPPORTUNITY",
        "OPPORTUNITY_IN_CATEGORY",
        "OPPORTUNITY_IN_DOMAIN",
        "USER_CREATED_TRANSACTION",
        "USER_PAID_USER",
        "USER_DELIVERED_VALUE",
        "USER_RECEIVED_VALUE",
        "TRANSACTION_FOR_OPPORTUNITY",
        "CONTRACT_BETWEEN_PARTIES",
        "USER_EARNED_ACHIEVEMENT",
        "USER_COMPLETED_OPPORTUNITY",
        "USER_CREATED_VALUE",
        "USER_RECEIVED_VALIDATION",
        "USER_IMPROVED_EXPERTISE",
        "USER_OWNS_EQUITY",
        "USER_CONTRIBUTED_TO_VENTURE",
        "EQUITY_ALLOCATED_FOR_CONTRIBUTION",
        "USER_HAS_ROLE_IN_VENTURE",
        "EQUITY_VESTED_FROM_ALLOCATION",
        "USER_PRACTICE_EXPERIENCE",
        "USER_TRAINING_EXPERIENCE",
        "USER_CONSULTING_EXPERIENCE",
        "ROLE_AFFINITY",
      ],
      graph_event_type: [
        "skill_added",
        "skill_removed",
        "certification_earned",
        "certification_verified",
        "startup_contribution_accepted",
        "startup_member_added",
        "training_delivered",
        "training_published",
        "consulting_engagement_completed",
        "consulting_service_published",
        "tender_won",
        "tender_published",
        "venture_created",
        "equity_vested",
        "journey_completed",
        "job_published",
        "job_applied",
        "review_created",
        "transaction_completed",
        "training_completed",
        "consulting_completed",
        "job_completed",
        "startup_contribution_completed",
        "milestone_completed",
        "opportunity_created",
        "opportunity_updated",
        "opportunity_published",
        "opportunity_closed",
        "user_viewed_opportunity",
        "user_saved_opportunity",
        "user_applied_opportunity",
        "user_rejected_opportunity",
        "user_accepted_opportunity",
        "transaction_created",
        "offer_sent",
        "offer_accepted",
        "contract_created",
        "payment_initiated",
        "payment_completed",
        "payment_failed",
        "refund_created",
        "delivery_started",
        "delivery_completed",
        "invoice_created",
        "expertise_score_updated",
        "trust_score_updated",
        "opportunity_completed",
        "review_received",
        "startup_milestone_completed",
        "equity_offer_created",
        "equity_offer_accepted",
        "equity_offer_rejected",
        "equity_allocation_created",
        "vesting_started",
        "vesting_milestone_completed",
        "equity_transferred",
        "equity_revoked",
        "ownership_exit_requested",
        "stage_transition_evaluated",
        "recommendation_generated",
        "action_completed",
        "milestone_reached",
        "goal_created",
        "goal_completed",
        "growth_loop_triggered",
        "growth_loop_notified",
        "growth_loop_engaged",
        "growth_loop_converted",
        "growth_loop_dismissed",
        "recommendation_feedback_recorded",
        "intent_declared",
        "intent_signal_recorded",
        "recommendation_outcome_recorded",
        "experiment_assigned",
        "experiment_converted",
        "application_submitted",
        "application_reviewing",
        "application_shortlisted",
        "application_accepted",
        "application_rejected",
        "application_withdrawn",
        "application_completed",
        "cold_start_seeded",
        "cold_start_confirmed",
        "notification_dispatched",
        "notification_delivered",
        "notification_failed",
        "recommendation_available",
        "onboarding_started",
        "onboarding_step_completed",
        "onboarding_completed",
        "first_recommendations_viewed",
        "first_recommendation_clicked",
        "cold_start_updated",
        "route_not_found",
        "practice_verified",
        "training_verified",
        "consulting_verified",
        "activation_hub_viewed",
        "opportunity_interested",
        "nba_executed",
        "signal_completed",
        "draft_generated",
        "draft_viewed",
        "draft_accepted",
        "draft_edited",
        "draft_regenerated",
        "draft_dismissed",
        "idea_solution_canvas_completed",
        "idea_discovery_entered",
        "idea_validation_approved",
        "idea_validation_extended",
        "idea_validation_revoked",
        "idea_evidence_added",
        "advisor_eligibility_changed",
        "advisor_approved",
        "advisor_paused",
        "advisor_removed",
        "box_request_created",
        "box_request_accepted",
        "box_request_matched",
        "box_request_completed",
        "box_request_archived",
        "admin_override_recorded",
        "commitment.created",
        "commitment.started",
        "commitment.progressed",
        "commitment.completed",
        "commitment.failed",
        "commitment.cancelled",
        "milestone.achieved",
        "contribution.recorded",
        "ritual.instance.scheduled",
        "ritual.instance.completed",
        "relationship.formed",
        "idea.solution.validated",
        "startup.team.joined",
        "company.incorporated",
        "commitment.checkpoint.completed",
        "opportunity.created",
        "opportunity.opened",
        "opportunity.applied",
        "opportunity.matched",
        "opportunity.accepted",
        "opportunity.closed",
      ],
      graph_node_type: [
        "user",
        "skill",
        "certification",
        "training",
        "consulting_service",
        "startup",
        "tender",
        "venture",
        "job",
        "box",
        "transaction",
        "review",
        "achievement",
        "organization",
        "project",
        "opportunity",
        "category",
        "domain",
        "location",
        "contract",
        "payment",
        "invoice",
        "role",
        "equity_allocation",
        "vesting_schedule",
        "contribution",
      ],
      journey_status: [
        "not_started",
        "in_progress",
        "pending_approval",
        "approved",
        "rejected",
      ],
      journey_type: [
        "skill_ptc",
        "idea_ptc",
        "scaling_path",
        "finance_literacy",
        "security_literacy",
      ],
      notification_delivery_state: [
        "created",
        "queued",
        "sent",
        "opened",
        "failed",
      ],
      org_lifecycle_stage: ["venture", "business", "startup", "mature"],
      role_affinity_kind: ["builder", "strategist", "operator", "connector"],
    },
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointment_confirmations: {
        Row: {
          appointment_id: string
          capability_id: string | null
          id: string
          responded_at: string | null
          response: string | null
          sent_at: string
        }
        Insert: {
          appointment_id: string
          capability_id?: string | null
          id?: string
          responded_at?: string | null
          response?: string | null
          sent_at?: string
        }
        Update: {
          appointment_id?: string
          capability_id?: string | null
          id?: string
          responded_at?: string | null
          response?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_confirmations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_confirmations_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_by_user_id: string
          created_at: string
          from_status: string | null
          id: string
          to_status: string
        }
        Insert: {
          appointment_id: string
          changed_by_user_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          to_status: string
        }
        Update: {
          appointment_id?: string
          changed_by_user_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          business_timezone: string
          cancellation_deadline_at: string
          cancellation_policy_snapshot: Json
          created_at: string
          ends_at: string
          id: string
          person_id: string
          policy_version: number
          service_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          business_timezone: string
          cancellation_deadline_at: string
          cancellation_policy_snapshot: Json
          created_at?: string
          ends_at: string
          id?: string
          person_id: string
          policy_version: number
          service_id: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_timezone?: string
          cancellation_deadline_at?: string
          cancellation_policy_snapshot?: Json
          created_at?: string
          ends_at?: string
          id?: string
          person_id?: string
          policy_version?: number
          service_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_policy_version_fkey"
            columns: ["policy_version"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["policy_version"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string
          correlation_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id: string
          correlation_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string
          correlation_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      cancellation_policies: {
        Row: {
          business_timezone: string
          countable_hours: number
          created_at: string
          effective_from: string
          excluded_weekdays: Json
          id: string
          late_cancellation_charge_enabled: boolean
          legal_document_version_id: string | null
          no_show_charge_enabled: boolean
          policy_version: number
        }
        Insert: {
          business_timezone: string
          countable_hours: number
          created_at?: string
          effective_from: string
          excluded_weekdays: Json
          id?: string
          late_cancellation_charge_enabled: boolean
          legal_document_version_id?: string | null
          no_show_charge_enabled: boolean
          policy_version: number
        }
        Update: {
          business_timezone?: string
          countable_hours?: number
          created_at?: string
          effective_from?: string
          excluded_weekdays?: Json
          id?: string
          late_cancellation_charge_enabled?: boolean
          legal_document_version_id?: string | null
          no_show_charge_enabled?: boolean
          policy_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_policies_legal_document_version_id_fkey"
            columns: ["legal_document_version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      capabilities: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          purpose: string
          revoked_at: string | null
          subject_id: string
          subject_type: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          purpose: string
          revoked_at?: string | null
          subject_id: string
          subject_type: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          revoked_at?: string | null
          subject_id?: string
          subject_type?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      document_jobs: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          signature_evidence_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          signature_evidence_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          signature_evidence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_jobs_signature_evidence_id_fkey"
            columns: ["signature_evidence_id"]
            isOneToOne: false
            referencedRelation: "signature_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      event_expenses: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          event_id: string
          id: string
          paid_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description: string
          event_id: string
          id?: string
          paid_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registration_status_history: {
        Row: {
          actor_id: string | null
          changed_at: string
          id: string
          registration_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          changed_at?: string
          id?: string
          registration_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          changed_at?: string
          id?: string
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registration_status_history_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attendance_status: string
          created_at: string
          event_id: string
          id: string
          person_id: string
          price_cents: number
          status: string
        }
        Insert: {
          attendance_status?: string
          created_at?: string
          event_id: string
          id?: string
          person_id: string
          price_cents: number
          status: string
        }
        Update: {
          attendance_status?: string
          created_at?: string
          event_id?: string
          id?: string
          person_id?: string
          price_cents?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          default_price_cents: number
          description: string | null
          ends_at: string
          id: string
          location: string | null
          modality: string
          required_form_template_id: string | null
          starts_at: string
          status: string
          timezone: string
          title: string
          type: string
        }
        Insert: {
          capacity: number
          created_at?: string
          default_price_cents: number
          description?: string | null
          ends_at: string
          id?: string
          location?: string | null
          modality: string
          required_form_template_id?: string | null
          starts_at: string
          status?: string
          timezone: string
          title: string
          type: string
        }
        Update: {
          capacity?: number
          created_at?: string
          default_price_cents?: number
          description?: string | null
          ends_at?: string
          id?: string
          location?: string | null
          modality?: string
          required_form_template_id?: string | null
          starts_at?: string
          status?: string
          timezone?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          active: boolean
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      fiscal_attempts: {
        Row: {
          attempt_number: number
          correlation_id: string
          error_code: string | null
          finished_at: string | null
          fiscal_document_id: string
          id: string
          operation: string
          provider_status: string | null
          started_at: string
          status: string
        }
        Insert: {
          attempt_number: number
          correlation_id: string
          error_code?: string | null
          finished_at?: string | null
          fiscal_document_id: string
          id?: string
          operation: string
          provider_status?: string | null
          started_at?: string
          status: string
        }
        Update: {
          attempt_number?: number
          correlation_id?: string
          error_code?: string | null
          finished_at?: string | null
          fiscal_document_id?: string
          id?: string
          operation?: string
          provider_status?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_attempts_fiscal_document_id_fkey"
            columns: ["fiscal_document_id"]
            isOneToOne: false
            referencedRelation: "fiscal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documents: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          created_at: string
          external_id: string | null
          id: string
          idempotency_key: string
          issued_at: string | null
          payer_person_id: string
          pdf_path: string | null
          person_id: string
          profile_id: string
          profile_version: number
          protocol: string | null
          provider: string
          source_id: string
          source_type: string
          status: string
          treatment_id: string
          treatment_version: number
          updated_at: string
          xml_path: string | null
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          idempotency_key: string
          issued_at?: string | null
          payer_person_id: string
          pdf_path?: string | null
          person_id: string
          profile_id: string
          profile_version: number
          protocol?: string | null
          provider: string
          source_id: string
          source_type: string
          status?: string
          treatment_id: string
          treatment_version: number
          updated_at?: string
          xml_path?: string | null
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          idempotency_key?: string
          issued_at?: string | null
          payer_person_id?: string
          pdf_path?: string | null
          person_id?: string
          profile_id?: string
          profile_version?: number
          protocol?: string | null
          provider?: string
          source_id?: string
          source_type?: string
          status?: string
          treatment_id?: string
          treatment_version?: number
          updated_at?: string
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_payer_person_id_fkey"
            columns: ["payer_person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_payer_person_id_fkey"
            columns: ["payer_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "fiscal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "fiscal_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_profiles: {
        Row: {
          active: boolean
          created_at: string
          effective_from: string
          effective_until: string | null
          fiscal_address: Json
          id: string
          issuer_document: string
          issuer_kind: string
          municipality_code: string
          service_code: string
          tax_regime: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          effective_from: string
          effective_until?: string | null
          fiscal_address?: Json
          id?: string
          issuer_document: string
          issuer_kind: string
          municipality_code: string
          service_code: string
          tax_regime: string
          version: number
        }
        Update: {
          active?: boolean
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          fiscal_address?: Json
          id?: string
          issuer_document?: string
          issuer_kind?: string
          municipality_code?: string
          service_code?: string
          tax_regime?: string
          version?: number
        }
        Relationships: []
      }
      fiscal_treatments: {
        Row: {
          approved: boolean
          created_at: string
          effective_from: string
          effective_until: string | null
          enabled_for_live: boolean
          id: string
          issuance_rule: string
          service_code: string | null
          source_kind: string
          version: number
        }
        Insert: {
          approved?: boolean
          created_at?: string
          effective_from: string
          effective_until?: string | null
          enabled_for_live?: boolean
          id?: string
          issuance_rule: string
          service_code?: string | null
          source_kind: string
          version: number
        }
        Update: {
          approved?: boolean
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          enabled_for_live?: boolean
          id?: string
          issuance_rule?: string
          service_code?: string | null
          source_kind?: string
          version?: number
        }
        Relationships: []
      }
      form_submission_versions: {
        Row: {
          answers: Json | null
          answers_auth_tag: string | null
          answers_ciphertext: string | null
          answers_iv: string | null
          created_at: string
          id: string
          key_version: number | null
          submission_id: string
          submitted_at: string | null
          version: number
        }
        Insert: {
          answers?: Json | null
          answers_auth_tag?: string | null
          answers_ciphertext?: string | null
          answers_iv?: string | null
          created_at?: string
          id?: string
          key_version?: number | null
          submission_id: string
          submitted_at?: string | null
          version: number
        }
        Update: {
          answers?: Json | null
          answers_auth_tag?: string | null
          answers_ciphertext?: string | null
          answers_iv?: string | null
          created_at?: string
          id?: string
          key_version?: number | null
          submission_id?: string
          submitted_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_versions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          id: string
          status: string
          subject_id: string
          template_version_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject_id: string
          template_version_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject_id?: string
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "form_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_template_versions: {
        Row: {
          created_at: string
          data_classification: string
          id: string
          schema: Json
          template_id: string
          version: number
        }
        Insert: {
          created_at?: string
          data_classification: string
          id?: string
          schema: Json
          template_id: string
          version: number
        }
        Update: {
          created_at?: string
          data_classification?: string
          id?: string
          schema?: Json
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          active_version: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active_version?: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active_version?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      inbox_events: {
        Row: {
          id: string
          payload: Json
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          id?: string
          payload: Json
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          capability_id: string | null
          channel: string
          content_hash_sha256: string
          document_version_id: string
          id: string
          person_id: string
        }
        Insert: {
          accepted_at?: string
          capability_id?: string | null
          channel: string
          content_hash_sha256: string
          document_version_id: string
          id?: string
          person_id: string
        }
        Update: {
          accepted_at?: string
          capability_id?: string | null
          channel?: string
          content_hash_sha256?: string
          document_version_id?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          content: string
          content_hash_sha256: string
          created_at: string
          document_id: string
          effective_from: string
          id: string
          is_draft: boolean
          supersedes_id: string | null
          version: number
        }
        Insert: {
          content: string
          content_hash_sha256: string
          created_at?: string
          document_id: string
          effective_from: string
          id?: string
          is_draft?: boolean
          supersedes_id?: string | null
          version: number
        }
        Update: {
          content?: string
          content_hash_sha256?: string
          created_at?: string
          document_id?: string
          effective_from?: string
          id?: string
          is_draft?: boolean
          supersedes_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_document_versions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          created_at: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      message_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          error_code: string | null
          id: string
          outbound_message_id: string
          provider_status: string | null
        }
        Insert: {
          attempt_number: number
          created_at?: string
          error_code?: string | null
          id?: string
          outbound_message_id: string
          provider_status?: string | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          error_code?: string | null
          id?: string
          outbound_message_id?: string
          provider_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attempts_outbound_message_id_fkey"
            columns: ["outbound_message_id"]
            isOneToOne: false
            referencedRelation: "outbound_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          body: string
          channel: string
          id: string
          key: string
          version: number
        }
        Insert: {
          active?: boolean
          body: string
          channel: string
          id?: string
          key: string
          version: number
        }
        Update: {
          active?: boolean
          body?: string
          channel?: string
          id?: string
          key?: string
          version?: number
        }
        Relationships: []
      }
      outbound_messages: {
        Row: {
          channel: string
          created_at: string
          dispatched_at: string | null
          id: string
          idempotency_key: string
          payload: Json
          recipient: string
          status: string
          template_key: string
        }
        Insert: {
          channel: string
          created_at?: string
          dispatched_at?: string | null
          id?: string
          idempotency_key: string
          payload: Json
          recipient: string
          status?: string
          template_key: string
        }
        Update: {
          channel?: string
          created_at?: string
          dispatched_at?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          recipient?: string
          status?: string
          template_key?: string
        }
        Relationships: []
      }
      payable_payments: {
        Row: {
          actor_id: string
          amount_cents: number
          id: string
          idempotency_key: string
          method: string
          paid_at: string
          payable_id: string
          receipt_path: string | null
        }
        Insert: {
          actor_id: string
          amount_cents: number
          id?: string
          idempotency_key: string
          method: string
          paid_at?: string
          payable_id: string
          receipt_path?: string | null
        }
        Update: {
          actor_id?: string
          amount_cents?: number
          id?: string
          idempotency_key?: string
          method?: string
          paid_at?: string
          payable_id?: string
          receipt_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payable_payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount_cents: number
          category_id: string
          competence: string
          created_at: string
          description: string
          due_date: string
          id: string
          idempotency_key: string
          paid_cents: number
          receipt_path: string | null
          recurrence_rule_id: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          competence: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          idempotency_key: string
          paid_cents?: number
          receipt_path?: string | null
          recurrence_rule_id?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          competence?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          idempotency_key?: string
          paid_cents?: number
          receipt_path?: string | null
          recurrence_rule_id?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          actor_id: string
          amount_cents: number
          external_reference: string | null
          id: string
          idempotency_key: string
          method: string
          payment_id: string
          reason: string
          refunded_at: string
        }
        Insert: {
          actor_id: string
          amount_cents: number
          external_reference?: string | null
          id?: string
          idempotency_key: string
          method: string
          payment_id: string
          reason: string
          refunded_at?: string
        }
        Update: {
          actor_id?: string
          amount_cents?: number
          external_reference?: string | null
          id?: string
          idempotency_key?: string
          method?: string
          payment_id?: string
          reason?: string
          refunded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          actor_id: string
          amount_cents: number
          external_reference: string | null
          id: string
          idempotency_key: string
          method: string
          paid_at: string
          receivable_id: string
        }
        Insert: {
          actor_id: string
          amount_cents: number
          external_reference?: string | null
          id?: string
          idempotency_key: string
          method: string
          paid_at?: string
          receivable_id: string
        }
        Update: {
          actor_id?: string
          amount_cents?: number
          external_reference?: string | null
          id?: string
          idempotency_key?: string
          method?: string
          paid_at?: string
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          birth_date: string
          birthday_messages_enabled: boolean
          civil_name: string
          cpf_normalized: string | null
          created_at: string
          email_normalized: string | null
          fiscal_address: Json
          id: string
          phone_e164: string | null
          preferred_channel: string
          preferred_name: string | null
          updated_at: string
        }
        Insert: {
          birth_date: string
          birthday_messages_enabled?: boolean
          civil_name: string
          cpf_normalized?: string | null
          created_at?: string
          email_normalized?: string | null
          fiscal_address?: Json
          id?: string
          phone_e164?: string | null
          preferred_channel?: string
          preferred_name?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string
          birthday_messages_enabled?: boolean
          civil_name?: string
          cpf_normalized?: string | null
          created_at?: string
          email_normalized?: string | null
          fiscal_address?: Json
          id?: string
          phone_e164?: string | null
          preferred_channel?: string
          preferred_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      person_relationships: {
        Row: {
          created_at: string
          id: string
          person_id: string
          related_person_id: string
          relationship_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          related_person_id: string
          relationship_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          related_person_id?: string
          relationship_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_related_person_id_fkey"
            columns: ["related_person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_related_person_id_fkey"
            columns: ["related_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receivable_adjustments: {
        Row: {
          actor_id: string
          adjustment_cents: number
          created_at: string
          id: string
          reason: string
          receivable_id: string
        }
        Insert: {
          actor_id: string
          adjustment_cents: number
          created_at?: string
          id?: string
          reason: string
          receivable_id: string
        }
        Update: {
          actor_id?: string
          adjustment_cents?: number
          created_at?: string
          id?: string
          reason?: string
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_adjustments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          original_amount_cents: number
          payer_person_id: string
          person_id: string
          source_id: string
          source_type: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          original_amount_cents: number
          payer_person_id: string
          person_id: string
          source_id: string
          source_type: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          original_amount_cents?: number
          payer_person_id?: string
          person_id?: string
          source_id?: string
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_payer_person_id_fkey"
            columns: ["payer_person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_payer_person_id_fkey"
            columns: ["payer_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "accounting_people_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          active: boolean
          amount_cents: number
          category_id: string
          created_at: string
          day_of_month: number
          description: string
          id: string
          month_end_fallback: string
          start_date: string
          vendor_id: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          category_id: string
          created_at?: string
          day_of_month: number
          description: string
          id?: string
          month_end_fallback?: string
          start_date: string
          vendor_id: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          category_id?: string
          created_at?: string
          day_of_month?: number
          description?: string
          id?: string
          month_end_fallback?: string
          start_date?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price_cents: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_minutes: number
          id?: string
          name: string
          price_cents: number
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      signature_evidence: {
        Row: {
          canonical_hash_sha256: string
          declaration_version: string
          document_status: string
          id: string
          metadata: Json
          signature_asset_path: string | null
          signed_at: string
          source: string
          submission_version_id: string
          typed_name: string
        }
        Insert: {
          canonical_hash_sha256: string
          declaration_version: string
          document_status?: string
          id?: string
          metadata?: Json
          signature_asset_path?: string | null
          signed_at?: string
          source: string
          submission_version_id: string
          typed_name: string
        }
        Update: {
          canonical_hash_sha256?: string
          declaration_version?: string
          document_status?: string
          id?: string
          metadata?: Json
          signature_asset_path?: string | null
          signed_at?: string
          source?: string
          submission_version_id?: string
          typed_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_evidence_submission_version_id_fkey"
            columns: ["submission_version_id"]
            isOneToOne: false
            referencedRelation: "form_submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string
          document_normalized: string | null
          id: string
          legal_name: string
        }
        Insert: {
          created_at?: string
          document_normalized?: string | null
          id?: string
          legal_name: string
        }
        Update: {
          created_at?: string
          document_normalized?: string | null
          id?: string
          legal_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      accounting_people_view: {
        Row: {
          civil_name: string | null
          cpf_normalized: string | null
          fiscal_address: Json | null
          id: string | null
        }
        Insert: {
          civil_name?: string | null
          cpf_normalized?: string | null
          fiscal_address?: Json | null
          id?: string | null
        }
        Update: {
          civil_name?: string | null
          cpf_normalized?: string | null
          fiscal_address?: Json | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_aal: { Args: never; Returns: string }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      queue_archive: {
        Args: { p_message_id: string; p_queue_name: string }
        Returns: boolean
      }
      queue_read: {
        Args: {
          p_quantity: number
          p_queue_name: string
          p_visibility_timeout_seconds: number
        }
        Returns: {
          enqueued_at: string
          id: string
          message: Json
          read_count: number
          visible_at: string
        }[]
      }
      queue_requeue: {
        Args: {
          p_delay_seconds?: number
          p_message_id: string
          p_queue_name: string
        }
        Returns: boolean
      }
      queue_send: {
        Args: {
          p_delay_seconds?: number
          p_message: Json
          p_queue_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "psychologist_owner" | "secretary" | "accounting"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["psychologist_owner", "secretary", "accounting"],
    },
  },
} as const


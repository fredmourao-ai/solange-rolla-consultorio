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


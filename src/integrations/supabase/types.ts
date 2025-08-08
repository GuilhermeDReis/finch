export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          id: string
          bank_id: string
          limit_amount: number
          description: string
          brand: Database["public"]["Enums"]["credit_card_brand"]
          closing_day: number
          due_day: number
          is_archived: boolean
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bank_id: string
          limit_amount: number
          description: string
          brand?: Database["public"]["Enums"]["credit_card_brand"]
          closing_day: number
          due_day: number
          is_archived?: boolean
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bank_id?: string
          limit_amount?: number
          description?: string
          brand?: Database["public"]["Enums"]["credit_card_brand"]
          closing_day?: number
          due_day?: number
          is_archived?: boolean
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      background_jobs: {
        Row: {
          id: string
          type: string
          status: string
          payload: Json
          progress: number | null
          result: Json | null
          error_message: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          type: string
          status?: string
          payload: Json
          progress?: number | null
          result?: Json | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          type?: string
          status?: string
          payload?: Json
          progress?: number | null
          result?: Json | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          category: string
          is_read: boolean
          data: Json
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string
          read_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          category?: string
          is_read?: boolean
          data?: Json
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          category?: string
          is_read?: boolean
          data?: Json
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          id: string
          name: string
          icon_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          icon_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_layouts: {
        Row: {
          id: string
          bank_id: string
          name: string
          description: string | null
          date_column: string
          amount_column: string
          identifier_column: string
          description_column: string
          date_format: string
          decimal_separator: string
          thousands_separator: string | null
          encoding: string
          delimiter: string
          has_header: boolean
          sample_file: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bank_id: string
          name: string
          description?: string | null
          date_column: string
          amount_column: string
          identifier_column: string
          description_column: string
          date_format?: string
          decimal_separator?: string
          thousands_separator?: string | null
          encoding?: string
          delimiter?: string
          has_header?: boolean
          sample_file?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bank_id?: string
          name?: string
          description?: string | null
          date_column?: string
          amount_column?: string
          identifier_column?: string
          description_column?: string
          date_format?: string
          decimal_separator?: string
          thousands_separator?: string | null
          encoding?: string
          delimiter?: string
          has_header?: boolean
          sample_file?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_layouts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          }
        ]
      }
      import_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          filename: string
          id: string
          processed_records: number | null
          status: string | null
          total_records: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          processed_records?: number | null
          status?: string | null
          total_records?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          processed_records?: number | null
          status?: string | null
          total_records?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_mappings: {
        Row: {
          category_id: string
          confidence_score: number
          created_at: string
          id: string
          mapping_type: string | null
          original_description: string
          source: string
          standardized_identifier: string
          subcategory_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          confidence_score: number
          created_at?: string
          id?: string
          mapping_type?: string | null
          original_description: string
          source: string
          standardized_identifier: string
          subcategory_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          confidence_score?: number
          created_at?: string
          id?: string
          original_description?: string
          source?: string
          standardized_identifier?: string
          subcategory_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_mappings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string
          external_id: string | null
          id: string
          import_session_id: string | null
          is_recurring: boolean | null
          notes: string | null
          original_description: string | null
          payment_method: string | null
          recurring_frequency: string | null
          subcategory_id: string | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          bank_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          description: string
          external_id?: string | null
          id?: string
          import_session_id?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          original_description?: string | null
          payment_method?: string | null
          recurring_frequency?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          bank_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          external_id?: string | null
          id?: string
          import_session_id?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          original_description?: string | null
          payment_method?: string | null
          recurring_frequency?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_credit: {
        Row: {
          amount: number
          bank_id: string | null
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          date: string
          description: string
          external_id: string | null
          id: string
          import_session_id: string | null
          is_recurring: boolean | null
          notes: string | null
          original_description: string | null
          recurring_frequency: string | null
          subcategory_id: string | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          bank_id?: string | null
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          date: string
          description: string
          external_id?: string | null
          id?: string
          import_session_id?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          original_description?: string | null
          recurring_frequency?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          bank_id?: string | null
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string
          external_id?: string | null
          id?: string
          import_session_id?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          original_description?: string | null
          recurring_frequency?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_credit_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_credit_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_credit_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_credit_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_credit_import_session_id_fkey"
            columns: ["import_session_id"]
            isOneToOne: false
            referencedRelation: "import_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_credit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_charts: {
        Row: {
          category_id: string
          chart_type: Database["public"]["Enums"]["chart_type_enum"]
          color: string
          comparison_type:
            | Database["public"]["Enums"]["comparison_type_enum"]
            | null
          created_at: string
          display_order: number | null
          grouping_type: string | null
          highlight_min_max: boolean | null
          id: string
          monthly_goal: number | null
          name: string
          period_months: number
          show_percentages: boolean | null
          show_trend_line: boolean | null
          show_values_on_points: boolean | null
          subcategory_id: string | null
          transaction_type: string | null
          updated_at: string
          user_id: string
          visual_options: Json | null
        }
        Insert: {
          category_id: string
          chart_type?: Database["public"]["Enums"]["chart_type_enum"]
          color: string
          comparison_type?:
            | Database["public"]["Enums"]["comparison_type_enum"]
            | null
          created_at?: string
          display_order?: number | null
          grouping_type?: string | null
          highlight_min_max?: boolean | null
          id?: string
          monthly_goal?: number | null
          name: string
          period_months: number
          show_percentages?: boolean | null
          show_trend_line?: boolean | null
          show_values_on_points?: boolean | null
          subcategory_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          user_id: string
          visual_options?: Json | null
        }
        Update: {
          category_id?: string
          chart_type?: Database["public"]["Enums"]["chart_type_enum"]
          color?: string
          comparison_type?:
            | Database["public"]["Enums"]["comparison_type_enum"]
            | null
          created_at?: string
          display_order?: number | null
          grouping_type?: string | null
          highlight_min_max?: boolean | null
          id?: string
          monthly_goal?: number | null
          name?: string
          period_months?: number
          show_percentages?: boolean | null
          show_trend_line?: boolean | null
          show_values_on_points?: boolean | null
          subcategory_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string
          visual_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_charts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_charts_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chart_type_enum: "evolution" | "distribution" | "comparison"
      comparison_type_enum:
        | "categories_same_period"
        | "category_different_periods"
        | "subcategories"
      credit_card_brand:
        | "visa"
        | "mastercard"
        | "hipercard"
        | "american_express"
        | "elo"
        | "outra_bandeira"
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
      chart_type_enum: ["evolution", "distribution", "comparison"],
      comparison_type_enum: [
        "categories_same_period",
        "category_different_periods",
        "subcategories",
      ],
      credit_card_brand: [
        "visa",
        "mastercard",
        "hipercard",
        "american_express",
        "elo",
        "outra_bandeira"
      ],
    },
  },
} as const

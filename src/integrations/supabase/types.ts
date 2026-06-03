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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          criado_em: string
          id: number
          payload: Json | null
          registro_id: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          id?: number
          payload?: Json | null
          registro_id: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          id?: number
          payload?: Json | null
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      fazendas: {
        Row: {
          area_ha: number
          atualizado_em: string
          car: string | null
          criado_em: string
          criado_por: string | null
          id: string
          local: string | null
          nome: string
          observacoes: string | null
          proprietario: string | null
          status: Database["public"]["Enums"]["fazenda_status"]
        }
        Insert: {
          area_ha?: number
          atualizado_em?: string
          car?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          local?: string | null
          nome: string
          observacoes?: string | null
          proprietario?: string | null
          status?: Database["public"]["Enums"]["fazenda_status"]
        }
        Update: {
          area_ha?: number
          atualizado_em?: string
          car?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          local?: string | null
          nome?: string
          observacoes?: string | null
          proprietario?: string | null
          status?: Database["public"]["Enums"]["fazenda_status"]
        }
        Relationships: []
      }
      inventario_parcelas: {
        Row: {
          altura_media_m: number | null
          area_m2: number
          arvores_por_ha: number | null
          criado_em: string
          dap_medio_cm: number | null
          data: string
          fotos: string[] | null
          id: string
          numero: string
          observacoes: string | null
          qtd_arvores: number
          responsavel_id: string | null
          talhao_id: string
          volume_arvore_m3: number | null
        }
        Insert: {
          altura_media_m?: number | null
          area_m2: number
          arvores_por_ha?: number | null
          criado_em?: string
          dap_medio_cm?: number | null
          data?: string
          fotos?: string[] | null
          id?: string
          numero: string
          observacoes?: string | null
          qtd_arvores: number
          responsavel_id?: string | null
          talhao_id: string
          volume_arvore_m3?: number | null
        }
        Update: {
          altura_media_m?: number | null
          area_m2?: number
          arvores_por_ha?: number | null
          criado_em?: string
          dap_medio_cm?: number | null
          data?: string
          fotos?: string[] | null
          id?: string
          numero?: string
          observacoes?: string | null
          qtd_arvores?: number
          responsavel_id?: string | null
          talhao_id?: string
          volume_arvore_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_parcelas_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      talhoes: {
        Row: {
          ano_plantio: number | null
          area_ha: number
          atualizado_em: string
          codigo: string
          criado_em: string
          criado_por: string | null
          espacamento: string | null
          especie: string
          fazenda_id: string
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["talhao_status"]
          volume_estimado_m3: number
        }
        Insert: {
          ano_plantio?: number | null
          area_ha?: number
          atualizado_em?: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          espacamento?: string | null
          especie: string
          fazenda_id: string
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["talhao_status"]
          volume_estimado_m3?: number
        }
        Update: {
          ano_plantio?: number | null
          area_ha?: number
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          espacamento?: string | null
          especie?: string
          fazenda_id?: string
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["talhao_status"]
          volume_estimado_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "talhoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
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
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "campo"
        | "patio"
        | "serraria"
        | "comercial"
      fazenda_status: "ativa" | "inativa" | "manejo"
      talhao_status:
        | "em_crescimento"
        | "pronto_corte"
        | "em_corte"
        | "cortado"
        | "finalizado"
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
      app_role: ["admin", "gestor", "campo", "patio", "serraria", "comercial"],
      fazenda_status: ["ativa", "inativa", "manejo"],
      talhao_status: [
        "em_crescimento",
        "pronto_corte",
        "em_corte",
        "cortado",
        "finalizado",
      ],
    },
  },
} as const

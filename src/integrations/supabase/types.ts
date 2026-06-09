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
      cargas: {
        Row: {
          atualizado_em: string
          codigo: string
          criado_em: string
          criado_por: string | null
          data_recebimento: string | null
          data_saida: string
          fotos: string[]
          gps_origem: string | null
          id: string
          motorista: string | null
          observacoes: string | null
          ordem_colheita_id: string
          placa_veiculo: string | null
          qtd_toras: number
          status: Database["public"]["Enums"]["carga_status"]
          volume_carregado_m3: number
        }
        Insert: {
          atualizado_em?: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          data_recebimento?: string | null
          data_saida?: string
          fotos?: string[]
          gps_origem?: string | null
          id?: string
          motorista?: string | null
          observacoes?: string | null
          ordem_colheita_id: string
          placa_veiculo?: string | null
          qtd_toras?: number
          status?: Database["public"]["Enums"]["carga_status"]
          volume_carregado_m3?: number
        }
        Update: {
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data_recebimento?: string | null
          data_saida?: string
          fotos?: string[]
          gps_origem?: string | null
          id?: string
          motorista?: string | null
          observacoes?: string | null
          ordem_colheita_id?: string
          placa_veiculo?: string | null
          qtd_toras?: number
          status?: Database["public"]["Enums"]["carga_status"]
          volume_carregado_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "cargas_ordem_colheita_id_fkey"
            columns: ["ordem_colheita_id"]
            isOneToOne: false
            referencedRelation: "ordens_colheita"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cidade: string | null
          criado_em: string
          criado_por: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          limite_credito: number
          nome: string
          observacoes: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cidade?: string | null
          criado_em?: string
          criado_por?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome: string
          observacoes?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cidade?: string | null
          criado_em?: string
          criado_por?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      codigos_seq: {
        Row: {
          ano: number
          prefixo: string
          ultimo: number
        }
        Insert: {
          ano: number
          prefixo: string
          ultimo?: number
        }
        Update: {
          ano?: number
          prefixo?: string
          ultimo?: number
        }
        Relationships: []
      }
      divergencias: {
        Row: {
          carga_id: string | null
          codigo: string
          criado_em: string
          descricao: string
          diferenca: number | null
          id: string
          justificativa: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: Database["public"]["Enums"]["divergencia_status"]
          tipo: string
        }
        Insert: {
          carga_id?: string | null
          codigo: string
          criado_em?: string
          descricao: string
          diferenca?: number | null
          id?: string
          justificativa?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["divergencia_status"]
          tipo: string
        }
        Update: {
          carga_id?: string | null
          codigo?: string
          criado_em?: string
          descricao?: string
          diferenca?: number | null
          id?: string
          justificativa?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["divergencia_status"]
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "divergencias_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
        ]
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
      lotes_patio: {
        Row: {
          atualizado_em: string
          carga_id: string | null
          codigo: string
          criado_em: string
          especie: string | null
          id: string
          localizacao: string | null
          qtd_toras: number
          status: Database["public"]["Enums"]["lote_status"]
          talhao_id: string | null
          volume_m3: number
        }
        Insert: {
          atualizado_em?: string
          carga_id?: string | null
          codigo: string
          criado_em?: string
          especie?: string | null
          id?: string
          localizacao?: string | null
          qtd_toras?: number
          status?: Database["public"]["Enums"]["lote_status"]
          talhao_id?: string | null
          volume_m3?: number
        }
        Update: {
          atualizado_em?: string
          carga_id?: string | null
          codigo?: string
          criado_em?: string
          especie?: string | null
          id?: string
          localizacao?: string | null
          qtd_toras?: number
          status?: Database["public"]["Enums"]["lote_status"]
          talhao_id?: string | null
          volume_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "lotes_patio_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_patio_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          criado_em: string
          destino: string | null
          id: string
          lote_patio_id: string | null
          observacoes: string | null
          origem: string | null
          responsavel_id: string | null
          tipo: string
          volume_m3: number
        }
        Insert: {
          criado_em?: string
          destino?: string | null
          id?: string
          lote_patio_id?: string | null
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          tipo: string
          volume_m3?: number
        }
        Update: {
          criado_em?: string
          destino?: string | null
          id?: string
          lote_patio_id?: string | null
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          tipo?: string
          volume_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_lote_patio_id_fkey"
            columns: ["lote_patio_id"]
            isOneToOne: false
            referencedRelation: "lotes_patio"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_colheita: {
        Row: {
          atualizado_em: string
          codigo: string
          criado_em: string
          criado_por: string | null
          data_abertura: string
          data_conclusao: string | null
          id: string
          observacoes: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["oc_status"]
          talhao_id: string
          volume_colhido_m3: number
          volume_previsto_m3: number
        }
        Insert: {
          atualizado_em?: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["oc_status"]
          talhao_id: string
          volume_colhido_m3?: number
          volume_previsto_m3?: number
        }
        Update: {
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["oc_status"]
          talhao_id?: string
          volume_colhido_m3?: number
          volume_previsto_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_colheita_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          atualizado_em: string
          codigo: string
          criado_em: string
          data_abertura: string
          data_conclusao: string | null
          id: string
          lote_patio_id: string
          observacoes: string | null
          rendimento_pct: number | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["op_status"]
          volume_entrada_m3: number
          volume_perda_m3: number
          volume_produzido_m3: number
        }
        Insert: {
          atualizado_em?: string
          codigo: string
          criado_em?: string
          data_abertura?: string
          data_conclusao?: string | null
          id?: string
          lote_patio_id: string
          observacoes?: string | null
          rendimento_pct?: number | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["op_status"]
          volume_entrada_m3?: number
          volume_perda_m3?: number
          volume_produzido_m3?: number
        }
        Update: {
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          data_abertura?: string
          data_conclusao?: string | null
          id?: string
          lote_patio_id?: string
          observacoes?: string | null
          rendimento_pct?: number | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["op_status"]
          volume_entrada_m3?: number
          volume_perda_m3?: number
          volume_produzido_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_lote_patio_id_fkey"
            columns: ["lote_patio_id"]
            isOneToOne: false
            referencedRelation: "lotes_patio"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          atualizado_em: string
          cliente_id: string
          codigo: string
          criado_em: string
          criado_por: string | null
          data: string
          descricao: string | null
          id: string
          observacoes: string | null
          pagamento: string | null
          qtd_itens: number
          status: string
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          pagamento?: string | null
          qtd_itens?: number
          status?: string
          valor_total?: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          pagamento?: string | null
          qtd_itens?: number
          status?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_acabados: {
        Row: {
          codigo: string
          criado_em: string
          descricao: string
          dimensoes: string | null
          id: string
          ordem_producao_id: string
          qtd_pecas: number
          status: string
          volume_m3: number
        }
        Insert: {
          codigo: string
          criado_em?: string
          descricao: string
          dimensoes?: string | null
          id?: string
          ordem_producao_id: string
          qtd_pecas?: number
          status?: string
          volume_m3?: number
        }
        Update: {
          codigo?: string
          criado_em?: string
          descricao?: string
          dimensoes?: string | null
          id?: string
          ordem_producao_id?: string
          qtd_pecas?: number
          status?: string
          volume_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_acabados_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
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
      recebimentos_patio: {
        Row: {
          carga_id: string
          conferente_id: string | null
          criado_em: string
          data: string
          divergencia_toras: number
          divergencia_volume_m3: number
          fotos: string[]
          id: string
          observacoes: string | null
          qtd_toras_recebida: number
          volume_recebido_m3: number
        }
        Insert: {
          carga_id: string
          conferente_id?: string | null
          criado_em?: string
          data?: string
          divergencia_toras?: number
          divergencia_volume_m3?: number
          fotos?: string[]
          id?: string
          observacoes?: string | null
          qtd_toras_recebida?: number
          volume_recebido_m3?: number
        }
        Update: {
          carga_id?: string
          conferente_id?: string | null
          criado_em?: string
          data?: string
          divergencia_toras?: number
          divergencia_volume_m3?: number
          fotos?: string[]
          id?: string
          observacoes?: string | null
          qtd_toras_recebida?: number
          volume_recebido_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_patio_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: true
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
        ]
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
      proximo_codigo: { Args: { _prefixo: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "campo"
        | "patio"
        | "serraria"
        | "comercial"
      carga_status: "em_transito" | "recebida" | "divergente" | "cancelada"
      divergencia_status: "aberta" | "justificada" | "resolvida"
      fazenda_status: "ativa" | "inativa" | "manejo"
      lote_status: "disponivel" | "em_producao" | "consumido"
      oc_status: "aberta" | "em_execucao" | "concluida" | "cancelada"
      op_status: "aberta" | "em_execucao" | "concluida" | "cancelada"
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
      carga_status: ["em_transito", "recebida", "divergente", "cancelada"],
      divergencia_status: ["aberta", "justificada", "resolvida"],
      fazenda_status: ["ativa", "inativa", "manejo"],
      lote_status: ["disponivel", "em_producao", "consumido"],
      oc_status: ["aberta", "em_execucao", "concluida", "cancelada"],
      op_status: ["aberta", "em_execucao", "concluida", "cancelada"],
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

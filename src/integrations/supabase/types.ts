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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          ano: number | null
          anotacoes: string | null
          created_at: string
          data_conclusao: string | null
          data_inicio: string
          descricao: string | null
          feedback_coordenador: string | null
          id: string
          mes: number | null
          nome_atividade: string
          nucleo_id: string
          semana: number | null
          status: Database["public"]["Enums"]["atividade_status"]
          turma_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: number | null
          anotacoes?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio: string
          descricao?: string | null
          feedback_coordenador?: string | null
          id?: string
          mes?: number | null
          nome_atividade: string
          nucleo_id: string
          semana?: number | null
          status?: Database["public"]["Enums"]["atividade_status"]
          turma_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number | null
          anotacoes?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string
          descricao?: string | null
          feedback_coordenador?: string | null
          id?: string
          mes?: number | null
          nome_atividade?: string
          nucleo_id?: string
          semana?: number | null
          status?: Database["public"]["Enums"]["atividade_status"]
          turma_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiarios: {
        Row: {
          altura: number | null
          ativo: boolean
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          id: string
          idade: number | null
          imc: number | null
          modalidade: string
          nome: string
          nucleo_id: string
          peso: number | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          sexo: string | null
          turma_id: string | null
        }
        Insert: {
          altura?: number | null
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          idade?: number | null
          imc?: number | null
          modalidade?: string
          nome: string
          nucleo_id: string
          peso?: number | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          sexo?: string | null
          turma_id?: string | null
        }
        Update: {
          altura?: number | null
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          idade?: number | null
          imc?: number | null
          modalidade?: string
          nome?: string
          nucleo_id?: string
          peso?: number | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          sexo?: string | null
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiarios_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_beneficiarios: {
        Row: {
          beneficiario_id: string
          created_at: string
          id: string
          nome_arquivo: string
          tipo: string
          uploaded_by: string
          url: string
        }
        Insert: {
          beneficiario_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tipo?: string
          uploaded_by: string
          url: string
        }
        Update: {
          beneficiario_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tipo?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_beneficiarios_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_documentos: {
        Row: {
          id: string
          tipo: Database["public"]["Enums"]["envio_tipo"]
          nucleo_id: string
          turma_id: string | null
          mes: number
          ano: number
          status: Database["public"]["Enums"]["envio_status"]
          enviado_por: string
          revisado_por: string | null
          justificativa: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo: Database["public"]["Enums"]["envio_tipo"]
          nucleo_id: string
          turma_id?: string | null
          mes: number
          ano: number
          status?: Database["public"]["Enums"]["envio_status"]
          enviado_por: string
          revisado_por?: string | null
          justificativa?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tipo?: Database["public"]["Enums"]["envio_tipo"]
          nucleo_id?: string
          turma_id?: string | null
          mes?: number
          ano?: number
          status?: Database["public"]["Enums"]["envio_status"]
          enviado_por?: string
          revisado_por?: string | null
          justificativa?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "envios_documentos_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_documentos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_historico: {
        Row: {
          id: string
          envio_id: string
          acao: Database["public"]["Enums"]["envio_status"]
          realizado_por: string
          justificativa: string | null
          created_at: string
        }
        Insert: {
          id?: string
          envio_id: string
          acao: Database["public"]["Enums"]["envio_status"]
          realizado_por: string
          justificativa?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          envio_id?: string
          acao?: Database["public"]["Enums"]["envio_status"]
          realizado_por?: string
          justificativa?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "envios_historico_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envios_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          created_at: string
          estoque_minimo: number | null
          foto_url: string | null
          id: string
          item: string
          nucleo_id: string
          quantidade: number
          unidade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          item: string
          nucleo_id: string
          quantidade?: number
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          item?: string
          nucleo_id?: string
          quantidade?: number
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          nucleo_id: string
          turma_id: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          nucleo_id: string
          turma_id?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          nucleo_id?: string
          turma_id?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          estoque_id: string
          id: string
          observacao: string | null
          quantidade: number
          registrado_por: string
          tipo: string
        }
        Insert: {
          created_at?: string
          estoque_id: string
          id?: string
          observacao?: string | null
          quantidade: number
          registrado_por: string
          tipo: string
        }
        Update: {
          created_at?: string
          estoque_id?: string
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      nucleos: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      presencas: {
        Row: {
          beneficiario_id: string
          created_at: string
          data: string
          id: string
          presente: boolean
          registrado_por: string
          turma_id: string
        }
        Insert: {
          beneficiario_id: string
          created_at?: string
          data: string
          id?: string
          presente?: boolean
          registrado_por: string
          turma_id: string
        }
        Update: {
          beneficiario_id?: string
          created_at?: string
          data?: string
          id?: string
          presente?: boolean
          registrado_por?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presencas_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      relatorios_fotograficos: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          nome_arquivo: string
          total_fotos: number
          url: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          nome_arquivo: string
          total_fotos?: number
          url: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          nome_arquivo?: string
          total_fotos?: number
          url?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          created_at: string
          id: string
          modalidade: string
          nome: string
          nucleo_id: string
          turno: string
        }
        Insert: {
          created_at?: string
          id?: string
          modalidade?: string
          nome: string
          nucleo_id: string
          turno: string
        }
        Update: {
          created_at?: string
          id?: string
          modalidade?: string
          nome?: string
          nucleo_id?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "coordenador" | "professor" | "monitor" | "coordenador_geral"
      atividade_status: "pendente" | "aprovada" | "correcao_solicitada"
      envio_status: "enviado" | "em_analise" | "aprovado" | "devolvido" | "reenviado"
      envio_tipo: "chamada" | "relatorio_fotografico"
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
      app_role: ["coordenador", "professor", "monitor", "coordenador_geral"],
      atividade_status: ["pendente", "aprovada", "correcao_solicitada"],
      envio_status: ["enviado", "em_analise", "aprovado", "devolvido", "reenviado"],
      envio_tipo: ["chamada", "relatorio_fotografico"],
    },
  },
} as const

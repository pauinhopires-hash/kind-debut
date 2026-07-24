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
      config_sistema: {
        Row: {
          chave: string
          valor: string
        }
        Insert: {
          chave: string
          valor: string
        }
        Update: {
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      estoque_atual: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          id: string
          local: string
          produto_id: string
          quantidade: number | null
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          id?: string
          local?: string
          produto_id: string
          quantidade?: number | null
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          id?: string
          local?: string
          produto_id?: string
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_atual_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "estoque_atual_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_atual_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome_empresa: string
          whatsapp: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome_empresa: string
          whatsapp: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome_empresa?: string
          whatsapp?: string
        }
        Relationships: []
      }
      funcoes: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      locais: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          estoque_antes: number
          estoque_depois: number
          id: string
          local: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          requisicao_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          estoque_antes: number
          estoque_depois: number
          id?: string
          local?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          requisicao_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          estoque_antes?: number
          estoque_depois?: number
          id?: string
          local?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          requisicao_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_internas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          concluido_em: string | null
          criado_em: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          observacao: string | null
          quantidade_planejada: number
          quantidade_produzida: number | null
          receita_id: string
          status: string
          usuario_id: string | null
        }
        Insert: {
          concluido_em?: string | null
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          quantidade_planejada: number
          quantidade_produzida?: number | null
          receita_id: string
          status?: string
          usuario_id?: string | null
        }
        Update: {
          concluido_em?: string | null
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          quantidade_planejada?: number
          quantidade_produzida?: number | null
          receita_id?: string
          status?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ordens_producao_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ordens_producao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          criado_em: string | null
          id: string
          nome: string
          slug: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          nome: string
          slug: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      produto_fornecedores: {
        Row: {
          criado_em: string
          fornecedor_id: string
          id: string
          produto_id: string
        }
        Insert: {
          criado_em?: string
          fornecedor_id: string
          id?: string
          produto_id: string
        }
        Update: {
          criado_em?: string
          fornecedor_id?: string
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_funcoes: {
        Row: {
          criado_em: string
          funcao_id: string
          id: string
          produto_id: string
        }
        Insert: {
          criado_em?: string
          funcao_id: string
          id?: string
          produto_id: string
        }
        Update: {
          criado_em?: string
          funcao_id?: string
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_funcoes_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_funcoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          estoque_minimo: number
          grupo: string | null
          id: string
          local: string | null
          nome: string
          perfil_id: string | null
          setor: string | null
          subgrupo: string | null
          unidade: string
          valor_unitario: number | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          estoque_minimo?: number
          grupo?: string | null
          id?: string
          local?: string | null
          nome: string
          perfil_id?: string | null
          setor?: string | null
          subgrupo?: string | null
          unidade: string
          valor_unitario?: number | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          estoque_minimo?: number
          grupo?: string | null
          id?: string
          local?: string | null
          nome?: string
          perfil_id?: string | null
          setor?: string | null
          subgrupo?: string | null
          unidade?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          criado_em: string
          endpoint: string
          id: string
          p256dh: string
          usuario_id: string
        }
        Insert: {
          auth: string
          criado_em?: string
          endpoint: string
          id?: string
          p256dh: string
          usuario_id: string
        }
        Update: {
          auth?: string
          criado_em?: string
          endpoint?: string
          id?: string
          p256dh?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      receita_itens: {
        Row: {
          id: string
          insumo_id: string
          quantidade: number
          receita_id: string
          unidade: string | null
        }
        Insert: {
          id?: string
          insumo_id: string
          quantidade: number
          receita_id: string
          unidade?: string | null
        }
        Update: {
          id?: string
          insumo_id?: string
          quantidade?: number
          receita_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receita_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          ativo: boolean
          criado_em: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          produto_id: string
          rendimento: number
          status: string
          unidade_rendimento: string
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          produto_id: string
          rendimento: number
          status?: string
          unidade_rendimento?: string
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          produto_id?: string
          rendimento?: number
          status?: string
          unidade_rendimento?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receitas_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "receitas_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "receitas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicao_interna_itens: {
        Row: {
          created_at: string
          id: string
          produto_id: string
          quantidade: number
          requisicao_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produto_id: string
          quantidade: number
          requisicao_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          requisicao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicao_interna_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicao_interna_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_internas"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicao_itens: {
        Row: {
          comprado: boolean
          comprado_em: string | null
          criado_em: string | null
          id: string
          nome_custom: string | null
          observacao: string | null
          produto_id: string | null
          quantidade: number
          requisicao_id: string
          unidade: string | null
        }
        Insert: {
          comprado?: boolean
          comprado_em?: string | null
          criado_em?: string | null
          id?: string
          nome_custom?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade: number
          requisicao_id: string
          unidade?: string | null
        }
        Update: {
          comprado?: boolean
          comprado_em?: string | null
          criado_em?: string | null
          id?: string
          nome_custom?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number
          requisicao_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisicao_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicao_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes: {
        Row: {
          created_at: string | null
          decidido_em: string | null
          decidido_por: string | null
          id: string
          numero: number
          observacao: string | null
          perfil_id: string
          status: string | null
          tipo: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          numero?: number
          observacao?: string | null
          perfil_id: string
          status?: string | null
          tipo?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          numero?: number
          observacao?: string | null
          perfil_id?: string
          status?: string | null
          tipo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisicoes_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisicoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes_internas: {
        Row: {
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          observacao: string | null
          status: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_internas_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisicoes_internas_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_internas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisicoes_internas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          email: string
          funcao_id: string | null
          id: string
          nome: string
          perfil_id: string | null
          ve_todos_setores: boolean
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          email: string
          funcao_id?: string | null
          id: string
          nome: string
          perfil_id?: string | null
          ve_todos_setores?: boolean
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          email?: string
          funcao_id?: string | null
          id?: string
          nome?: string
          perfil_id?: string | null
          ve_todos_setores?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_roles: {
        Row: {
          role: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_meu_perfil_id: { Args: never; Returns: string }
      get_meu_perfil_slug: { Args: never; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      import_estoque_rows: {
        Args: {
          p_rows: Json
          p_usuario_id: string
          p_zerar_local?: string
          p_zerar_produto_ids?: string[]
        }
        Returns: Json
      }
      meu_ve_todos_setores: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

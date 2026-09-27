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
          atualizado_em: string
          chave: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          chave: string
          valor: Json
        }
        Update: {
          atualizado_em?: string
          chave?: string
          valor?: Json
        }
        Relationships: []
      }
      estoque_atual: {
        Row: {
          atualizado_em: string
          local: string
          produto_id: string
          quantidade: number
        }
        Insert: {
          atualizado_em?: string
          local?: string
          produto_id: string
          quantidade?: number
        }
        Update: {
          atualizado_em?: string
          local?: string
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
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
          created_at: string
          id: string
          nome_empresa: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_empresa: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_empresa?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      funcionario_pins: {
        Row: {
          created_at: string
          funcionario_id: string
          pin: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          pin: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          pin?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_pins_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          created_at: string
          funcao: string | null
          id: string
          login_email: string
          nome: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao?: string | null
          id?: string
          login_email: string
          nome: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string | null
          id?: string
          login_email?: string
          nome?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      locais: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
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
          local: string
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
          local?: string
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
          local?: string
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
            foreignKeyName: "movimentacoes_estoque_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          id: string
          nome: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          slug?: string | null
        }
        Relationships: []
      }
      produto_fornecedores: {
        Row: {
          created_at: string
          fornecedor_id: string
          produto_id: string
        }
        Insert: {
          created_at?: string
          fornecedor_id: string
          produto_id: string
        }
        Update: {
          created_at?: string
          fornecedor_id?: string
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
          created_at: string
          funcao_id: string
          produto_id: string
        }
        Insert: {
          created_at?: string
          funcao_id: string
          produto_id: string
        }
        Update: {
          created_at?: string
          funcao_id?: string
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
          ativo: boolean
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          estoque_minimo: number
          grupo: string | null
          id: string
          local: string | null
          nome: string
          perfil_id: string | null
          setor: string | null
          status: string
          subgrupo: string | null
          sugerido_por: string | null
          unidade: string
          valor_unitario: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          estoque_minimo?: number
          grupo?: string | null
          id?: string
          local?: string | null
          nome: string
          perfil_id?: string | null
          setor?: string | null
          status?: string
          subgrupo?: string | null
          sugerido_por?: string | null
          unidade?: string
          valor_unitario?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          estoque_minimo?: number
          grupo?: string | null
          id?: string
          local?: string | null
          nome?: string
          perfil_id?: string | null
          setor?: string | null
          status?: string
          subgrupo?: string | null
          sugerido_por?: string | null
          unidade?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_sugerido_por_fkey"
            columns: ["sugerido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          usuario_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          usuario_id: string
        }
        Update: {
          auth?: string
          created_at?: string
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
          unidade: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          produto_id: string
          quantidade: number
          requisicao_id: string
          unidade?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          requisicao_id?: string
          unidade?: string | null
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
          created_at: string
          excluido: boolean
          id: string
          nome_custom: string | null
          produto_id: string
          quantidade: number
          requisicao_id: string
          unidade: string | null
        }
        Insert: {
          comprado?: boolean
          comprado_em?: string | null
          created_at?: string
          excluido?: boolean
          id?: string
          nome_custom?: string | null
          produto_id: string
          quantidade: number
          requisicao_id: string
          unidade?: string | null
        }
        Update: {
          comprado?: boolean
          comprado_em?: string | null
          created_at?: string
          excluido?: boolean
          id?: string
          nome_custom?: string | null
          produto_id?: string
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
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          observacao: string | null
          perfil_id: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          perfil_id?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          perfil_id?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: [
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
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
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
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          funcao_id: string | null
          id: string
          nome: string
          perfil_id: string | null
          ve_todos_setores: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          funcao_id?: string | null
          id: string
          nome: string
          perfil_id?: string | null
          ve_todos_setores?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
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
      [_ in never]: never
    }
    Functions: {
      current_user_perfil_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "usuario"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "usuario"],
    },
  },
} as const

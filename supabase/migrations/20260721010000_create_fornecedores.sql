-- Cadastro de fornecedores (nome + WhatsApp editável) vinculado a produtos
-- (muitos-pra-muitos: um produto pode ter vários fornecedores, um
-- fornecedor pode vender vários produtos). Base pra uma ideia futura de
-- pedir cotação via WhatsApp — não construída ainda, deliberadamente.
-- Aplicado via Supabase MCP em 2026-07-21.

CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  whatsapp text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.produto_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, fornecedor_id)
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_fornecedores ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de produtos/receitas: admin escreve, autenticado só lê.
CREATE POLICY "fornecedores_admin_total" ON public.fornecedores
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "fornecedores_leitura" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "produto_fornecedores_admin_total" ON public.produto_fornecedores
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "produto_fornecedores_leitura" ON public.produto_fornecedores
  FOR SELECT TO authenticated USING (true);

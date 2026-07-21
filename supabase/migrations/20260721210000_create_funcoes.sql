-- Funções editáveis por produto (muitos-pra-muitos), substituindo o campo
-- fixo produtos.setor (hardcoded no código como COZINHA/ESTOQUE CENTRAL/
-- FRENTE). produtos.setor é mantido intacto por enquanto (não lido/escrito
-- pelo app depois desta migration) — não é uma migração destrutiva.
-- Aplicado via Supabase MCP em 2026-07-21.

CREATE TABLE public.funcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.produto_funcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, funcao_id)
);

ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_funcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funcoes_admin_total" ON public.funcoes
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "funcoes_leitura" ON public.funcoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "produto_funcoes_admin_total" ON public.produto_funcoes
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "produto_funcoes_leitura" ON public.produto_funcoes
  FOR SELECT TO authenticated USING (true);

-- Seed com os 3 valores hoje hardcoded no código.
INSERT INTO public.funcoes (nome) VALUES ('COZINHA'), ('ESTOQUE CENTRAL'), ('FRENTE');

-- Backfill: cada produto com setor preenchido ganha o vínculo correspondente.
INSERT INTO public.produto_funcoes (produto_id, funcao_id)
SELECT p.id, f.id
FROM public.produtos p
JOIN public.funcoes f ON f.nome = p.setor
WHERE p.setor IS NOT NULL
ON CONFLICT DO NOTHING;

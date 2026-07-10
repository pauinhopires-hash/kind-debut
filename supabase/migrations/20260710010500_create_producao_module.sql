-- Fase 4 do plano do fluxograma: módulo de Produção (fichas técnicas +
-- ordens de produção), que consome insumos do estoque e gera produto pronto.
-- Aplicado via Supabase MCP (apply_migration) em 2026-07-10.

CREATE TABLE public.receitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  rendimento numeric NOT NULL CHECK (rendimento > 0),
  unidade_rendimento text NOT NULL DEFAULT 'UND',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receita_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receita_id uuid NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  unidade text
);

CREATE TABLE public.ordens_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receita_id uuid NOT NULL REFERENCES public.receitas(id),
  quantidade_planejada numeric NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_produzida numeric,
  status text NOT NULL DEFAULT 'planejada'
    CHECK (status = ANY (ARRAY['planejada'::text, 'em_producao'::text, 'concluida'::text, 'cancelada'::text])),
  usuario_id uuid REFERENCES public.usuarios(id),
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de produtos/estoque_atual: admin tem controle total,
-- demais usuários autenticados só leem.
CREATE POLICY "receitas_admin_total" ON public.receitas
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "receitas_leitura" ON public.receitas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "receita_itens_admin_total" ON public.receita_itens
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "receita_itens_leitura" ON public.receita_itens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ordens_producao_admin_total" ON public.ordens_producao
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');
CREATE POLICY "ordens_producao_leitura" ON public.ordens_producao
  FOR SELECT TO authenticated USING (true);

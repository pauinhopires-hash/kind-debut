-- ============ LOCAIS ============
CREATE TABLE IF NOT EXISTS public.locais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locais TO authenticated;
GRANT ALL ON public.locais TO service_role;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
CREATE POLICY locais_select_auth ON public.locais FOR SELECT TO authenticated USING (true);
CREATE POLICY locais_admin_insert ON public.locais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY locais_admin_update ON public.locais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY locais_admin_delete ON public.locais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
GRANT INSERT, UPDATE, DELETE ON public.locais TO authenticated;
INSERT INTO public.locais (nome) VALUES ('ESTOQUE CENTRAL') ON CONFLICT (nome) DO NOTHING;

-- ============ ESTOQUE POR LOCAL ============
ALTER TABLE public.estoque_atual ADD COLUMN IF NOT EXISTS local text NOT NULL DEFAULT 'ESTOQUE CENTRAL';
ALTER TABLE public.estoque_atual DROP CONSTRAINT IF EXISTS estoque_atual_pkey;
ALTER TABLE public.estoque_atual ADD CONSTRAINT estoque_atual_pkey PRIMARY KEY (produto_id, local);

ALTER TABLE public.movimentacoes_estoque ADD COLUMN IF NOT EXISTS local text NOT NULL DEFAULT 'ESTOQUE CENTRAL';

-- ============ FUNCOES ============
CREATE TABLE IF NOT EXISTS public.funcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcoes TO authenticated;
GRANT ALL ON public.funcoes TO service_role;
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY funcoes_select_auth ON public.funcoes FOR SELECT TO authenticated USING (true);
CREATE POLICY funcoes_admin_insert ON public.funcoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcoes_admin_update ON public.funcoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcoes_admin_delete ON public.funcoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.produto_funcoes (
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  funcao_id uuid NOT NULL REFERENCES public.funcoes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (produto_id, funcao_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_funcoes TO authenticated;
GRANT ALL ON public.produto_funcoes TO service_role;
ALTER TABLE public.produto_funcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pf_select_auth ON public.produto_funcoes FOR SELECT TO authenticated USING (true);
CREATE POLICY pf_admin_insert ON public.produto_funcoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY pf_admin_update ON public.produto_funcoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY pf_admin_delete ON public.produto_funcoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ USUARIOS ============
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS funcao_id uuid REFERENCES public.funcoes(id) ON DELETE SET NULL;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ve_todos_setores boolean NOT NULL DEFAULT true;

-- ============ PRODUTOS ============
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovado';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS sugerido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS decidido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS decidido_em timestamp with time zone;

-- ============ PERFIS ============
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.perfis SET slug = lower(regexp_replace(unaccent_nome, '[^a-z0-9]+', '-', 'g'))
FROM (SELECT id AS pid, lower(nome) AS unaccent_nome FROM public.perfis) s
WHERE public.perfis.id = s.pid AND public.perfis.slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS perfis_slug_key ON public.perfis (slug);

-- ============ REQUISICOES ============
ALTER TABLE public.requisicoes ADD COLUMN IF NOT EXISTS decidido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.requisicoes_internas ADD COLUMN IF NOT EXISTS decidido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- ============ FORNECEDORES ============
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  whatsapp text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY forn_select_auth ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY forn_admin_insert ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY forn_admin_update ON public.fornecedores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY forn_admin_delete ON public.fornecedores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.produto_fornecedores (
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (produto_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedores TO authenticated;
GRANT ALL ON public.produto_fornecedores TO service_role;
ALTER TABLE public.produto_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY prfo_select_auth ON public.produto_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY prfo_admin_insert ON public.produto_fornecedores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY prfo_admin_update ON public.produto_fornecedores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY prfo_admin_delete ON public.produto_fornecedores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

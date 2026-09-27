
-- Perfis (roles)
CREATE TABLE public.perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Usuarios (linked to auth.users)
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  perfil_id uuid REFERENCES public.perfis(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Produtos
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade text NOT NULL DEFAULT 'un',
  perfil_id uuid REFERENCES public.perfis(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Estoque atual
CREATE TABLE public.estoque_atual (
  produto_id uuid PRIMARY KEY REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Requisicoes
CREATE TABLE public.requisicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  perfil_id uuid REFERENCES public.perfis(id),
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Requisicao itens
CREATE TABLE public.requisicao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.requisicoes(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Config sistema
CREATE TABLE public.config_sistema (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Helper function: get current user's perfil_id (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.current_user_perfil_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT perfil_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- Enable RLS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_atual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisicao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- perfis: authenticated can read
CREATE POLICY "perfis_select_auth" ON public.perfis FOR SELECT TO authenticated USING (true);

-- usuarios: user can read own row
CREATE POLICY "usuarios_select_self" ON public.usuarios FOR SELECT TO authenticated USING (id = auth.uid());

-- produtos: user sees only products from their perfil
CREATE POLICY "produtos_select_by_perfil" ON public.produtos FOR SELECT TO authenticated
  USING (perfil_id = public.current_user_perfil_id());

-- estoque_atual: tied to products of same perfil
CREATE POLICY "estoque_select_by_perfil" ON public.estoque_atual FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = produto_id AND p.perfil_id = public.current_user_perfil_id()));

-- requisicoes: user sees own
CREATE POLICY "requisicoes_select_own" ON public.requisicoes FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "requisicoes_insert_own" ON public.requisicoes FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "requisicoes_update_own" ON public.requisicoes FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- requisicao_itens: linked to own requisicao
CREATE POLICY "req_itens_select_own" ON public.requisicao_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requisicoes r WHERE r.id = requisicao_id AND r.usuario_id = auth.uid()));
CREATE POLICY "req_itens_insert_own" ON public.requisicao_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.requisicoes r WHERE r.id = requisicao_id AND r.usuario_id = auth.uid()));
CREATE POLICY "req_itens_delete_own" ON public.requisicao_itens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requisicoes r WHERE r.id = requisicao_id AND r.usuario_id = auth.uid()));

-- config_sistema: authenticated read
CREATE POLICY "config_select_auth" ON public.config_sistema FOR SELECT TO authenticated USING (true);

-- Trigger to auto-create usuarios row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default perfil
INSERT INTO public.perfis (nome) VALUES ('Líder'), ('Admin'), ('Gerente');

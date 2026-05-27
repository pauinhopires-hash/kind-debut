
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles_select_self_or_admin"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_insert"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_update"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_delete"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin CRUD policies em produtos
CREATE POLICY "produtos_admin_insert" ON public.produtos
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produtos_admin_update" ON public.produtos
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produtos_admin_delete" ON public.produtos
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin CRUD em estoque_atual
CREATE POLICY "estoque_admin_insert" ON public.estoque_atual
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "estoque_admin_update" ON public.estoque_atual
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "estoque_admin_delete" ON public.estoque_atual
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin: ler/atualizar usuarios e perfis
CREATE POLICY "usuarios_admin_select" ON public.usuarios
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "usuarios_admin_update" ON public.usuarios
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "perfis_admin_insert" ON public.perfis
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "perfis_admin_update" ON public.perfis
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "perfis_admin_delete" ON public.perfis
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Permitir DELETE de requisições pendentes do próprio usuário (para cancelamento via delete OU manter update)
CREATE POLICY "requisicoes_delete_own_pendente" ON public.requisicoes
FOR DELETE TO authenticated
USING (usuario_id = auth.uid() AND status = 'pendente');

-- Permitir UPDATE de itens de requisições pendentes do próprio usuário
CREATE POLICY "req_itens_update_own_pendente" ON public.requisicao_itens
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.requisicoes r WHERE r.id = requisicao_itens.requisicao_id AND r.usuario_id = auth.uid() AND r.status = 'pendente'));

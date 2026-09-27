CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND ativo = true)
$$;
REVOKE EXECUTE ON FUNCTION public.is_active_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "funcoes_select_auth" ON public.funcoes;
CREATE POLICY "funcoes_select_active" ON public.funcoes FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "perfis_select_auth" ON public.perfis;
CREATE POLICY "perfis_select_active" ON public.perfis FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "produtos_select_all_authenticated" ON public.produtos;
CREATE POLICY "produtos_select_active" ON public.produtos FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "pf_select_auth" ON public.produto_funcoes;
CREATE POLICY "pf_select_active" ON public.produto_funcoes FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "locais_select_auth" ON public.locais;
CREATE POLICY "locais_select_active" ON public.locais FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "forn_select_auth" ON public.fornecedores;
CREATE POLICY "forn_select_admin" ON public.fornecedores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "prfo_select_auth" ON public.produto_fornecedores;
CREATE POLICY "prfo_select_admin" ON public.produto_fornecedores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
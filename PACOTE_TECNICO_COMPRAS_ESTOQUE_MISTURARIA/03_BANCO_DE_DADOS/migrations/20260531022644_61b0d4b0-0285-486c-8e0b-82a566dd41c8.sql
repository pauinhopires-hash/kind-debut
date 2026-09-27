
DROP POLICY IF EXISTS produtos_select_by_perfil ON public.produtos;
CREATE POLICY produtos_select_by_perfil_or_admin ON public.produtos
  FOR SELECT TO authenticated
  USING (perfil_id = public.current_user_perfil_id() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS estoque_select_by_perfil ON public.estoque_atual;
CREATE POLICY estoque_select_by_perfil_or_admin ON public.estoque_atual
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.produtos p
      WHERE p.id = estoque_atual.produto_id
        AND p.perfil_id = public.current_user_perfil_id()
    )
  );

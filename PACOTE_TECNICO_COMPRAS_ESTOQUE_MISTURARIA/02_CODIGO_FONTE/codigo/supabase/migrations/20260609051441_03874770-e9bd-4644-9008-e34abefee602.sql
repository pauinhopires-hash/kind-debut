DROP POLICY IF EXISTS produtos_select_by_perfil_or_admin ON public.produtos;
CREATE POLICY produtos_select_all_authenticated ON public.produtos
  FOR SELECT TO authenticated USING (true);
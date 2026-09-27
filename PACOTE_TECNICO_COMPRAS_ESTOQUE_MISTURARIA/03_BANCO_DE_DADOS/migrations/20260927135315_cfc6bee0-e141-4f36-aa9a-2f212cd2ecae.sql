DROP POLICY IF EXISTS funcionarios_select_ativos ON public.funcionarios;
CREATE POLICY funcionarios_select_ativos ON public.funcionarios
  FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY funcionarios_select_admin ON public.funcionarios
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

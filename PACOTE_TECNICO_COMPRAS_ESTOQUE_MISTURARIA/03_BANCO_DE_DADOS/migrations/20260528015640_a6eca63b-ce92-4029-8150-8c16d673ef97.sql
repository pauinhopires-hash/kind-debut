
CREATE POLICY "requisicoes_admin_select" ON public.requisicoes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "requisicoes_admin_update" ON public.requisicoes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "req_itens_admin_select" ON public.requisicao_itens
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

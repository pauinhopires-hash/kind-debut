
-- 1. config_sistema: restrict SELECT to admins
DROP POLICY IF EXISTS config_select_auth ON public.config_sistema;
CREATE POLICY config_select_admin ON public.config_sistema
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. requisicoes: restrict update to pendente and forbid status changes by owner
DROP POLICY IF EXISTS requisicoes_update_own ON public.requisicoes;
CREATE POLICY requisicoes_update_own_pendente ON public.requisicoes
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() AND status = 'pendente')
  WITH CHECK (
    usuario_id = auth.uid()
    AND status = 'pendente'
  );

-- 3. Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_first_admin() FROM PUBLIC, anon, authenticated;

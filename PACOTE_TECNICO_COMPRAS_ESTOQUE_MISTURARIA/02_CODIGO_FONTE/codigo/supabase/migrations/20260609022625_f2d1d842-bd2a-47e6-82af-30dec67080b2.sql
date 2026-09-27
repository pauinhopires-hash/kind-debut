-- 1) usuarios: apenas admin pode deletar
CREATE POLICY usuarios_admin_delete ON public.usuarios
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) config_sistema: admin-only INSERT/UPDATE/DELETE explícitos
CREATE POLICY config_insert_admin ON public.config_sistema
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY config_update_admin ON public.config_sistema
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY config_delete_admin ON public.config_sistema
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) requisicoes_internas: bloquear update do dono após sair de "pendente"
DROP POLICY "own or admin update ri" ON public.requisicoes_internas;
CREATE POLICY "own or admin update ri" ON public.requisicoes_internas
  FOR UPDATE TO authenticated
  USING (
    (usuario_id = auth.uid() AND status = 'pendente')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (usuario_id = auth.uid() AND status = 'pendente')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
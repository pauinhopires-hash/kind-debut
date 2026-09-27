DROP POLICY IF EXISTS "auth insert mov" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "auth read mov" ON public.movimentacoes_estoque;

CREATE POLICY "admin insert mov" ON public.movimentacoes_estoque
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin read mov" ON public.movimentacoes_estoque
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicit restrictive policy to deny direct inserts on usuarios (table is populated via SECURITY DEFINER trigger handle_new_user)
CREATE POLICY "usuarios_no_direct_insert" ON public.usuarios
  AS RESTRICTIVE
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);
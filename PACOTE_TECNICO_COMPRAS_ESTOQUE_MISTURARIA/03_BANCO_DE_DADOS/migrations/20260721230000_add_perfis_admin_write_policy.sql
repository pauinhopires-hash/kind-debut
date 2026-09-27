-- perfis só tinha policy de leitura até aqui — nem admin conseguia
-- criar/editar perfil pela tela. Mesmo padrão de escrita usado em
-- produtos/funcoes/fornecedores. Habilita a nova tela admin.perfis.tsx.
-- Aplicado via Supabase MCP em 2026-07-21.
CREATE POLICY "perfis_admin_total" ON public.perfis
  FOR ALL TO authenticated USING (get_meu_perfil_slug() = 'admin') WITH CHECK (get_meu_perfil_slug() = 'admin');

REVOKE EXECUTE ON FUNCTION public.current_user_perfil_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_non_admin_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- has_role precisa ficar acessível para authenticated (usado em policies via auth.uid())
-- Mas policies usam-na em contexto de RLS, não chamada direta. Mantemos sem authenticated.
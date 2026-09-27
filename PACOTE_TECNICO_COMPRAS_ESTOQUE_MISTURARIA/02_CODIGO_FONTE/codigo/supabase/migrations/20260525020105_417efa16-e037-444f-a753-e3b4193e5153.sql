
REVOKE EXECUTE ON FUNCTION public.current_user_perfil_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;


CREATE OR REPLACE FUNCTION public.grant_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_first_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS usuarios_grant_first_admin ON public.usuarios;
CREATE TRIGGER usuarios_grant_first_admin
AFTER INSERT ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.grant_first_admin();

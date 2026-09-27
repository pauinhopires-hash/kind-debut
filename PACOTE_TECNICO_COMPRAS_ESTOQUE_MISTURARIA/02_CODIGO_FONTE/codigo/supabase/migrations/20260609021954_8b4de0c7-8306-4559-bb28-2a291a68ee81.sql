-- B-1: Trigger handle_new_user + grant_first_admin + backfill
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_first_admin();

-- Backfill usuarios para auth.users existentes
INSERT INTO public.usuarios (id, nome, email)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
       u.email
FROM auth.users u
LEFT JOIN public.usuarios pu ON pu.id = u.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill user_roles: garantir pelo menos um admin e role 'usuario' para o resto
DO $$
DECLARE
  has_admin boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_admin;
  IF NOT has_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'::app_role FROM auth.users ORDER BY created_at ASC LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'usuario'::app_role FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE ur.user_id IS NULL
  ON CONFLICT DO NOTHING;
END $$;
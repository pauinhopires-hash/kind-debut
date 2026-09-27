-- Funcoes e gatilhos do schema public (catalogo vivo, 2026-09-27).

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND ativo = true)
$function$;

CREATE OR REPLACE FUNCTION public.current_user_perfil_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT perfil_id FROM public.usuarios WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuarios (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_first_admin()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_non_admin_status_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status da requisicao' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE TRIGGER trg_funcionario_pins_updated BEFORE UPDATE ON public.funcionario_pins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_funcionarios_updated BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_prevent_non_admin_status_change BEFORE UPDATE ON public.requisicoes
  FOR EACH ROW EXECUTE FUNCTION prevent_non_admin_status_change();
CREATE TRIGGER trg_ri_updated BEFORE UPDATE ON public.requisicoes_internas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER usuarios_grant_first_admin AFTER INSERT ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION grant_first_admin();

-- Indices adicionais (alem dos criados por PK/UNIQUE):
CREATE INDEX idx_mov_created ON public.movimentacoes_estoque USING btree (created_at DESC);
CREATE INDEX idx_mov_produto ON public.movimentacoes_estoque USING btree (produto_id);
CREATE INDEX idx_rii_req ON public.requisicao_interna_itens USING btree (requisicao_id);

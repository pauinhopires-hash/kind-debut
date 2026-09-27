CREATE TABLE public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  nome text NOT NULL,
  funcao text,
  login_email text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.funcionarios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY funcionarios_select_ativos ON public.funcionarios
  FOR SELECT TO anon, authenticated USING (ativo = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcionarios_admin_insert ON public.funcionarios
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcionarios_admin_update ON public.funcionarios
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcionarios_admin_delete ON public.funcionarios
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_funcionarios_updated
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.funcionario_pins (
  funcionario_id uuid PRIMARY KEY REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  pin text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_pins TO authenticated;
GRANT ALL ON public.funcionario_pins TO service_role;

ALTER TABLE public.funcionario_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY funcionario_pins_admin_select ON public.funcionario_pins
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcionario_pins_admin_insert ON public.funcionario_pins
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcionario_pins_admin_update ON public.funcionario_pins
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY funcionario_pins_admin_delete ON public.funcionario_pins
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_funcionario_pins_updated
  BEFORE UPDATE ON public.funcionario_pins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

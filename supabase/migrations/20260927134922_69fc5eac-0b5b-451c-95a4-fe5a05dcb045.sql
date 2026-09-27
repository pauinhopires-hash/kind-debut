ALTER TABLE public.requisicoes ADD COLUMN IF NOT EXISTS decidido_em timestamp with time zone;
ALTER TABLE public.requisicoes_internas ADD COLUMN IF NOT EXISTS decidido_em timestamp with time zone;
ALTER TABLE public.requisicao_itens ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_select_own ON public.push_subscriptions
  FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY push_insert_own ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY push_update_own ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY push_delete_own ON public.push_subscriptions
  FOR DELETE TO authenticated USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

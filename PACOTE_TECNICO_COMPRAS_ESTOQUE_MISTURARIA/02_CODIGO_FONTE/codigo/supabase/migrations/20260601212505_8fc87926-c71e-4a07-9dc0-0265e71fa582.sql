ALTER TABLE public.requisicao_itens
  ADD COLUMN IF NOT EXISTS comprado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comprado_em timestamptz;

CREATE POLICY "req_itens_admin_update"
ON public.requisicao_itens
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
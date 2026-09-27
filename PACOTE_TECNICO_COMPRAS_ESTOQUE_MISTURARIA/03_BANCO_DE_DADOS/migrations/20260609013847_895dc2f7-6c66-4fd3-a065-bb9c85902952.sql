
-- movimentacoes_estoque
CREATE TABLE public.movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL,
  estoque_antes numeric NOT NULL,
  estoque_depois numeric NOT NULL,
  requisicao_id uuid,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mov" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert mov" ON public.movimentacoes_estoque FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update mov" ON public.movimentacoes_estoque FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin delete mov" ON public.movimentacoes_estoque FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX idx_mov_produto ON public.movimentacoes_estoque(produto_id);
CREATE INDEX idx_mov_created ON public.movimentacoes_estoque(created_at DESC);

-- requisicoes_internas
CREATE TABLE public.requisicoes_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','entregue','rejeitada')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicoes_internas TO authenticated;
GRANT ALL ON public.requisicoes_internas TO service_role;
ALTER TABLE public.requisicoes_internas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin select ri" ON public.requisicoes_internas FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "own insert ri" ON public.requisicoes_internas FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "own or admin update ri" ON public.requisicoes_internas FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin delete ri" ON public.requisicoes_internas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- requisicao_interna_itens
CREATE TABLE public.requisicao_interna_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.requisicoes_internas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicao_interna_itens TO authenticated;
GRANT ALL ON public.requisicao_interna_itens TO service_role;
ALTER TABLE public.requisicao_interna_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin select rii" ON public.requisicao_interna_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requisicoes_internas r WHERE r.id = requisicao_id AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));
CREATE POLICY "own insert rii" ON public.requisicao_interna_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.requisicoes_internas r WHERE r.id = requisicao_id AND r.usuario_id = auth.uid()));
CREATE POLICY "own or admin update rii" ON public.requisicao_interna_itens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requisicoes_internas r WHERE r.id = requisicao_id AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));
CREATE POLICY "own or admin delete rii" ON public.requisicao_interna_itens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requisicoes_internas r WHERE r.id = requisicao_id AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));
CREATE INDEX idx_rii_req ON public.requisicao_interna_itens(requisicao_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_ri_updated BEFORE UPDATE ON public.requisicoes_internas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

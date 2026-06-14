ALTER TABLE public.requisicao_itens ADD COLUMN IF NOT EXISTS unidade text;
ALTER TABLE public.requisicao_interna_itens ADD COLUMN IF NOT EXISTS unidade text;
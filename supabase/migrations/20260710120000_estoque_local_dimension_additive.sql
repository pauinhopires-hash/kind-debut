-- Fase 1 do bloco "estoque por local": adiciona a dimensão local ao estoque
-- de forma aditiva, sem remover nada que o app já usa hoje. A UNIQUE(produto_id)
-- antiga (estoque_atual_produto_id_key) é removida só na Fase 3, depois que os
-- 3 escritores automáticos (lista-compras, requisicoes-internas, producao)
-- forem atualizados pra escrever com onConflict: 'produto_id,local'.
-- Aplicado via Supabase MCP em 2026-07-10.

ALTER TABLE public.estoque_atual ADD COLUMN local text;

UPDATE public.estoque_atual ea
SET local = COALESCE(p.local, 'ESTOQUE CENTRAL')
FROM public.produtos p
WHERE ea.produto_id = p.id;

ALTER TABLE public.estoque_atual
  ADD CONSTRAINT estoque_atual_local_check
  CHECK (local IN ('CONGELADOR','GELADEIRA','PRATELEIRA','ESTOQUE CENTRAL'));

ALTER TABLE public.estoque_atual ALTER COLUMN local SET NOT NULL;

-- DEFAULT crítico: sem ele, qualquer upsert existente que ainda não informa
-- "local" (todos os 8 call sites atuais até a Fase 2/3) quebraria ao criar a
-- primeira linha de estoque de um produto novo (NOT NULL sem valor).
ALTER TABLE public.estoque_atual ALTER COLUMN local SET DEFAULT 'ESTOQUE CENTRAL';

-- Convive com a UNIQUE(produto_id) antiga até a Fase 3.
ALTER TABLE public.estoque_atual
  ADD CONSTRAINT estoque_atual_produto_local_key UNIQUE (produto_id, local);

ALTER TABLE public.movimentacoes_estoque ADD COLUMN local text;

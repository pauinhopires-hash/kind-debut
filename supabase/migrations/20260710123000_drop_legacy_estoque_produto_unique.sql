-- Fase 3 do bloco "estoque por local": remove a UNIQUE(produto_id) antiga,
-- agora que admin.estoque.tsx (Fase 2) e os 3 escritores automáticos
-- (lista-compras, requisicoes-internas, producao, atualizados no mesmo
-- commit) já escrevem sempre com onConflict "produto_id,local". A partir
-- daqui um produto pode ter mais de uma linha de estoque (uma por local).
-- Aplicado via Supabase MCP em 2026-07-10.
ALTER TABLE public.estoque_atual DROP CONSTRAINT estoque_atual_produto_id_key;

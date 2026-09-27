-- Fase 3 do plano do fluxograma: formaliza o "Recebimento" de compras.
-- requisicoes.status só aceitava pendente/aprovada/cancelada; o front
-- (admin.lista-compras.tsx) agora fecha o ciclo com um status "recebida"
-- quando todos os itens de uma requisição aprovada já foram comprados.
-- Aplicado via Supabase MCP (apply_migration) em 2026-07-10.
ALTER TABLE public.requisicoes DROP CONSTRAINT IF EXISTS requisicoes_status_check;
ALTER TABLE public.requisicoes ADD CONSTRAINT requisicoes_status_check
  CHECK (status = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'cancelada'::text, 'recebida'::text]));

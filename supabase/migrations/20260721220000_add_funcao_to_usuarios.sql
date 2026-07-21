-- Usuário tem no máximo 1 função "de casa" (diferente de produtos, que
-- pode ter várias). ve_todos_setores é um escape hatch: quando marcado,
-- o usuário pode ver/pedir itens de qualquer função, não só a dele.
-- Por enquanto isso é só dado cadastral — nenhuma tela filtra por isso
-- ainda (fase futura, separada).
-- Aplicado via Supabase MCP em 2026-07-21.
ALTER TABLE public.usuarios ADD COLUMN funcao_id uuid REFERENCES public.funcoes(id);
ALTER TABLE public.usuarios ADD COLUMN ve_todos_setores boolean NOT NULL DEFAULT false;

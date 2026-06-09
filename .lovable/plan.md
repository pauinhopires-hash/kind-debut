## Auditoria de Estabilização — Produção Amanhã

Sem novas funcionalidades. Apenas correções para destravar o uso real.

---

### BLOQUEADORES (app quebra sem isso)

**B-1. Trigger `on_auth_user_created` ausente em `auth.users`**
A função `handle_new_user()` existe mas não há trigger. Usuários novos (convite/signup) não recebem linha em `public.usuarios` → `useAuth` quebra, RLS nega tudo, telas ficam em branco.
- Correção: migração criando `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();` + trigger `grant_first_admin` + backfill `INSERT INTO usuarios … SELECT FROM auth.users ON CONFLICT DO NOTHING`.

**B-2. Filtro de setor em `admin.lista-compras.tsx` não casa com `produtos.setor`**
A lista hard-codeia setores diferentes dos definidos em `admin.produtos.tsx`. Qualquer filtro esvazia a lista de compras.
- Correção: derivar setores via `SELECT DISTINCT setor FROM produtos` ou reutilizar a constante `SETORES` central.

**B-3. Status `"comprada"` órfão**
`admin.lista-compras.tsx` grava status `"comprada"` em requisições, mas `admin.requisicoes.tsx` e `historico.tsx` só reconhecem `pendente|aprovada|cancelada`. Pedidos somem do histórico após compra.
- Correção: padronizar fechamento como `aprovada` (já reconhecido em todas as telas).

---

### GRAVES (vazam dados ou corrompem estoque)

**G-1. `pedido.tsx` → `repetirUltimo` sem filtro de `usuario_id`**
Usuário pode repetir o último pedido de qualquer outro usuário.
- Correção: adicionar `.eq("usuario_id", user.id)` na query.

**G-2. `admin.estoque.tsx` edita quantidade sem registrar movimentação**
Upsert direto em `estoque_atual` quebra a auditoria de `movimentacoes_estoque`.
- Correção: ler saldo atual → inserir `movimentacoes_estoque` tipo `ajuste` → upsert.

**G-3. `index.tsx` usa `.single()` para buscar nome do usuário**
Se a linha em `usuarios` não existir (cenário B-1 ou legado), a home crasha.
- Correção: trocar por `.maybeSingle()` + fallback no email.

**G-4. Metadados genéricos da Lovable em `__root.tsx`**
Título, OG e descrição padrão "Lovable" — inadequado para produção.
- Correção: atualizar `<title>`, `meta description`, OG/Twitter para "Misturaria Fina Mezcla".

---

### MENORES (polimento pré-prod)

- **M-1.** `admin.tsx` usa `useEffect` para guard → flash de "Carregando" e possível bypass momentâneo. Substituir por `beforeLoad` que valida `has_role`.
- **M-2.** `admin.requisicoes-internas.tsx` entrega parcial sem rollback transacional — se a 2ª query falhar, estoque fica inconsistente. Mover para RPC `entregar_requisicao_interna` (server-side, atômica).
- **M-3.** `requisicao-interna.tsx:52` `catch (e: any)` sem tratamento — silencia erros reais.
- **M-4.** `historico.tsx:188` comparação de status sem `.toLowerCase()` quebra filtros futuros.

---

### FORA DE ESCOPO (não tocar agora)
- Novas funcionalidades
- Refator de `src/routes/` para `_authenticated/`
- Mudanças de design
- Arquivos auto-gerados (`src/integrations/supabase/*`)

---

### Ordem de execução proposta
1. Migração SQL: trigger `handle_new_user` + `grant_first_admin` + backfill (B-1)
2. Frontend: B-2, B-3, G-1, G-2, G-3, G-4
3. Polimento: M-1 a M-4

Aprovação para executar nesta ordem?

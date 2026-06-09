# Auditoria de Estabilização — Pronto para Produção

Levantamento completo do estado atual. **Nenhuma funcionalidade nova será criada.** Apenas correções para o sistema funcionar de forma confiável em produção.

---

## 🔴 BLOQUEADORES (impedem uso real — corrigir antes de publicar)

### B-1 · Contador "Estoque baixo" sempre mostra 0
- `src/routes/admin.tsx:57` — filtra `produtos` por `estoque_atual`, mas essa coluna não existe na tabela `produtos` (fica em `estoque_atual.quantidade`).
- **Correção**: refazer a consulta com join correto (`produtos` + `estoque_atual`) ou buscar do lado correto.

### B-2 · Tela de "Lista de Compras" e KPIs do admin sempre vazios
- `src/routes/admin.lista-compras.tsx:52,56,57,60,199,200` e `src/routes/admin.index.tsx:47,48,61,62,70,71` usam as colunas `data_pedido` e `setor` em `requisicoes`. Nenhuma das duas existe (apenas `created_at` e `perfil_id`).
- **Correção**: trocar `data_pedido` → `created_at`; remover filtro `setor` ou substituir por `perfil_id`.

### B-3 · Confirmar entrega quebra estoque
- `src/routes/admin.requisicoes-internas.tsx:117-133` decrementa `estoque_atual` **antes** de inserir em `movimentacoes_estoque`; o insert pode falhar (faltam `usuario_id` e `tipo`, RLS hoje exige admin). Resultado: estoque debitado sem rastro.
- **Correção**: inverter ordem (insert movimentação primeiro), incluir `usuario_id` e `tipo`, e em caso de erro reverter o decremento.

### B-4 · Dois dashboards conflitantes em `/admin`
- `src/routes/admin.tsx` é um arquivo de página completa **sem `<Outlet/>`**, mas também existe `src/routes/admin.index.tsx`. No TanStack flat-file, `admin.tsx` vira layout dos filhos `admin.estoque.tsx`, `admin.produtos.tsx`, etc. — então hoje os subroutes não renderizam dentro de um shell comum, e `/admin` pode cair em qualquer um dos dois.
- **Correção**: transformar `admin.tsx` em layout (`component: () => <Outlet/>` + auth/role guard único) e manter `admin.index.tsx` como dashboard.

### B-5 · Telas que leem `movimentacoes_estoque` falham para não-admin
- Depois da migração de RLS, `SELECT` e `INSERT` em `movimentacoes_estoque` exigem `has_role(..., 'admin')`. `admin.movimentacoes.tsx:32-46` e `admin.requisicoes-internas.tsx:36-49` só checam sessão, não role.
- **Correção**: aplicar guard de role admin (via layout B-4) antes do fetch.

---

## 🟠 GRAVES (bugs visíveis, perda de dado, vazamento de informação)

- **G-1 · Encoding corrompido (`Ã§`, `Ã£`, `â`)** em strings de UI e em texto gravado no banco (`observacao` de movimentações). Arquivos: `admin.requisicoes-internas.tsx`, `admin.movimentacoes.tsx`, `requisicao-interna.tsx`, `historico-interno.tsx`. Reescrever as strings em UTF-8 correto.
- **G-2 · Entrada de compra não registra movimentação** (`admin.lista-compras.tsx:165-179`): ao marcar comprado, `estoque_atual` muda mas `movimentacoes_estoque` não recebe linha. Adicionar INSERT correspondente.
- **G-3 · `/admin/estoque` sem nenhum guard de role** — qualquer usuário logado edita estoque. Resolvido junto do layout B-4.
- **G-4 · Demais rotas `admin.*` sem checagem de role** (`admin.lista-compras`, `admin.produtos`, `admin.usuarios`, `admin.requisicoes`). Resolvido junto do layout B-4.
- **G-5 · `admin.index.tsx` sem guard** (idem).
- **G-6 · `/historico` vaza pedidos de outros usuários** (`historico.tsx`): falta `.eq("usuario_id", user.id)`. Adicionar filtro.
- **G-7 · Confirmar entrega trava se produto não tem linha em `estoque_atual`** (`admin.requisicoes-internas.tsx:107`): `.single()` lança, mas status já virou "entregue". Usar `.maybeSingle()` e tratar como quantidade 0, ou validar antes de atualizar status.
- **G-8 · Estoque incorreto ao desmarcar compra** (`admin.lista-compras.tsx:172`): usa `it.estoque` da carga inicial. Reler `estoque_atual` no momento.

---

## 🟡 MENORES (polimento e robustez)

- **M-1 · Classe Tailwind inválida `max-w-2mx`** em `admin.movimentacoes.tsx:77` e `admin.requisicoes-internas.tsx:166`. Trocar por `max-w-2xl`.
- **M-2 · Caractere quebrado `â`** (deveria ser `→`) em `admin.movimentacoes.tsx:133` e `requisicao-interna.tsx:141`.
- **M-3 · `pedido.tsx` vs `pedido.editar.$id.tsx`**: confirmar se layout compartilhado é necessário (provavelmente não).
- **M-4 · `admin.requisicoes.tsx` sem guard de role** — resolvido pelo layout B-4.
- **M-6 · KPIs de `admin.index.tsx` dependem de `data_pedido`** inexistente — resolvido junto de B-2.
- **M-7 · Erros silenciados em `Promise.all`** (`admin.index.tsx:35-72`): adicionar checagem de `error` e log.
- **M-8 · `exportar.tsx:50-54` exporta último pedido global**, não do usuário logado. Adicionar filtro por `usuario_id` (ou role admin para ver tudo).

---

## Plano de execução (ordem proposta)

1. **Layout `admin.tsx`** → transformar em layout com guard único de admin (resolve B-4, B-5, G-3, G-4, G-5, M-4).
2. **Corrigir queries com colunas inexistentes** (B-1, B-2, M-6).
3. **Fluxo de entrega de requisição interna** (B-3, G-7) — ordem das operações e tratamento de erro.
4. **Registro de movimentação ao comprar** (G-2) e correção de estoque ao desmarcar (G-8).
5. **Filtro por `usuario_id`** em `historico.tsx` e `exportar.tsx` (G-6, M-8).
6. **Limpeza de encoding** (G-1, M-2) e classes Tailwind inválidas (M-1).
7. **Tratamento de erros silenciados** em `admin.index.tsx` (M-7).

Após cada bloco: `bunx tsc --noEmit` + teste manual no preview do fluxo afetado.

---

## Fora deste plano (explicitamente)

- Não serão adicionadas novas telas, novos campos, novas migrações de schema (exceto se uma correção exigir, ex.: coluna `tipo` em movimentação se descobrirmos faltando).
- Não vou re-escrever design ou refatorar arquitetura.
- Não vou tocar nas integrações `src/integrations/supabase/*` (auto-geradas).

Posso começar pela etapa 1 assim que você aprovar — ou ajustar a ordem se algum bloco for mais urgente para você.

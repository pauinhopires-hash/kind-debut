# Plano: Correção dos warnings de segurança

Foram detectados 6 warnings. Plano para resolver cada um sem alterar funcionalidades existentes.

## 1. RLS — DELETE de itens em requisições não-pendentes
**Tabela:** `requisicao_itens`, política `req_itens_delete_own`
Adicionar checagem `r.status = 'pendente'` (espelhando a política de UPDATE), via migração que faz DROP + CREATE da política.

## 2. RLS — Usuário pode alterar `status` da própria requisição
**Tabela:** `requisicoes`, política `requisicoes_update_own_pendente`
Hoje o WITH CHECK só exige `status = 'pendente'` após o update — o usuário pode manter status `pendente` mas isso já está OK; o risco é mudar para outro valor. Solução: revogar `UPDATE` na coluna `status` para `authenticated` e conceder apenas em colunas seguras (`observacao`). Admin continua podendo via política `requisicoes_admin_update` (role bypassa column grants quando feito por security definer? — usaremos abordagem alternativa mais simples):
- Recriar a política com `WITH CHECK ((usuario_id = auth.uid()) AND status = 'pendente')` — já existe — **mas** adicionar grant em nível de coluna:
  ```sql
  REVOKE UPDATE ON public.requisicoes FROM authenticated;
  GRANT UPDATE (observacao) ON public.requisicoes TO authenticated;
  GRANT UPDATE ON public.requisicoes TO service_role;
  ```
  Admin executa updates via cliente também — então admins precisam ser autenticated com privilégio total. Solução: manter `GRANT UPDATE ON public.requisicoes TO authenticated` e em vez disso adicionar um **trigger BEFORE UPDATE** que impede non-admins de alterar `status` (compara OLD.status com NEW.status e checa `has_role(auth.uid(), 'admin')`).

## 3. Mutations no cliente sem re-checagem de status
**Arquivos:** `src/routes/historico.tsx` (`cancelar`), `src/routes/pedido.editar.$id.tsx` (`salvar`)
- Adicionar `.eq('status', 'pendente')` em todos os `update` de `requisicoes` feitos por não-admins.
- Verificar count de linhas afetadas; se 0, mostrar toast de erro ("requisição já foi processada, recarregue a página").

## 4. Admin guard apenas no cliente (defesa em profundidade)
Já está mitigado pelas políticas RLS (toda escrita admin é gated por `has_role(auth.uid(), 'admin')`). Vou **marcar como ignorado** com justificativa: o guard de rota é UX; toda mutation admin é protegida por RLS server-side via `has_role`. Adicionar comentário em `admin.tsx` deixando isso explícito.

## 5. SECURITY DEFINER executáveis por authenticated (2 warnings)
Funções: `has_role` e `current_user_perfil_id`.
Ambas **precisam** ser executáveis pelo role `authenticated` porque são chamadas dentro de expressões RLS (Postgres avalia RLS como o role que faz a query). Revogar EXECUTE quebraria todo o controle de acesso.
- **Ação:** marcar os 2 findings como `ignore` com explicação detalhada e atualizar a security memory para o scanner não re-flaggar.

## Resumo das ações
1. **Migração SQL:**
   - DROP + CREATE policy `req_itens_delete_own` com check de status pendente
   - Trigger BEFORE UPDATE em `requisicoes` impedindo non-admin de alterar `status`
2. **Edição de código:**
   - `src/routes/historico.tsx`: `.eq('status','pendente')` + verificar linhas afetadas
   - `src/routes/pedido.editar.$id.tsx`: idem no `salvar`
3. **Marcar findings como ignored** (2 SECURITY DEFINER + 1 ROUTE_ONLY_ADMIN_GUARD) com justificativa e atualizar @security-memory.

Nenhum comportamento visível ao usuário muda: usuário continua editando/cancelando suas pendentes; admin continua aprovando; apenas fechamos brechas onde estado mudou em paralelo ou cliente foi manipulado.

## Checklist "Pronto para Produção" — Validação Amanhã

Estado atual: bloqueadores e graves já corrigidos. Itens menores opcionais listados ao final.

---

### A. INFRAESTRUTURA DE BANCO — concluído

- [x] **Trigger `on_auth_user_created`** ativo em `auth.users` (verificado em `pg_trigger`)
- [x] **Trigger `on_auth_user_created_role`** ativo em `auth.users`
- [x] **Backfill**: `auth.users=1`, `public.usuarios=1`, `public.user_roles=1` (consistente)
- [x] **Funções SECURITY DEFINER** sem EXECUTE para `anon/authenticated` (`handle_new_user`, `grant_first_admin`, `has_role`, `current_user_perfil_id`, `prevent_non_admin_status_change`)
- [x] **RLS policies novas** (auditoria de segurança):
  - `usuarios_admin_delete` — só admin deleta usuário
  - `config_insert_admin` / `config_update_admin` / `config_delete_admin`
  - `own or admin update ri` exige `status='pendente'` para o dono

**Como validar amanhã:**
1. Convidar 1 usuário novo via painel de auth → confirmar que aparece em `usuarios` e `user_roles` automaticamente
2. Logar como usuário comum → tentar deletar outro usuário (deve falhar com permission denied)
3. Logar como admin → editar `config_sistema` (deve funcionar)

---

### B. FRONTEND — bloqueadores corrigidos

- [x] **Filtro de setor `admin.lista-compras.tsx`** alinhado a `produtos.setor` (`COZINHA`, `ESTOQUE CENTRAL`, `FRENTE`)
- [x] **Status `"comprada"` → `"aprovada"`** em `fecharDia`, evita pedidos sumindo do histórico
- [x] **`pedido.tsx → repetirUltimo`** filtra por `usuario_id = user.id`
- [x] **`admin.estoque.tsx`** registra `movimentacoes_estoque` tipo `ajuste` ao editar quantidade
- [x] **`index.tsx`** usa `.maybeSingle()` + fallback no email (tolera usuário sem linha em `usuarios`)
- [x] **`__root.tsx`** metadados "Misturaria Fina Mezcla" em title, OG e Twitter
- [x] **`requisicao-interna.tsx:52`** tipos corrigidos (sem `any` solto)

**Como validar amanhã (telas):**

| Tela | Rota | Caminho de teste |
|---|---|---|
| Home | `/` | Carrega nome do usuário; admin é redirecionado para `/admin` |
| Login | `/login` | Email + senha; novo usuário cria linha em `usuarios` |
| Novo pedido | `/pedido` | Adicionar 2 itens, salvar → aparece em `/historico` |
| Repetir último | `/pedido` botão Repetir | Carrega só os próprios itens |
| Requisição interna | `/requisicao-interna` | Não permite quantidade > estoque |
| Histórico compras | `/historico` | Lista status pendente/aprovada/cancelada |
| Histórico interno | `/historico-interno` | Lista só do próprio usuário |
| Dashboard admin | `/admin` | Acesso negado para não-admin |
| Lista de compras | `/admin/lista-compras` | Filtro por setor não esvazia; "Marcar tudo" usa `aprovada` |
| Produtos | `/admin/produtos` | CRUD funciona, setores `COZINHA`/`ESTOQUE CENTRAL`/`FRENTE` |
| Estoque | `/admin/estoque` | Salvar quantidade gera linha em `movimentacoes_estoque` (tipo `ajuste`) |
| Requisições | `/admin/requisicoes` | Aprovar/cancelar muda status |
| Requisições internas | `/admin/requisicoes-internas` | Entregar debita estoque e registra movimentação |
| Movimentações | `/admin/movimentacoes` | Mostra entradas/saídas/ajustes |
| Usuários | `/admin/usuarios` | Listar e atribuir papéis |
| Exportar | `/exportar` | CSV gerado com dados do próprio usuário |

---

### C. ITENS MENORES — não bloqueiam produção, mas recomendados

- [ ] **M-1** `admin.tsx` guard via `useEffect` causa flash de "Carregando" — funciona, mas ideal mover para `beforeLoad` com `has_role`
- [ ] **M-2** `admin.requisicoes-internas.tsx`: entrega parcial sem rollback transacional. Risco: se a 2ª query falhar entre debitar estoque e atualizar status, fica inconsistente. Mitigação completa requer RPC server-side
- [ ] **M-4** `historico.tsx:188` exibe status sem normalizar caixa — só cosmético

**Aceitar/postpor:** estes 3 não impedem produção. Se algum surgir como problema real no uso, criar tarefa específica.

---

### D. CHECAGEM FINAL ANTES DO DEPLOY

- [ ] Build sem erros TypeScript (rodar `bun run build` ou aguardar pipeline)
- [ ] Smoke test: criar 1 pedido, aprovar, fechar dia, ver no histórico
- [ ] Smoke test: criar 1 requisição interna, entregar como admin, conferir movimentação
- [ ] Verificar `/login` aceita email/senha do convite enviado
- [ ] Confirmar que metadados aparecem ao compartilhar link (OG image carrega)

---

### Evidências de migrations executadas

```
2026-06-09  triggers handle_new_user + grant_first_admin + backfill usuarios/user_roles
2026-06-09  REVOKE EXECUTE em todas as SECURITY DEFINER de anon/authenticated
2026-06-09  policies: usuarios_admin_delete, config_*_admin, requisicoes_internas status guard
```

Próximo passo: marcar checkboxes da seção D amanhã durante o smoke test.

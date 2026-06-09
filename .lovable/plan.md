## Auditoria — Login & Usuários

### Diagnóstico (estado atual)

**🔴 BLOQUEADOR ATIVO AGORA** — visível no log de rede:
```
POST /rpc/has_role → 403 "permission denied for function has_role"
```
Em `src/routes/index.tsx:25` e `src/routes/admin.tsx:22` o app chama `supabase.rpc("has_role", …)` diretamente do cliente. Na auditoria de segurança anterior, revoguei `EXECUTE` de `has_role` para `authenticated` — isso quebrou a home e o gate do admin. Resultado: **nenhum usuário consegue passar da tela inicial.**

**Outros problemas relevantes:**

1. **Sem fluxo de recuperação de senha.** Login só aceita "Email + senha"; não existe `/forgot-password` nem `/reset-password`. Se um usuário esquecer a senha, só o admin via painel do Cloud consegue resetar.
2. **Sem cadastro/convite na UI.** `admin.usuarios.tsx` lista, ativa/desativa e promove admin, mas não convida novos usuários. O fluxo "somente por convite" depende 100% do painel do Lovable Cloud.
3. **Risco de auto-bloqueio do admin.** `toggleAdmin` e `toggleAtivo` em `admin.usuarios.tsx` permitem o admin remover o próprio papel ou se desativar — possível ficar sem nenhum admin no sistema.
4. **`useAuth` sem flag de loading do perfil/role.** O segundo `useEffect` carrega `usuario`, `perfil` e `isAdmin` async, mas `loading` já é `false` depois do `getSession`. Consumidores que decidem com base em `isAdmin` veem `false` por alguns ms (potencial flash de redirecionamento errado).
5. **`onAuthStateChange` em `useAuth` não invalida o router.** Após `signOut` em uma página, rotas carregadas continuam mostrando dados em cache até navegação manual.
6. **`login.tsx` mostra mensagem genérica para qualquer erro** ("Email ou senha inválidos") — esconde casos como "Email não confirmado" ou "Usuário desativado".
7. **Sessão hidratada via `getSession()` sem revalidar com `getUser()`.** Se o token foi invalidado no servidor (admin removeu o usuário), o cliente segue logado até o próximo refresh.

---

### BLOCO ÚNICO DE AÇÕES PARA PRODUÇÃO

> Todas as correções abaixo são **estabilização** (não adicionam feature nova). Sem implementação agora — só aprovação.

#### A. Banco (1 migração)
- Restaurar `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;`. Justificativa: `has_role` é `SECURITY DEFINER STABLE` que só faz SELECT em `user_roles` pelo `_user_id` recebido — não vaza nada quando chamada com `auth.uid()`. É o padrão recomendado da Supabase e é usado em todas as policies do projeto.
- Criar função `public.is_current_user_admin()` (`SECURITY DEFINER`, sem parâmetros, retorna `boolean`) chamando `has_role(auth.uid(), 'admin')`. Substitui o uso do RPC parametrizado pelo cliente (mais seguro: não aceita `_user_id` arbitrário) — opcional, se quisermos máximo rigor.

#### B. Frontend (mínimas correções)
- `src/routes/index.tsx` e `src/routes/admin.tsx`: trocar `supabase.rpc("has_role", …)` por consulta direta a `user_roles` filtrando `auth.uid()` **OU** pela nova `is_current_user_admin()`. Decisão fica em "Decisões pendentes" abaixo.
- `src/hooks/use-auth.ts`: adicionar `profileLoading` separado de `loading` (sessão). Componentes que dependem de `isAdmin` esperam `!profileLoading`.
- `src/routes/admin.usuarios.tsx`: impedir o usuário logado de remover o próprio admin / se desativar (verificação no clique + toast explicativo).
- `src/routes/login.tsx`: tratar erros específicos ("Email not confirmed", "Invalid login credentials") com mensagens claras em PT-BR; adicionar link "Esqueci a senha".
- Criar `src/routes/forgot-password.tsx` (envia `resetPasswordForEmail` com `redirectTo` para `/reset-password`).
- Criar `src/routes/reset-password.tsx` (lê `type=recovery` do hash, chama `updateUser({ password })`).
- `__root.tsx`: registrar `supabase.auth.onAuthStateChange` para chamar `router.invalidate()` em `SIGNED_IN`/`SIGNED_OUT`.

#### C. Configuração do Cloud (manual ou via tool)
- Habilitar **HIBP (leaked password check)** — bloqueia senhas vazadas.
- Manter `auto_confirm_email = false` e `disable_signup = true` (acesso só por convite).

---

### Decisões pendentes (preciso de resposta antes de codar)

1. **`has_role`**: prefere (a) re-conceder EXECUTE para `authenticated` — mais simples, padrão da Supabase, OU (b) criar `is_current_user_admin()` e usar essa função no cliente — mais restritivo?
2. **Esqueci a senha**: posso criar `/forgot-password` + `/reset-password`? (Você disse "sem novas funcionalidades" — confirmo se esse fluxo entra como estabilização básica ou se prefere adiar e instruir admins a resetarem manualmente no painel.)
3. **Convite na UI (admin.usuarios.tsx)**: deixo como está (só painel do Cloud) ou adiciono botão "Convidar por email"? Recomendo deixar como está para hoje — o trigger `handle_new_user` já popula `usuarios` automaticamente quando o convite é aceito.
4. **HIBP**: ativo agora?

Sem essas respostas só posso garantir a correção do bloqueador A+B (re-grant `has_role` + ajuste de `useAuth`/`login`/`admin.usuarios`).

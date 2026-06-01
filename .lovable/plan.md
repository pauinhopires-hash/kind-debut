## Objetivo
Permitir que novos usuários se cadastrem e entrem imediatamente, sem precisar confirmar email e sem precisar de aprovação do admin.

## Mudanças

**1. Auto-confirmação de email (Supabase Auth)**
- Ativar `auto_confirm_email = true` no Supabase Auth.
- Resultado: ao se cadastrar via `/login`, o usuário entra direto, sem precisar clicar em link de confirmação.

**2. Cadastro público continua aberto**
- Manter `disable_signup = false` (qualquer um pode se cadastrar).
- Manter o trigger `handle_new_user` que cria registro em `public.usuarios` com `ativo = true`.
- Manter o trigger `grant_first_admin` (1º usuário vira admin, demais viram `usuario`).

**3. Sem aprovação do admin**
- Não exigir que o admin ative o usuário.
- Novo usuário já entra com `ativo = true` (comportamento atual).

## O que NÃO muda
- O admin **ainda precisa atribuir um perfil** (Líder Cozinha, Líder Salão, Frente de Caixa, Copa Cozinha) em `/admin/usuarios` para o usuário ver produtos em `/pedido`. Isso é uma regra de negócio (cada perfil vê apenas seus produtos via RLS), não autenticação.
- Quem é admin (Paulo) continua vendo tudo.

## Observação de segurança
Com auto-confirm ativo, qualquer pessoa com um email válido (mesmo inexistente) consegue criar conta e logar. Se quiser restringir, posso adicionar depois: domínio de email permitido, ou voltar para "exige confirmação por email".

## Ação técnica
- Chamar `configure_auth` com `auto_confirm_email: true`, `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true`.
- Nenhuma mudança de código/migration necessária.
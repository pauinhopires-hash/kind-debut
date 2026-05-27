## Plano: Área administrativa + editar/cancelar requisições

### 1. Banco de dados (migration)
- Criar enum `app_role` (`admin`, `usuario`).
- Criar tabela `user_roles` (user_id, role) com GRANTs + RLS.
- Função `has_role(_user_id, _role)` SECURITY DEFINER.
- Adicionar policies de **admin** (INSERT/UPDATE/DELETE) em: `produtos`, `estoque_atual`, `usuarios`, `perfis`.
- Adicionar policy de **UPDATE/DELETE** em `requisicoes` para o próprio usuário **apenas quando `status = 'pendente'`** (e mesma regra em `requisicao_itens`).
- Conceder permissão de admin ao primeiro usuário (após migration aprovada, via insert).

### 2. Hook
- Extender `useAuth` com `isAdmin` (consulta `has_role`).

### 3. Telas novas
- `/admin` — hub com cards: Produtos, Estoque, Usuários (protegida; redireciona se não-admin).
- `/admin/produtos` — listar/criar/editar/desativar produtos do perfil do admin.
- `/admin/estoque` — ajustar quantidades em `estoque_atual` (upsert por produto).
- `/admin/usuarios` — listar usuários, alterar perfil_id, ativar/desativar, promover a admin.

### 4. Edição/cancelamento de requisições pendentes
- Em `/historico`: para requisições com `status = 'pendente'`, mostrar botões **Editar** e **Cancelar**.
- **Cancelar**: `UPDATE requisicoes SET status = 'cancelada'` (confirm via dialog).
- **Editar**: rota `/pedido/$id` reaproveitando a UI de `/pedido`, pré-carregando itens; salvar substitui (`delete` + `insert`) `requisicao_itens`.

### 5. Home
- Mostrar botão "⚙️ Admin" apenas se `isAdmin`.

### Detalhes técnicos
- Todas as policies de admin usam `public.has_role(auth.uid(), 'admin')`.
- Status válidos de requisição: `pendente`, `cancelada`, `processada` (já existente).
- Toasts (`sonner`) em todas as ações.
- Mobile-first, paleta já estabelecida (#0A0A0A / #E8650A / cards #141414).

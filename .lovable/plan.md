## Adicionar atalho "Nova Requisição de Compra" no painel admin

### Objetivo
Adicionar ao painel administrativo (`/admin`) um botão que permita ao administrador criar uma nova requisição de compra, redirecionando para a rota `/pedido` já existente.

### Motivação
Atualmente, o administrador é redirecionado automaticamente de `/` para `/admin`, e o painel `/admin` não possui atalho para iniciar uma requisição de compra. Apenas usuários comuns veem essa opção na home. A tela `/pedido` já existe e o admin tem permissão de acessá-la — o problema é apenas a falta de navegação.

### O que será alterado

**Arquivo:** `src/routes/admin.index.tsx`

- Adicionar um novo item ao grupo de menu "Compras" com:
  - **Título:** Nova Requisição de Compra
  - **Rota:** `/pedido`
  - **Ícone:** ShoppingCart
  - **Destaque visual:** cor laranja para diferenciar como ação de criação

- **Ordem final do grupo Compras:**
  1. Nova Requisição de Compra (novo)
  2. Requisições de Compra (aprovar)
  3. Lista de Compras

### Não será alterado
- Banco de dados, RLS, policies ou lógica de backend.

### Resultado esperado
O administrador verá no painel `/admin`, dentro do grupo "Compras", um card com ícone de carrinho e o texto "Nova Requisição de Compra". Clicando nele, será levado para `/pedido` para criar o pedido normalmente.
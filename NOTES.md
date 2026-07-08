# Melhorias de UX — sem tocar em regras de negócio

Objetivo: elevar a experiência de uso do app (foco no fluxo do operador e telas comuns) mantendo intocado tudo que já funciona: RLS, queries do Supabase, mutações, rotas, permissões admin, PWA/offline e autenticação.

## Princípios (guardrails)

- Nenhuma mudança em: schemas, migrations, RLS, RPCs (`has_role`), `useAuth`, `client.ts`, `auth-middleware`, `start.ts`, `vite.config.ts`, `manifest.webmanifest`, `register-sw.ts`.
- Nenhuma mudança em: fluxos de submit, payloads, nomes de tabela/colunas, redirecionamentos existentes (admin → /admin, sem sessão → /login).
- Só camada de apresentação: layout, feedback, estados de carregamento/erro/vazio, acessibilidade, atalhos de teclado, responsividade.

## Escopo (o que muda)

### 1. Responsividade desktop
- `index.tsx`, `historico.tsx`, `pedido.tsx`, `historico-interno.tsx`, `requisicao-interna.tsx`, `login.tsx`: subir o container de `max-w-md`/`max-w-2xl` para `max-w-3xl`/`max-w-5xl` em breakpoints `md/lg`, com grid de 2 colunas para os cartões da Home em `md+`.
- Header sticky ganha densidade maior no desktop (padding e tipografia responsivos).

### 2. Estados de carregamento e vazio
- Trocar os textos "Carregando..." (Home, `/admin`, `/historico`) por skeletons já existentes em `components/skeleton.tsx`.
- Estados vazios com ícone + copy consistente (padrão já usado no Histórico) em Pedido e Requisição Interna quando não houver produtos.
- Estado de erro com botão "Tentar novamente" (chama a mesma função de carregar já existente).

### 3. Feedback e microinterações
- Toasts (`sonner`) padronizados: sucesso curto, erro com `description`. Sem trocar mensagens de erro do backend.
- Botões de ação primária com estado `disabled` + spinner durante request (usa flag local que já existe; não altera a chamada).
- Foco visível (`focus-visible:ring`) em todos os botões/links customizados.

### 4. Navegação e atalhos
- Botão "Voltar" consistente em todas as sub-rotas (padrão já usado em `/historico`).
- Atalho `Esc` fecha modais/acordeões abertos; `/` foca busca quando existir (Pedido e Requisição Interna).
- Link "Sair" no header também nas telas internas (hoje só existe na Home), sem alterar `signOut`.

### 5. Acessibilidade
- `aria-label` nos botões-ícone que faltam.
- Contraste dos textos `text-gray-400` sobre preto revisado para `text-muted-foreground` (token já existente).
- `<main>` único por rota; heading hierárquico (h1 → h2).

### 6. Metadados por rota (SEO/compartilhamento)
- `head()` com `title` e `description` únicos em `pedido.tsx`, `requisicao-interna.tsx`, `historico-interno.tsx`, `login.tsx`, `forgot-password.tsx`, `reset-password.tsx` (mantendo o padrão do `historico.tsx`).

### 7. Home
- Grid `md:grid-cols-2` para os 4 cards de ação; ordem preservada.
- Saudação com hora do dia ("Bom dia/Boa tarde/Boa noite, {nome}") — puramente cosmético.

## Fora de escopo

- Qualquer refator de dados, hooks de auth, roteamento, PWA/service worker.
- Telas do admin (`/admin/*`) — o pedido foi "fluxo do operador"; só toco no `admin.tsx` para trocar o "Carregando..." por skeleton.
- Novos componentes de terceiros ou dependências adicionais.

## Arquivos afetados (apenas apresentação)

```
src/routes/index.tsx
src/routes/pedido.tsx
src/routes/historico.tsx
src/routes/historico-interno.tsx
src/routes/requisicao-interna.tsx
src/routes/login.tsx
src/routes/forgot-password.tsx
src/routes/reset-password.tsx
src/routes/admin.tsx                (só o placeholder de loading)
src/components/skeleton.tsx         (pequenas variantes se precisar)
```

## Validação

- Build limpo (typecheck).
- Playwright headless: login → home → pedido (adicionar item, salvar) → histórico (abrir/fechar) → logout, no viewport desktop (1280) e mobile (390). Screenshot por etapa para confirmar que nenhum fluxo quebrou.

Ao aprovar, executo tudo em um único PR, arquivo por arquivo, sem tocar em nada fora da lista acima.

---

# Requisições de Estoque (Internas) — o que falta

O fluxo principal já funciona: usuário cria → admin aprova → admin confirma entrega (baixa estoque + grava movimentação) → histórico do usuário. Faltam as funções de paridade com o fluxo de compras e algumas melhorias de robustez.

## 1. Paridade no admin (`/admin/requisicoes-internas`)

Mesmas funções que adicionamos em `/admin/requisicoes`:

- **Editar quantidade do item** (apenas em status `pendente`)
  - Botões ± e input direto na lista expandida
  - Validar contra estoque disponível antes de salvar
- **Excluir item** (apenas em `pendente`)
  - Lixeira ao lado de cada item, com confirmação
  - Se ficar sem itens, alertar para rejeitar a requisição
- **Compartilhar no WhatsApp**
  - Botão na requisição (pendente ou aprovada) que abre `wa.me` com a lista formatada (solicitante, data, itens, observação)

## 2. Admin também pode criar requisição interna

Hoje só usuários comuns conseguem usar `/requisicao-interna`. Liberar o acesso para admin (botão de atalho no painel admin, em "Estoque"), reusando a mesma tela já existente — sem nova rota.

## 3. Validações que estão faltando

- **Re-checar estoque no momento da aprovação**: hoje só checa na entrega. Se o admin aprova mas alguém já consumiu o estoque, só vai dar erro na hora de entregar. Mostrar aviso na aprovação quando estoque ficou insuficiente.
- **Bloquear editar/excluir após aprovada**: já garantido por UI (só pendente), mas adicionar guarda no clique também.
- **Indicador visual de estoque insuficiente** na lista expandida (item vermelho quando `quantidade > estoque_atual`).

## 4. UX menores

- Botão "Nova requisição interna" no `/admin/requisicoes-internas` (atalho para `/requisicao-interna`).
- Contador de pendentes já existe no header — manter.
- Após "Confirmar Entrega", recarregar também `stats` no dashboard admin (hoje só recarrega na próxima visita ao `/admin`).

## Fora de escopo (não vou mexer)

- Schema do banco — tabelas `requisicoes_internas`, `requisicao_interna_itens`, `movimentacoes_estoque` e `estoque_atual` já estão corretas, com RLS e trigger de status.
- Fluxo do usuário comum (`/requisicao-interna` e `/historico-interno`) — já funciona.

## Detalhes técnicos

- Arquivo principal: `src/routes/admin.requisicoes-internas.tsx` (adicionar `atualizarQtd`, `excluirItem`, `compartilharWhatsApp`, espelhando `admin.requisicoes.tsx`).
- Edição de quantidade: `UPDATE requisicao_interna_itens SET quantidade = ?`.
- Exclusão: `DELETE FROM requisicao_interna_itens WHERE id = ?`.
- Verificação de estoque insuficiente: cruzar `itens[req.id]` com `estoque_atual` carregado uma vez por expansão.
- Compartilhamento: `window.open("https://wa.me/?text=" + encodeURIComponent(msg))`.

## Confirme antes de eu seguir

1. Confirma que quer as 3 funções de paridade (editar qtd, excluir, WhatsApp)?
2. Quer mesmo o atalho para o admin criar requisição interna no painel?
3. Posso incluir o aviso de estoque insuficiente na aprovação ou prefere deixar só na entrega?

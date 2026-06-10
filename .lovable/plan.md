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
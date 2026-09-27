# 05 — Fluxos Operacionais

As mensagens citadas foram extraidas literalmente do codigo (COMPROVADO).

## 1. Nova requisicao de compra

| Campo | Conteudo |
|---|---|
| Responsavel | Operador ou administrador |
| Tela inicial | `/` → "Nova Requisicao de Compra" → `/pedido` |

Etapas: escolher produtos da lista do seu setor; informar quantidade (aceita
decimais para KG e LT); opcionalmente ajustar a unidade e o nome do item;
opcionalmente usar "repetir ultimo pedido"; enviar.

Dados gravados: uma linha em `requisicoes` (`status = "pendente"`, numero,
setor, solicitante) e uma linha por item em `requisicao_itens`.

Estado final: requisicao pendente, visivel para o solicitante e para a administracao.

Mensagens: sucesso "Pedido enviado — N itens registrados."; ao repetir,
"N itens carregados do ultimo pedido".

Falhas possiveis: "Erro ao carregar produtos"; "Nao foi possivel determinar o
setor deste pedido. Confirme se seu perfil esta configurado (fale com um admin)";
"Erro ao criar requisicao"; "Erro ao salvar itens".

## 2. Aprovacao ou tratamento da requisicao

| Campo | Conteudo |
|---|---|
| Responsavel | Administrador |
| Tela inicial | `/admin/requisicoes` |

Etapas: abrir a requisicao, conferir itens, corrigir quantidade ou nome do item,
excluir item indevido, e entao aprovar ou cancelar (com confirmacao).

Dados gravados: `requisicoes.status` passa a `aprovada` ou `cancelada`, com
`decidido_por` e `decidido_em`; alteracoes em `requisicao_itens`.

Estado final: aprovada segue para a lista de compras; cancelada encerra.

Mensagens: "Requisicao aprovada" / "Requisicao cancelada"; "Item excluido";
"Nome atualizado". O solicitante recebe aviso: "Sua requisicao foi aprovada e
vai pra lista de compras." ou "Sua requisicao foi cancelada."

Falhas: mensagens de erro com a causa; tentativa de mudar status sem ser
administrador e barrada pelo proprio banco com erro de permissao (42501).

## 3. Lista diaria de compras e fechamento do dia

| Campo | Conteudo |
|---|---|
| Responsavel | Administrador |
| Tela inicial | `/admin/lista-compras` |

Etapas: ver a lista consolidada de pendentes e aprovadas; marcar item como
comprado; descartar ou restaurar item; compartilhar por WhatsApp ou copiar;
confirmar recebimento de uma requisicao; "fechar o dia".

Dados gravados: marcacoes nos itens; `requisicoes.status = "recebida"`;
no fechamento, entradas em `movimentacoes_estoque` (`tipo = "entrada"`, com
saldo antes e depois) e atualizacao de `estoque_atual`.

Mensagens: "<item> marcado como comprado" / "desmarcado"; "<item> descartado" /
"restaurado"; "Requisicao #N marcada como recebida"; "N item(ns) fechado(s) como
comprado(s)."; "Copiado para o clipboard!".

Falhas: "Erro ao carregar"; "Erro ao salvar"; "Erro ao confirmar recebimento";
"Erro ao fechar dia"; "Nao foi possivel copiar".

## 4. Historico de compras

Responsavel: qualquer usuario com sessao. Tela `/historico`. Mostra as proprias
requisicoes com numero, data, status e itens. Administrador enxerga todas.
Nada e gravado. Falha possivel: erro de leitura exibido na tela.

## 5. Requisicao de estoque (retirada interna)

| Campo | Conteudo |
|---|---|
| Responsavel | Operador |
| Tela inicial | `/` → "Requisicao de Estoque" → `/requisicao-interna` |

Etapas: escolher produto, informar quantidade, adicionar a lista, repetir,
escrever observacao opcional e enviar.

Validacoes: "Selecione um produto"; "Quantidade deve ser maior que zero";
"Produto ja adicionado"; "Adicione ao menos um item"; "Sessao expirada".

Dados gravados: `requisicoes_internas` (`status = "pendente"`) e
`requisicao_interna_itens`.

Mensagem de sucesso: "Requisicao enviada!". Falha: "Erro ao carregar produtos",
"Erro ao carregar estoque disponivel", "Erro: <causa>".

## 6. Retirada e atualizacao de quantidade em estoque

Responsavel: administrador. Telas `/admin/requisicoes-internas`, `/admin/estoque`
e `/admin/movimentacoes`. A aprovacao/entrega da requisicao interna gera
movimentacao de saida; o ajuste manual de saldo gera movimentacao de ajuste.
Toda movimentacao grava saldo antes e depois, produto, local, quantidade,
usuario e observacao.

## 7. Cancelamento e edicao

O solicitante pode editar (`/pedido/editar/$id`) ou excluir a propria requisicao
enquanto ela estiver **pendente**. Depois de decidida, apenas o administrador
altera. O cancelamento e feito pelo administrador na tela de requisicoes.

## 8. Notificacoes

Ao aprovar ou cancelar, o sistema chama a funcao `enviar-notificacao` com
usuario, titulo, corpo e endereco de destino. A falha em notificar nunca
interrompe a acao principal — apenas registra um aviso no console.
Status: NAO TESTADO ponta a ponta.

## 9. Acompanhamento pelo solicitante

Pela tela inicial: "Minhas Requisicoes de Estoque" e "Historico de Compras". O
status de cada pedido aparece como etiqueta (pendente, aprovada, cancelada,
recebida, entregue, rejeitada).

## 10. Tratamento de erros

- Erros de operacao aparecem como aviso na tela, com a causa.
- Erros graves de renderizacao no servidor sao capturados em `src/server.ts` e
  devolvem uma pagina de erro com a identidade da marca, em vez de texto tecnico.
- Sem internet, o aplicativo instalado abre com o conteudo em cache; acoes de
  gravacao falham ate a conexao voltar.

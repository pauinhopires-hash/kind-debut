# 09 — Resultado dos Testes

Data: 2026-09-27. Executados **somente testes seguros**, que nao criam, alteram
nem apagam qualquer dado de producao. Nenhuma publicacao foi feita.

## 1. Suite automatizada

Nao existe suite de testes automatizados no repositorio (sem Vitest, Jest,
Playwright ou script `test` no `package.json`). Classificacao: PENDENTE.

## 2. Testes executados

| # | Verificacao | Comando / acao | Resultado | Classificacao |
|---|---|---|---|---|
| 1 | Consistencia de tipos do codigo | `bunx tsgo --noEmit` | Sem erros | PASS |
| 2 | Geracao do pacote de producao | `vite build` | Concluido; dependencias embutidas no pacote do servidor | PASS |
| 3 | Aplicacao local responde | `GET http://localhost:8080/` | HTTP 200 | PASS |
| 4 | Tela de entrada local responde | `GET http://localhost:8080/login` | HTTP 200 | PASS |
| 5 | Site publicado no ar | `GET https://misturariafinamezclacompraseestoque.lovable.app/` | HTTP 200 | PASS |
| 6 | RLS ativa em todas as tabelas | leitura do catalogo do banco | 19/19 tabelas com RLS | PASS |
| 7 | Estrutura do banco documentada | comparacao catalogo x `schema.sql` | Coincidem | PASS |
| 8 | Entrada por PIN | teste de navegador executado em sessao anterior com um operador real | Entrou e chegou a tela inicial | PASS (execucao anterior) |

## 3. Nao testados

| Verificacao | Motivo | Classificacao |
|---|---|---|
| Envio de requisicao de compra ponta a ponta | Criaria dado real em producao | NAO TESTADO |
| Envio de requisicao interna ponta a ponta | Idem | NAO TESTADO |
| Aprovacao e fechamento do dia | Alteraria saldos reais | NAO TESTADO |
| Baixa e ajuste de estoque | Alteraria saldos reais | NAO TESTADO |
| Edicao e exclusao de requisicao pendente | Alteraria dados reais | NAO TESTADO |
| Notificacoes push | Depende de chaves VAPID nao confirmadas e de dispositivo real | NAO TESTADO |
| Exportacao para planilha (`/exportar`) | Nao exercitada | NAO TESTADO |
| Convite e recuperacao de senha de administrador | Enviaria e-mail real | NAO TESTADO |
| Comportamento sem conexao (offline) | Requer dispositivo real | NAO TESTADO |
| Restauracao de backup | Sem copia de dados disponivel | NAO TESTADO |

## 4. Falhas conhecidas e limitacoes

| Item | Situacao |
|---|---|
| Usuaria com papel duplo (`usuario` e `admin`) | PENDENTE |
| Alerta de seguranca "Signed-In Users Can Execute SECURITY DEFINER Function" | PENDENTE, aceito pelo responsavel |
| Permissoes amplas de escrita concedidas nas tabelas | PENDENTE de revisao |
| Importacao da planilha de produtos | PENDENTE |
| Ambiente de homologacao separado | Inexistente — BLOQUEADO enquanto houver instancia unica |

## 5. Lista de verificacao para ambiente de teste

Com o banco de teste criado a partir de `schema.sql` + `seed_ficticio.sql`:

1. Entrar como operador de teste com PIN.
2. Criar uma requisicao de compra com 2 itens e confirmar a mensagem de sucesso.
3. Conferir a requisicao em "Historico de Compras" com status pendente.
4. Editar a requisicao pendente e depois exclui-la.
5. Entrar como administrador, aprovar uma requisicao e confirmar o novo status.
6. Marcar itens como comprados na lista de compras e fechar o dia.
7. Conferir a entrada gerada em movimentacoes e o saldo em estoque.
8. Criar uma requisicao interna, aprovar e conferir a saida de estoque.
9. Fazer um ajuste manual de saldo e conferir o registro com saldo antes/depois.
10. Tentar abrir `/admin` com um operador e confirmar o redirecionamento.

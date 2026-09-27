# Plano de Rollback

## Quando usar

Quando uma publicacao deixa o aplicativo fora do ar, quebra o login, quebra o
envio de requisicoes ou corrompe saldos de estoque.

## A. Rollback do codigo (rapido, reversivel)

1. Abrir o historico de versoes do projeto na plataforma Lovable.
2. Restaurar a ultima versao que estava funcionando.
3. Publicar novamente.
4. Conferir: abrir a URL de producao, entrar com um PIN de teste e abrir uma
   tela que lista dados.

Tempo estimado: 5 minutos. Risco: baixo. Nao afeta dados.

Referencia segura conhecida: commit `7e60e1d` na branch
`edit/edt-17422137-a438-40d2-9187-eed3e456f3f5` (producao respondendo 200).

## B. Rollback de uma alteracao de banco

Migracoes sao aplicadas em avanco e nao possuem script de reversao automatico.
Procedimento:

1. Parar de usar a funcionalidade afetada.
2. Escrever e revisar a migracao inversa (por exemplo, remover a coluna criada,
   restaurar a politica anterior).
3. Aplicar em horario de baixo movimento.
4. Reverter tambem o codigo que dependia da mudanca.

Risco: alto quando envolve remocao de coluna ou tabela com dados. Sempre exportar
a tabela afetada antes.

## C. Rollback de dados operacionais

Nao ha desfazer nativo. Correcoes de saldo devem ser feitas por **ajuste**
registrado em `/admin/estoque`, que gera movimentacao com saldo antes e depois —
preservando a trilha de auditoria. Nunca apagar linhas de
`movimentacoes_estoque`.

## D. Falha na publicacao (site fora do ar)

Sintoma conhecido: erro 500/502 na URL de producao enquanto a pre-visualizacao
funciona. Causa ja registrada: dependencia deixada fora do pacote do servidor.
Verificar em `vite.config.ts` se `ssr.noExternal: true` continua ativo somente
no build, e em `src/server.ts` se a entrada do servidor segue importada de forma
estatica. Ambas as regras estao em `AGENTS.md`.

## Criterio de sucesso do rollback

Tela de entrada carrega, login por PIN funciona, `/pedido` lista produtos, e a
area `/admin` abre para um administrador.

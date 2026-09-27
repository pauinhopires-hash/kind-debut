# 08 — Backup e Restauracao

## 1. Situacao atual

| Item | Situacao |
|---|---|
| Backup automatico do banco | Gerenciado pela plataforma Lovable Cloud; periodicidade e retencao: NAO IDENTIFICADO pelo cliente |
| Backup manual do banco | Nao existe rotina configurada |
| Backup do codigo | Historico Git interno da plataforma (branch `edit/edt-17422137-a438-40d2-9187-eed3e456f3f5`, commit `7e60e1d`) |
| Copia externa fora da Lovable | Nao existe — este pacote e a primeira |
| Teste de restauracao | Nunca executado — NAO TESTADO |
| Responsavel pela rotina | NAO IDENTIFICADO |

## 2. O que precisa ser salvo

1. Estrutura do banco — coberta por `03_BANCO_DE_DADOS/schema.sql`,
   `FUNCOES_E_TRIGGERS.sql` e `migrations/`.
2. Dados operacionais — produtos, estoque, movimentacoes, requisicoes,
   funcionarios, fornecedores. **Nao incluidos neste pacote por decisao de
   privacidade.**
3. Contas de acesso — vivem no provedor de autenticacao e nao sao copiadas pelo
   schema.
4. Codigo-fonte — incluido em `02_CODIGO_FONTE/` e no repositorio.

## 3. Procedimento manual de backup de dados (recomendado)

Com acesso administrativo ao banco, exportar cada tabela do schema `public` em
CSV ou usar `pg_dump` com a string de conexao do projeto. Na Lovable Cloud a
senha do banco nao esta disponivel ao cliente, portanto esta rotina depende de
suporte da plataforma ou de uma exportacao feita pelas telas de administracao.

Frequencia recomendada: diaria para dados operacionais, e sempre antes de
qualquer migracao de banco.

## 4. Procedimento de restauracao em ambiente limpo

1. Criar um projeto Postgres/Supabase vazio.
2. Aplicar `schema.sql`, depois `FUNCOES_E_TRIGGERS.sql`, depois as politicas de
   `RLS_E_PERMISSOES.md` (ou, alternativamente, aplicar `migrations/` em ordem
   alfabetica, que ja contem tudo).
3. Importar os CSVs na ordem: `perfis`, `locais`, `funcoes`, `fornecedores`,
   `produtos`, `produto_fornecedores`, `produto_funcoes`, `estoque_atual`,
   `usuarios`, `user_roles`, `funcionarios`, `funcionario_pins`, `requisicoes`,
   `requisicao_itens`, `requisicoes_internas`, `requisicao_interna_itens`,
   `movimentacoes_estoque`, `config_sistema`, `push_subscriptions`.
4. Recriar os logins no provedor de autenticacao e reconectar `usuarios.id` e
   `funcionarios.user_id` aos novos identificadores.
5. Apontar o `.env` da aplicacao para o novo projeto e subir a aplicacao.
6. Validar com a lista de verificacao de `09_TESTES/RESULTADO_DOS_TESTES.md`.

Tempo estimado: 2 a 4 horas para quem tem os dados em maos. NAO TESTADO.

## 5. Pendencias criticas

- Definir responsavel e periodicidade do backup — PENDENTE.
- Confirmar com a plataforma a politica de retencao — PENDENTE.
- Executar ao menos um teste real de restauracao — PENDENTE.
- Guardar uma copia dos dados fora da plataforma — PENDENTE.

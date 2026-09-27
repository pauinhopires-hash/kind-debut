# 14 — Manual Tecnico

## 1. Visao da arquitetura

Aplicacao unica em TanStack Start v1 (React 19 + Vite 7), renderizada no
servidor em ambiente de borda e instalavel como aplicativo (PWA). Todo o estado
persistente vive no Postgres gerenciado do Lovable Cloud, acessado diretamente
pelo navegador com o token da sessao — a seguranca fica na RLS. Operacoes
privilegiadas (criar funcionario, convidar administrador) passam por funcoes de
servidor.

```text
Navegador (React, PWA)
   |  token da sessao
   +--> Postgres/Supabase  (RLS por usuario e papel)
   +--> Funcoes de servidor (createServerFn) --> operacoes privilegiadas
   +--> Funcao enviar-notificacao --> Web Push
```

## 2. Convencoes do codigo

- Uma tela por arquivo em `src/routes/`; o nome do arquivo define o endereco.
- Funcoes de servidor em `*.functions.ts`, helpers exclusivos de servidor em
  `*.server.ts` (nunca importados pelo navegador).
- Cliente do backend sempre por `@/integrations/supabase/client`.
- Cores, fontes e sombras vem de variaveis de tema em `src/styles.css`; nao usar
  cor fixa nos componentes.
- Arquivos gerados nao se editam: `src/routeTree.gen.ts`,
  `src/integrations/supabase/*`, `.env`, `supabase/config.toml`.

## 3. Regras obrigatorias (AGENTS.md)

1. A entrada do servidor e importada estaticamente em `src/server.ts`.
2. `ssr.noExternal: true` no `vite.config.ts` **somente** quando o comando e
   `build`. No desenvolvimento quebra o carregador de modulos; na producao, sem
   ela, o site responde 502.

## 4. Limitacoes do ambiente de execucao

Nao funcionam no servidor: `child_process`, `sharp`, `canvas`, `puppeteer`,
`fs.watch`, `os.cpus()`, e qualquer pacote com binario nativo. Funcionam:
`fs` (virtual), `path`, `crypto`, `Buffer`, `stream`, `url`, `events`, `timers`,
`zlib`. Todas as dependencias precisam ser empacotadas no build.

## 5. Como rodar localmente

```bash
bun install
cp PACOTE_TECNICO_COMPRAS_ESTOQUE_MISTURARIA/02_CODIGO_FONTE/.env.example .env  # preencher
bun run dev            # http://localhost:8080
bunx tsgo --noEmit     # checagem de tipos
bun run build          # pacote de producao
```

Detalhes em `02_CODIGO_FONTE/COMANDOS_EXECUCAO.md`.

## 6. Como adicionar uma tela

1. Criar `src/routes/minha-tela.tsx` com `createFileRoute`.
2. Definir `head()` com titulo e descricao proprios.
3. Se for area restrita, verificar a sessao e o papel como em `src/routes/admin.tsx`.
4. O arquivo de rotas gerado se atualiza sozinho.

## 7. Como alterar o banco

Sempre por migracao versionada. Em toda tabela nova do schema `public`, na mesma
migracao e nesta ordem: criar a tabela, conceder os grants, habilitar RLS, criar
as politicas. Tabela sem politica fica inacessivel; tabela sem grant retorna erro
de permissao mesmo com politica correta.

## 8. Diagnostico rapido

| Sintoma | Causa provavel |
|---|---|
| Site publicado com 500/502 e pre-visualizacao boa | Dependencia fora do pacote do servidor; conferir as duas regras da secao 3 |
| "permission denied for table X" | Falta grant ou politica |
| Consulta retorna vazio com dados no banco | Politica de RLS negando; conferir papel e `usuarios.ativo` |
| Erro citando `FileRoutesByPath` | Arquivo de tela referenciado nao existe |
| "Unauthorized" no build | Funcao protegida chamada no carregamento de uma tela publica |

## 9. Estado atual

Checagem de tipos limpa, build gerando pacote valido, producao respondendo 200.
Sem testes automatizados. Pendencias tecnicas em
`09_TESTES/RESULTADO_DOS_TESTES.md` e `10_SEGURANCA_E_PRIVACIDADE.md`.

# Comandos de Execucao

| Item | Valor | Classificacao |
|---|---|---|
| Framework | TanStack Start v1 (React 19 + TanStack Router) | COMPROVADO |
| Empacotador | Vite 7 | COMPROVADO |
| Estilos | Tailwind CSS v4 (via `src/styles.css`) | COMPROVADO |
| Linguagem | TypeScript 5.8 | COMPROVADO |
| Node utilizado no ambiente | v22.22.0 | COMPROVADO |
| Node minimo recomendado | 22 LTS | Recomendacao |
| Gerenciador de pacotes | Bun 1.3.3 (ha tambem `package-lock.json` para npm) | COMPROVADO |
| Runtime de producao | Ambiente de borda tipo Cloudflare Workers | COMPROVADO |
| Branch de origem | `edit/edt-17422137-a438-40d2-9187-eed3e456f3f5` | COMPROVADO |
| Commit de origem | `7e60e1d` | COMPROVADO |
| Repositorio Git | Repositorio privado interno da plataforma (sem GitHub conectado) | COMPROVADO |

## Instalacao

```bash
bun install
# ou
npm ci
```

## Desenvolvimento

```bash
bun run dev       # sobe em http://localhost:8080
```

## Build de producao

```bash
bun run build
```

## Build de desenvolvimento (com prerender)

```bash
bun run build:dev
```

## Execucao do build

```bash
bun run preview               # servidor de pre-visualizacao do Vite
node dist/server/server.js    # host Node autonomo (exige K_SERVICE e PORT definidos)
```

## Verificacao de tipos

```bash
bunx tsgo --noEmit
```

## Lint e formatacao

```bash
bun run lint
bun run format
```

## Testes

NAO EXISTE suite de testes automatizados no repositorio. Nao ha `bun test`,
`vitest` nem `playwright` configurados em `package.json`.

## Observacao critica de build

Em `vite.config.ts`, a opcao `ssr.noExternal: true` e aplicada **somente quando
`command === "build"`**. Isso e obrigatorio: o ambiente de borda nao resolve
modulos em tempo de execucao e a ausencia dessa opcao causa erro 502 no site
publicado (`No such module "h3-v2"`). Ativar essa opcao tambem em modo de
desenvolvimento quebra o servidor local.

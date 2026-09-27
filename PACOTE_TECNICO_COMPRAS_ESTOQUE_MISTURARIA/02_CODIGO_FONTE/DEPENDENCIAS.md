# Dependencias

Fonte: `package.json` do commit `7e60e1d`. `node_modules` NAO faz parte do pacote.

## Dependencias de producao

| Pacote | Versao | Finalidade |
|---|---|---|
| @tanstack/react-start | ^1.167.50 | Framework full-stack (SSR, funcoes de servidor) |
| @tanstack/react-router | ^1.168.25 | Roteamento por arquivos |
| @tanstack/router-plugin | ^1.167.28 | Geracao da arvore de rotas |
| @tanstack/react-query | ^5.83.0 | Cache e busca de dados |
| react / react-dom | ^19.2.0 | Interface |
| @supabase/supabase-js | ^2.106.1 | Cliente do backend (banco + autenticacao) |
| tailwindcss / @tailwindcss/vite | ^4.2.1 | Estilos |
| tw-animate-css | ^1.3.4 | Animacoes utilitarias |
| framer-motion | ^12.42.0 | Animacoes de interface |
| lucide-react | ^0.575.0 | Icones |
| sonner | ^2.0.7 | Mensagens de aviso na tela |
| zod | ^3.24.2 | Validacao de dados |
| react-hook-form / @hookform/resolvers | ^7.71.2 / ^5.2.2 | Formularios |
| recharts | ^2.15.4 | Graficos |
| xlsx (SheetJS 0.20.3, via CDN) | tarball | Exportacao para planilha |
| date-fns | ^4.1.0 | Datas |
| class-variance-authority, clsx, tailwind-merge | — | Composicao de classes CSS |
| cmdk, vaul, input-otp, embla-carousel-react, react-day-picker, react-resizable-panels | — | Componentes de interface |
| @radix-ui/react-* (26 pacotes) | — | Base acessivel dos componentes (shadcn/ui) |
| srvx | ^0.11.9 | Servidor HTTP apenas para host Node autonomo |
| nitro | 3.0.260603-beta | Dependencia transitiva do empacotamento de servidor |
| vite-tsconfig-paths | ^6.0.2 | Resolucao dos atalhos `@/` |

## Dependencias de desenvolvimento

| Pacote | Versao |
|---|---|
| vite | ^7.3.1 |
| @vitejs/plugin-react | ^5.0.4 |
| vite-plugin-pwa | ^1.3.0 |
| workbox-window | ^7.4.1 |
| typescript | ^5.8.3 |
| typescript-eslint | ^8.56.1 |
| eslint + @eslint/js | ^9.32.0 |
| eslint-config-prettier, eslint-plugin-prettier | ^10.1.1 / ^5.2.6 |
| eslint-plugin-react-hooks, eslint-plugin-react-refresh | ^5.2.0 / ^0.4.20 |
| prettier | ^3.7.3 |
| globals | ^15.15.0 |
| @types/node, @types/react, @types/react-dom | ^22.16.5 / ^19.2.0 / ^19.2.0 |

## Dependencias exclusivas da plataforma Lovable

| Item | Impacto fora da Lovable |
|---|---|
| `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `previewAuthStorage.ts`, `types.ts` | Arquivos gerados automaticamente; fora da plataforma precisam ser mantidos a mao |
| Variaveis `VITE_SUPABASE_*` injetadas pela plataforma | Precisam ser definidas manualmente |
| Ambiente de borda gerenciado pela Lovable | Substituivel por Cloudflare Workers proprio ou host Node com `K_SERVICE` |
| Publicacao por botao na Lovable | Substituivel por pipeline proprio |
| Backend Lovable Cloud (instancia Supabase gerenciada) | A chave administrativa e a senha do banco nao sao acessiveis ao cliente; migrar exige um projeto Supabase proprio |

## Restricoes do runtime de borda

Nao funcionam no servidor: `child_process`, `sharp`, `canvas`, `puppeteer`,
`fs.watch`, `os.cpus()`, e qualquer pacote com binario nativo.

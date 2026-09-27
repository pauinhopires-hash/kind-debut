# Estrutura de Pastas

Arvore do repositorio no commit `7e60e1d` (sem `node_modules`, `dist`, `.git` e arquivos temporarios).

```text
.
|-- .env
|-- .gitignore
|-- .prettierignore
|-- .prettierrc
|-- AGENTS.md
|-- NOTES.md
|-- bun.lock
|-- components.json
|-- eslint.config.js
|-- package-lock.json
|-- package.json
|-- public
|   |-- apple-touch-icon.png
|   |-- favicon.ico
|   |-- icon-192.png
|   |-- icon-512.png
|   |-- manifest.webmanifest
|   `-- push-sw.js
|-- roadmap.md
|-- src
|   |-- components
|   |   |-- filtro-pill.tsx
|   |   |-- indicadores-charts.tsx
|   |   |-- skeleton.tsx
|   |   `-- ui
|   |       |-- accordion.tsx
|   |       |-- alert-dialog.tsx
|   |       |-- alert.tsx
|   |       |-- aspect-ratio.tsx
|   |       |-- avatar.tsx
|   |       |-- badge.tsx
|   |       |-- breadcrumb.tsx
|   |       |-- button.tsx
|   |       |-- calendar.tsx
|   |       |-- card.tsx
|   |       |-- carousel.tsx
|   |       |-- chart.tsx
|   |       |-- checkbox.tsx
|   |       |-- collapsible.tsx
|   |       |-- command.tsx
|   |       |-- context-menu.tsx
|   |       |-- dialog.tsx
|   |       |-- drawer.tsx
|   |       |-- dropdown-menu.tsx
|   |       |-- form.tsx
|   |       |-- hover-card.tsx
|   |       |-- input-otp.tsx
|   |       |-- input.tsx
|   |       |-- label.tsx
|   |       |-- menubar.tsx
|   |       |-- navigation-menu.tsx
|   |       |-- pagination.tsx
|   |       |-- popover.tsx
|   |       |-- progress.tsx
|   |       |-- radio-group.tsx
|   |       |-- resizable.tsx
|   |       |-- scroll-area.tsx
|   |       |-- select.tsx
|   |       |-- separator.tsx
|   |       |-- sheet.tsx
|   |       |-- sidebar.tsx
|   |       |-- skeleton.tsx
|   |       |-- slider.tsx
|   |       |-- sonner.tsx
|   |       |-- switch.tsx
|   |       |-- table.tsx
|   |       |-- tabs.tsx
|   |       |-- textarea.tsx
|   |       |-- toggle-group.tsx
|   |       |-- toggle.tsx
|   |       `-- tooltip.tsx
|   |-- hooks
|   |   |-- use-auth.ts
|   |   |-- use-confirm.tsx
|   |   |-- use-mobile.tsx
|   |   |-- use-persisted-state.ts
|   |   `-- use-voltar-avancar.ts
|   |-- integrations
|   |   `-- supabase
|   |       |-- auth-attacher.ts
|   |       |-- auth-middleware.ts
|   |       |-- client.server.ts
|   |       |-- client.ts
|   |       |-- previewAuthStorage.ts
|   |       `-- types.ts
|   |-- lib
|   |   |-- admin-invite.functions.ts
|   |   |-- error-capture.ts
|   |   |-- error-page.ts
|   |   |-- funcionarios.functions.ts
|   |   |-- motion.ts
|   |   |-- notificar.ts
|   |   |-- pin.ts
|   |   |-- push.ts
|   |   |-- register-sw.ts
|   |   |-- utils.ts
|   |   `-- whatsapp.ts
|   |-- routeTree.gen.ts
|   |-- router.tsx
|   |-- routes
|   |   |-- __root.tsx
|   |   |-- admin.estoque.tsx
|   |   |-- admin.funcionarios.tsx
|   |   |-- admin.index.tsx
|   |   |-- admin.lista-compras.tsx
|   |   |-- admin.movimentacoes.tsx
|   |   |-- admin.perfis.tsx
|   |   |-- admin.produtos.tsx
|   |   |-- admin.requisicoes-internas.tsx
|   |   |-- admin.requisicoes.tsx
|   |   |-- admin.tsx
|   |   |-- admin.usuarios.tsx
|   |   |-- exportar.tsx
|   |   |-- forgot-password.tsx
|   |   |-- historico-interno.tsx
|   |   |-- historico.tsx
|   |   |-- index.tsx
|   |   |-- login.tsx
|   |   |-- pedido.editar.$id.tsx
|   |   |-- pedido.tsx
|   |   |-- requisicao-interna.tsx
|   |   `-- reset-password.tsx
|   |-- server.ts
|   |-- start.ts
|   `-- styles.css
|-- supabase
|   |-- config.toml
|   |-- functions
|   |   `-- enviar-notificacao
|   |       `-- index.ts
|   `-- migrations
|       |-- 20260525020045_a45e5e56-8481-4078-9308-0291264eb466.sql
|       |-- 20260525020105_417efa16-e037-444f-a753-e3b4193e5153.sql
|       |-- 20260527000428_fc96a57d-1511-4e11-a758-1045d95bfba9.sql
|       |-- 20260527000443_40dbec0d-89fe-431e-84eb-2b99abeb4c12.sql
|       |-- 20260527000509_9466455f-ec8a-440d-9952-e1db7050a318.sql
|       |-- 20260528015640_a6eca63b-ce92-4029-8150-8c16d673ef97.sql
|       |-- 20260530020945_927bdda1-0ce9-4085-854d-2bcefd4003d5.sql
|       |-- 20260530021758_3e725a6f-086e-414b-aa41-9546e1fbc2e1.sql
|       |-- 20260531022644_61b0d4b0-0285-486c-8e0b-82a566dd41c8.sql
|       |-- 20260601212505_8fc87926-c71e-4a07-9dc0-0265e71fa582.sql
|       |-- 20260602033650_e13756c5-2548-4bcf-b01b-1ba557505cad.sql
|       |-- 20260608004916_e4c51119-bdd6-47ee-a83c-c51b1c9ee7bd.sql
|       |-- 20260609012948_bb1b4e18-67d1-48d1-acb8-c03e09e2638a.sql
|       |-- 20260609013847_895dc2f7-6c66-4fd3-a065-bb9c85902952.sql
|       |-- 20260609014939_66bd4dee-b440-469c-94a6-1cdb812c4b74.sql
|       |-- 20260609021954_8b4de0c7-8306-4559-bb28-2a291a68ee81.sql
|       |-- 20260609022015_18c41241-011b-42fe-bac2-c3cbdbb420a0.sql
|       |-- 20260609022036_acc9a5f2-6529-4a33-a531-b5a9eab0c48d.sql
|       |-- 20260609022055_57078e3f-d62e-47e1-93dd-e77ab446dbe5.sql
|       |-- 20260609022625_f2d1d842-bd2a-47e6-82af-30dec67080b2.sql
|       |-- 20260609023727_cd6800bc-fadf-4fb9-95f0-36b84da02ea7.sql
|       |-- 20260609051441_03874770-e9bd-4644-9008-e34abefee602.sql
|       |-- 20260614220824_164a760f-3eba-48a1-823e-10adbff466c7.sql
|       |-- 20260614221219_df0c25b5-d206-4156-bfbb-1a07f073cce0.sql
|       |-- 20260710005935_add_recebida_status_to_requisicoes.sql
|       |-- 20260710010500_create_producao_module.sql
|       |-- 20260710023526_reconcile_schema_drift_and_missing_role_system.sql
|       |-- 20260710120000_estoque_local_dimension_additive.sql
|       |-- 20260710123000_drop_legacy_estoque_produto_unique.sql
|       |-- 20260710130000_create_import_estoque_rows_function.sql
|       |-- 20260721010000_create_fornecedores.sql
|       |-- 20260721210000_create_funcoes.sql
|       |-- 20260721211500_update_import_estoque_rows_funcoes.sql
|       |-- 20260721220000_add_funcao_to_usuarios.sql
|       |-- 20260721230000_add_perfis_admin_write_policy.sql
|       |-- 20260927134500_d5838012-a41c-440a-8156-9baab5afb7a3.sql
|       |-- 20260927134922_69fc5eac-0b5b-451c-95a4-fe5a05dcb045.sql
|       |-- 20260927135033_7733cced-4ad4-4d4d-be67-b3f8d15e7930.sql
|       |-- 20260927135315_cfc6bee0-e141-4f36-aa9a-2f212cd2ecae.sql
|       `-- 20260927140146_ada21c49-7be9-454f-a147-b74557a7e096.sql
|-- tsconfig.json
`-- vite.config.ts

14 directories, 160 files
```

## Papel de cada pasta

| Caminho | Conteudo |
|---|---|
| `public/` | Icones, manifesto do aplicativo instalavel e complemento do service worker de notificacoes |
| `src/routes/` | Uma tela por arquivo; o nome do arquivo define o endereco da tela |
| `src/routes/__root.tsx` | Moldura comum a todas as telas (fontes, avisos, tema) |
| `src/components/ui/` | Componentes visuais base (shadcn/ui sobre Radix) |
| `src/components/` | Componentes proprios do produto |
| `src/hooks/` | Comportamentos reutilizaveis (sessao, confirmacao, navegacao, persistencia) |
| `src/lib/` | Regras auxiliares: PIN, WhatsApp, notificacoes, funcoes de servidor, tratamento de erro |
| `src/integrations/supabase/` | Conexao com o backend — arquivos gerados automaticamente |
| `src/server.ts` | Entrada do servidor com tratamento de erro de renderizacao |
| `src/start.ts` | Middlewares de requisicao e de funcoes de servidor |
| `src/router.tsx` | Criacao do roteador e do cache de dados |
| `src/styles.css` | Tema, cores e tipografia da marca |
| `supabase/migrations/` | Historico versionado do banco (40 arquivos) |
| `supabase/functions/enviar-notificacao/` | Funcao de envio de notificacao |
| `AGENTS.md` | Regras tecnicas obrigatorias do projeto |
| `NOTES.md`, `roadmap.md` | Anotacoes e lista de tarefas do produto |

## Arquivos gerados — nao editar manualmente

`src/routeTree.gen.ts`, `src/integrations/supabase/*`, `.env`, `supabase/config.toml`.

# 06 — Integracoes

Nenhum valor secreto e reproduzido neste documento.

## 1. Backend Lovable Cloud (Supabase)

| Item | Conteudo |
|---|---|
| Finalidade | Banco de dados, autenticacao e execucao de funcoes |
| Onde esta configurada | `src/integrations/supabase/client.ts` (navegador), `client.server.ts` (servidor), `auth-middleware.ts`, `auth-attacher.ts` — todos gerados automaticamente |
| Variaveis necessarias | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (e equivalentes sem prefixo no servidor) |
| Dados enviados | Consultas e gravacoes das telas, sempre com o token da sessao |
| Dados recebidos | Linhas das tabelas permitidas pela RLS, sessao e papeis |
| Autenticacao | E-mail e senha; token JWT anexado automaticamente |
| Dependencia externa | Total: sem o backend o aplicativo nao funciona |
| Custo | Incluso no plano Lovable Cloud |
| Teste | Entrar no aplicativo e abrir uma tela que lista dados |
| Em caso de falha | Telas exibem "Erro ao carregar" com a causa; nada e gravado |

A chave administrativa (service role) e a senha do banco nao sao acessiveis na
Lovable e nao constam deste pacote.

## 2. Notificacoes push (Web Push)

| Item | Conteudo |
|---|---|
| Finalidade | Avisar o solicitante quando a requisicao e aprovada ou cancelada |
| Onde esta configurada | `public/push-sw.js`, `src/lib/push.ts`, `src/lib/notificar.ts`, `src/lib/register-sw.ts`, funcao `supabase/functions/enviar-notificacao/index.ts`, tabela `push_subscriptions` |
| Variaveis necessarias | Chaves VAPID (publica e privada) — NAO IDENTIFICADO se estao configuradas |
| Dados enviados | Identificador do usuario, titulo, corpo e endereco de destino |
| Dados recebidos | Confirmacao de envio |
| Autenticacao | Chamada autenticada a funcao |
| Dependencia externa | Servico de push do navegador (Google/Apple/Mozilla) |
| Custo | Gratuito |
| Teste | Ativar o sino na tela inicial e aprovar uma requisicao de teste |
| Em caso de falha | Silenciosa por desenho: a acao principal e concluida e a falha vira aviso no console |
| Status | NAO TESTADO ponta a ponta |

## 3. WhatsApp

| Item | Conteudo |
|---|---|
| Finalidade | Abrir uma conversa ja com o pedido de cotacao ou a lista de compras escrita |
| Onde esta configurada | `src/lib/whatsapp.ts`; usada nas telas de requisicoes e lista de compras |
| Variaveis necessarias | Nenhuma |
| Dados enviados | Somente o texto montado no link `wa.me`; o envio e confirmado manualmente pela pessoa |
| Autenticacao | Nenhuma — nao ha API paga |
| Dependencia externa | WhatsApp instalado ou WhatsApp Web |
| Custo | Zero |
| Teste | Tocar em compartilhar e conferir a mensagem montada |
| Em caso de falha | O link nao abre; a operacao no aplicativo nao e afetada |

Observacao: numeros com ate 11 digitos recebem o codigo `55` automaticamente.

## 4. Exportacao para planilha

| Item | Conteudo |
|---|---|
| Finalidade | Baixar dados em formato de planilha |
| Onde esta configurada | Biblioteca SheetJS (`xlsx` 0.20.3, instalada via CDN oficial) e a tela `/exportar` |
| Dependencia externa | O pacote e baixado do CDN da SheetJS na instalacao |
| Custo | Zero (versao comunitaria) |
| Status | NAO TESTADO neste pacote |

## 5. Aplicativo instalavel e cache offline (PWA)

| Item | Conteudo |
|---|---|
| Finalidade | Instalar no celular e funcionar com conexao instavel |
| Onde esta configurada | `vite.config.ts` (plugin PWA + Workbox), `public/manifest.webmanifest`, `public/push-sw.js` |
| Estrategias | Navegacao: rede primeiro com 4s de espera; arquivos com hash: cache primeiro; fontes do Google: cache com revalidacao |
| Custo | Zero |
| Em caso de falha | O aplicativo continua funcionando como site comum |

## 6. Fontes Google

Carregadas por `<link>` na moldura das telas (`src/routes/__root.tsx`): Bebas Neue
(titulos) e Inter (texto). Dependencia externa do dominio `fonts.googleapis.com`,
com cache local. Sem custo.

## 7. E-mail

Usado apenas para recuperacao de senha e convite de administrador, atraves do
provedor de autenticacao do backend. Nao existe integracao de e-mail
transacional propria. Remetente e dominio de envio: NAO IDENTIFICADO.

## 8. Webhooks, APIs externas e automacoes

Nenhum webhook, nenhuma API externa de terceiros e nenhuma automacao agendada
foram identificados no repositorio. Nao ha uso de armazenamento de arquivos
(storage).

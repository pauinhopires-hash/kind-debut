# 07 — Publicacao e Infraestrutura

## 1. Onde o aplicativo esta hospedado

Plataforma Lovable. O servidor roda em ambiente de borda do tipo Cloudflare
Workers; os arquivos estaticos sao servidos pela propria rede da plataforma. O
banco de dados e a autenticacao ficam no Lovable Cloud (instancia Supabase
gerenciada).

## 2. Ambientes

| Ambiente | Endereco | Banco |
|---|---|---|
| Desenvolvimento | `http://localhost:8080` | mesma instancia de producao |
| Pre-visualizacao | `https://id-preview--3c5020ac-c411-444e-b122-1c6b9d236c01.lovable.app` | mesma instancia de producao |
| Producao | `https://misturariafinamezclacompraseestoque.lovable.app` | mesma instancia |

Nao existe ambiente de homologacao isolado. **Toda alteracao de dados feita em
pre-visualizacao afeta a producao.**

Enderecos estaveis alternativos (nao mudam se o projeto for renomeado):
`project--3c5020ac-c411-444e-b122-1c6b9d236c01.lovable.app` (producao) e
`project--3c5020ac-c411-444e-b122-1c6b9d236c01-dev.lovable.app` (pre-visualizacao).

## 3. Como o build e gerado

`vite build` produz o pacote do cliente e o pacote do servidor. Pontos
obrigatorios, registrados em `AGENTS.md`:

1. A entrada do servidor e importada de forma estatica em `src/server.ts`, para
   que tudo seja empacotado junto.
2. `ssr.noExternal: true` e aplicado **apenas** no build. O ambiente de borda nao
   resolve modulos em tempo de execucao; sem essa opcao o site publicado responde
   erro 502 (`No such module "h3-v2"`). Com a opcao ativa em desenvolvimento, o
   servidor local quebra.
3. Nunca definir `ssr.external` ou `resolve.external` — causa falha de build.

## 4. Como publicar uma atualizacao

Pelo botao de publicar da plataforma Lovable. A propagacao leva cerca de um
minuto. Verificacao recomendada apos publicar: abrir a URL de producao e
confirmar que a tela de entrada carrega.

## 5. Como voltar a versao anterior

A plataforma mantem o historico de versoes do codigo; e possivel restaurar uma
versao anterior e publicar de novo. Rollback do **banco** e um processo separado
e nao automatico — ver `PLANO_DE_ROLLBACK.md`.

## 6. Dominio e redirecionamentos

| Item | Situacao |
|---|---|
| Dominio Lovable | `misturariafinamezclacompraseestoque.lovable.app` (renomeado a partir de um nome anterior) |
| Dominio proprio | Nenhum conectado |
| Redirecionamentos | Nenhum configurado |
| Certificado HTTPS | Gerenciado pela plataforma |

## 7. Variaveis de ambiente

Apenas as listadas em `02_CODIGO_FONTE/.env.example`. Sao injetadas pela
plataforma e o arquivo `.env` e gerado automaticamente — nao deve ser editado a
mao. Nenhum segredo adicional esta cadastrado no produto.

## 8. Dependencias exclusivas da Lovable

- Arquivos de conexao com o backend gerados automaticamente.
- Injecao das variaveis de ambiente.
- Publicacao e historico de versoes.
- Repositorio Git privado interno (sem GitHub conectado).
- Backend Lovable Cloud, cuja chave administrativa e senha do banco nao sao
  acessiveis ao cliente.

## 9. Como executar ou migrar para outro provedor

1. Criar um projeto Supabase proprio, aplicar `03_BANCO_DE_DADOS/schema.sql`,
   `FUNCOES_E_TRIGGERS.sql` e as politicas de `RLS_E_PERMISSOES.md` (ou aplicar
   `migrations/` em ordem).
2. Preencher o `.env` com URL, chave publicavel e identificador do novo projeto.
3. Escolher o destino:
   - **Cloudflare Workers proprio**: manter `ssr.noExternal` no build e publicar
     o pacote de servidor gerado.
   - **Host Node autonomo (Cloud Run, App Hosting, VPS)**: definir `K_SERVICE` e
     `PORT`; `src/server.ts` sobe um servidor HTTP e serve os arquivos do cliente.
     Comando: `node dist/server/server.js`.
4. Recriar os logins: os usuarios vivem no provedor de autenticacao e nao sao
   copiados pelo schema. Operadores precisam ser recriados com o padrao de
   e-mail e senha descrito em `04_LOGIN_E_PERMISSOES.md`.

Historico relevante: houve uma tentativa anterior de migracao para Firebase App
Hosting que quebrou o site publicado; a configuracao foi removida e a decisao
registrada e permanecer na Lovable.

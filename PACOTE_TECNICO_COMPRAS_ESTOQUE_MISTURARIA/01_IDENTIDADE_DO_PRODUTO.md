# 01 — Identidade do Produto

| Campo | Valor | Classificacao |
|---|---|---|
| Nome oficial do aplicativo | Misturaria Fina Mezcla — Compras e Estoque | COMPROVADO |
| URL publica | https://misturariafinamezclacompraseestoque.lovable.app/ | COMPROVADO |
| URL de pre-visualizacao | https://id-preview--3c5020ac-c411-444e-b122-1c6b9d236c01.lovable.app | COMPROVADO |
| Data desta versao do pacote | 2026-09-27 | COMPROVADO |
| Versao do produto | NAO IDENTIFICADO (nao ha versionamento semantico no repositorio; `package.json` nao declara `version`) | NAO COMPROVADO |
| Identificador da versao | branch `edit/edt-17422137-a438-40d2-9187-eed3e456f3f5`, commit `7e60e1d` | COMPROVADO |
| Estado atual | Publicado e respondendo | COMPROVADO |
| Registro | Produto operacional do MIOS | Declarado pelo responsavel |

## Objetivo operacional

Centralizar, em um unico aplicativo de celular (PWA), dois processos diarios da
Misturaria Fina Mezcla:

1. **Requisicao de compras** — a equipe pede o que falta; a administracao consolida
   uma lista diaria de compras, marca o que foi comprado e fecha o dia dando entrada
   no estoque.
2. **Requisicao interna / baixa de estoque** — a equipe retira itens do estoque
   central e o sistema registra a movimentacao.

## Problema que resolve

Substitui pedidos informais (papel, WhatsApp solto, memoria) por um registro
rastreavel: quem pediu, o que pediu, quanto, quando foi aprovado, quem comprou e
como o estoque mudou.

## Publico e usuarios

| Perfil | Como entra | Uso principal |
|---|---|---|
| Funcionario/operador | PIN numerico (4 a 6 digitos) escolhendo o proprio nome | Criar requisicoes de compra e de estoque, acompanhar o proprio historico |
| Administrador | E-mail e senha | Aprovar, editar, consolidar a lista de compras, fechar o dia, gerir produtos, estoque, funcionarios e usuarios |

Quantidade de funcionarios cadastrados: 12 (COMPROVADO; nomes e PINs nao sao
exportados neste pacote por serem dados pessoais/credenciais).

## Principais modulos

| Modulo | Telas | Estado |
|---|---|---|
| Acesso | `/login`, `/forgot-password`, `/reset-password` | FUNCIONANDO |
| Painel do operador | `/` | FUNCIONANDO |
| Compras | `/pedido`, `/pedido/editar/$id`, `/historico` | FUNCIONANDO |
| Estoque interno | `/requisicao-interna`, `/historico-interno` | FUNCIONANDO |
| Administracao | `/admin`, `/admin/lista-compras`, `/admin/requisicoes`, `/admin/requisicoes-internas`, `/admin/produtos`, `/admin/estoque`, `/admin/movimentacoes`, `/admin/funcionarios`, `/admin/usuarios`, `/admin/perfis` | FUNCIONANDO |
| Exportacao | `/exportar` | NAO TESTADO neste pacote |
| Notificacoes push | Service worker + tabela `push_subscriptions` | NAO TESTADO ponta a ponta |

## Funcionalidades existentes (COMPROVADO no codigo)

- Entrada por PIN com selecao de nome e teclado numerico; alternancia para acesso
  de administrador por e-mail e senha.
- Recuperacao de senha por e-mail (apenas para contas de administrador).
- Criacao de requisicao de compra com produtos, quantidades decimais (KG/LT),
  unidade opcional por item e nome personalizado de item.
- Repetir o ultimo pedido.
- Edicao e exclusao de requisicoes pendentes.
- Aprovacao ou cancelamento de requisicoes pelo administrador (protegida tambem
  no banco por gatilho).
- Lista diaria de compras consolidada, com marcar/desmarcar comprado, descartar e
  restaurar item, confirmar recebimento e "fechar o dia" dando entrada no estoque.
- Compartilhamento da lista por WhatsApp e copia para a area de transferencia.
- Requisicao interna de estoque com validacao de quantidade e de item duplicado.
- Registro de movimentacoes de estoque (entrada, saida, ajuste) com estoque antes
  e depois.
- Cadastro de produtos, estoque por local, funcionarios e PINs, usuarios e perfis.
- Convite de administrador.
- Funcionamento offline basico e instalacao como aplicativo (PWA).

## Funcionalidades incompletas / pendentes

| Item | Situacao |
|---|---|
| Notificacoes push | Infraestrutura pronta (service worker, tabela, funcao `enviar-notificacao`), fluxo completo NAO TESTADO |
| Importacao da planilha de produtos | PENDENTE — nunca executada |
| Usuaria com dois papeis simultaneos (`usuario` + `admin`) | PENDENTE — situacao conhecida, nao resolvida |
| Alerta de seguranca "Signed-In Users Can Execute SECURITY DEFINER Function" | PENDENTE — aceito conscientemente |
| Tela `/exportar` | Existe no codigo; comportamento NAO TESTADO neste pacote |
| Suite de testes automatizados | NAO EXISTE |

## Funcionalidades planejadas e nao implementadas

- Hierarquia de usuarios — REJEITADA pelo responsavel, nao implementar.
- Fusao com outro aplicativo — REJEITADA, os aplicativos seguem separados.
- Migracao para Firebase App Hosting — DESCARTADA; o produto permanece na Lovable.

## Limitacoes conhecidas

- O servidor roda em ambiente de borda (sem sistema de arquivos tradicional nem
  processos filhos); bibliotecas exclusivas de Node.js nao funcionam.
- Todas as dependencias precisam ser embutidas no pacote de producao
  (`ssr.noExternal` no build), caso contrario o site publicado responde erro 502.
- Nao ha ambiente de homologacao separado: existem apenas pre-visualizacao e producao,
  ambos ligados ao mesmo banco de dados.

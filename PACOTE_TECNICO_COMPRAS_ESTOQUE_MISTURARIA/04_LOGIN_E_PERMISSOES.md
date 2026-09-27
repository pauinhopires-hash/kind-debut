# 04 — Login, Usuarios e Permissoes

## 1. Provedor de autenticacao

Autenticacao por e-mail e senha do backend gerenciado (Lovable Cloud / Supabase
GoTrue). Nao ha login social ativo, nao ha cadastro aberto ao publico e nao ha
login anonimo.

## 2. Como o login funciona

### 2.1 Operador (PIN)

1. A tela `/login` lista os funcionarios ativos (leitura permitida sem sessao
   pela politica `funcionarios_select_ativos`, que expoe apenas nomes ativos).
2. O operador toca no proprio nome e digita o PIN no teclado numerico.
3. O aplicativo converte nome e PIN em credenciais:
   - e-mail: `slug-do-nome@misturaria.app` (acentos removidos, espacos viram ponto);
   - senha: `mfm-<PIN>-<slug>`.
4. Faz login com e-mail e senha e redireciona para a tela inicial `/`.
5. PIN errado exibe: "PIN incorreto. Tente de novo."

O PIN nunca e usado como senha direta: a senha real combina PIN e identificador
do login para atingir o tamanho minimo exigido pelo provedor.

### 2.2 Administrador (e-mail e senha)

Na mesma tela, a aba "Administrador" pede e-mail e senha reais e faz login
padrao. Recuperacao de senha em `/forgot-password`, com redefinicao em
`/reset-password` (fluxo disponivel apenas para contas com e-mail real).

## 3. Criacao e desativacao de usuarios

| Acao | Como |
|---|---|
| Criar operador | Tela `/admin/funcionarios`; a funcao de servidor `salvarFuncionario` (restrita a administrador) cria o login, a linha em `funcionarios` e o PIN em `funcionario_pins` |
| Trocar PIN | Mesma tela; atualiza `funcionario_pins` e a senha do login |
| Desativar operador | Marcar `funcionarios.ativo = false` — some da lista de PIN; ou remover pela funcao `removerFuncionario` |
| Criar administrador | Convite por e-mail (`src/lib/admin-invite.functions.ts`) |
| Desativar usuario | Marcar `usuarios.ativo = false`; `is_active_user` passa a negar leituras de catalogo |
| Papel de um usuario | Linha em `user_roles`; o primeiro usuario criado vira `admin` automaticamente pelo gatilho `grant_first_admin` |

## 4. Protecao das rotas

- Todas as telas exigem sessao; sem sessao o aplicativo redireciona para `/login`.
- A area `/admin/*` tem uma barreira propria: consulta `has_role(uid, 'admin')`
  no banco. Quem nao e administrador e devolvido para `/`.
- Regra critica: a verificacao de administrador e feita **no banco**, nunca em
  armazenamento local do navegador.

## 5. Regras de acesso ao banco

RLS ativa em todas as 19 tabelas. Resumo:

| Grupo de tabelas | Leitura | Escrita |
|---|---|---|
| `produtos`, `funcoes`, `locais`, `perfis` | usuario ativo ou administrador | apenas administrador |
| `fornecedores`, `produto_fornecedores` | apenas administrador | apenas administrador |
| `estoque_atual` | administrador, ou usuario cujo perfil corresponde ao produto | apenas administrador |
| `movimentacoes_estoque`, `config_sistema` | apenas administrador | apenas administrador |
| `funcionarios` | nomes ativos visiveis para a tela de PIN; visao completa so para administrador | apenas administrador |
| `funcionario_pins` | apenas administrador | apenas administrador |
| `requisicoes` e itens | o proprio solicitante e o administrador | solicitante cria/edita enquanto pendente; mudanca de status so por administrador (bloqueio por gatilho no banco) |
| `requisicoes_internas` e itens | o proprio solicitante e o administrador | idem |
| `usuarios` | o proprio registro; administrador enxerga todos | insercao direta bloqueada; alteracao so por administrador |
| `user_roles` | conforme politica; papel verificado por funcao segura | apenas administrador |
| `push_subscriptions` | o proprio dispositivo/usuario | o proprio usuario |

Detalhe politica por politica em `03_BANCO_DE_DADOS/RLS_E_PERMISSOES.md`.

## 6. Matriz de permissoes

| Perfil | Pode visualizar | Pode criar | Pode editar | Pode aprovar | Pode excluir | Pode administrar |
|---|---|---|---|---|---|---|
| Operador (PIN) | Produtos do seu perfil, saldo do seu perfil, as proprias requisicoes | Requisicao de compra e requisicao interna | As proprias requisicoes enquanto pendentes | Nao | As proprias requisicoes pendentes | Nao |
| Administrador | Tudo | Tudo | Tudo | Sim (compras e internas) | Sim | Sim (produtos, estoque, funcionarios, usuarios, perfis, configuracoes) |
| Visitante sem sessao | Apenas a lista de nomes ativos na tela de entrada | Nao | Nao | Nao | Nao | Nao |

Nao existe perfil intermediario de "gestor" no sistema. Onde este pacote fala em
"gestor", trata-se do administrador.

## 7. Riscos e permissoes amplas identificadas

| Risco | Detalhe | Classificacao |
|---|---|---|
| Senha deduzivel a partir do PIN | Quem conhece o nome e o PIN de alguem entra como essa pessoa; o padrao da senha e conhecido pelo codigo do navegador | PENDENTE de decisao |
| PIN curto | 4 a 6 digitos, sem bloqueio por tentativas | PENDENTE |
| Lista de nomes publica | A tela de entrada expoe nomes de funcionarios ativos sem sessao | Aceito por desenho |
| Grants amplos para `anon`/`authenticated` | Controle efetivo fica so na RLS; sem defesa em profundidade | PENDENTE |
| Alerta "Signed-In Users Can Execute SECURITY DEFINER Function" | Aviso pre-existente do scanner | PENDENTE, aceito |
| Usuaria com dois papeis (`usuario` e `admin`) | Situacao conhecida e nao resolvida | PENDENTE |

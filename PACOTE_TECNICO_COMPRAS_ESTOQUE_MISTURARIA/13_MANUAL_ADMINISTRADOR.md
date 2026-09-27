# 13 — Manual do Administrador

## Telas de administracao

| Tela | Para que serve |
|---|---|
| `/admin` | Painel inicial da administracao |
| `/admin/requisicoes` | Aprovar, corrigir ou cancelar pedidos de compra |
| `/admin/lista-compras` | Montar a compra do dia e fechar o dia |
| `/admin/requisicoes-internas` | Liberar retiradas do estoque |
| `/admin/estoque` | Saldo por produto e por local, e ajustes |
| `/admin/movimentacoes` | Historico de entradas, saidas e ajustes |
| `/admin/produtos` | Cadastro de produtos |
| `/admin/funcionarios` | Operadores e PINs |
| `/admin/usuarios` | Usuarios com login por e-mail |
| `/admin/perfis` | Setores usados para filtrar produtos |

## Cadastrar um produto

Em "Produtos", informe nome, unidade (un, kg, lt e demais), setor, grupo,
subgrupo, local, estoque minimo e, se quiser, valor. O estoque minimo e o que
faz o produto aparecer como "abaixo do minimo".

## Cadastrar um funcionario (acesso por PIN)

1. Abra "Funcionarios" e toque em adicionar.
2. Informe o nome, o setor e o PIN (4 a 6 digitos).
3. Salve. O sistema cria sozinho o acesso da pessoa.

Para trocar o PIN, edite o funcionario e informe o novo numero. Para tirar o
acesso, desative o funcionario — o nome some da tela de entrada.

Nunca reaproveite o mesmo PIN para duas pessoas e evite sequencias obvias.

## Cadastrar outro administrador

Em "Usuarios", envie o convite para o e-mail da pessoa. Ela recebe o link,
define a senha e ja entra com acesso administrativo.

## Setores

Em "Perfis" voce cria os setores. Cada produto pertence a um setor, e cada
operador ve apenas os produtos do setor dele. Se alguem reclamar que nao ve
produtos, quase sempre e o setor que nao esta preenchido.

## Ajustar estoque

Em "Estoque", use o ajuste e escreva o motivo. Fica registrado quem ajustou,
quando, e o saldo antes e depois.

## Publicar alteracoes

Alteracoes no aplicativo sao publicadas pelo botao de publicar da plataforma.
Leva cerca de um minuto para ficar no ar. Se algo quebrar depois de publicar,
siga o `PLANO_DE_ROLLBACK.md`.

## Cuidados importantes

1. Pre-visualizacao e producao usam o mesmo banco: teste com cuidado.
2. Nao existe copia dos dados fora da plataforma — providencie uma rotina.
3. Nunca apague registros de movimentacao: corrija por ajuste.
4. Mantenha pelo menos dois administradores ativos.
5. Pendencias conhecidas: uma usuaria com dois papeis, um alerta de seguranca
   aceito, e a importacao da planilha de produtos ainda nao feita.

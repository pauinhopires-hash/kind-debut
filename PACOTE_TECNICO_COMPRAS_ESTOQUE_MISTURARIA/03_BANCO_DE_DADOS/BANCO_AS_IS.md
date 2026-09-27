# Banco de Dados — Estado Atual (AS IS)

Extraido do catalogo vivo em 2026-09-27. Nenhuma alteracao foi feita no banco.

| Item | Valor |
|---|---|
| Motor | PostgreSQL gerenciado (Lovable Cloud / Supabase) |
| Schema do produto | `public` |
| Tabelas | 19 |
| Views | nenhuma |
| Funcoes proprias | 7 |
| Gatilhos proprios | 5 |
| RLS | ativa em 100% das tabelas |
| Rotinas agendadas | NAO IDENTIFICADO |
| Extensoes usadas pelo produto | `pgcrypto` (`gen_random_uuid`) |
| Tipo enumerado | `app_role` (`admin`, `usuario`) |

Instancia em uso: a mesma atende pre-visualizacao e producao. Uma instancia
anterior, usada durante a tentativa de migracao para Firebase, foi abandonada e
nao deve ser considerada fonte de dados.

## Tabelas por dominio

### Acesso e pessoas
| Tabela | Papel |
|---|---|
| `usuarios` | Espelho de cada login; ligada a `auth.users` |
| `user_roles` | Papel de cada usuario (`admin`/`usuario`), tabela separada por seguranca |
| `funcionarios` | Operadores que entram por PIN |
| `funcionario_pins` | PIN de cada operador (acesso restrito a administrador) |
| `perfis` | Agrupamento/setor usado para filtrar produtos e estoque |
| `funcoes` | Funcoes de trabalho |

### Catalogo
| Tabela | Papel |
|---|---|
| `produtos` | Itens com unidade, grupo, subgrupo, local, setor, valor, estoque minimo e status |
| `fornecedores` | Fornecedores com WhatsApp |
| `produto_fornecedores` | Relacao produto x fornecedor |
| `produto_funcoes` | Relacao produto x funcao |
| `locais` | Locais de estoque |

### Operacao
| Tabela | Papel |
|---|---|
| `requisicoes` | Pedido de compra (numero, status, setor, solicitante, decisao) |
| `requisicao_itens` | Itens do pedido de compra |
| `requisicoes_internas` | Pedido de retirada do estoque |
| `requisicao_interna_itens` | Itens da retirada |
| `estoque_atual` | Saldo por produto e por local (chave composta) |
| `movimentacoes_estoque` | Historico de entrada, saida e ajuste com saldo antes e depois |

### Apoio
| Tabela | Papel |
|---|---|
| `config_sistema` | Configuracoes em formato chave/valor |
| `push_subscriptions` | Inscricoes de notificacao por dispositivo |

## Regras de integridade relevantes

- `estoque_atual` tem chave primaria composta `(produto_id, local)`; o local
  padrao e `ESTOQUE CENTRAL`.
- `movimentacoes_estoque.tipo` aceita apenas `entrada`, `saida` ou `ajuste`.
- `requisicoes_internas.status` aceita `pendente`, `aprovada`, `entregue` ou
  `rejeitada`; `requisicoes` inclui ainda `recebida`.
- Quantidades de itens internos devem ser maiores que zero.
- Exclusao de produto propaga para estoque, movimentacoes e relacoes; itens de
  requisicao de compra impedem a exclusao (RESTRICT/sem cascata).
- `usuarios.id` referencia `auth.users(id)` com exclusao em cascata.

## Arquivos desta pasta

| Arquivo | Conteudo |
|---|---|
| `schema.sql` | Estrutura completa reconstruida do catalogo vivo |
| `FUNCOES_E_TRIGGERS.sql` | Funcoes, gatilhos e indices adicionais |
| `DICIONARIO_DE_DADOS.md` | Todas as colunas, tipos, obrigatoriedade, padroes e constraints |
| `RLS_E_PERMISSOES.md` | Politicas de acesso, funcoes de seguranca e grants |
| `seed_ficticio.sql` | Dados de exemplo 100% ficticios para ambiente de teste |
| `migrations/` | Copia integral do historico de migracoes do repositorio |

Nenhum dado real de funcionarios, fornecedores, produtos, estoque ou compras foi
exportado.

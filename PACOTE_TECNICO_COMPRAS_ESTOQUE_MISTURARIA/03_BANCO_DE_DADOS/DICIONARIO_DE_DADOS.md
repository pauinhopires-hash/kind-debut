# Dicionario de Dados — public (extraido do catalogo vivo em 2026-09-27)

Status: COMPROVADO (leitura direta do banco, sem alteracao).

## config_sistema

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| chave | text | nao | - |
| valor | jsonb | nao | - |
| atualizado_em | timestamp with time zone | nao | now() |

## estoque_atual

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| produto_id | uuid | nao | - |
| quantidade | numeric | nao | 0 |
| atualizado_em | timestamp with time zone | nao | now() |
| local | text | nao | 'ESTOQUE CENTRAL'::text |

## fornecedores

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| nome_empresa | text | nao | - |
| whatsapp | text | sim | - |
| ativo | boolean | nao | true |
| created_at | timestamp with time zone | nao | now() |

## funcionario_pins

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| funcionario_id | uuid | nao | - |
| pin | text | nao | - |
| created_at | timestamp with time zone | nao | now() |
| updated_at | timestamp with time zone | nao | now() |

## funcionarios

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| user_id | uuid | sim | - |
| nome | text | nao | - |
| funcao | text | sim | - |
| login_email | text | nao | - |
| ativo | boolean | nao | true |
| created_at | timestamp with time zone | nao | now() |
| updated_at | timestamp with time zone | nao | now() |

## funcoes

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| nome | text | nao | - |
| ativo | boolean | nao | true |
| created_at | timestamp with time zone | nao | now() |

## locais

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| nome | text | nao | - |
| ativo | boolean | nao | true |
| created_at | timestamp with time zone | nao | now() |

## movimentacoes_estoque

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| tipo | text | nao | - |
| produto_id | uuid | nao | - |
| quantidade | numeric | nao | - |
| estoque_antes | numeric | nao | - |
| estoque_depois | numeric | nao | - |
| requisicao_id | uuid | sim | - |
| usuario_id | uuid | sim | - |
| observacao | text | sim | - |
| created_at | timestamp with time zone | nao | now() |
| local | text | nao | 'ESTOQUE CENTRAL'::text |

## perfis

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| nome | text | nao | - |
| created_at | timestamp with time zone | nao | now() |
| slug | text | sim | - |

## produto_fornecedores

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| produto_id | uuid | nao | - |
| fornecedor_id | uuid | nao | - |
| created_at | timestamp with time zone | nao | now() |

## produto_funcoes

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| produto_id | uuid | nao | - |
| funcao_id | uuid | nao | - |
| created_at | timestamp with time zone | nao | now() |

## produtos

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| nome | text | nao | - |
| unidade | text | nao | 'un'::text |
| perfil_id | uuid | sim | - |
| ativo | boolean | nao | true |
| created_at | timestamp with time zone | nao | now() |
| grupo | text | sim | - |
| subgrupo | text | sim | - |
| local | text | sim | - |
| setor | text | sim | - |
| valor_unitario | numeric | sim | - |
| estoque_minimo | numeric | nao | 0 |
| status | text | nao | 'aprovado'::text |
| sugerido_por | uuid | sim | - |
| decidido_por | uuid | sim | - |
| decidido_em | timestamp with time zone | sim | - |

## push_subscriptions

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| usuario_id | uuid | nao | - |
| endpoint | text | nao | - |
| p256dh | text | nao | - |
| auth | text | nao | - |
| created_at | timestamp with time zone | nao | now() |

## requisicao_interna_itens

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| requisicao_id | uuid | nao | - |
| produto_id | uuid | nao | - |
| quantidade | numeric | nao | - |
| created_at | timestamp with time zone | nao | now() |
| unidade | text | sim | - |

## requisicao_itens

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| requisicao_id | uuid | nao | - |
| produto_id | uuid | nao | - |
| quantidade | numeric | nao | - |
| created_at | timestamp with time zone | nao | now() |
| comprado | boolean | nao | false |
| comprado_em | timestamp with time zone | sim | - |
| unidade | text | sim | - |
| nome_custom | text | sim | - |
| excluido | boolean | nao | false |

## requisicoes

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| usuario_id | uuid | nao | - |
| perfil_id | uuid | sim | - |
| status | text | nao | 'pendente'::text |
| observacao | text | sim | - |
| created_at | timestamp with time zone | nao | now() |
| decidido_em | timestamp with time zone | sim | - |
| decidido_por | uuid | sim | - |

## requisicoes_internas

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| usuario_id | uuid | nao | - |
| status | text | nao | 'pendente'::text |
| observacao | text | sim | - |
| created_at | timestamp with time zone | nao | now() |
| updated_at | timestamp with time zone | nao | now() |
| decidido_em | timestamp with time zone | sim | - |
| decidido_por | uuid | sim | - |

## user_roles

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | gen_random_uuid() |
| user_id | uuid | nao | - |
| role | USER-DEFINED | nao | - |
| created_at | timestamp with time zone | nao | now() |

## usuarios

| Coluna | Tipo | Aceita vazio | Padrao |
|---|---|---|---|
| id | uuid | nao | - |
| nome | text | nao | - |
| email | text | nao | - |
| perfil_id | uuid | sim | - |
| ativo | boolean | nao | true |
| created_at | timestamp with time zone | nao | now() |
| funcao_id | uuid | sim | - |
| ve_todos_setores | boolean | nao | true |

## Constraints e relacionamentos

| Tabela | Nome | Tipo | Definicao |
|---|---|---|---|
| config_sistema | config_sistema_pkey | p | PRIMARY KEY (chave) |
| estoque_atual | estoque_atual_pkey | p | PRIMARY KEY (produto_id, local) |
| estoque_atual | estoque_atual_produto_id_fkey | f | FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE |
| fornecedores | fornecedores_pkey | p | PRIMARY KEY (id) |
| funcionario_pins | funcionario_pins_funcionario_id_fkey | f | FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE |
| funcionario_pins | funcionario_pins_pkey | p | PRIMARY KEY (funcionario_id) |
| funcionarios | funcionarios_login_email_key | u | UNIQUE (login_email) |
| funcionarios | funcionarios_pkey | p | PRIMARY KEY (id) |
| funcionarios | funcionarios_user_id_fkey | f | FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL |
| funcoes | funcoes_nome_key | u | UNIQUE (nome) |
| funcoes | funcoes_pkey | p | PRIMARY KEY (id) |
| locais | locais_nome_key | u | UNIQUE (nome) |
| locais | locais_pkey | p | PRIMARY KEY (id) |
| movimentacoes_estoque | movimentacoes_estoque_pkey | p | PRIMARY KEY (id) |
| movimentacoes_estoque | movimentacoes_estoque_produto_id_fkey | f | FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE |
| movimentacoes_estoque | movimentacoes_estoque_tipo_check | c | CHECK ((tipo = ANY (ARRAY['entrada'::text, 'saida'::text, 'ajuste'::text]))) |
| movimentacoes_estoque | movimentacoes_estoque_usuario_id_fkey | f | FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL |
| perfis | perfis_nome_key | u | UNIQUE (nome) |
| perfis | perfis_pkey | p | PRIMARY KEY (id) |
| produto_fornecedores | produto_fornecedores_fornecedor_id_fkey | f | FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE |
| produto_fornecedores | produto_fornecedores_pkey | p | PRIMARY KEY (produto_id, fornecedor_id) |
| produto_fornecedores | produto_fornecedores_produto_id_fkey | f | FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE |
| produto_funcoes | produto_funcoes_funcao_id_fkey | f | FOREIGN KEY (funcao_id) REFERENCES funcoes(id) ON DELETE CASCADE |
| produto_funcoes | produto_funcoes_pkey | p | PRIMARY KEY (produto_id, funcao_id) |
| produto_funcoes | produto_funcoes_produto_id_fkey | f | FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE |
| produtos | produtos_decidido_por_fkey | f | FOREIGN KEY (decidido_por) REFERENCES usuarios(id) ON DELETE SET NULL |
| produtos | produtos_perfil_id_fkey | f | FOREIGN KEY (perfil_id) REFERENCES perfis(id) |
| produtos | produtos_pkey | p | PRIMARY KEY (id) |
| produtos | produtos_sugerido_por_fkey | f | FOREIGN KEY (sugerido_por) REFERENCES usuarios(id) ON DELETE SET NULL |
| push_subscriptions | push_subscriptions_endpoint_key | u | UNIQUE (endpoint) |
| push_subscriptions | push_subscriptions_pkey | p | PRIMARY KEY (id) |
| push_subscriptions | push_subscriptions_usuario_id_fkey | f | FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE |
| requisicao_interna_itens | requisicao_interna_itens_pkey | p | PRIMARY KEY (id) |
| requisicao_interna_itens | requisicao_interna_itens_produto_id_fkey | f | FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT |
| requisicao_interna_itens | requisicao_interna_itens_quantidade_check | c | CHECK ((quantidade > (0)::numeric)) |
| requisicao_interna_itens | requisicao_interna_itens_requisicao_id_fkey | f | FOREIGN KEY (requisicao_id) REFERENCES requisicoes_internas(id) ON DELETE CASCADE |
| requisicao_itens | requisicao_itens_pkey | p | PRIMARY KEY (id) |
| requisicao_itens | requisicao_itens_produto_id_fkey | f | FOREIGN KEY (produto_id) REFERENCES produtos(id) |
| requisicao_itens | requisicao_itens_requisicao_id_fkey | f | FOREIGN KEY (requisicao_id) REFERENCES requisicoes(id) ON DELETE CASCADE |
| requisicoes | requisicoes_decidido_por_fkey | f | FOREIGN KEY (decidido_por) REFERENCES usuarios(id) ON DELETE SET NULL |
| requisicoes | requisicoes_perfil_id_fkey | f | FOREIGN KEY (perfil_id) REFERENCES perfis(id) |
| requisicoes | requisicoes_pkey | p | PRIMARY KEY (id) |
| requisicoes | requisicoes_usuario_id_fkey | f | FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE |
| requisicoes_internas | requisicoes_internas_decidido_por_fkey | f | FOREIGN KEY (decidido_por) REFERENCES usuarios(id) ON DELETE SET NULL |
| requisicoes_internas | requisicoes_internas_pkey | p | PRIMARY KEY (id) |
| requisicoes_internas | requisicoes_internas_status_check | c | CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'entregue'::text, 'rejeitada'::text]))) |
| requisicoes_internas | requisicoes_internas_usuario_id_fkey | f | FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE |
| user_roles | user_roles_pkey | p | PRIMARY KEY (id) |
| user_roles | user_roles_user_id_fkey | f | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| user_roles | user_roles_user_id_role_key | u | UNIQUE (user_id, role) |
| usuarios | usuarios_funcao_id_fkey | f | FOREIGN KEY (funcao_id) REFERENCES funcoes(id) ON DELETE SET NULL |
| usuarios | usuarios_id_fkey | f | FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE |
| usuarios | usuarios_perfil_id_fkey | f | FOREIGN KEY (perfil_id) REFERENCES perfis(id) |
| usuarios | usuarios_pkey | p | PRIMARY KEY (id) |

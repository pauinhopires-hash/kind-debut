# RLS, Funcoes, Gatilhos e Permissoes

Status: COMPROVADO — extraido do catalogo vivo do banco em 2026-09-27, sem alteracao.

## 1. Row Level Security

RLS esta ATIVA (`t`) em todas as 19 tabelas do schema `public`:
config_sistema, estoque_atual, fornecedores, funcionario_pins, funcionarios, funcoes,
locais, movimentacoes_estoque, perfis, produto_fornecedores, produto_funcoes, produtos,
push_subscriptions, requisicao_interna_itens, requisicao_itens, requisicoes,
requisicoes_internas, user_roles, usuarios.

## 2. Politicas

| Tabela | Politica | Comando | Papeis | Condicao (USING // CHECK) |
|---|---|---|---|---|
| config_sistema | config_delete_admin | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| config_sistema | config_insert_admin | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| config_sistema | config_select_admin | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| config_sistema | config_update_admin | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| estoque_atual | estoque_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| estoque_atual | estoque_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| estoque_atual | estoque_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| estoque_atual | estoque_select_by_perfil_or_admin | SELECT | {authenticated} | (has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1 FROM produtos p WHERE ((p.id = estoque_atual.produto_id) AND (p.perfil_id = current_user_perfil_id()))))) // CHECK: - |
| fornecedores | forn_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| fornecedores | forn_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| fornecedores | forn_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| fornecedores | forn_select_admin | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcionario_pins | funcionario_pins_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcionario_pins | funcionario_pins_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| funcionario_pins | funcionario_pins_admin_select | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcionario_pins | funcionario_pins_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| funcionarios | funcionarios_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcionarios | funcionarios_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| funcionarios | funcionarios_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| funcionarios | funcionarios_select_admin | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcionarios | funcionarios_select_ativos | SELECT | {anon,authenticated} | (ativo = true) // CHECK: - |
| funcoes | funcoes_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcoes | funcoes_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| funcoes | funcoes_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| funcoes | funcoes_select_active | SELECT | {authenticated} | (is_active_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| locais | locais_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| locais | locais_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| locais | locais_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| locais | locais_select_active | SELECT | {authenticated} | (is_active_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| movimentacoes_estoque | admin delete mov | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| movimentacoes_estoque | admin insert mov | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| movimentacoes_estoque | admin read mov | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| movimentacoes_estoque | admin update mov | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| perfis | perfis_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| perfis | perfis_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| perfis | perfis_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| perfis | perfis_select_active | SELECT | {authenticated} | (is_active_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| produto_fornecedores | prfo_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produto_fornecedores | prfo_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| produto_fornecedores | prfo_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produto_fornecedores | prfo_select_admin | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produto_funcoes | pf_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produto_funcoes | pf_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| produto_funcoes | pf_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produto_funcoes | pf_select_active | SELECT | {authenticated} | (is_active_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| produtos | produtos_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produtos | produtos_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| produtos | produtos_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| produtos | produtos_select_active | SELECT | {authenticated} | (is_active_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| push_subscriptions | push_delete_own | DELETE | {authenticated} | ((usuario_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| push_subscriptions | push_insert_own | INSERT | {authenticated} | - // CHECK: (usuario_id = auth.uid()) |
| push_subscriptions | push_select_own | SELECT | {authenticated} | ((usuario_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| push_subscriptions | push_update_own | UPDATE | {authenticated} | (usuario_id = auth.uid()) // CHECK: (usuario_id = auth.uid()) |
| requisicao_interna_itens | own insert rii | INSERT | {authenticated} | - // CHECK: (EXISTS ( SELECT 1 FROM requisicoes_internas r WHERE ((r.id = requisicao_interna_itens.requisicao_id) AND (r.usuario_id = auth.uid())))) |
| requisicao_interna_itens | own or admin delete rii | DELETE | {authenticated} | (EXISTS ( SELECT 1 FROM requisicoes_internas r WHERE ((r.id = requisicao_interna_itens.requisicao_id) AND ((r.usuario_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))) // CHECK: - |
| requisicao_interna_itens | own or admin select rii | SELECT | {authenticated} | (EXISTS ( SELECT 1 FROM requisicoes_internas r WHERE ((r.id = requisicao_interna_itens.requisicao_id) AND ((r.usuario_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))) // CHECK: - |
| requisicao_interna_itens | own or admin update rii | UPDATE | {authenticated} | (EXISTS ( SELECT 1 FROM requisicoes_internas r WHERE ((r.id = requisicao_interna_itens.requisicao_id) AND ((r.usuario_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))) // CHECK: - |
| requisicao_itens | req_itens_admin_select | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| requisicao_itens | req_itens_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| requisicao_itens | req_itens_delete_own | DELETE | {authenticated} | (EXISTS ( SELECT 1 FROM requisicoes r WHERE ((r.id = requisicao_itens.requisicao_id) AND (r.usuario_id = auth.uid()) AND (r.status = 'pendente'::text)))) // CHECK: - |
| requisicao_itens | req_itens_insert_own | INSERT | {authenticated} | - // CHECK: (EXISTS ( SELECT 1 FROM requisicoes r WHERE ((r.id = requisicao_itens.requisicao_id) AND (r.usuario_id = auth.uid())))) |
| requisicao_itens | req_itens_select_own | SELECT | {authenticated} | (EXISTS ( SELECT 1 FROM requisicoes r WHERE ((r.id = requisicao_itens.requisicao_id) AND (r.usuario_id = auth.uid())))) // CHECK: - |
| requisicao_itens | req_itens_update_own_pendente | UPDATE | {authenticated} | (EXISTS ( SELECT 1 FROM requisicoes r WHERE ((r.id = requisicao_itens.requisicao_id) AND (r.usuario_id = auth.uid()) AND (r.status = 'pendente'::text)))) // CHECK: - |
| requisicoes | requisicoes_admin_select | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| requisicoes | requisicoes_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| requisicoes | requisicoes_delete_own_pendente | DELETE | {authenticated} | ((usuario_id = auth.uid()) AND (status = 'pendente'::text)) // CHECK: - |
| requisicoes | requisicoes_insert_own | INSERT | {authenticated} | - // CHECK: (usuario_id = auth.uid()) |
| requisicoes | requisicoes_select_own | SELECT | {authenticated} | (usuario_id = auth.uid()) // CHECK: - |
| requisicoes | requisicoes_update_own_pendente | UPDATE | {authenticated} | ((usuario_id = auth.uid()) AND (status = 'pendente'::text)) // CHECK: ((usuario_id = auth.uid()) AND (status = 'pendente'::text)) |
| requisicoes_internas | admin delete ri | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| requisicoes_internas | own insert ri | INSERT | {authenticated} | - // CHECK: (usuario_id = auth.uid()) |
| requisicoes_internas | own or admin select ri | SELECT | {authenticated} | ((usuario_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| requisicoes_internas | own or admin update ri | UPDATE | {authenticated} | (((usuario_id = auth.uid()) AND (status = 'pendente'::text)) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: (((usuario_id = auth.uid()) AND (status = 'pendente'::text)) OR has_role(auth.uid(), 'admin'::app_role)) |
| user_roles | user_roles_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| user_roles | user_roles_admin_insert | INSERT | {authenticated} | - // CHECK: has_role(auth.uid(), 'admin'::app_role) |
| user_roles | user_roles_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| user_roles | user_roles_select_self_or_admin | SELECT | {authenticated} | ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) // CHECK: - |
| usuarios | usuarios_admin_delete | DELETE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| usuarios | usuarios_admin_select | SELECT | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| usuarios | usuarios_admin_update | UPDATE | {authenticated} | has_role(auth.uid(), 'admin'::app_role) // CHECK: - |
| usuarios | usuarios_no_direct_insert | INSERT | {anon,authenticated} | - // CHECK: false |
| usuarios | usuarios_select_self | SELECT | {authenticated} | (id = auth.uid()) // CHECK: - |

## 3. Funcoes (SECURITY DEFINER destacadas)

| Funcao | Retorno | Tipo | Finalidade |
|---|---|---|---|
| `has_role(_user_id uuid, _role app_role)` | boolean | SQL STABLE SECURITY DEFINER, search_path=public | Verifica papel em `user_roles` sem recursao de RLS. |
| `is_active_user(_user_id uuid)` | boolean | SQL STABLE SECURITY DEFINER | Confirma que o usuario existe e esta ativo. |
| `current_user_perfil_id()` | uuid | SQL STABLE SECURITY DEFINER | Perfil do usuario autenticado, usado no filtro de estoque. |
| `handle_new_user()` | trigger | PLPGSQL SECURITY DEFINER | Cria a linha em `usuarios` quando nasce um login. |
| `grant_first_admin()` | trigger | PLPGSQL SECURITY DEFINER | Primeiro usuario vira `admin`; demais viram `usuario`. |
| `prevent_non_admin_status_change()` | trigger | PLPGSQL SECURITY DEFINER | Bloqueia mudanca de `status` em `requisicoes` por nao-admin (ERRCODE 42501). |
| `set_updated_at()` | trigger | PLPGSQL | Atualiza `updated_at`. |

Definicoes completas em `FUNCOES_E_TRIGGERS.sql`.

## 4. Gatilhos

| Tabela | Gatilho | Definicao |
|---|---|---|
| funcionario_pins | trg_funcionario_pins_updated | BEFORE UPDATE FOR EACH ROW EXECUTE set_updated_at() |
| funcionarios | trg_funcionarios_updated | BEFORE UPDATE FOR EACH ROW EXECUTE set_updated_at() |
| requisicoes | trg_prevent_non_admin_status_change | BEFORE UPDATE FOR EACH ROW EXECUTE prevent_non_admin_status_change() |
| requisicoes_internas | trg_ri_updated | BEFORE UPDATE FOR EACH ROW EXECUTE set_updated_at() |
| usuarios | usuarios_grant_first_admin | AFTER INSERT FOR EACH ROW EXECUTE grant_first_admin() |

Nao existem gatilhos definidos pelo produto em schemas gerenciados (`auth`, `storage`).

## 5. Grants de tabela

Os papeis `anon`, `authenticated` e `service_role` possuem SELECT/INSERT/UPDATE/DELETE
concedidos em todas as tabelas de `public`. O controle efetivo de acesso e feito pelas
politicas RLS acima, e nao pelos grants.

Ponto que exige revisao humana: `anon` possui grant amplo; na pratica so a politica
`funcionarios_select_ativos` expoe leitura anonima (lista de nomes ativos para a tela de PIN).
Recomenda-se revogar os grants de escrita de `anon` como defesa em profundidade.

## 6. Views e rotinas agendadas

| Item | Situacao |
|---|---|
| Views em `public` | Nenhuma identificada. |
| Rotinas agendadas (pg_cron) | NAO IDENTIFICADO — nenhum agendamento encontrado no repositorio. |

## 7. Alerta de seguranca pendente

Existe 1 aviso pre-existente do scanner: "Signed-In Users Can Execute SECURITY DEFINER Function".
Status: PENDENTE — aceito conscientemente pelo responsavel; nao tratado neste pacote.

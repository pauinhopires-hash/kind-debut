-- Dados INICIAIS FICTICIOS para ambiente de teste.
-- NAO contem nenhuma informacao real da Misturaria Fina Mezcla.
-- Executar somente em banco de desenvolvimento, nunca em producao.

BEGIN;

-- Perfis / setores
INSERT INTO public.perfis (id, nome, slug) VALUES
  ('11111111-1111-4111-8111-111111111111', 'SETOR EXEMPLO A', 'setor-exemplo-a'),
  ('11111111-1111-4111-8111-222222222222', 'SETOR EXEMPLO B', 'setor-exemplo-b')
ON CONFLICT DO NOTHING;

-- Locais de estoque
INSERT INTO public.locais (nome) VALUES
  ('ESTOQUE CENTRAL'),
  ('DEPOSITO TESTE')
ON CONFLICT DO NOTHING;

-- Funcoes de trabalho
INSERT INTO public.funcoes (nome) VALUES
  ('FUNCAO EXEMPLO 1'),
  ('FUNCAO EXEMPLO 2')
ON CONFLICT DO NOTHING;

-- Fornecedores ficticios
INSERT INTO public.fornecedores (id, nome_empresa, whatsapp) VALUES
  ('22222222-2222-4222-8222-111111111111', 'FORNECEDOR FICTICIO LTDA', '+5500000000000')
ON CONFLICT DO NOTHING;

-- Produtos ficticios
INSERT INTO public.produtos (id, nome, unidade, perfil_id, grupo, estoque_minimo, status) VALUES
  ('33333333-3333-4333-8333-111111111111', 'PRODUTO TESTE UN', 'un', '11111111-1111-4111-8111-111111111111', 'GRUPO TESTE', 5, 'aprovado'),
  ('33333333-3333-4333-8333-222222222222', 'PRODUTO TESTE KG', 'kg', '11111111-1111-4111-8111-111111111111', 'GRUPO TESTE', 2, 'aprovado'),
  ('33333333-3333-4333-8333-333333333333', 'PRODUTO TESTE LT', 'lt', '11111111-1111-4111-8111-222222222222', 'GRUPO TESTE', 1, 'aprovado')
ON CONFLICT DO NOTHING;

-- Saldo inicial ficticio
INSERT INTO public.estoque_atual (produto_id, local, quantidade) VALUES
  ('33333333-3333-4333-8333-111111111111', 'ESTOQUE CENTRAL', 10),
  ('33333333-3333-4333-8333-222222222222', 'ESTOQUE CENTRAL', 10),
  ('33333333-3333-4333-8333-333333333333', 'ESTOQUE CENTRAL', 10)
ON CONFLICT DO NOTHING;

-- Configuracao de exemplo
INSERT INTO public.config_sistema (chave, valor) VALUES
  ('exemplo_config', '{"ativo": true}'::jsonb)
ON CONFLICT DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- USUARIOS E FUNCIONARIOS
-- Nao ha seed de login: contas nascem em `auth.users` pelo provedor de
-- autenticacao, e o gatilho `handle_new_user` cria a linha em `usuarios`.
-- O primeiro usuario criado recebe automaticamente o papel `admin`.
-- Para testar a entrada por PIN, crie um login ficticio com e-mail
-- `nome.teste@misturaria.app` e senha `mfm-<PIN>-nome.teste`, e depois insira:
--   INSERT INTO public.funcionarios (nome, login_email, user_id)
--     VALUES ('NOME TESTE', 'nome.teste@misturaria.app', '<uuid do login>');
--   INSERT INTO public.funcionario_pins (funcionario_id, pin)
--     VALUES ('<uuid do funcionario>', '0000');
-- ---------------------------------------------------------------------------

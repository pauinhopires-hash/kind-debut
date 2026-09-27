-- Esquema reconstruido a partir do catalogo vivo do banco (schema public).
-- Gerado em 2026-09-27. Nao contem dados reais.
-- Requer: extensao pgcrypto (gen_random_uuid) e o tipo app_role.

CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');

CREATE TABLE public.config_sistema (
  chave text NOT NULL,
  valor jsonb NOT NULL,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.config_sistema ADD PRIMARY KEY (chave);
ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_sistema TO authenticated;
GRANT ALL ON public.config_sistema TO service_role;

CREATE TABLE public.estoque_atual (
  produto_id uuid NOT NULL,
  quantidade numeric NOT NULL DEFAULT 0,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  local text NOT NULL DEFAULT 'ESTOQUE CENTRAL'::text
);
ALTER TABLE public.estoque_atual ADD PRIMARY KEY (produto_id, local);
ALTER TABLE public.estoque_atual ADD FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.estoque_atual ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_atual TO authenticated;
GRANT ALL ON public.estoque_atual TO service_role;

CREATE TABLE public.fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  whatsapp text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ADD PRIMARY KEY (id);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

CREATE TABLE public.funcionario_pins (
  funcionario_id uuid NOT NULL,
  pin text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.funcionario_pins ADD FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE;
ALTER TABLE public.funcionario_pins ADD PRIMARY KEY (funcionario_id);
ALTER TABLE public.funcionario_pins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_pins TO authenticated;
GRANT ALL ON public.funcionario_pins TO service_role;

CREATE TABLE public.funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  nome text NOT NULL,
  funcao text,
  login_email text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.funcionarios ADD UNIQUE (login_email);
ALTER TABLE public.funcionarios ADD PRIMARY KEY (id);
ALTER TABLE public.funcionarios ADD FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;

CREATE TABLE public.funcoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.funcoes ADD UNIQUE (nome);
ALTER TABLE public.funcoes ADD PRIMARY KEY (id);
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcoes TO authenticated;
GRANT ALL ON public.funcoes TO service_role;

CREATE TABLE public.locais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.locais ADD UNIQUE (nome);
ALTER TABLE public.locais ADD PRIMARY KEY (id);
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locais TO authenticated;
GRANT ALL ON public.locais TO service_role;

CREATE TABLE public.movimentacoes_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  produto_id uuid NOT NULL,
  quantidade numeric NOT NULL,
  estoque_antes numeric NOT NULL,
  estoque_depois numeric NOT NULL,
  requisicao_id uuid,
  usuario_id uuid,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  local text NOT NULL DEFAULT 'ESTOQUE CENTRAL'::text
);
ALTER TABLE public.movimentacoes_estoque ADD PRIMARY KEY (id);
ALTER TABLE public.movimentacoes_estoque ADD FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacoes_estoque ADD CHECK ((tipo = ANY (ARRAY['entrada'::text, 'saida'::text, 'ajuste'::text])));
ALTER TABLE public.movimentacoes_estoque ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;

CREATE TABLE public.perfis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  slug text
);
ALTER TABLE public.perfis ADD UNIQUE (nome);
ALTER TABLE public.perfis ADD PRIMARY KEY (id);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;

CREATE TABLE public.produto_fornecedores (
  produto_id uuid NOT NULL,
  fornecedor_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.produto_fornecedores ADD FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE;
ALTER TABLE public.produto_fornecedores ADD PRIMARY KEY (produto_id, fornecedor_id);
ALTER TABLE public.produto_fornecedores ADD FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.produto_fornecedores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedores TO authenticated;
GRANT ALL ON public.produto_fornecedores TO service_role;

CREATE TABLE public.produto_funcoes (
  produto_id uuid NOT NULL,
  funcao_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.produto_funcoes ADD FOREIGN KEY (funcao_id) REFERENCES funcoes(id) ON DELETE CASCADE;
ALTER TABLE public.produto_funcoes ADD PRIMARY KEY (produto_id, funcao_id);
ALTER TABLE public.produto_funcoes ADD FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.produto_funcoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_funcoes TO authenticated;
GRANT ALL ON public.produto_funcoes TO service_role;

CREATE TABLE public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade text NOT NULL DEFAULT 'un'::text,
  perfil_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  grupo text,
  subgrupo text,
  local text,
  setor text,
  valor_unitario numeric,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aprovado'::text,
  sugerido_por uuid,
  decidido_por uuid,
  decidido_em timestamp with time zone
);
ALTER TABLE public.produtos ADD FOREIGN KEY (decidido_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.produtos ADD FOREIGN KEY (perfil_id) REFERENCES perfis(id);
ALTER TABLE public.produtos ADD PRIMARY KEY (id);
ALTER TABLE public.produtos ADD FOREIGN KEY (sugerido_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ADD UNIQUE (endpoint);
ALTER TABLE public.push_subscriptions ADD PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

CREATE TABLE public.requisicao_interna_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  unidade text
);
ALTER TABLE public.requisicao_interna_itens ADD PRIMARY KEY (id);
ALTER TABLE public.requisicao_interna_itens ADD FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT;
ALTER TABLE public.requisicao_interna_itens ADD CHECK ((quantidade > (0)::numeric));
ALTER TABLE public.requisicao_interna_itens ADD FOREIGN KEY (requisicao_id) REFERENCES requisicoes_internas(id) ON DELETE CASCADE;
ALTER TABLE public.requisicao_interna_itens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicao_interna_itens TO authenticated;
GRANT ALL ON public.requisicao_interna_itens TO service_role;

CREATE TABLE public.requisicao_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  comprado boolean NOT NULL DEFAULT false,
  comprado_em timestamp with time zone,
  unidade text,
  nome_custom text,
  excluido boolean NOT NULL DEFAULT false
);
ALTER TABLE public.requisicao_itens ADD PRIMARY KEY (id);
ALTER TABLE public.requisicao_itens ADD FOREIGN KEY (produto_id) REFERENCES produtos(id);
ALTER TABLE public.requisicao_itens ADD FOREIGN KEY (requisicao_id) REFERENCES requisicoes(id) ON DELETE CASCADE;
ALTER TABLE public.requisicao_itens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicao_itens TO authenticated;
GRANT ALL ON public.requisicao_itens TO service_role;

CREATE TABLE public.requisicoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  perfil_id uuid,
  status text NOT NULL DEFAULT 'pendente'::text,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  decidido_em timestamp with time zone,
  decidido_por uuid
);
ALTER TABLE public.requisicoes ADD FOREIGN KEY (decidido_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.requisicoes ADD FOREIGN KEY (perfil_id) REFERENCES perfis(id);
ALTER TABLE public.requisicoes ADD PRIMARY KEY (id);
ALTER TABLE public.requisicoes ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicoes TO authenticated;
GRANT ALL ON public.requisicoes TO service_role;

CREATE TABLE public.requisicoes_internas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  decidido_em timestamp with time zone,
  decidido_por uuid
);
ALTER TABLE public.requisicoes_internas ADD FOREIGN KEY (decidido_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.requisicoes_internas ADD PRIMARY KEY (id);
ALTER TABLE public.requisicoes_internas ADD CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'entregue'::text, 'rejeitada'::text])));
ALTER TABLE public.requisicoes_internas ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.requisicoes_internas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisicoes_internas TO authenticated;
GRANT ALL ON public.requisicoes_internas TO service_role;

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ADD PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD UNIQUE (user_id, role);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE TABLE public.usuarios (
  id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  perfil_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  funcao_id uuid,
  ve_todos_setores boolean NOT NULL DEFAULT true
);
ALTER TABLE public.usuarios ADD FOREIGN KEY (funcao_id) REFERENCES funcoes(id) ON DELETE SET NULL;
ALTER TABLE public.usuarios ADD FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.usuarios ADD FOREIGN KEY (perfil_id) REFERENCES perfis(id);
ALTER TABLE public.usuarios ADD PRIMARY KEY (id);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;


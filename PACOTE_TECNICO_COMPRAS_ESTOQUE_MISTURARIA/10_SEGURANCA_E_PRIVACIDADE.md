# 10 — Seguranca e Privacidade

## 1. Dados pessoais tratados

| Dado | Onde fica | Finalidade |
|---|---|---|
| Nome do funcionario | `funcionarios`, `usuarios` | Identificar quem pediu |
| E-mail sintetico do operador (`nome@misturaria.app`) | `funcionarios`, provedor de login | Permitir a entrada por PIN |
| E-mail real do administrador | provedor de login, `usuarios` | Acesso e recuperacao de senha |
| PIN de acesso | `funcionario_pins` | Entrada rapida no aplicativo |
| Setor e funcao | `perfis`, `funcoes` | Filtrar o que cada pessoa ve |
| Nome de empresa e WhatsApp de fornecedor | `fornecedores` | Cotacao |
| Inscricao de notificacao do dispositivo | `push_subscriptions` | Enviar avisos |

Nao ha CPF, endereco residencial, dado bancario, dado de saude nem dado de
menor. Nao ha upload de arquivos nem de fotos.

## 2. Nada disso foi exportado

Este pacote **nao contem** nenhum nome real, PIN, e-mail, telefone, produto,
preco, saldo ou requisicao da operacao. Os dados de exemplo em
`seed_ficticio.sql` sao inventados.

## 3. Credenciais

| Credencial | Situacao |
|---|---|
| Chave publicavel do backend | Pode ficar no codigo do navegador por desenho; protegida pela RLS |
| Chave administrativa (service role) | Nao acessivel na Lovable Cloud e nao incluida |
| Senha do banco | Nao acessivel na Lovable Cloud e nao incluida |
| Chaves de notificacao (VAPID) | Nao incluidas; existencia NAO IDENTIFICADA |
| Senhas de usuarios | Guardadas com hash pelo provedor de login; nunca visiveis |

`.env.example` traz apenas nomes de variaveis, sem valores.

## 4. Protecoes implementadas

- RLS ativa nas 19 tabelas, com politicas por dono do registro e por papel.
- Papeis em tabela separada (`user_roles`), nunca no perfil do usuario — evita
  escalonamento de privilegio.
- Verificacao de administrador feita no banco pela funcao `has_role`, nunca em
  armazenamento local do navegador.
- Gatilho `prevent_non_admin_status_change`: mesmo que a tela permitisse, o banco
  recusa mudanca de status por quem nao e administrador.
- Funcao `is_active_user`: usuario desativado perde a leitura de catalogo.
- Trilha de auditoria em `movimentacoes_estoque` com saldo antes e depois.
- Transporte sempre em HTTPS.

## 5. Riscos abertos

| Risco | Gravidade | Recomendacao |
|---|---|---|
| Senha derivada do PIN por regra publica no codigo do navegador | Alta | Mover a geracao da credencial para o servidor ou adotar troca de PIN por token |
| PIN de 4 digitos sem bloqueio por tentativas | Alta | Limitar tentativas e registrar falhas |
| Lista de nomes de funcionarios visivel sem login | Media | Aceito por desenho; alternativa e digitar o nome |
| Permissoes amplas de escrita concedidas a papeis da API | Media | Revogar escrita onde a politica ja restringe |
| Alerta do scanner sobre funcao SECURITY DEFINER executavel por logados | Media | Revisar; hoje aceito |
| Pre-visualizacao e producao no mesmo banco | Alta | Criar banco de homologacao |
| Sem copia de dados fora da plataforma | Alta | Rotina de exportacao |
| Sem registro de auditoria de login | Media | Avaliar registro de acessos |

## 6. LGPD

Este documento **nao declara conformidade com a LGPD**. Existem dados pessoais
de funcionarios e contatos de fornecedores em tratamento, o que exige avaliacao
juridica sobre base legal, aviso aos titulares, prazo de retencao, atendimento a
pedidos de exclusao e responsabilidade do operador de dados (a plataforma).
Classificacao: PENDENTE de revisao juridica.

## 7. O que depende de decisao humana

1. Definir a politica de PIN e tentativas.
2. Aprovar ou recusar a revogacao de permissoes amplas.
3. Tratar o alerta de seguranca pendente.
4. Resolver a usuaria com papel duplo.
5. Contratar ou nao um ambiente de homologacao separado.
6. Revisao juridica de privacidade.

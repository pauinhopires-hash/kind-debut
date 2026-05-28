## Próximas etapas (economizando créditos)

Focar apenas no essencial que falta para o app ficar redondo, sem reescrever o que já funciona.

### 1. Dashboard admin com indicadores (`/admin` index)
Substituir o hub atual por cards com números úteis, consultando o que já existe:
- Total de requisições pendentes
- Requisições da semana
- Produtos ativos / inativos
- Itens com estoque zerado
- Atalhos para Produtos, Estoque, Usuários

### 2. Tela admin de requisições (`/admin/requisicoes`)
Hoje o admin não tem como ver/processar pedidos de todos os usuários. Adicionar:
- Lista de todas as requisições (filtro por status: pendente / aprovada / cancelada)
- Ver itens de cada requisição (expandir)
- Botões "Aprovar" e "Cancelar"
- Migration: políticas RLS para admin ler/atualizar `requisicoes` e ler `requisicao_itens` de todos

### 3. Exportar pedido em CSV/WhatsApp na tela `/exportar`
Hoje só lista. Adicionar:
- Botão "Copiar para WhatsApp" (texto formatado pronto pra colar)
- Botão "Baixar CSV"

### 4. Pequenos polimentos
- Banner de dias de pedido (domingo/quarta) já está na home — verificar consistência
- Indicador visual de "pendente / aprovada / cancelada" colorido no `/historico`
- Bottom nav fixa em mobile (Home · Pedido · Histórico · Admin?)

### Detalhes técnicos
- 1 migration nova (RLS admin em `requisicoes` e `requisicao_itens`)
- 2 rotas novas: `admin.requisicoes.tsx`, reaproveitar componentes existentes
- Sem novas dependências
- Sem alteração nas tabelas/colunas existentes

### Fora do escopo (deixar pra depois)
- Push notifications
- PWA / instalação no celular
- Multi-idioma
- Tela pública de status do pedido

Posso executar tudo numa sequência só assim que aprovar.

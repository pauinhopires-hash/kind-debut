## Plano: Importar produtos da planilha

### 1. Migração de banco
Adicionar à tabela `produtos`:
- `grupo` (text) — ex: Alimentos, Bebidas, Consumo
- `subgrupo` (text) — ex: Mercearia, Congelados
- `local` (text) — CONGELADOR | GELADEIRA | PRATELEIRA | ESTOQUE CENTRAL
- `setor` (text) — COZINHA | ESTOQUE CENTRAL | FRENTE
- `valor_unitario` (numeric, nullable)

### 2. Criar 4 perfis
- Lider Cozinha
- Lider Salão
- Frente de Caixa
- Copa Cozinha

### 3. Inserir 399 produtos
Para cada linha:
- `nome` = PRODUTO
- `unidade` = UNIDADE DE MEDIDA (UND, KG, CX, PC, PCT, LT)
- `grupo`, `subgrupo`, `setor`, `valor_unitario` = colunas correspondentes
- `local` = última palavra de "Mapa de Líder" (CONGELADOR/GELADEIRA/PRATELEIRA/ESTOQUE CENTRAL)
- `perfil_id` = perfil cujo nome aparece no início de "Mapa de Líder"
- `ativo` = true

### 4. Estoque inicial zerado
`INSERT INTO estoque_atual (produto_id, quantidade) SELECT id, 0 FROM produtos;`

### 5. Atualizar UI de admin
- `/admin/produtos` (cadastro/edição): adicionar campos grupo, subgrupo, setor, local, valor unitário no formulário e listar grupo/local no card.
- `/admin/estoque`: já deve funcionar; opcionalmente mostrar local/grupo na linha.
- Tela inicial de pedido (`/pedido`): manter filtragem por perfil já existente; opcionalmente agrupar produtos por subgrupo na listagem (fora do escopo se você não quiser).

### Detalhes técnicos
- Migração SQL: `ALTER TABLE produtos ADD COLUMN ...` (campos nullable para não quebrar dados existentes).
- Inserção em lote via tool `supabase--insert` com um único INSERT de 399 linhas usando `VALUES (...), (...), ...` e subqueries para resolver `perfil_id` por nome.
- Sem alteração nas RLS policies (continuam por `perfil_id`).

### Pendências/observações
- 14 produtos estão sem valor unitário na planilha — entrarão como `NULL`.
- Linhas como "ARROZ - 1 KILO - EQUIPE" ficam no perfil "Lider Cozinha" mesmo sendo "alimentação de funcionários" (o mapa de líder define isso).
- Após importar você poderá editar/desativar individualmente em `/admin/produtos`.

Confirma para executar?
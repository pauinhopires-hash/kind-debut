
## Lista de compras consolidada (do dia)

Nova tela `/admin/lista-compras` que junta todas as requisições pendentes do dia em uma única lista de compras, agrupada por categoria, com botão de marcar comprado e geração de texto pronto pro WhatsApp.

## Como vai funcionar (fluxo)

1. Líderes (Cozinha, Salão, Copa, Caixa) fazem pedidos durante o dia em `/pedido`.
2. Admin abre `/admin/lista-compras` → vê **um item por produto**, somando o que foi pedido por todos os setores naquele dia.
3. Para cada produto a tela mostra 3 colunas: **Pedido** (soma) · **Estoque atual** · **A comprar** (admin pode ajustar manualmente, sugestão = pedido − estoque, mínimo 0).
4. Itens agrupados por **Grupo** (Limpeza, Descartáveis, Bebidas, Alimentos…) e ordenados por nome.
5. Filtros no topo: **data** (default = hoje), **setor** (todos / específico), busca por nome.
6. Cada linha tem um checkbox **"Comprado"**. Ao marcar, salva timestamp.
7. Botão **"Copiar para WhatsApp"** gera texto formatado e copia pro clipboard. Exemplo:
   ```
   🛒 Lista de compras — 01/06
   
   *LIMPEZA*
   • Detergente Ypê — 5 un
   • Saco lixo 100L — 2 pct
   
   *BEBIDAS*
   • Coca-Cola 2L — 12 un
   ```
8. Botão **"Marcar tudo como comprado e fechar"** atualiza status das requisições do dia de `pendente` → `comprada`.

## Mudanças no banco

Adicionar duas colunas em `requisicao_itens`:
- `comprado boolean not null default false`
- `comprado_em timestamptz`

Permitir admin atualizar (nova policy `req_itens_admin_update`).

Adicionar status `'comprada'` ao fluxo de `requisicoes` (já é text, sem CHECK — só convenção no código).

Nenhuma tabela nova. Sem mudança no `produtos` / `estoque_atual`.

## Arquivos

- `supabase/migrations/<novo>.sql` — colunas + policy admin update em `requisicao_itens`.
- `src/routes/admin.lista-compras.tsx` — nova tela (consulta agregada client-side: busca itens pendentes do dia + estoque + produtos, agrupa por `produto_id`).
- `src/routes/admin.index.tsx` — adicionar card/link "Lista de compras do dia".

## De onde sai a lista (resposta direta)

Hoje a lista "existe" apenas implicitamente nas requisições individuais em `/admin/requisicoes` e no `/exportar`. Depois desta mudança, a **fonte oficial** vira `/admin/lista-compras` — é lá que o admin extrai (visualiza, ajusta, marca comprado, copia pro WhatsApp).

## O que NÃO entra agora (posso fazer depois se quiser)

- Exportar PDF / Excel da lista.
- Receber a compra e atualizar `estoque_atual` automaticamente.
- Histórico de compras (relatório do que foi comprado por dia/semana).
- Sugestão automática de fornecedor por categoria.

Confirma que pode partir pra implementação?

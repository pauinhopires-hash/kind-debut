import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Check, Copy, CheckCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/lista-compras")({
  component: AdminListaCompras,
});

type ItemLista = {
  produto_id: string;
  nome: string;
  unidade: string;
  grupo: string;
  pedido: number; // soma das requisições
  estoque: number; // estoque atual
  aComprar: number; // admin pode ajustar
  comprado: boolean;
  comprado_em: string | null;
  item_ids: string[]; // ids dos requisicao_itens relacionados
};

type Grupo = { nome: string; itens: ItemLista[] };

function AdminListaCompras() {
  const navigate = useNavigate();
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [setor, setSetor] = useState("todos");
  const [busca, setBusca] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [fechando, setFechando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      // Carrega requisições do dia com itens
      let query = supabase
        .from("requisicao_itens")
        .select(
          `
          id,
          quantidade,
          comprado,
          comprado_em,
          produto_id,
          produtos (id, nome, unidade, grupo, setor),
          requisicoes!inner (id, status, created_at)
        `,
        )
        .in("requisicoes.status", ["pendente", "aprovada"])
        .gte("requisicoes.created_at", `${data}T00:00:00`)
        .lte("requisicoes.created_at", `${data}T23:59:59`);

      const { data: itens, error: e1 } = await query;
      const { data: estoqueRows, error: e2 } = await supabase.from("estoque_atual").select("produto_id, quantidade");

      if (e1 || e2) {
        toast.error("Erro ao carregar", { description: (e1 ?? e2)?.message });
        setCarregando(false);
        return;
      }

      const mapEstoque: Record<string, number> = {};
      (estoqueRows ?? []).forEach((r) => {
        mapEstoque[r.produto_id] = Number(r.quantidade);
      });

      // Agrupa por produto
      const mapProduto: Record<string, ItemLista> = {};
      for (const item of itens ?? []) {
        const prod = item.produtos as {
          id: string;
          nome: string;
          unidade: string;
          grupo: string | null;
          setor: string | null;
        } | null;
        if (!prod) continue;
        // Filtro de setor (vem do produto)
        if (setor !== "todos" && prod.setor !== setor) continue;
        const pid = prod.id;
        if (!mapProduto[pid]) {
          const est = mapEstoque[pid] ?? 0;
          mapProduto[pid] = {
            produto_id: pid,
            nome: prod.nome,
            unidade: prod.unidade,
            grupo: prod.grupo ?? "Outros",
            pedido: 0,
            estoque: est,
            aComprar: 0,
            comprado: false,
            comprado_em: null,
            item_ids: [],
          };
        }
        mapProduto[pid].pedido += Number(item.quantidade);
        mapProduto[pid].item_ids.push(item.id);
        if (item.comprado) {
          mapProduto[pid].comprado = true;
          mapProduto[pid].comprado_em = item.comprado_em;
        }
      }

      // Calcula aComprar (pedido - estoque, mínimo 0)
      for (const it of Object.values(mapProduto)) {
        it.aComprar = Math.max(0, it.pedido - it.estoque);
      }

      // Agrupa por grupo
      const gruposMap: Record<string, ItemLista[]> = {};
      for (const it of Object.values(mapProduto)) {
        const g = it.grupo || "Outros";
        if (!gruposMap[g]) gruposMap[g] = [];
        gruposMap[g].push(it);
      }

      const gruposArr: Grupo[] = Object.entries(gruposMap)
        .map(([nome, itens]) => ({
          nome,
          itens: itens.sort((a, b) => a.nome.localeCompare(b.nome)),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setGrupos(gruposArr);
    } finally {
      setCarregando(false);
    }
  }, [data, setor]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const setAComprar = (pid: string, v: number) => {
    setGrupos((gs) =>
      gs.map((g) => ({
        ...g,
        itens: g.itens.map((it) => (it.produto_id === pid ? { ...it, aComprar: v } : it)),
      })),
    );
  };

  const marcarComprado = async (it: ItemLista) => {
    setSalvando(it.produto_id);
    const agora = new Date().toISOString();
    const novoComprado = !it.comprado;

    try {
      // Re-lê estoque atual para evitar stale data
      const { data: estRow, error: errEst } = await supabase
        .from("estoque_atual")
        .select("quantidade")
        .eq("produto_id", it.produto_id)
        .maybeSingle();
      if (errEst) throw errEst;
      const estoqueAntes = estRow ? Number(estRow.quantidade) : 0;

      // Quando marcando, soma aComprar; quando desmarcando, subtrai
      const delta = novoComprado ? it.aComprar : -it.aComprar;
      const estoqueDepois = Math.max(0, estoqueAntes + delta);

      // 1. Atualiza requisicao_itens
      const { error: e1 } = await supabase
        .from("requisicao_itens")
        .update({ comprado: novoComprado, comprado_em: novoComprado ? agora : null })
        .in("id", it.item_ids);
      if (e1) throw e1;

      if (it.aComprar > 0) {
        // 2. Atualiza estoque
        const { error: e2 } = await supabase
          .from("estoque_atual")
          .upsert({ produto_id: it.produto_id, quantidade: estoqueDepois });
        if (e2) throw e2;

        // 3. Registra movimentação (entrada quando comprou, ajuste quando desmarcou)
        const { data: { session } } = await supabase.auth.getSession();
        const { error: eMov } = await supabase
          .from("movimentacoes_estoque")
          .insert({
            tipo: novoComprado ? "entrada" : "ajuste",
            produto_id: it.produto_id,
            quantidade: it.aComprar,
            estoque_antes: estoqueAntes,
            estoque_depois: estoqueDepois,
            usuario_id: session?.user.id ?? null,
            observacao: novoComprado
              ? `Compra registrada — lista de compras ${data}`
              : `Compra desfeita — lista de compras ${data}`,
          });
        if (eMov) throw eMov;
      }

      toast.success(novoComprado ? `${it.nome} marcado como comprado` : `${it.nome} desmarcado`);
      await carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    } finally {
      setSalvando(null);
    }
  };

  const fecharDia = async () => {
    setFechando(true);
    try {
      const pendentes = grupos.flatMap((g) => g.itens.filter((i) => !i.comprado && i.aComprar > 0));
      if (pendentes.length === 0) {
        toast.info("Nada para fechar — todos os itens já estão comprados.");
        return;
      }
      if (!confirm(`Marcar ${pendentes.length} item(ns) como comprado(s)?`)) return;
      for (const it of pendentes) {
        await marcarComprado(it);
      }
      toast.success(`${pendentes.length} item(ns) fechado(s) como comprado(s).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao fechar dia", { description: msg });
    } finally {
      setFechando(false);
    }
  };

  const copiarWhatsApp = () => {
    const dataFmt = format(new Date(data + "T12:00:00"), "dd/MM", { locale: ptBR });
    const linhas: string[] = [`🛒 Lista de compras — ${dataFmt}`, ""];

    for (const g of grupos) {
      const itensNaoComprados = g.itens.filter((it) => !it.comprado && it.aComprar > 0);
      if (itensNaoComprados.length === 0) continue;
      linhas.push(`*${g.nome.toUpperCase()}*`);
      for (const it of itensNaoComprados) {
        linhas.push(`• ${it.nome} — ${it.aComprar} ${it.unidade}`);
      }
      linhas.push("");
    }

    navigator.clipboard
      .writeText(linhas.join("\n").trim())
      .then(() => toast.success("Copiado para o clipboard!"))
      .catch(() => toast.error("Não foi possível copiar"));
  };

  // Filtro de busca (aplicado sobre grupos)
  const gruposFiltrados = busca
    ? grupos
        .map((g) => ({
          ...g,
          itens: g.itens.filter((it) => it.nome.toLowerCase().includes(busca.toLowerCase())),
        }))
        .filter((g) => g.itens.length > 0)
    : grupos;

  const totalItens = grupos.reduce((acc, g) => acc + g.itens.length, 0);
  const comprados = grupos.reduce((acc, g) => acc + g.itens.filter((i) => i.comprado).length, 0);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate({ to: "/admin" })}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl font-bold flex-1">Lista de compras</h1>
          <span className="text-xs text-gray-400">
            {comprados}/{totalItens} comprados
          </span>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-orange-500"
          />
          <select
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="todos">Todos os setores</option>
            <option value="COZINHA">COZINHA</option>
            <option value="ESTOQUE CENTRAL">ESTOQUE CENTRAL</option>
            <option value="FRENTE">FRENTE</option>
          </select>
          <input
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 min-w-32 px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={copiarWhatsApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm hover:bg-zinc-700"
          >
            <Copy className="w-4 h-4" /> Copiar WhatsApp
          </button>
          <button
            onClick={fecharDia}
            disabled={fechando}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-orange-600 text-sm hover:bg-orange-500 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {fechando ? "Fechando..." : "Marcar tudo e fechar dia"}
          </button>
        </div>

        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : gruposFiltrados.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">Nenhuma requisição para este dia/setor.</p>
        ) : (
          <>
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_60px_70px_80px_40px] gap-1 text-xs text-gray-500 mb-1 px-1">
              <span>Produto</span>
              <span className="text-center">Pedido</span>
              <span className="text-center">Estoque</span>
              <span className="text-center">A comprar</span>
              <span />
            </div>

            {gruposFiltrados.map((g) => (
              <div key={g.nome} className="mb-6">
                <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">{g.nome}</h2>
                <div className="space-y-1">
                  {g.itens.map((it) => {
                    const estoqueInsuficiente = it.estoque < it.pedido;
                    return (
                      <div
                        key={it.produto_id}
                        className={`grid grid-cols-[1fr_60px_70px_80px_40px] gap-1 items-center px-2 py-1.5 rounded ${
                          it.comprado
                            ? "bg-green-950/30 opacity-70"
                            : estoqueInsuficiente
                              ? "bg-zinc-900"
                              : "bg-zinc-900"
                        }`}
                      >
                        {/* Nome */}
                        <span className={`text-sm ${it.comprado ? "line-through text-gray-500" : ""}`}>
                          {estoqueInsuficiente && !it.comprado && (
                            <AlertTriangle className="w-3 h-3 text-yellow-500 inline mr-1" />
                          )}
                          {it.nome}
                          <span className="text-xs text-gray-500 ml-1">{it.unidade}</span>
                        </span>

                        {/* Pedido */}
                        <span className="text-center text-sm text-gray-300">{it.pedido}</span>

                        {/* Estoque */}
                        <span
                          className={`text-center text-sm ${estoqueInsuficiente ? "text-yellow-400" : "text-gray-400"}`}
                        >
                          {it.estoque}
                        </span>

                        {/* A comprar (editável) */}
                        <input
                          type="number"
                          min={0}
                          value={it.aComprar}
                          disabled={it.comprado}
                          onChange={(e) => setAComprar(it.produto_id, Number(e.target.value))}
                          className="w-full text-center text-sm rounded px-1 py-0.5 bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-orange-500 disabled:opacity-40"
                        />

                        {/* Checkbox comprado */}
                        <button
                          onClick={() => marcarComprado(it)}
                          disabled={salvando === it.produto_id}
                          className={`flex items-center justify-center w-7 h-7 rounded border transition-colors ${
                            it.comprado
                              ? "bg-green-600 border-green-600 text-white"
                              : "border-zinc-600 hover:border-orange-500"
                          } disabled:opacity-40`}
                        >
                          {it.comprado && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

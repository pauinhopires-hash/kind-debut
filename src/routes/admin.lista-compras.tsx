import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, CheckCheck, AlertTriangle, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";

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

type RequisicaoPronta = {
  id: string;
  numero: number;
  usuario: string;
  totalItens: number;
  compradoItens: number;
};

function AdminListaCompras() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [setor, setSetor] = useState("todos");
  const [busca, setBusca] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [fechando, setFechando] = useState(false);
  const [requisicoesProntas, setRequisicoesProntas] = useState<RequisicaoPronta[]>([]);
  const [recebendo, setRecebendo] = useState<string | null>(null);

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
          requisicoes!inner (id, numero, status, created_at, usuarios (nome))
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

      // Soma por produto (um produto pode ter linhas em vários locais).
      const mapEstoque: Record<string, number> = {};
      (estoqueRows ?? []).forEach((r) => {
        mapEstoque[r.produto_id] = (mapEstoque[r.produto_id] ?? 0) + Number(r.quantidade);
      });

      // Agrupa por requisição (independente do filtro de setor) para saber
      // quais requisições aprovadas já têm todos os itens comprados.
      const mapRequisicao: Record<string, RequisicaoPronta & { status: string }> = {};
      for (const item of itens ?? []) {
        const req = item.requisicoes as unknown as {
          id: string;
          numero: number;
          status: string;
          usuarios: { nome: string } | null;
        } | null;
        if (!req) continue;
        if (!mapRequisicao[req.id]) {
          mapRequisicao[req.id] = {
            id: req.id,
            numero: req.numero,
            usuario: req.usuarios?.nome ?? "Usuário desconhecido",
            status: req.status,
            totalItens: 0,
            compradoItens: 0,
          };
        }
        mapRequisicao[req.id].totalItens += 1;
        if (item.comprado) mapRequisicao[req.id].compradoItens += 1;
      }
      setRequisicoesProntas(
        Object.values(mapRequisicao)
          .filter((r) => r.status === "aprovada" && r.totalItens > 0 && r.compradoItens === r.totalItens)
          .map(({ status, ...r }) => r)
          .sort((a, b) => a.numero - b.numero),
      );

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
      // Re-lê estoque atual (sempre no Estoque Central) para evitar stale data
      const { data: estRow, error: errEst } = await supabase
        .from("estoque_atual")
        .select("quantidade")
        .eq("produto_id", it.produto_id)
        .eq("local", "ESTOQUE CENTRAL")
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
        // 2. Atualiza estoque (sempre no Estoque Central)
        const { error: e2 } = await supabase
          .from("estoque_atual")
          .upsert(
            { produto_id: it.produto_id, local: "ESTOQUE CENTRAL", quantidade: estoqueDepois },
            { onConflict: "produto_id,local" },
          );
        if (e2) throw e2;

        // 3. Registra movimentação (entrada quando comprou, ajuste quando desmarcou)
        const { data: { session } } = await supabase.auth.getSession();
        const { error: eMov } = await supabase
          .from("movimentacoes_estoque")
          .insert({
            tipo: novoComprado ? "entrada" : "ajuste",
            produto_id: it.produto_id,
            local: "ESTOQUE CENTRAL",
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

  const confirmarRecebimento = async (req: RequisicaoPronta) => {
    setRecebendo(req.id);
    try {
      const { error } = await supabase.from("requisicoes").update({ status: "recebida" }).eq("id", req.id);
      if (error) throw error;
      toast.success(`Requisição #${req.numero} marcada como recebida`);
      await carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao confirmar recebimento", { description: msg });
    } finally {
      setRecebendo(null);
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
      <div className="max-w-2xl md:max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={voltar}
            className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={tap}
            onClick={avancar}
            className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Avançar"
          >
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </motion.button>
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
            className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
          <select
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
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
            className="flex-1 min-w-32 px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={copiarWhatsApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          >
            <Copy className="w-4 h-4" /> Copiar WhatsApp
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={fecharDia}
            disabled={fechando}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-orange-600 text-sm hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-50"
          >
            {fechando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            {fechando ? "Fechando..." : "Marcar tudo e fechar dia"}
          </motion.button>
        </div>

        {!carregando && requisicoesProntas.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="mb-6 space-y-2">
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Prontas para receber
            </h2>
            {requisicoesProntas.map((r) => (
              <motion.div
                key={r.id}
                variants={listItem}
                className="flex items-center justify-between gap-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    Requisição #{r.numero} — {r.usuario}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.compradoItens}/{r.totalItens} itens comprados
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={tap}
                  onClick={() => confirmarRecebimento(r)}
                  disabled={recebendo === r.id}
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                >
                  {recebendo === r.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageCheck className="w-4 h-4" />
                  )}
                  Confirmar Recebimento
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {carregando ? (
          <SkeletonStack rows={6} />
        ) : gruposFiltrados.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="text-gray-500 text-sm text-center py-12">
            Nenhuma requisição para este dia/setor.
          </motion.p>
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
                <motion.div initial="hidden" animate="visible" variants={staggerList(0.03, 0.02)} className="space-y-1">
                  {g.itens.map((it) => {
                    const estoqueInsuficiente = it.estoque < it.pedido;
                    return (
                      <motion.div
                        key={it.produto_id}
                        variants={listItem}
                        className={`grid grid-cols-[1fr_60px_70px_80px_40px] gap-1 items-center px-2 py-1.5 rounded transition-shadow hover:shadow-md hover:shadow-primary/5 ${
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
                          className="w-full text-center text-sm rounded px-1 py-0.5 bg-zinc-800 border border-zinc-700 transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-40"
                        />

                        {/* Checkbox comprado */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => marcarComprado(it)}
                          disabled={salvando === it.produto_id}
                          className={`flex items-center justify-center w-7 h-7 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                            it.comprado
                              ? "bg-green-600 border-green-600 text-white"
                              : "border-zinc-600 hover:border-orange-500"
                          } disabled:opacity-40`}
                        >
                          {salvando === it.produto_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            it.comprado && <Check className="w-4 h-4" />
                          )}
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

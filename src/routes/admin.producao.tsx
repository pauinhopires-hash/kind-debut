import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, Check, XCircle, Loader2, ChevronDown, ChevronUp, Factory } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/producao")({
  component: AdminProducao,
});

type Receita = {
  id: string;
  rendimento: number;
  unidade_rendimento: string;
  produtos: { nome: string; unidade: string } | null;
};

type Ordem = {
  id: string;
  receita_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number | null;
  status: string;
  observacao: string | null;
  criado_em: string;
  receitas: { rendimento: number; unidade_rendimento: string; produtos: { nome: string; unidade: string } | null } | null;
};

function AdminProducao() {
  const navigate = useNavigate();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(false);
  const [criando, setCriando] = useState(false);
  const [receitaId, setReceitaId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quantidadeProduzida, setQuantidadeProduzida] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: recs }, { data: ords }] = await Promise.all([
      supabase.from("receitas").select("id, rendimento, unidade_rendimento, produtos(nome, unidade)").eq("ativo", true).order("criado_em"),
      supabase
        .from("ordens_producao")
        .select(
          "id, receita_id, quantidade_planejada, quantidade_produzida, status, observacao, criado_em, receitas(rendimento, unidade_rendimento, produtos(nome, unidade))",
        )
        .order("criado_em", { ascending: false }),
    ]);
    setReceitas((recs ?? []) as unknown as Receita[]);
    setOrdens((ords ?? []) as unknown as Ordem[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNova = () => {
    setReceitaId("");
    setQuantidade("");
    setObservacao("");
    setNova(true);
  };

  const criarOrdem = async () => {
    if (!receitaId) return toast.error("Selecione a receita");
    const qtd = Number(quantidade.replace(",", "."));
    if (!qtd || qtd <= 0) return toast.error("Quantidade inválida");

    setCriando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("ordens_producao").insert({
        receita_id: receitaId,
        quantidade_planejada: qtd,
        observacao: observacao.trim() || null,
        usuario_id: session?.user.id ?? null,
      });
      if (error) throw error;
      toast.success("Ordem de produção criada");
      setNova(false);
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao criar ordem", { description: msg });
    } finally {
      setCriando(false);
    }
  };

  const cancelar = async (ordem: Ordem) => {
    if (!confirm("Cancelar esta ordem de produção?")) return;
    setProcessando(ordem.id);
    try {
      const { error } = await supabase.from("ordens_producao").update({ status: "cancelada" }).eq("id", ordem.id);
      if (error) throw error;
      toast.success("Ordem cancelada");
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao cancelar", { description: msg });
    } finally {
      setProcessando(null);
    }
  };

  const concluir = async (ordem: Ordem) => {
    const produzida = Number((quantidadeProduzida || String(ordem.quantidade_planejada)).replace(",", "."));
    if (!produzida || produzida <= 0) return toast.error("Quantidade produzida inválida");
    const receita = ordem.receitas;
    if (!receita) return toast.error("Receita não encontrada");

    setProcessando(ordem.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const usuarioId = session?.user.id ?? null;

      const { data: receitaItens, error: errItens } = await supabase
        .from("receita_itens")
        .select("insumo_id, quantidade, produtos(nome)")
        .eq("receita_id", ordem.receita_id);
      if (errItens) throw errItens;
      if (!receitaItens || receitaItens.length === 0) throw new Error("Receita sem insumos cadastrados");

      const { data: receitaRow, error: errReceita } = await supabase
        .from("receitas")
        .select("produto_id, rendimento")
        .eq("id", ordem.receita_id)
        .single();
      if (errReceita) throw errReceita;

      const fator = produzida / Number(receitaRow.rendimento);
      const insumoIds = receitaItens.map((i) => i.insumo_id);
      const produtoFinalId = receitaRow.produto_id;

      const { data: estoques, error: errEst } = await supabase
        .from("estoque_atual")
        .select("produto_id, quantidade")
        .in("produto_id", [...insumoIds, produtoFinalId]);
      if (errEst) throw errEst;
      const estoqueMap: Record<string, number> = {};
      (estoques ?? []).forEach((e) => { estoqueMap[e.produto_id] = Number(e.quantidade); });

      const obsRef = `Ordem de produção #${ordem.id.slice(0, 8)}`;
      const movs = receitaItens.map((item) => {
        const antes = estoqueMap[item.insumo_id] ?? 0;
        const consumo = Number(item.quantidade) * fator;
        const depois = Math.max(0, antes - consumo);
        estoqueMap[item.insumo_id] = depois;
        return {
          usuario_id: usuarioId,
          produto_id: item.insumo_id,
          tipo: "saida",
          quantidade: consumo,
          estoque_antes: antes,
          estoque_depois: depois,
          observacao: obsRef,
        };
      });
      const antesFinal = estoqueMap[produtoFinalId] ?? 0;
      const depoisFinal = antesFinal + produzida;
      movs.push({
        usuario_id: usuarioId,
        produto_id: produtoFinalId,
        tipo: "entrada",
        quantidade: produzida,
        estoque_antes: antesFinal,
        estoque_depois: depoisFinal,
        observacao: obsRef,
      });

      const { error: errMovs } = await supabase.from("movimentacoes_estoque").insert(movs);
      if (errMovs) throw errMovs;

      for (const item of receitaItens) {
        const { error } = await supabase
          .from("estoque_atual")
          .upsert({ produto_id: item.insumo_id, quantidade: estoqueMap[item.insumo_id] }, { onConflict: "produto_id" });
        if (error) throw error;
      }
      const { error: errFinal } = await supabase
        .from("estoque_atual")
        .upsert({ produto_id: produtoFinalId, quantidade: depoisFinal }, { onConflict: "produto_id" });
      if (errFinal) throw errFinal;

      const { error: errOrdem } = await supabase
        .from("ordens_producao")
        .update({ status: "concluida", quantidade_produzida: produzida, concluido_em: new Date().toISOString() })
        .eq("id", ordem.id);
      if (errOrdem) throw errOrdem;

      toast.success("Produção concluída — estoque atualizado");
      setExpandedId(null);
      setQuantidadeProduzida("");
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao concluir produção", { description: msg });
    } finally {
      setProcessando(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === "concluida") return "text-green-400 bg-green-400/10";
    if (s === "cancelada") return "text-red-400 bg-red-400/10";
    return "text-orange-400 bg-orange-400/10";
  };

  const statusLabel = (s: string) => {
    if (s === "concluida") return "Concluída";
    if (s === "cancelada") return "Cancelada";
    if (s === "em_producao") return "Em produção";
    return "Planejada";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl md:max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={() => navigate({ to: "/admin" })}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </motion.button>
          <h1 className="text-xl font-bold text-orange-500 flex-1">Produção</h1>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={abrirNova}
            className="flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-2 text-xs font-bold uppercase hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <Plus size={14} /> Nova ordem
          </motion.button>
        </div>

        {carregando ? (
          <SkeletonStack rows={6} />
        ) : ordens.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center text-gray-400 py-12">
            <Factory size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma ordem de produção</p>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="space-y-3">
            {ordens.map((o) => {
              const podeAgir = o.status === "planejada" || o.status === "em_producao";
              return (
                <motion.div
                  key={o.id}
                  variants={listItem}
                  className="bg-zinc-900 rounded-xl overflow-hidden transition-shadow hover:shadow-md hover:shadow-primary/5"
                >
                  <button
                    className="w-full p-4 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                    onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    aria-expanded={expandedId === o.id}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(o.status)}`}>
                          {statusLabel(o.status)}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate">{o.receitas?.produtos?.nome ?? "—"}</p>
                      <p className="text-gray-400 text-sm">
                        {o.quantidade_produzida ?? o.quantidade_planejada} {o.receitas?.unidade_rendimento}
                        {o.quantidade_produzida == null && " (planejado)"}
                      </p>
                    </div>
                    {expandedId === o.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedId === o.id && (
                      <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseY} className="border-t border-zinc-800 p-4">
                        {o.observacao && <p className="text-gray-400 text-sm mb-3 italic">"{o.observacao}"</p>}
                        {podeAgir && (
                          <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-wider text-gray-400">
                              Quantidade produzida ({o.receitas?.unidade_rendimento})
                            </label>
                            <input
                              inputMode="decimal"
                              placeholder={String(o.quantidade_planejada)}
                              defaultValue={String(o.quantidade_planejada)}
                              onChange={(e) => setQuantidadeProduzida(e.target.value)}
                              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            />
                            <div className="flex gap-2 pt-1">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={tap}
                                onClick={() => concluir(o)}
                                disabled={processando === o.id}
                                className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-zinc-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/40"
                              >
                                {processando === o.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Concluir
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={tap}
                                onClick={() => cancelar(o)}
                                disabled={processando === o.id}
                                className="flex-1 bg-red-800 hover:bg-red-700 disabled:bg-zinc-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                              >
                                {processando === o.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Cancelar
                              </motion.button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {nova && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 sm:rounded-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Nova ordem de produção</h2>
                <motion.button
                  whileTap={tap}
                  onClick={() => setNova(false)}
                  aria-label="Fechar"
                  className="rounded-md p-1 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  <X size={18} />
                </motion.button>
              </div>
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wider text-gray-400">
                  Receita
                  <select
                    value={receitaId}
                    onChange={(e) => setReceitaId(e.target.value)}
                    className="mt-1 w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  >
                    <option value="">— Selecione —</option>
                    {receitas.map((r) => (
                      <option key={r.id} value={r.id}>{r.produtos?.nome ?? r.id}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs uppercase tracking-wider text-gray-400">
                  Quantidade planejada
                  <input
                    inputMode="decimal"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="mt-1 w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                </label>
                <label className="block text-xs uppercase tracking-wider text-gray-400">
                  Observação (opcional)
                  <input
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="mt-1 w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                </label>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={tap}
                onClick={criarOrdem}
                disabled={criando}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold uppercase hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
              >
                {criando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {criando ? "Criando..." : "Criar ordem"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

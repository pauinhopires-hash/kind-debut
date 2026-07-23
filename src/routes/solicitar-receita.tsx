import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2, Send, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { useAuth } from "@/hooks/use-auth";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/solicitar-receita")({
  head: () => ({
    meta: [
      { title: "Propor ficha técnica — Misturaria Fina Mezcla" },
      { name: "description", content: "Sugira uma receita/ficha técnica pro seu setor." },
    ],
  }),
  component: SolicitarReceita,
});

type Produto = { id: string; nome: string; unidade: string };
type ItemForm = { insumo_id: string; quantidade: string; unidade: string };
type MinhaReceita = {
  id: string;
  status: string;
  rendimento: number;
  unidade_rendimento: string;
  criado_em: string;
  produtos: { nome: string; unidade: string } | null;
};

function statusIcon(status: string) {
  if (status === "pendente") return <Clock size={16} className="text-yellow-400" />;
  if (status === "aprovada") return <CheckCircle size={16} className="text-blue-400" />;
  if (status === "rejeitada") return <XCircle size={16} className="text-red-400" />;
  return <Clock size={16} className="text-gray-400" />;
}
function statusLabel(status: string) {
  return { pendente: "Pendente", aprovada: "Aprovada", rejeitada: "Rejeitada" }[status] ?? status;
}
function statusColor(status: string) {
  if (status === "pendente") return "text-yellow-400 bg-yellow-900/30";
  if (status === "aprovada") return "text-blue-400 bg-blue-900/30";
  if (status === "rejeitada") return "text-red-400 bg-red-900/30";
  return "text-gray-400 bg-zinc-800";
}

function SolicitarReceita() {
  const navigate = useNavigate();
  const { voltar, avancar } = useVoltarAvancar("/");
  const { user, loading: authLoading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [minhas, setMinhas] = useState<MinhaReceita[]>([]);
  const [itensPorReceita, setItensPorReceita] = useState<Record<string, { nome: string; quantidade: number; unidade: string }[]>>({});
  const [expandida, setExpandida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [produtoId, setProdutoId] = useState("");
  const [rendimento, setRendimento] = useState("1");
  const [unidadeRendimento, setUnidadeRendimento] = useState("UND");
  const [itens, setItens] = useState<ItemForm[]>([{ insumo_id: "", quantidade: "", unidade: "" }]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    carregar(user.id);
  }, [user]);

  const carregar = async (userId: string) => {
    setCarregando(true);
    const [{ data: prods }, { data: recs }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase
        .from("receitas")
        .select("id, status, rendimento, unidade_rendimento, criado_em, produtos(nome, unidade)")
        .eq("usuario_id", userId)
        .order("criado_em", { ascending: false }),
    ]);
    setProdutos((prods ?? []) as Produto[]);
    setMinhas((recs ?? []) as unknown as MinhaReceita[]);
    setCarregando(false);
  };

  const fetchItens = async (receitaId: string) => {
    if (itensPorReceita[receitaId]) return;
    const { data } = await supabase
      .from("receita_itens")
      .select("quantidade, unidade, produtos(nome, unidade)")
      .eq("receita_id", receitaId);
    setItensPorReceita((prev) => ({
      ...prev,
      [receitaId]: (data ?? []).map((i: any) => ({
        nome: i.produtos?.nome ?? "—",
        quantidade: i.quantidade,
        unidade: i.unidade || i.produtos?.unidade || "",
      })),
    }));
  };

  const toggleExpandir = (id: string) => {
    if (expandida === id) return setExpandida(null);
    setExpandida(id);
    fetchItens(id);
  };

  const addItem = () => setItens((its) => [...its, { insumo_id: "", quantidade: "", unidade: "" }]);
  const removeItem = (idx: number) => setItens((its) => its.filter((_, i) => i !== idx));
  const setItem = (idx: number, patch: Partial<ItemForm>) =>
    setItens((its) => its.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const enviar = async () => {
    if (!user) return toast.error("Sessão expirada");
    if (!produtoId) return toast.error("Selecione o produto final");
    const rend = Number(rendimento.replace(",", "."));
    if (!rend || rend <= 0) return toast.error("Rendimento inválido");
    const itensValidos = itens.filter((i) => i.insumo_id && Number(i.quantidade) > 0);
    if (itensValidos.length === 0) return toast.error("Adicione ao menos um insumo");

    setEnviando(true);
    try {
      const { data, error } = await supabase
        .from("receitas")
        .insert({
          produto_id: produtoId,
          rendimento: rend,
          unidade_rendimento: unidadeRendimento,
          usuario_id: user.id,
          status: "pendente",
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: errItens } = await supabase.from("receita_itens").insert(
        itensValidos.map((i) => ({
          receita_id: data.id,
          insumo_id: i.insumo_id,
          quantidade: Number(i.quantidade.replace(",", ".")),
          unidade: i.unidade || null,
        })),
      );
      if (errItens) throw errItens;

      toast.success("Ficha técnica enviada pra aprovação!");
      setProdutoId("");
      setRendimento("1");
      setUnidadeRendimento("UND");
      setItens([{ insumo_id: "", quantidade: "", unidade: "" }]);
      carregar(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao enviar", { description: msg });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl md:max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={voltar}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={tap}
            onClick={avancar}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Avançar"
          >
            <ArrowRight size={22} />
          </motion.button>
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-500">Produção</p>
            <h1 className="text-xl md:text-2xl font-bold text-white">Propor Ficha Técnica</h1>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Nova proposta</h2>

          {carregando ? (
            <SkeletonStack rows={3} />
          ) : (
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-gray-400">
                Produto final
                <select
                  value={produtoId}
                  onChange={(e) => setProdutoId(e.target.value)}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  <option value="">— Selecione —</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs uppercase tracking-wider text-gray-400">
                  Rendimento
                  <input
                    inputMode="decimal"
                    value={rendimento}
                    onChange={(e) => setRendimento(e.target.value)}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                </label>
                <label className="block text-xs uppercase tracking-wider text-gray-400">
                  Unidade
                  <input
                    value={unidadeRendimento}
                    onChange={(e) => setUnidadeRendimento(e.target.value)}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                </label>
              </div>

              <div className="pt-1">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-400">Insumos</p>
                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={it.insumo_id}
                        onChange={(e) => setItem(idx, { insumo_id: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                      >
                        <option value="">— Insumo —</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                      <input
                        inputMode="decimal"
                        placeholder="Qtd"
                        value={it.quantidade}
                        onChange={(e) => setItem(idx, { quantidade: e.target.value })}
                        className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                      />
                      <motion.button
                        whileTap={tap}
                        onClick={() => removeItem(idx)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                        aria-label="Remover insumo"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={tap}
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-400"
                >
                  <Plus size={13} /> Adicionar insumo
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={tap}
                onClick={enviar}
                disabled={enviando}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-3 text-sm font-bold uppercase text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
              >
                <Send size={16} /> {enviando ? "Enviando..." : "Enviar pra aprovação"}
              </motion.button>
            </div>
          )}
        </div>

        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Minhas propostas</h2>
        {carregando ? (
          <SkeletonStack rows={2} />
        ) : minhas.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center py-8">
            <BookOpen size={40} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Você ainda não propôs nenhuma ficha técnica.</p>
          </motion.div>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {minhas.map((r) => {
              const aberto = expandida === r.id;
              return (
                <motion.li
                  key={r.id}
                  variants={listItem}
                  className="bg-zinc-900 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/80"
                >
                  <button
                    onClick={() => toggleExpandir(r.id)}
                    className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
                    aria-expanded={aberto}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0">{statusIcon(r.status)}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium break-words">{r.produtos?.nome ?? "—"}</p>
                          <p className="text-gray-400 text-xs">
                            Rende {r.rendimento} {r.unidade_rendimento}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                        {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {aberto && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={collapseY}
                        className="border-t border-zinc-800 p-4 bg-zinc-950"
                      >
                        {itensPorReceita[r.id] ? (
                          itensPorReceita[r.id].length === 0 ? (
                            <p className="text-gray-500 text-sm">Sem insumos.</p>
                          ) : (
                            <ul className="space-y-2">
                              {itensPorReceita[r.id].map((item, i) => (
                                <li key={i} className="flex justify-between gap-2 text-sm">
                                  <span className="min-w-0 flex-1 break-words text-gray-300">{item.nome}</span>
                                  <span className="shrink-0 whitespace-nowrap text-orange-400 font-semibold tabular-nums">
                                    {item.quantidade} {item.unidade}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : (
                          <SkeletonStack rows={2} />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/historico-interno")({
  head: () => ({
    meta: [
      { title: "Minhas requisições de estoque — Misturaria Fina Mezcla" },
      { name: "description", content: "Acompanhe suas retiradas de insumos." },
    ],
  }),
  component: HistoricoInterno,
});

type RequisicaoInterna = {
  id: string;
  status: string;
  observacao: string | null;
  created_at: string;
};

type Item = {
  id: string;
  quantidade: number;
  produtos: { nome: string; unidade: string } | null;
};

function HistoricoInterno() {
  const navigate = useNavigate();
  const [requisicoes, setRequisicoes] = useState<RequisicaoInterna[]>([]);
  const [itens, setItens] = useState<Record<string, Item[]>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      fetchRequisicoes(session.user.id);
    };
    init();
  }, []);

  const fetchRequisicoes = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("requisicoes_internas")
      .select("id, status, observacao, created_at")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar histórico"); setLoading(false); return; }
    setRequisicoes(data || []);
    setLoading(false);
  };

  const fetchItens = async (reqId: string) => {
    if (itens[reqId]) return;
    const { data } = await supabase
      .from("requisicao_interna_itens")
      .select("id, quantidade, produtos(nome, unidade)")
      .eq("requisicao_id", reqId);
    if (data) setItens(prev => ({ ...prev, [reqId]: data as Item[] }));
  };

  const toggleExpandir = (id: string) => {
    if (expandido === id) {
      setExpandido(null);
    } else {
      setExpandido(id);
      fetchItens(id);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "pendente") return <Clock size={16} className="text-yellow-400" />;
    if (status === "aprovada") return <CheckCircle size={16} className="text-blue-400" />;
    if (status === "entregue") return <Package size={16} className="text-green-400" />;
    if (status === "rejeitada") return <XCircle size={16} className="text-red-400" />;
    return <Clock size={16} className="text-gray-400" />;
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "Pendente",
      aprovada: "Aprovada",
      entregue: "Entregue",
      rejeitada: "Rejeitada",
    };
    return labels[status] ?? status;
  };

  const statusColor = (status: string) => {
    if (status === "pendente") return "text-yellow-400 bg-yellow-900/30";
    if (status === "aprovada") return "text-blue-400 bg-blue-900/30";
    if (status === "entregue") return "text-green-400 bg-green-900/30";
    if (status === "rejeitada") return "text-red-400 bg-red-900/30";
    return "text-gray-400 bg-zinc-800";
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl md:max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={() => navigate({ to: "/" })}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </motion.button>
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-500">Estoque interno</p>
            <h1 className="text-xl md:text-2xl font-bold text-white">Minhas Requisições</h1>
          </div>
        </div>

        {loading ? (
          <SkeletonStack rows={5} />
        ) : requisicoes.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center py-12">
            <Package size={48} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-gray-500">Você ainda não fez nenhuma requisição.</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={tap}
              onClick={() => navigate({ to: "/requisicao-interna" })}
              className="mt-4 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              Fazer requisição
            </motion.button>
          </motion.div>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-3">
            {requisicoes.map(req => {
              const aberto = expandido === req.id;
              return (
                <motion.li
                  key={req.id}
                  variants={listItem}
                  className="bg-zinc-900 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/80 hover:shadow-md hover:shadow-primary/5"
                >
                  <button
                    onClick={() => toggleExpandir(req.id)}
                    className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
                    aria-expanded={aberto}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0">{statusIcon(req.status)}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {new Date(req.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "long", year: "numeric"
                            })}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(req.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(req.status)}`}>
                          {statusLabel(req.status)}
                        </span>
                        {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>
                    {req.observacao && (
                      <p className="text-gray-400 text-sm mt-2 italic truncate">"{req.observacao}"</p>
                    )}
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
                        {itens[req.id] ? (
                          itens[req.id].length === 0 ? (
                            <p className="text-gray-500 text-sm">Sem itens.</p>
                          ) : (
                            <ul className="space-y-2">
                              {itens[req.id].map(item => (
                                <li key={item.id} className="flex justify-between gap-2 text-sm">
                                  <span className="min-w-0 flex-1 break-words text-gray-300">{item.produtos?.nome}</span>
                                  <span className="shrink-0 whitespace-nowrap text-orange-400 font-semibold tabular-nums">
                                    {item.quantidade} {item.produtos?.unidade}
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

        <div className="mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={() => navigate({ to: "/requisicao-interna" })}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            + Nova Requisição
          </motion.button>
        </div>
      </div>
    </main>
  );
}

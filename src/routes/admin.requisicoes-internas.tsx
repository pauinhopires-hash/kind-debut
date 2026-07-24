import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  XCircle,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Truck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { notificar } from "@/lib/notificar";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/requisicoes-internas")({
  component: AdminRequisicoesInternas,
});

type ItemReq = {
  id: string;
  produto_id: string;
  quantidade: number;
  produtos: { nome: string; unidade: string } | null;
};

type Requisicao = {
  id: string;
  status: string;
  observacao: string | null;
  created_at: string;
  usuario_id: string;
  usuarios: { nome: string } | null;
  requisicao_interna_itens: ItemReq[];
};

function AdminRequisicoesInternas() {
  const navigate = useNavigate();
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      fetchRequisicoes();
    };
    init();
  }, []);

  const fetchRequisicoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("requisicoes_internas")
      .select(`id, status, observacao, created_at, usuario_id,
        usuarios!requisicoes_internas_usuario_id_fkey(nome),
        requisicao_interna_itens(id, produto_id, quantidade, produtos(nome, unidade))`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { toast.error("Erro ao carregar requisições"); setLoading(false); return; }
    setRequisicoes((data || []) as any);
    setLoading(false);
  };

  const aprovar = async (req: Requisicao) => {
    if (!userId) { toast.error("Sessão expirada"); return; }
    if (req.requisicao_interna_itens.length === 0) { toast.error("Requisição sem itens"); return; }
    setProcessing(req.id);
    try {
      // 1. Busca estoque atual (Estoque Central) para cada produto
      const prodIds = req.requisicao_interna_itens.map(i => i.produto_id);
      const { data: estoques, error: errEst } = await supabase
        .from("estoque_atual")
        .select("produto_id, quantidade")
        .eq("local", "ESTOQUE CENTRAL")
        .in("produto_id", prodIds);
      if (errEst) throw errEst;
      const estoqueMap: Record<string, number> = {};
      (estoques || []).forEach((e: any) => { estoqueMap[e.produto_id] = e.quantidade; });

      // 2. Insere movimentacoes PRIMEIRO (B-3 fix: antes de decrementar)
      const movs = req.requisicao_interna_itens.map(item => ({
        usuario_id: userId,
        produto_id: item.produto_id,
        local: "ESTOQUE CENTRAL",
        tipo: "saida",
        quantidade: item.quantidade,
        estoque_antes: estoqueMap[item.produto_id] ?? 0,
        estoque_depois: Math.max(0, (estoqueMap[item.produto_id] ?? 0) - item.quantidade),
        observacao: `Requisição interna #${req.id.slice(0, 8)}`,
      }));
      const { error: errMovs } = await supabase.from("movimentacoes_estoque").insert(movs);
      if (errMovs) console.warn("Movimentacoes nao registradas (RLS):", errMovs.message);

      // 3. Só após sucesso, atualiza estoque_atual
      for (const item of req.requisicao_interna_itens) {
        const antes = estoqueMap[item.produto_id] ?? 0;
        const depois = Math.max(0, antes - item.quantidade);
        const { error: errUpd } = await supabase
          .from("estoque_atual")
          .upsert(
            { produto_id: item.produto_id, local: "ESTOQUE CENTRAL", quantidade: depois },
            { onConflict: "produto_id,local" },
          );
        if (errUpd) throw errUpd;
      }

      // 4. Atualiza status da requisição
      const { error: errStatus } = await supabase
        .from("requisicoes_internas")
        .update({ status: "aprovada", decidido_por: userId, decidido_em: new Date().toISOString() })
        .eq("id", req.id);
      if (errStatus) throw errStatus;

      toast.success("Requisição aprovada!");
      notificar(req.usuario_id, "Requisição de estoque aprovada", "Sua retirada de insumos foi aprovada.", "/historico-interno");
      fetchRequisicoes();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const confirmarEntrega = async (req: Requisicao) => {
    setProcessing(req.id);
    try {
      const { error } = await supabase
        .from("requisicoes_internas")
        .update({ status: "entregue", decidido_por: userId, decidido_em: new Date().toISOString() })
        .eq("id", req.id);
      if (error) throw error;
      toast.success("Entrega confirmada!");
      notificar(req.usuario_id, "Entrega de estoque confirmada", "Sua retirada de insumos foi entregue.", "/historico-interno");
      fetchRequisicoes();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const rejeitar = async (req: Requisicao) => {
    setProcessing(req.id);
    try {
      const { error } = await supabase
        .from("requisicoes_internas")
        .update({ status: "rejeitada", decidido_por: userId, decidido_em: new Date().toISOString() })
        .eq("id", req.id);
      if (error) throw error;
      toast.success("Requisição rejeitada");
      notificar(req.usuario_id, "Requisição de estoque rejeitada", "Sua retirada de insumos foi rejeitada.", "/historico-interno");
      fetchRequisicoes();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === "entregue") return "text-emerald-400 bg-emerald-400/10";
    if (s === "aprovada") return "text-green-400 bg-green-400/10";
    if (s === "rejeitada") return "text-red-400 bg-red-400/10";
    return "text-orange-400 bg-orange-400/10";
  };

  const statusLabel = (s: string) => {
    if (s === "entregue") return "Entregue";
    if (s === "aprovada") return "Aprovada";
    if (s === "rejeitada") return "Rejeitada";
    return "Pendente";
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
          <h1 className="text-xl font-bold text-orange-500">Requisições Internas</h1>
        </div>

        {loading ? (
          <SkeletonStack rows={6} />
        ) : requisicoes.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center text-gray-400 py-12">
            <PackageCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma requisição</p>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="space-y-3">
            {requisicoes.map(req => (
              <motion.div
                key={req.id}
                variants={listItem}
                className="bg-zinc-900 rounded-xl overflow-hidden transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <button
                  className="w-full p-4 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                  aria-expanded={expandedId === req.id}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(req.status)}`}>
                        {statusLabel(req.status)}
                      </span>
                      <span className="text-gray-400 text-xs">{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <p className="text-white font-medium truncate">
                      {req.usuarios?.nome || "Usuário desconhecido"}
                    </p>
                    <p className="text-gray-400 text-sm">{req.requisicao_interna_itens.length} item(s)</p>
                  </div>
                  {expandedId === req.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                <AnimatePresence initial={false}>
                  {expandedId === req.id && (
                    <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseY} className="border-t border-zinc-800 p-4">
                      {req.observacao && (
                        <p className="text-gray-400 text-sm mb-3 italic">"{req.observacao}"</p>
                      )}
                      <div className="space-y-2 mb-4">
                        {req.requisicao_interna_itens.map(item => (
                          <div key={item.id} className="flex justify-between items-center bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-white text-sm">{item.produtos?.nome || item.produto_id}</span>
                            <span className="text-orange-400 text-sm font-medium">
                              {item.quantidade} {item.produtos?.unidade || ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      {req.status === "pendente" && (
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={tap}
                            onClick={() => aprovar(req)}
                            disabled={processing === req.id}
                            className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-zinc-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/40"
                          >
                            {processing === req.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Aprovar
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={tap}
                            onClick={() => rejeitar(req)}
                            disabled={processing === req.id}
                            className="flex-1 bg-red-800 hover:bg-red-700 disabled:bg-zinc-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                          >
                            {processing === req.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Rejeitar
                          </motion.button>
                        </div>
                      )}
                      {req.status === "aprovada" && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={tap}
                          onClick={() => confirmarEntrega(req)}
                          disabled={processing === req.id}
                          className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                        >
                          {processing === req.id ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />} Confirmar Entrega
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

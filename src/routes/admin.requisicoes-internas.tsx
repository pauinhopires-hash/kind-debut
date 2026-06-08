import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, XCircle, ChevronDown, ChevronUp, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/requisicoes-internas")({
  component: AdminRequisicoesInternas,
});

type RequisicaoInterna = {
  id: string;
  status: string;
  observacao: string | null;
  created_at: string;
  usuario_id: string;
  usuarios: { nome: string } | null;
};

type Item = {
  id: string;
  quantidade: number;
  produto_id: string;
  produtos: { nome: string; unidade: string } | null;
};

function AdminRequisicoesInternas() {
  const navigate = useNavigate();
  const [requisicoes, setRequisicoes] = useState<RequisicaoInterna[]>([]);
  const [itens, setItens] = useState<Record<string, Item[]>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      fetchRequisicoes();
    };
    init();
  }, []);

  const fetchRequisicoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("requisicoes_internas")
      .select("id, status, observacao, created_at, usuario_id, usuarios(nome)")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar requisiÃ§Ãµes"); setLoading(false); return; }
    setRequisicoes((data || []) as RequisicaoInterna[]);
    setLoading(false);
  };

  const fetchItens = async (reqId: string) => {
    if (itens[reqId]) return;
    const { data, error } = await supabase
      .from("requisicao_interna_itens")
      .select("id, quantidade, produto_id, produtos(nome, unidade)")
      .eq("requisicao_id", reqId);
    if (!error) {
      setItens(prev => ({ ...prev, [reqId]: (data || []) as Item[] }));
    }
  };

  const toggleExpandir = (id: string) => {
    if (expandido === id) {
      setExpandido(null);
    } else {
      setExpandido(id);
      fetchItens(id);
    }
  };

  const aprovar = async (req: RequisicaoInterna) => {
    const { error } = await supabase
      .from("requisicoes_internas")
      .update({ status: "aprovada" })
      .eq("id", req.id);
    if (error) { toast.error("Erro ao aprovar"); return; }
    toast.success("RequisiÃ§Ã£o aprovada!");
    fetchRequisicoes();
  };

  const entregar = async (req: RequisicaoInterna) => {
    const reqItens = itens[req.id];
    if (!reqItens) { toast.error("Carregue os itens primeiro"); return; }

    try {
      // Update status
      const { error: errStatus } = await supabase
        .from("requisicoes_internas")
        .update({ status: "entregue" })
        .eq("id", req.id);
      if (errStatus) throw errStatus;

      // Baixa no estoque + registra movimentaÃ§Ã£o para cada item
      for (const item of reqItens) {
        // Get current stock
        const { data: prod, error: errProd } = await supabase
          .from("produtos")
          .select("estoque_atual")
          .eq("id", item.produto_id)
          .single();
        if (errProd) throw errProd;

        const estoqueAntes = prod.estoque_atual;
        const estoqueDepois = estoqueAntes - item.quantidade;

        // Update stock
        const { error: errEst } = await supabase
          .from("produtos")
          .update({ estoque_atual: estoqueDepois })
          .eq("id", item.produto_id);
        if (errEst) throw errEst;

        // Register movement
        await supabase.from("movimentacoes_estoque").insert({
          tipo: "saida",
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          estoque_antes: estoqueAntes,
          estoque_depois: estoqueDepois,
          requisicao_interna_id: req.id,
          observacao: `SaÃ­da por requisiÃ§Ã£o interna #${req.id.substring(0, 8)}`,
        });
      }

      toast.success("Entrega confirmada! Estoque atualizado.");
      fetchRequisicoes();
    } catch (e: any) {
      toast.error("Erro ao confirmar entrega: " + e.message);
    }
  };

  const rejeitar = async (id: string) => {
    const { error } = await supabase
      .from("requisicoes_internas")
      .update({ status: "rejeitada" })
      .eq("id", id);
    if (error) { toast.error("Erro ao rejeitar"); return; }
    toast.success("RequisiÃ§Ã£o rejeitada.");
    fetchRequisicoes();
  };

  const statusColor = (status: string) => {
    if (status === "pendente") return "text-yellow-400 bg-yellow-900/30";
    if (status === "aprovada") return "text-blue-400 bg-blue-900/30";
    if (status === "entregue") return "text-green-400 bg-green-900/30";
    if (status === "rejeitada") return "text-red-400 bg-red-900/30";
    return "text-gray-400 bg-zinc-800";
  };

  const pendentes = requisicoes.filter(r => r.status === "pendente").length;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ to: "/admin" })} className="text-gray-400 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-orange-500">RequisiÃ§Ãµes Internas</h1>
            {pendentes > 0 && (
              <p className="text-yellow-400 text-sm">{pendentes} pendente{pendentes > 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Carregando...</p>
        ) : requisicoes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma requisiÃ§Ã£o encontrada.</p>
        ) : (
          <div className="space-y-3">
            {requisicoes.map(req => (
              <div key={req.id} className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white">{req.usuarios?.nome ?? "UsuÃ¡rio"}</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(req.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>

                  {req.observacao && (
                    <p className="text-gray-400 text-sm mb-2 italic">"{req.observacao}"</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {req.status === "pendente" && (
                      <>
                        <button
                          onClick={() => aprovar(req)}
                          className="flex items-center gap-1 bg-blue-700 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Check size={14} /> Aprovar
                        </button>
                        <button
                          onClick={() => rejeitar(req.id)}
                          className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <XCircle size={14} /> Rejeitar
                        </button>
                      </>
                    )}
                    {req.status === "aprovada" && (
                      <button
                        onClick={() => { fetchItens(req.id); setExpandido(req.id); }}
                        className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        onClickCapture={(e) => { e.stopPropagation(); entregar(req); }}
                      >
                        <PackageCheck size={14} /> Confirmar Entrega
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpandir(req.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-white text-sm px-2 py-1.5 rounded-lg transition-colors ml-auto"
                    >
                      {expandido === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      Itens
                    </button>
                  </div>
                </div>

                {/* Itens expandidos */}
                {expandido === req.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-950">
                    {itens[req.id] ? (
                      itens[req.id].length === 0 ? (
                        <p className="text-gray-500 text-sm">Sem itens.</p>
                      ) : (
                        <ul className="space-y-1">
                          {itens[req.id].map(item => (
                            <li key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-300">{item.produtos?.nome}</span>
                              <span className="text-orange-400 font-semibold">
                                {item.quantidade} {item.produtos?.unidade}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">Carregando itens...</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

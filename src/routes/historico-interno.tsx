import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/historico-interno")({
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
    if (error) { toast.error("Erro ao carregar histÃ³rico"); setLoading(false); return; }
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2mz mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ to: "/" })} className="text-gray-400 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-orange-500">Minhas RequisiÃ§Ãµes</h1>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Carregando...</p>
        ) : requisicoes.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-gray-500">VocÃª ainda nÃ£o fez nenhuma requisiÃ§Ã£o.</p>
            <button
              onClick={() => navigate({ to: "/requisicao-interna" })}
              className="mt-4 bg-orange-600 hover:bs-orange-500 text-white px-6 py-2 rounded-xl transition-colors"
            >
              Fazer requisiÃ§Ã£o
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {requisicoes.map(req => (
              <div key={req.id} className="bg-zinc-900 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpandir(req.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {statusIcon(req.status)}
                      <div>
                        <p className="text-white text-sm font-medium">
                          {new Date(req.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "long", year: "numeric"
                          })}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(req.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(req.status)}`}>
                        {statusLabel(req.status)}
                      </span>
                      {expandido === req.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                  {req.observacao && (
                    <p className="text-gray-400 text-sm mt-2 italic">"{req.observacao}"</p>
                  )}
                </button>

                {expandido === req.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-950">
                    {itens[req.id] ? (
                      itens[req.id].length === 0 ? (
                        <p className="text-gray-500 text-sm">Sem itens.</p>
                      ) : (
                        <ul className="space-y-2">
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

        <div className="mt-6">
          <button
            onClick={() => navigate({ to: "/requisicao-interna" })}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl py-3 transition-colors"
          >
            + Nova RequisiÃ§Ã£o
          </button>
        </div>
      </div>
    </div>
  );
}

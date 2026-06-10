import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  XCircle,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Plus,
  Minus,
  Trash2,
  Share2,
  AlertTriangle,
} from "lucide-react";
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
  const [estoque, setEstoque] = useState<Record<string, number>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequisicoes();
  }, []);

  const fetchRequisicoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("requisicoes_internas")
      .select("id, status, observacao, created_at, usuario_id, usuarios(nome)")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar requisições"); setLoading(false); return; }
    setRequisicoes((data || []) as RequisicaoInterna[]);
    setLoading(false);
  };

  const fetchEstoqueDosItens = async (lista: Item[]) => {
    const ids = lista.map(i => i.produto_id).filter(id => estoque[id] === undefined);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("estoque_atual")
      .select("produto_id, quantidade")
      .in("produto_id", ids);
    if (data) {
      const map: Record<string, number> = {};
      data.forEach(r => { map[r.produto_id] = Number(r.quantidade); });
      ids.forEach(id => { if (map[id] === undefined) map[id] = 0; });
      setEstoque(prev => ({ ...prev, ...map }));
    }
  };

  const fetchItens = async (reqId: string, force = false) => {
    if (itens[reqId] && !force) return;
    const { data, error } = await supabase
      .from("requisicao_interna_itens")
      .select("id, quantidade, produto_id, produtos(nome, unidade)")
      .eq("requisicao_id", reqId);
    if (!error) {
      const lista = (data || []) as Item[];
      setItens(prev => ({ ...prev, [reqId]: lista }));
      fetchEstoqueDosItens(lista);
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
    // Re-checar estoque antes de aprovar
    let lista = itens[req.id];
    if (!lista) {
      const { data } = await supabase
        .from("requisicao_interna_itens")
        .select("id, quantidade, produto_id, produtos(nome, unidade)")
        .eq("requisicao_id", req.id);
      lista = (data || []) as Item[];
      setItens(prev => ({ ...prev, [req.id]: lista! }));
      await fetchEstoqueDosItens(lista);
    }
    if (!lista || lista.length === 0) {
      toast.error("Requisição sem itens. Rejeite-a antes.");
      return;
    }
    const { data: estData } = await supabase
      .from("estoque_atual")
      .select("produto_id, quantidade")
      .in("produto_id", lista.map(i => i.produto_id));
    const mapaEst: Record<string, number> = {};
    (estData || []).forEach(r => { mapaEst[r.produto_id] = Number(r.quantidade); });
    const insuficientes = lista.filter(i => (mapaEst[i.produto_id] ?? 0) < Number(i.quantidade));
    if (insuficientes.length > 0) {
      const nomes = insuficientes.map(i => `${i.produtos?.nome} (disp: ${mapaEst[i.produto_id] ?? 0})`).join(", ");
      if (!confirm(`Estoque insuficiente para: ${nomes}.\n\nAprovar mesmo assim?`)) return;
    }

    const { error } = await supabase
      .from("requisicoes_internas")
      .update({ status: "aprovada" })
      .eq("id", req.id);
    if (error) { toast.error("Erro ao aprovar"); return; }
    toast.success("Requisição aprovada!");
    fetchRequisicoes();
  };

  const entregar = async (req: RequisicaoInterna) => {
    let reqItens = itens[req.id];
    if (!reqItens) {
      const { data, error } = await supabase
        .from("requisicao_interna_itens")
        .select("id, quantidade, produto_id, produtos(nome, unidade)")
        .eq("requisicao_id", req.id);
      if (error || !data || data.length === 0) {
        toast.error("Não foi possível carregar os itens da requisição");
        return;
      }
      reqItens = data as Item[];
      setItens(prev => ({ ...prev, [req.id]: reqItens }));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const usuarioId = session?.user.id ?? null;

      for (const item of reqItens) {
        const { data: est, error: errEst } = await supabase
          .from("estoque_atual")
          .select("quantidade")
          .eq("produto_id", item.produto_id)
          .maybeSingle();
        if (errEst) throw errEst;

        const estoqueAntes = est ? Number(est.quantidade) : 0;
        if (estoqueAntes < Number(item.quantidade)) {
          throw new Error(`Estoque insuficiente para ${item.produtos?.nome ?? "produto"} (disponível: ${estoqueAntes})`);
        }
        const estoqueDepois = estoqueAntes - Number(item.quantidade);

        const { error: errMov } = await supabase
          .from("movimentacoes_estoque")
          .insert({
            tipo: "saida",
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            estoque_antes: estoqueAntes,
            estoque_depois: estoqueDepois,
            requisicao_id: req.id,
            usuario_id: usuarioId,
            observacao: `Saída por requisição interna #${req.id.substring(0, 8)}`,
          });
        if (errMov) throw errMov;

        const { error: errUpd } = await supabase
          .from("estoque_atual")
          .upsert({ produto_id: item.produto_id, quantidade: estoqueDepois });
        if (errUpd) throw errUpd;
      }

      const { error: errStatus } = await supabase
        .from("requisicoes_internas")
        .update({ status: "entregue" })
        .eq("id", req.id);
      if (errStatus) throw errStatus;

      toast.success("Entrega confirmada! Estoque atualizado.");
      // limpa cache do estoque para refletir
      setEstoque({});
      fetchRequisicoes();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao confirmar entrega: " + msg);
    }
  };

  const rejeitar = async (id: string) => {
    if (!confirm("Rejeitar esta requisição?")) return;
    const { error } = await supabase
      .from("requisicoes_internas")
      .update({ status: "rejeitada" })
      .eq("id", id);
    if (error) { toast.error("Erro ao rejeitar"); return; }
    toast.success("Requisição rejeitada.");
    fetchRequisicoes();
  };

  const atualizarQtd = async (req: RequisicaoInterna, item: Item, novaQtd: number) => {
    if (req.status !== "pendente") return;
    if (novaQtd <= 0) return;
    setItens(prev => ({
      ...prev,
      [req.id]: (prev[req.id] ?? []).map(i => (i.id === item.id ? { ...i, quantidade: novaQtd } : i)),
    }));
    const { error } = await supabase
      .from("requisicao_interna_itens")
      .update({ quantidade: novaQtd })
      .eq("id", item.id);
    if (error) {
      toast.error("Erro ao atualizar quantidade");
      fetchItens(req.id, true);
    }
  };

  const excluirItem = async (req: RequisicaoInterna, item: Item) => {
    if (req.status !== "pendente") return;
    if (!confirm(`Excluir "${item.produtos?.nome ?? "item"}" da requisição?`)) return;
    const { error } = await supabase
      .from("requisicao_interna_itens")
      .delete()
      .eq("id", item.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Item excluído");
    const restantes = (itens[req.id] ?? []).filter(i => i.id !== item.id);
    setItens(prev => ({ ...prev, [req.id]: restantes }));
    if (restantes.length === 0) {
      toast.warning("Requisição sem itens. Considere rejeitá-la.");
    }
  };

  const compartilharWhatsApp = (req: RequisicaoInterna) => {
    const lista = itens[req.id] ?? [];
    if (lista.length === 0) { toast.error("Sem itens para compartilhar"); return; }
    const linhas = lista.map(it => `• ${it.produtos?.nome ?? "—"} — ${it.quantidade} ${it.produtos?.unidade ?? ""}`.trim());
    const data = new Date(req.created_at).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
    const texto = [
      `*Requisição Interna de Estoque*`,
      `Solicitante: ${req.usuarios?.nome ?? "—"}`,
      `Data: ${data}`,
      `Status: ${req.status}`,
      ``,
      ...linhas,
      req.observacao ? `\nObs: ${req.observacao}` : ``,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-orange-500">Requisições Internas</h1>
            {pendentes > 0 && (
              <p className="text-yellow-400 text-sm">{pendentes} pendente{pendentes > 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={() => navigate({ to: "/requisicao-interna" })}
            className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
          >
            <Plus size={14} /> Nova
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Carregando...</p>
        ) : requisicoes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma requisição encontrada.</p>
        ) : (
          <div className="space-y-3">
            {requisicoes.map(req => {
              const pendente = req.status === "pendente";
              return (
              <div key={req.id} className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white">{req.usuarios?.nome ?? "Usuário"}</p>
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

                  <div className="flex gap-2 flex-wrap">
                    {pendente && (
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
                        onClick={() => entregar(req)}
                        className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <PackageCheck size={14} /> Confirmar Entrega
                      </button>
                    )}
                    {(pendente || req.status === "aprovada") && (
                      <button
                        onClick={() => {
                          if (!itens[req.id]) fetchItens(req.id).then(() => compartilharWhatsApp(req));
                          else compartilharWhatsApp(req);
                        }}
                        className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Share2 size={14} /> WhatsApp
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

                {expandido === req.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-950">
                    {itens[req.id] ? (
                      itens[req.id].length === 0 ? (
                        <p className="text-gray-500 text-sm">Sem itens.</p>
                      ) : (
                        <ul className="space-y-2">
                          {itens[req.id].map(item => {
                            const disp = estoque[item.produto_id];
                            const insuf = disp !== undefined && disp < Number(item.quantidade);
                            return (
                            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="text-gray-200 truncate">{item.produtos?.nome}</p>
                                {disp !== undefined && (
                                  <p className={`text-[10px] ${insuf ? "text-red-400" : "text-gray-500"} flex items-center gap-1`}>
                                    {insuf && <AlertTriangle size={10} />}
                                    Estoque: {disp} {item.produtos?.unidade}
                                  </p>
                                )}
                              </div>
                              {pendente ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => atualizarQtd(req, item, Number(item.quantidade) - 1)}
                                    disabled={Number(item.quantidade) <= 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white disabled:opacity-40"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={1}
                                    value={item.quantidade}
                                    onChange={e => {
                                      const v = Number(e.target.value);
                                      if (Number.isFinite(v) && v > 0) atualizarQtd(req, item, v);
                                    }}
                                    className={`w-14 h-7 rounded-md border bg-zinc-900 text-center text-xs font-semibold tabular-nums outline-none focus:border-orange-500 ${insuf ? "border-red-500 text-red-400" : "border-zinc-700 text-white"}`}
                                  />
                                  <button
                                    onClick={() => atualizarQtd(req, item, Number(item.quantidade) + 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-orange-600 hover:bg-orange-500 text-white"
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <span className="ml-1 text-[10px] uppercase text-gray-500 w-8">
                                    {item.produtos?.unidade ?? ""}
                                  </span>
                                  <button
                                    onClick={() => excluirItem(req, item)}
                                    className="ml-1 w-7 h-7 flex items-center justify-center rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <span className={`font-semibold ${insuf ? "text-red-400" : "text-orange-400"}`}>
                                  {item.quantidade} {item.produtos?.unidade}
                                </span>
                              )}
                            </li>
                          );})}
                        </ul>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">Carregando itens...</p>
                    )}
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

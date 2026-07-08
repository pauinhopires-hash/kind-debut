import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Send, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";

export const Route = createFileRoute("/requisicao-interna")({
  head: () => ({
    meta: [
      { title: "Requisição de estoque — Misturaria Fina Mezcla" },
      { name: "description", content: "Retire insumos do estoque central." },
    ],
  }),
  component: RequisicaoInterna,
});

type Produto = { id: string; nome: string; unidade: string; estoque_disponivel: number };
type ItemRequisicao = { produto_id: string; nome: string; unidade: string; quantidade: number };

function RequisicaoInterna() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemRequisicao[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      fetchProdutos();
    };
    init();
  }, []);

  const fetchProdutos = async () => {
    setCarregandoProdutos(true);
    const [{ data: prods, error: errP }, { data: estoques }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);
    if (errP) { toast.error("Erro ao carregar produtos"); setCarregandoProdutos(false); return; }
    const estoqueMap: Record<string, number> = {};
    (estoques || []).forEach((e: any) => { estoqueMap[e.produto_id] = e.quantidade; });
    const lista: Produto[] = (prods || []).map((p: any) => ({
      id: p.id, nome: p.nome, unidade: p.unidade,
      estoque_disponivel: estoqueMap[p.id] ?? 0,
    }));
    setProdutos(lista);
    setCarregandoProdutos(false);
  };

  const adicionarItem = () => {
    if (!produtoSelecionado) { toast.error("Selecione um produto"); return; }
    if (quantidade <= 0) { toast.error("Quantidade deve ser maior que zero"); return; }
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;
    if (itens.find(i => i.produto_id === produtoSelecionado)) { toast.error("Produto já adicionado"); return; }
    if (produto.estoque_disponivel > 0 && quantidade > produto.estoque_disponivel) {
      toast.warning("Atenção: estoque disponível é " + produto.estoque_disponivel + " " + produto.unidade);
    }
    setItens([...itens, { produto_id: produto.id, nome: produto.nome, unidade: produto.unidade, quantidade }]);
    setProdutoSelecionado("");
    setQuantidade(1);
  };

  const removerItem = (id: string) => setItens(itens.filter(i => i.produto_id !== id));

  const enviarRequisicao = async () => {
    if (!userId) { toast.error("Sessão expirada"); return; }
    if (itens.length === 0) { toast.error("Adicione ao menos um item"); return; }
    setLoading(true);
    try {
      const { data: req, error: errReq } = await supabase
        .from("requisicoes_internas")
        .insert({ usuario_id: userId, observacao: observacao || null, status: "pendente" })
        .select().single();
      if (errReq) throw errReq;
      const { error: errItens } = await supabase.from("requisicao_interna_itens")
        .insert(itens.map(i => ({ requisicao_id: req.id, produto_id: i.produto_id, quantidade: i.quantidade })));
      if (errItens) throw errItens;
      toast.success("Requisição enviada!");
      navigate({ to: "/historico-interno" });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally { setLoading(false); }
  };

  const produtoSel = produtos.find(p => p.id === produtoSelecionado);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl md:max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-500">Estoque interno</p>
            <h1 className="text-xl md:text-2xl font-bold text-white">Requisição Interna</h1>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Adicionar Item</h2>

          {carregandoProdutos ? (
            <SkeletonStack rows={2} />
          ) : produtos.length === 0 ? (
            <div className="py-6 text-center">
              <PackageSearch size={28} className="mx-auto text-zinc-600" />
              <p className="mt-2 text-sm text-gray-400">Nenhum produto disponível.</p>
            </div>
          ) : (
            <>
              <select
                value={produtoSelecionado}
                onChange={e => setProdutoSelecionado(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                <option value="">Selecione um produto...</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {p.estoque_disponivel > 0 ? `disponível: ${p.estoque_disponivel} ${p.unidade}` : p.unidade}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={e => setQuantidade(Number(e.target.value))}
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  aria-label="Quantidade"
                />
                {produtoSel && <span className="flex items-center text-gray-400 text-sm">{produtoSel.unidade}</span>}
                <button
                  onClick={adicionarItem}
                  disabled={!produtoSelecionado}
                  className="flex-1 min-w-[8rem] bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
              {produtoSel && produtoSel.estoque_disponivel > 0 && (
                <p className="text-xs text-gray-500 mt-2">Estoque atual: {produtoSel.estoque_disponivel} {produtoSel.unidade}</p>
              )}
            </>
          )}
        </div>

        {itens.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Itens ({itens.length})</h2>
            <ul className="space-y-2">
              {itens.map(item => (
                <li key={item.produto_id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-800/80">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{item.nome}</p>
                    <p className="text-gray-400 text-sm">{item.quantidade} {item.unidade}</p>
                  </div>
                  <button
                    onClick={() => removerItem(item.produto_id)}
                    className="text-red-400 hover:text-red-300 rounded-md p-2 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label={`Remover ${item.nome}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
          <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={3}
            placeholder="Detalhes, urgência, etc."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-orange-500"
          />
        </div>

        <button
          onClick={enviarRequisicao}
          disabled={loading || itens.length === 0}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Send size={18} className={loading ? "animate-pulse" : ""} />
          {loading ? "Enviando..." : `Enviar Requisição (${itens.length} item${itens.length !== 1 ? "s" : ""})`}
        </button>
      </div>
    </main>
  );
}

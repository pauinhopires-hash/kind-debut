// v2
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/requisicao-interna")({
  component: RequisicaoInterna,
});

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  estoque_disponivel: number;
};

type ItemRequisicao = {
  produto_id: string;
  nome: string;
  unidade: string;
  quantidade: number;
};

function RequisicaoInterna() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemRequisicao[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
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
    const { data, error } = await supabase
      .from("estoque_atual")
      .select("quantidade, produto_id, produtos(id, nome, unidade)")
      .gt("quantidade", 0);
    if (error) { toast.error("Erro ao carregar produtos"); return; }
    const lista: Produto[] = (data || []).map((e: any) => ({
      id: e.produto_id,
      nome: e.produtos?.nome || "",
      unidade: e.produtos?.unidade || "",
      estoque_disponivel: e.quantidade,
    })).sort((a: Produto, b: Produto) => a.nome.localeCompare(b.nome));
    setProdutos(lista);
  };

  const adicionarItem = () => {
    if (!produtoSelecionado) { toast.error("Selecione um produto"); return; }
    if (quantidade <= 0) { toast.error("Quantidade deve ser maior que zero"); return; }
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;
    if (itens.find(i => i.produto_id === produtoSelecionado)) {
      toast.error("Produto já adicionado");
      return;
    }
    if (quantidade > produto.estoque_disponivel) {
      toast.error(`Estoque disponível: ${produto.estoque_disponivel} ${produto.unidade}`);
      return;
    }
    setItens([...itens, {
      produto_id: produto.id,
      nome: produto.nome,
      unidade: produto.unidade,
      quantidade,
    }]);
    setProdutoSelecionado("");
    setQuantidade(1);
  };

  const removerItem = (produtoId: string) => {
    setItens(itens.filter(i => i.produto_id !== produtoId));
  };

  const enviarRequisicao = async () => {
    if (itens.length === 0) { toast.error("Adicione ao menos um item"); return; }
    if (!userId) { toast.error("Sessão expirada"); return; }
    setLoading(true);
    try {
      const { data: req, error: errReq } = await supabase
        .from("requisicoes_internas")
        .insert({ usuario_id: userId, observacao: observacao || null, status: "pendente" })
        .select()
        .single();
      if (errReq) throw errReq;

      const { error: errItens } = await supabase
        .from("requisicao_interna_itens")
        .insert(itens.map(i => ({
          requisicao_id: req.id,
          produto_id: i.produto_id,
          quantidade: i.quantidade,
        })));
      if (errItens) throw errItens;

      toast.success("Requisição enviada com sucesso!");
      navigate({ to: "/historico-interno" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao enviar requisição: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const produtoSel = produtos.find(p => p.id === produtoSelecionado);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ to: "/" })} className="text-gray-400 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-orange-500">Requisição Interna</h1>
        </div>

        {/* Adicionar item */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Adicionar Item</h2>
          <select
            value={produtoSelecionado}
            onChange={e => setProdutoSelecionado(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-orange-500"
          >
            <option value="">Selecione um produto...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} â disponÃ­vel: {p.estoque_disponivel} {p.unidade}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={produtoSel?.estoque_disponivel}
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              placeholder="Qtd"
              className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
            />
            {produtoSel && (
              <span className="flex items-center text-gray-400 text-sm">{produtoSel.unidade}</span>
            )}
            <button
              onClick={adicionarItem}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>

        {/* Lista de itens */}
        {itens.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Itens da Requisição</h2>
            <div className="space-y-2">
              {itens.map(item => (
                <div key={item.produto_id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white font-medium">{item.nome}</p>
                    <p className="text-gray-400 text-sm">{item.quantidade} {item.unidade}</p>
                  </div>
                  <button onClick={() => removerItem(item.produto_id)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observação */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Observação (opcional)</h2>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={3}
            placeholder="Motivo da requisição, urgência, etc."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-orange-500"
          />
        </div>

        <button
          onClick={enviarRequisicao}
          disabled={loading || itens.length === 0}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
        >
          <Send size={18} />
          {loading ? "Enviando..." : `Enviar Requisição (${itens.length} ${itens.length === 1 ? "item" : "itens"})`}
        </button>
      </div>
    </div>
  );
}

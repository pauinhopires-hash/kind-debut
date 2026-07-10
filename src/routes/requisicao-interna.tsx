import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Send, PackageSearch, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { easeOutExpo, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/requisicao-interna")({
  head: () => ({
    meta: [
      { title: "Requisição de estoque — Misturaria Fina Mezcla" },
      { name: "description", content: "Retire insumos do estoque central." },
    ],
  }),
  component: RequisicaoInterna,
});

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  setor: string | null;
  local: string | null;
  estoque_disponivel: number;
};
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
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("");
  const [localFiltro, setLocalFiltro] = useState("");

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
      supabase.from("produtos").select("id, nome, unidade, setor, local").eq("ativo", true).order("nome"),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);
    if (errP) { toast.error("Erro ao carregar produtos"); setCarregandoProdutos(false); return; }
    const estoqueMap: Record<string, number> = {};
    (estoques || []).forEach((e: any) => { estoqueMap[e.produto_id] = e.quantidade; });
    const lista: Produto[] = (prods || []).map((p: any) => ({
      id: p.id, nome: p.nome, unidade: p.unidade, setor: p.setor, local: p.local,
      estoque_disponivel: estoqueMap[p.id] ?? 0,
    }));
    setProdutos(lista);
    setCarregandoProdutos(false);
  };

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (setorFiltro && p.setor !== setorFiltro) return false;
      if (localFiltro && p.local !== localFiltro) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [produtos, busca, setorFiltro, localFiltro]);

  const setoresDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => { if (p.setor) set.add(p.setor); });
    return Array.from(set).sort();
  }, [produtos]);

  const locaisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => { if (p.local) set.add(p.local); });
    return Array.from(set).sort();
  }, [produtos]);

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
            <h1 className="text-xl md:text-2xl font-bold text-white">Requisição Interna</h1>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Adicionar Item</h2>

          {carregandoProdutos ? (
            <SkeletonStack rows={2} />
          ) : produtos.length === 0 ? (
            <motion.div initial="hidden" animate="visible" variants={fadeIn} className="py-6 text-center">
              <PackageSearch size={28} className="mx-auto text-zinc-600" />
              <p className="mt-2 text-sm text-gray-400">Nenhum produto disponível.</p>
            </motion.div>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="search"
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                />
              </div>

              {setoresDisponiveis.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <FiltroPill label="Todos os setores" ativo={setorFiltro === ""} onClick={() => setSetorFiltro("")} />
                  {setoresDisponiveis.map((s) => (
                    <FiltroPill key={s} label={s} ativo={setorFiltro === s} onClick={() => setSetorFiltro(s)} />
                  ))}
                </div>
              )}
              {locaisDisponiveis.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <FiltroPill label="Todos os locais" ativo={localFiltro === ""} onClick={() => setLocalFiltro("")} />
                  {locaisDisponiveis.map((l) => (
                    <FiltroPill key={l} label={l} ativo={localFiltro === l} onClick={() => setLocalFiltro(l)} />
                  ))}
                </div>
              )}

              {produtosFiltrados.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">Nada encontrado.</p>
              ) : (
                <motion.ul
                  initial="hidden"
                  animate="visible"
                  variants={staggerList(0.02, 0.01)}
                  className="mb-3 max-h-72 space-y-1.5 overflow-y-auto pr-1"
                >
                  {produtosFiltrados.map((p) => {
                    const selecionado = produtoSelecionado === p.id;
                    return (
                      <motion.li key={p.id} variants={listItem}>
                        <motion.button
                          type="button"
                          whileTap={tap}
                          animate={{
                            borderColor: selecionado ? "rgba(232,101,10,0.7)" : "rgb(63,63,70)",
                            backgroundColor: selecionado ? "rgba(232,101,10,0.08)" : "rgb(39,39,42)",
                          }}
                          transition={{ duration: 0.2, ease: easeOutExpo }}
                          onClick={() => setProdutoSelecionado(selecionado ? "" : p.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{p.nome}</p>
                            <p className="truncate text-xs text-gray-400">
                              {[p.setor, p.local].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-xs ${p.estoque_disponivel > 0 ? "text-gray-400" : "text-red-400"}`}
                          >
                            {p.estoque_disponivel} {p.unidade}
                          </span>
                        </motion.button>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}

              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={e => setQuantidade(Number(e.target.value))}
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  aria-label="Quantidade"
                />
                {produtoSel && <span className="flex items-center text-gray-400 text-sm">{produtoSel.unidade}</span>}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={tap}
                  onClick={adicionarItem}
                  disabled={!produtoSelecionado}
                  className="flex-1 min-w-[8rem] bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <Plus size={16} /> Adicionar
                </motion.button>
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
            <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
              <AnimatePresence>
                {itens.map(item => (
                  <motion.li
                    key={item.produto_id}
                    variants={listItem}
                    exit="exit"
                    layout
                    className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-800/80 hover:shadow-md hover:shadow-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{item.nome}</p>
                      <p className="text-gray-400 text-sm">{item.quantidade} {item.unidade}</p>
                    </div>
                    <motion.button
                      whileTap={tap}
                      onClick={() => removerItem(item.produto_id)}
                      className="text-red-400 hover:text-red-300 rounded-md p-2 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </div>
        )}

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
          <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={3}
            placeholder="Detalhes, urgência, etc."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={tap}
          onClick={enviarRequisicao}
          disabled={loading || itens.length === 0}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {loading ? "Enviando..." : `Enviar Requisição (${itens.length} item${itens.length !== 1 ? "s" : ""})`}
        </motion.button>
      </div>
    </main>
  );
}

function FiltroPill({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
        ativo
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-zinc-700 bg-zinc-900 text-gray-400 hover:border-orange-500/60"
      }`}
    >
      {label}
    </button>
  );
}

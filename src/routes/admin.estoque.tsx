import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, AlertTriangle, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/estoque")({
  component: AdminEstoque,
});

type LocalEstoque = {
  local: string;
  quantidade: number;
  novaQuantidade: string;
};

type ProdutoEstoque = {
  id: string;
  nome: string;
  unidade: string;
  locais: LocalEstoque[];
};

function AdminEstoque() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      fetchEstoque();
    };
    init();
  }, []);

  const fetchEstoque = async () => {
    setLoading(true);
    const [{ data: prods, error: errP }, { data: estoques }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase.from("estoque_atual").select("produto_id, local, quantidade"),
    ]);
    if (errP) { toast.error("Erro ao carregar produtos"); setLoading(false); return; }
    const locaisPorProduto: Record<string, LocalEstoque[]> = {};
    (estoques || []).forEach((e: any) => {
      if (!locaisPorProduto[e.produto_id]) locaisPorProduto[e.produto_id] = [];
      locaisPorProduto[e.produto_id].push({
        local: e.local,
        quantidade: Number(e.quantidade),
        novaQuantidade: "",
      });
    });
    setProdutos((prods || []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      unidade: p.unidade,
      locais: (locaisPorProduto[p.id] || []).sort((a, b) => a.local.localeCompare(b.local)),
    })));
    setLoading(false);
  };

  const handleNovaQuantidade = (produtoId: string, local: string, value: string) => {
    setProdutos(prods => prods.map(p => p.id !== produtoId ? p : {
      ...p,
      locais: p.locais.map(l => l.local === local ? { ...l, novaQuantidade: value } : l),
    }));
  };

  const salvarEstoque = async (produto: ProdutoEstoque, item: LocalEstoque) => {
    if (!item.novaQuantidade) return;
    const nova = parseFloat(item.novaQuantidade);
    if (isNaN(nova) || nova < 0) { toast.error("Quantidade inválida"); return; }
    if (!userId) { toast.error("Sessão expirada"); return; }
    const chave = `${produto.id}:${item.local}`;
    setSaving(chave);
    try {
      const qtdMov = Math.abs(nova - item.quantidade);
      if (qtdMov > 0) {
        const { error: errMov } = await supabase.from("movimentacoes_estoque").insert({
          usuario_id: userId,
          produto_id: produto.id,
          local: item.local,
          tipo: "ajuste",
          quantidade: qtdMov,
          estoque_antes: item.quantidade,
          estoque_depois: nova,
          observacao: `Ajuste manual (${item.local}): ${item.quantidade} → ${nova}`,
        });
        if (errMov) throw errMov;
      }
      const { error: errEst } = await supabase.from("estoque_atual").upsert(
        { produto_id: produto.id, local: item.local, quantidade: nova },
        { onConflict: "produto_id,local" }
      );
      if (errEst) throw errEst;
      toast.success(`Estoque de ${produto.nome} (${item.local}) atualizado`);
      fetchEstoque();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(null);
    }
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
          <h1 className="text-xl font-bold text-orange-500">Gestão de Estoque</h1>
        </div>
        {loading ? (
          <SkeletonStack rows={6} />
        ) : produtos.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center text-gray-400 py-12">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum produto cadastrado</p>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {produtos.map(p => {
              const totalProduto = p.locais.reduce((acc, l) => acc + l.quantidade, 0);
              return (
                <motion.div
                  key={p.id}
                  variants={listItem}
                  className="bg-zinc-900 rounded-xl p-4 transition-shadow hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {totalProduto <= 0 && <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />}
                    <p className="text-white font-medium truncate">{p.nome}</p>
                  </div>
                  {p.locais.length === 0 ? (
                    <p className="text-sm text-gray-500">Sem estoque cadastrado ainda.</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {p.locais.map(item => {
                        const chave = `${p.id}:${item.local}`;
                        return (
                          <div
                            key={item.local}
                            className="flex items-center gap-3 rounded-lg bg-zinc-800/60 px-3 py-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs uppercase tracking-wider text-gray-500">{item.local}</p>
                              <p className={`text-sm ${item.quantidade <= 0 ? "text-orange-400" : "text-gray-300"}`}>
                                Atual: {item.quantidade} {p.unidade}
                              </p>
                            </div>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder={String(item.quantidade)}
                              value={item.novaQuantidade}
                              onChange={e => handleNovaQuantidade(p.id, item.local, e.target.value)}
                              className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-center transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            />
                            <motion.button
                              whileHover={item.novaQuantidade ? { scale: 1.05 } : undefined}
                              whileTap={tap}
                              onClick={() => salvarEstoque(p, item)}
                              disabled={!item.novaQuantidade || saving === chave}
                              className="bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                            >
                              {saving === chave ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

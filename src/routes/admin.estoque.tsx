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

type ProdutoEstoque = {
  id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  novaQuantidade: string;
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
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);
    if (errP) { toast.error("Erro ao carregar produtos"); setLoading(false); return; }
    const estoqueMap: Record<string, number> = {};
    (estoques || []).forEach((e: any) => { estoqueMap[e.produto_id] = e.quantidade; });
    setProdutos((prods || []).map((p: any) => ({
      id: p.id, nome: p.nome, unidade: p.unidade,
      quantidade: estoqueMap[p.id] ?? 0, novaQuantidade: "",
    })));
    setLoading(false);
  };

  const handleNovaQuantidade = (id: string, value: string) => {
    setProdutos(prods => prods.map(p => p.id === id ? { ...p, novaQuantidade: value } : p));
  };

  const salvarEstoque = async (produto: ProdutoEstoque) => {
    if (!produto.novaQuantidade) return;
    const nova = parseFloat(produto.novaQuantidade);
    if (isNaN(nova) || nova < 0) { toast.error("Quantidade inválida"); return; }
    if (!userId) { toast.error("Sessão expirada"); return; }
    setSaving(produto.id);
    try {
      const qtdMov = Math.abs(nova - produto.quantidade);
      if (qtdMov > 0) {
        const { error: errMov } = await supabase.from("movimentacoes_estoque").insert({
          usuario_id: userId,
          produto_id: produto.id,
          tipo: "ajuste",
          quantidade: qtdMov,
          estoque_antes: produto.quantidade,
          estoque_depois: nova,
          observacao: `Ajuste manual: ${produto.quantidade} → ${nova}`,
        });
        if (errMov) throw errMov;
      }
      const { error: errEst } = await supabase.from("estoque_atual").upsert(
        { produto_id: produto.id, quantidade: nova },
        { onConflict: "produto_id" }
      );
      if (errEst) throw errEst;
      toast.success(`Estoque de ${produto.nome} atualizado`);
      handleNovaQuantidade(produto.id, "");
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
            {produtos.map(p => (
              <motion.div
                key={p.id}
                variants={listItem}
                className="bg-zinc-900 rounded-xl p-4 flex items-center gap-3 transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {p.quantidade <= 0 && <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />}
                    <p className="text-white font-medium truncate">{p.nome}</p>
                  </div>
                  <p className={`text-sm mt-0.5 ${p.quantidade <= 0 ? "text-orange-400" : "text-gray-400"}`}>
                    Atual: {p.quantidade} {p.unidade}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={String(p.quantidade)}
                    value={p.novaQuantidade}
                    onChange={e => handleNovaQuantidade(p.id, e.target.value)}
                    className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-center transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                  <motion.button
                    whileHover={p.novaQuantidade ? { scale: 1.05 } : undefined}
                    whileTap={tap}
                    onClick={() => salvarEstoque(p)}
                    disabled={!p.novaQuantidade || saving === p.id}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    {saving === p.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/movimentacoes")({
  component: AdminMovimentacoes,
});

type Movimentacao = {
  id: string;
  tipo: string;
  quantidade: number;
  estoque_antes: number;
  estoque_depois: number;
  observacao: string | null;
  created_at: string;
  produto_id: string;
  produtos: { nome: string; unidade: string } | null;
};

function AdminMovimentacoes() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroProduto, setFiltroProduto] = useState<string>("");

  useEffect(() => {
    fetchMovimentacoes();
  }, []);

  const fetchMovimentacoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("movimentacoes_estoque")
      .select("id, tipo, quantidade, estoque_antes, estoque_depois, observacao, created_at, produto_id, produtos(nome, unidade)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { toast.error("Erro ao carregar movimentações"); setLoading(false); return; }
    setMovimentacoes((data || []) as Movimentacao[]);
    setLoading(false);
  };

  const movFiltradas = movimentacoes.filter(m => {
    const tipoOk = filtroTipo === "todos" || m.tipo === filtroTipo;
    const prodOk = !filtroProduto || m.produtos?.nome.toLowerCase().includes(filtroProduto.toLowerCase());
    return tipoOk && prodOk;
  });

  const tipoIcon = (tipo: string) => {
    if (tipo === "entrada") return <TrendingUp size={16} className="text-green-400" />;
    if (tipo === "saida") return <TrendingDown size={16} className="text-red-400" />;
    return <RotateCcw size={16} className="text-blue-400" />;
  };

  const tipoColor = (tipo: string) => {
    if (tipo === "entrada") return "text-green-400";
    if (tipo === "saida") return "text-red-400";
    return "text-blue-400";
  };

  const tipoLabel = (tipo: string) => {
    if (tipo === "entrada") return "Entrada";
    if (tipo === "saida") return "Saída";
    return "Ajuste";
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
          <h1 className="text-xl font-bold text-orange-500">Movimentações de Estoque</h1>
        </div>

        {/* Filtros */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4 flex flex-col gap-3">
          <div className="flex gap-2">
            {["todos", "entrada", "saida", "ajuste"].map(t => (
              <motion.button
                key={t}
                whileTap={tap}
                onClick={() => setFiltroTipo(t)}
                className={`flex-1 text-sm py-1.5 rounded-lg transition-colors capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${filtroTipo === t
                    ? "bg-orange-600 text-white"
                    : "bg-zinc-800 text-gray-400 hover:text-white"
                }`}
              >
                {t === "todos" ? "Todos" : tipoLabel(t)}
              </motion.button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filtrar por produto..."
            value={filtroProduto}
            onChange={e => setFiltroProduto(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
        </div>

        {/* Stats rápidos */}
        <motion.div initial="hidden" animate="visible" variants={staggerList()} className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Entradas", tipo: "entrada", color: "text-green-400" },
            { label: "Saídas", tipo: "saida", color: "text-red-400" },
            { label: "Ajustes", tipo: "ajuste", color: "text-blue-400" },
          ].map(s => (
            <motion.div key={s.tipo} variants={listItem} className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>
                {movimentacoes.filter(m => m.tipo === s.tipo).length}
              </p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Lista */}
        {loading ? (
          <SkeletonStack rows={6} />
        ) : movFiltradas.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="text-gray-500 text-center py-8">
            Nenhuma movimentação encontrada.
          </motion.p>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {movFiltradas.map(mov => (
              <motion.div
                key={mov.id}
                variants={listItem}
                className="bg-zinc-900 rounded-xl p-4 transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{tipoIcon(mov.tipo)}</div>
                    <div>
                      <p className="font-semibold text-white">
                        {mov.produtos?.nome ?? "Produto removido"}
                      </p>
                      <p className={`text-sm font-bold ${tipoColor(mov.tipo)}`}>
                        {mov.tipo === "saida" ? "-" : "+"}{mov.quantidade} {mov.produtos?.unidade}
                      </p>
                      {mov.observacao && (
                        <p className="text-gray-400 text-xs mt-1 italic">{mov.observacao}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-xs">
                      {mov.estoque_antes} → {mov.estoque_depois}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(mov.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

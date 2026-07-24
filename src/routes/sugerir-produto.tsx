import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Send, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { useAuth } from "@/hooks/use-auth";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/sugerir-produto")({
  head: () => ({
    meta: [
      { title: "Sugerir produto — Misturaria Fina Mezcla" },
      { name: "description", content: "Sugira um produto novo pra cadastrar." },
    ],
  }),
  component: SugerirProduto,
});

const UNIDADES = ["UND", "KG", "CX", "PC", "PCT", "LT"];

type MinhaSugestao = {
  id: string;
  nome: string;
  unidade: string;
  observacao: string | null;
  status: string;
  criado_em: string;
};

function statusIcon(status: string) {
  if (status === "pendente") return <Clock size={16} className="text-yellow-400" />;
  if (status === "aprovado") return <CheckCircle size={16} className="text-blue-400" />;
  if (status === "rejeitado") return <XCircle size={16} className="text-red-400" />;
  return <Clock size={16} className="text-gray-400" />;
}
function statusLabel(status: string) {
  return { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" }[status] ?? status;
}
function statusColor(status: string) {
  if (status === "pendente") return "text-yellow-400 bg-yellow-900/30";
  if (status === "aprovado") return "text-blue-400 bg-blue-900/30";
  if (status === "rejeitado") return "text-red-400 bg-red-900/30";
  return "text-gray-400 bg-zinc-800";
}

function SugerirProduto() {
  const navigate = useNavigate();
  const { voltar, avancar } = useVoltarAvancar("/");
  const { user, loading: authLoading } = useAuth();
  const [minhas, setMinhas] = useState<MinhaSugestao[]>([]);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("UND");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    carregar(user.id);
  }, [user]);

  const carregar = async (userId: string) => {
    setCarregando(true);
    const { data } = await supabase
      .from("produtos")
      .select("id, nome, unidade, observacao, status, criado_em")
      .eq("usuario_id", userId)
      .order("criado_em", { ascending: false });
    setMinhas((data ?? []) as MinhaSugestao[]);
    setCarregando(false);
  };

  const enviar = async () => {
    if (!user) return toast.error("Sessão expirada");
    if (!nome.trim()) return toast.error("Informe o nome do produto");

    setEnviando(true);
    try {
      const { error } = await supabase.from("produtos").insert({
        nome: nome.trim(),
        unidade,
        observacao: observacao.trim() || null,
        usuario_id: user.id,
        status: "pendente",
        ativo: false,
      });
      if (error) throw error;

      toast.success("Sugestão enviada pra aprovação!");
      setNome("");
      setUnidade("UND");
      setObservacao("");
      carregar(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao enviar", { description: msg });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
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
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-500">Produtos</p>
            <h1 className="text-xl md:text-2xl font-bold text-white">Sugerir Produto</h1>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Nova sugestão</h2>
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-gray-400">
              Nome do produto
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Farinha de tapioca"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-gray-400">
              Unidade
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wider text-gray-400">
              Observação (opcional)
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                placeholder="Pra que setor, onde comprar, por que precisa..."
                className="mt-1 w-full resize-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
              />
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={tap}
              onClick={enviar}
              disabled={enviando}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-3 text-sm font-bold uppercase text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
            >
              <Send size={16} /> {enviando ? "Enviando..." : "Enviar pra aprovação"}
            </motion.button>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Minhas sugestões</h2>
        {carregando ? (
          <SkeletonStack rows={2} />
        ) : minhas.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center py-8">
            <PackagePlus size={40} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Você ainda não sugeriu nenhum produto.</p>
          </motion.div>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {minhas.map((s) => {
              const aberto = expandida === s.id;
              return (
                <motion.li
                  key={s.id}
                  variants={listItem}
                  className="bg-zinc-900 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/80"
                >
                  <button
                    onClick={() => setExpandida(aberto ? null : s.id)}
                    className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
                    aria-expanded={aberto}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0">{statusIcon(s.status)}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium break-words">{s.nome}</p>
                          <p className="text-gray-400 text-xs">{s.unidade}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(s.status)}`}>
                          {statusLabel(s.status)}
                        </span>
                        {s.observacao && (aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
                      </div>
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {aberto && s.observacao && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={collapseY}
                        className="border-t border-zinc-800 p-4 bg-zinc-950"
                      >
                        <p className="text-gray-300 text-sm italic">"{s.observacao}"</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, History, LogOut, Package, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { fadeUp, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [nomeUsuario, setNomeUsuario] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const { data } = await supabase.from("usuarios").select("nome").eq("id", session.user.id).maybeSingle();
      setNomeUsuario(data?.nome ?? session.user.email?.split("@")[0] ?? "");
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (isAdmin) navigate({ to: "/admin" });
    };
    init();
  }, []);

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const acoes = [
    {
      label: "Nova Requisição de Compra",
      descricao: "Solicite produtos ao setor de compras",
      icon: ShoppingCart,
      rota: "/pedido" as const,
      cor: "from-orange-600 to-orange-700",
    },
    {
      label: "Requisição de Estoque",
      descricao: "Retire insumos do estoque central",
      icon: Package,
      rota: "/requisicao-interna" as const,
      cor: "from-amber-600 to-amber-700",
    },
    {
      label: "Minhas Requisições de Estoque",
      descricao: "Acompanhe suas retiradas de insumos",
      icon: ClipboardList,
      rota: "/historico-interno" as const,
      cor: "from-yellow-600 to-yellow-700",
    },
    {
      label: "Histórico de Compras",
      descricao: "Veja suas requisições de compra",
      icon: History,
      rota: "/historico" as const,
      cor: "from-zinc-600 to-zinc-700",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl md:max-w-4xl mx-auto p-4 md:p-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex items-center justify-between mb-8 md:mb-12 pt-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-orange-500">MISTURARIA</h1>
            {nomeUsuario && (
              <p className="text-gray-400 text-sm md:text-base">
                {saudacao}, {nomeUsuario}
              </p>
            )}
          </div>
          <motion.button
            whileHover={{ x: 2, color: "#fff" }}
            whileTap={tap}
            onClick={handleLogout}
            className="text-gray-400 flex items-center gap-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-2 py-1"
            aria-label="Sair da conta"
          >
            <LogOut size={16} /> Sair
          </motion.button>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerList(0.07, 0.12)}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
        >
          {acoes.map((acao) => (
            <motion.button
              key={acao.rota}
              variants={listItem}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              onClick={() => navigate({ to: acao.rota })}
              className={`group relative w-full overflow-hidden bg-gradient-to-r ${acao.cor} rounded-xl p-4 flex items-center gap-4 text-left shadow-lg shadow-black/40`}
            >
              {/* shimmer on hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
              <div className="bg-white/20 rounded-lg p-2.5 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]">
                <acao.icon size={22} className="text-white" />
              </div>
              <div className="relative">
                <p className="font-bold text-white">{acao.label}</p>
                <p className="text-white/70 text-sm">{acao.descricao}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

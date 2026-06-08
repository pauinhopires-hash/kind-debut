import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, History, LogOut, Package, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase.from("usuarios").select("nome, perfil").eq("id", session.user.id).single();
      if (data) {
        setNomeUsuario(data.nome);
        if (data.perfil === "admin") navigate({ to: "/admin" });
      }
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const acoes = [
    {
      label: "Nova Requisição de Compra",
      descricao: "Solicite produtos ao setor de compras",
      icon: ShoppingCart,
      rota: "/pedido",
      cor: "from-orange-600 to-orange-700",
    },
    {
      label: "Requisição de Estoque",
      descricao: "Retire insumos do estoque central",
      icon: Package,
      rota: "/requisicao-interna",
      cor: "from-amber-600 to-amber-700",
    },
    {
      label: "Minhas Requisições de Estoque",
      descricao: "Acompanhe suas retiradas de insumos",
      icon: ClipboardList,
      rota: "/historico-interno",
      cor: "from-yellow-600 to-yellow-700",
    },
    {
      label: "Histórico de Compras",
      descricao: "Veja suas requisições de compra",
      icon: History,
      rota: "/historico",
      cor: "from-zinc-600 to-zinc-700",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">MISTURARIA</h1>
            {nomeUsuario && <p className="text-gray-400 text-sm">Olá, {nomeUsuario}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="space-y-3">
          {acoes.map((acao) => (
            <button
              key={acao.rota}
              onClick={() => navigate({ to: acao.rota })}
              className={`w-full bg-gradient-to-r ${acao.cor} hover:opacity-90 rounded-xl p-4 flex items-center gap-4 transition-all text-left`}
            >
              <div className="bg-white/20 rounded-lg p-2.5">
                <acao.icon size={22} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{acao.label}</p>
                <p className="text-white/70 text-sm">{acao.descricao}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

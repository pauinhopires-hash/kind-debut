import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Package,
  Users,
  ClipboardList,
  BarChart3,
  LogOut,
  ListChecks,
  ArrowRightLeft,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Stats = {
  requisicoesPendentes: number;
  requisicoesInternas: number;
  produtosBaixoEstoque: number;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [stats, setStats] = useState<Stats>({
    requisicoesPendentes: 0,
    requisicoesInternas: 0,
    produtosBaixoEstoque: 0,
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("id", session.user.id)
        .single();
      if (data) setNomeUsuario(data.nome);
      fetchStats();
    };
    init();
  }, []);

  const fetchStats = async () => {
    const [reqCompra, reqInternas, produtosRes, estoqueRes] = await Promise.all([
      supabase
        .from("requisicoes")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      supabase
        .from("requisicoes_internas")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      supabase.from("produtos").select("id, estoque_minimo").eq("ativo", true).gt("estoque_minimo", 0),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);

    if (reqCompra.error) console.error("reqCompra", reqCompra.error);
    if (reqInternas.error) console.error("reqInternas", reqInternas.error);
    if (produtosRes.error) console.error("produtos", produtosRes.error);
    if (estoqueRes.error) console.error("estoque", estoqueRes.error);

    const mapEstoque: Record<string, number> = {};
    (estoqueRes.data ?? []).forEach((r) => {
      mapEstoque[r.produto_id] = Number(r.quantidade);
    });
    const baixo = (produtosRes.data ?? []).filter(
      (p) => (mapEstoque[p.id] ?? 0) < Number(p.estoque_minimo),
    ).length;

    setStats({
      requisicoesPendentes: reqCompra.count ?? 0,
      requisicoesInternas: reqInternas.count ?? 0,
      produtosBaixoEstoque: baixo,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const menus = [
    {
      group: "Compras",
      items: [
        {
          label: "Requisições de Compra",
          descricao: "Aprovar pedidos da equipe",
          icon: ShoppingCart,
          rota: "/admin/requisicoes" as const,
          badge: stats.requisicoesPendentes,
          cor: "bg-orange-600",
        },
        {
          label: "Lista de Compras",
          descricao: "Itens para adquirir",
          icon: ListChecks,
          rota: "/admin/lista-compras" as const,
          badge: 0,
          cor: "bg-orange-700",
        },
      ],
    },
    {
      group: "Estoque",
      items: [
        {
          label: "Estoque",
          descricao: "Produtos e quantidades",
          icon: Package,
          rota: "/admin/estoque" as const,
          badge: stats.produtosBaixoEstoque,
          cor: "bg-amber-600",
        },
        {
          label: "Requisições de Estoque",
          descricao: "Saídas internas pendentes",
          icon: ClipboardList,
          rota: "/admin/requisicoes-internas" as const,
          badge: stats.requisicoesInternas,
          cor: "bg-amber-700",
        },
        {
          label: "Movimentações",
          descricao: "Histórico de entradas e saídas",
          icon: ArrowRightLeft,
          rota: "/admin/movimentacoes" as const,
          badge: 0,
          cor: "bg-yellow-700",
        },
        {
          label: "Produtos",
          descricao: "Cadastro de produtos",
          icon: FileText,
          rota: "/admin/produtos" as const,
          badge: 0,
          cor: "bg-zinc-600",
        },
      ],
    },
    {
      group: "Gestão",
      items: [
        {
          label: "Usuários",
          descricao: "Gerenciar acessos",
          icon: Users,
          rota: "/admin/usuarios" as const,
          badge: 0,
          cor: "bg-zinc-600",
        },
        {
          label: "Exportar",
          descricao: "Relatórios e dados",
          icon: BarChart3,
          rota: "/exportar" as const,
          badge: 0,
          cor: "bg-zinc-700",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Admin</h1>
            {nomeUsuario && <p className="text-gray-400 text-sm">{nomeUsuario}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{stats.requisicoesPendentes}</p>
            <p className="text-gray-400 text-xs">Compras pendentes</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.requisicoesInternas}</p>
            <p className="text-gray-400 text-xs">Req. internas</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.produtosBaixoEstoque}</p>
            <p className="text-gray-400 text-xs">Estoque baixo</p>
          </div>
        </div>

        {menus.map((group) => (
          <div key={group.group} className="mb-5">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2 px-1">
              {group.group}
            </h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <button
                  key={item.rota}
                  onClick={() => navigate({ to: item.rota })}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 flex items-center gap-4 transition-all text-left"
                >
                  <div className={`${item.cor} rounded-lg p-2.5`}>
                    <item.icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-gray-400 text-sm">{item.descricao}</p>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Package,
  ClipboardList,
  Users,
  BarChart2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

type KPIs = {
  pedidosPendentesHoje: number;
  produtosEstoqueBaixo: number;
  comprasRealizadasHoje: number;
  itensAComprHoje: number;
};

function AdminIndex() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs | null>(null);

  useEffect(() => {
    const hoje = format(new Date(), "yyyy-MM-dd");

    async function carregarKPIs() {
      const [
        { count: pedidosPendentes },
        { data: estoqueRows },
        { data: produtosRows },
        { count: comprasHoje },
        { data: itensHoje },
      ] = await Promise.all([
        // Pedidos pendentes criados hoje
        supabase
          .from("requisicoes")
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente")
          .gte("data_pedido", `${hoje}T00:00:00`)
          .lte("data_pedido", `${hoje}T23:59:59`),

        // Estoque atual
        supabase.from("estoque_atual").select("produto_id, quantidade"),

        // Produtos com estoque_minimo definido
        supabase.from("produtos").select("id, estoque_minimo").eq("ativo", true).gt("estoque_minimo", 0),

        // Requisições fechadas como "comprada" hoje
        supabase
          .from("requisicoes")
          .select("*", { count: "exact", head: true })
          .eq("status", "comprada")
          .gte("data_pedido", `${hoje}T00:00:00`)
          .lte("data_pedido", `${hoje}T23:59:59`),

        // Itens não comprados de requisições pendentes de hoje
        supabase
          .from("requisicao_itens")
          .select("quantidade, comprado, requisicoes!inner(status, data_pedido)")
          .eq("requisicoes.status", "pendente")
          .eq("comprado", false)
          .gte("requisicoes.data_pedido", `${hoje}T00:00:00`)
          .lte("requisicoes.data_pedido", `${hoje}T23:59:59`),
      ]);

      // Calcula produtos abaixo do mínimo
      const mapEstoque: Record<string, number> = {};
      (estoqueRows ?? []).forEach((r) => {
        mapEstoque[r.produto_id] = Number(r.quantidade);
      });
      const produtosEstoqueBaixo = (produtosRows ?? []).filter(
        (p) => (mapEstoque[p.id] ?? 0) < p.estoque_minimo,
      ).length;

      // Calcula total de itens ainda a comprar hoje
      const itensAComprar = (itensHoje ?? []).reduce((acc, i) => acc + Number(i.quantidade), 0);

      setKpis({
        pedidosPendentesHoje: pedidosPendentes ?? 0,
        produtosEstoqueBaixo,
        comprasRealizadasHoje: comprasHoje ?? 0,
        itensAComprHoje: Math.round(itensAComprar),
      });
    }

    carregarKPIs();
  }, []);

  const cards = [
    {
      titulo: "Pedidos pendentes hoje",
      valor: kpis?.pedidosPendentesHoje ?? "...",
      icone: <Clock className="w-5 h-5" />,
      cor: "text-yellow-400",
      bg: "bg-yellow-950/30",
      acao: () => navigate({ to: "/admin/requisicoes" }),
    },
    {
      titulo: "Produtos c/ estoque baixo",
      valor: kpis?.produtosEstoqueBaixo ?? "...",
      icone: <AlertTriangle className="w-5 h-5" />,
      cor: kpis && kpis.produtosEstoqueBaixo > 0 ? "text-red-400" : "text-gray-400",
      bg: kpis && kpis.produtosEstoqueBaixo > 0 ? "bg-red-950/30" : "bg-zinc-900",
      acao: () => navigate({ to: "/admin/estoque" }),
    },
    {
      titulo: "Compras fechadas hoje",
      valor: kpis?.comprasRealizadasHoje ?? "...",
      icone: <CheckCircle className="w-5 h-5" />,
      cor: "text-green-400",
      bg: "bg-green-950/30",
      acao: () => navigate({ to: "/admin/lista-compras" }),
    },
    {
      titulo: "Itens a comprar hoje",
      valor: kpis?.itensAComprHoje ?? "...",
      icone: <ShoppingCart className="w-5 h-5" />,
      cor: "text-orange-400",
      bg: "bg-orange-950/30",
      acao: () => navigate({ to: "/admin/lista-compras" }),
    },
  ];

  const menus = [
    {
      titulo: "Lista de compras",
      descricao: "Consolidar pedidos do dia",
      icone: <ShoppingCart className="w-6 h-6" />,
      rota: "/admin/lista-compras",
    },
    {
      titulo: "Requisições",
      descricao: "Ver e aprovar pedidos",
      icone: <ClipboardList className="w-6 h-6" />,
      rota: "/admin/requisicoes",
    },
    {
      titulo: "Estoque",
      descricao: "Gerenciar quantidades e mínimos",
      icone: <Package className="w-6 h-6" />,
      rota: "/admin/estoque",
    },
    {
      titulo: "Produtos",
      descricao: "Cadastrar e editar produtos",
      icone: <BarChart2 className="w-6 h-6" />,
      rota: "/admin/produtos",
    },
    {
      titulo: "Usuários",
      descricao: "Gerenciar acessos e perfis",
      icone: <Users className="w-6 h-6" />,
      rota: "/admin/usuarios",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-6">Painel admin</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {cards.map((c) => (
            <button
              key={c.titulo}
              onClick={c.acao}
              className={`${c.bg} rounded-xl p-4 text-left hover:opacity-90 transition-opacity`}
            >
              <div className={`${c.cor} mb-2`}>{c.icone}</div>
              <div className={`text-2xl font-bold ${c.cor}`}>{c.valor}</div>
              <div className="text-xs text-gray-400 mt-1">{c.titulo}</div>
            </button>
          ))}
        </div>

        {/* Menu */}
        <div className="space-y-3">
          {menus.map((m) => (
            <button
              key={m.rota}
              onClick={() => navigate({ to: m.rota as Parameters<typeof navigate>[0]["to"] })}
              className="w-full flex items-center gap-4 bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="text-orange-400">{m.icone}</span>
              <div>
                <div className="font-medium">{m.titulo}</div>
                <div className="text-xs text-gray-400">{m.descricao}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

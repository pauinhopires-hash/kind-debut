import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Boxes, Package, Users, ClipboardList, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminHub,
});

function AdminHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendentes: 0,
    semana: 0,
    produtosAtivos: 0,
    estoqueZero: 0,
  });

  useEffect(() => {
    (async () => {
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [p, s, pa, ez] = await Promise.all([
        supabase.from("requisicoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("requisicoes").select("id", { count: "exact", head: true }).gte("created_at", seteDiasAtras),
        supabase.from("produtos").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("estoque_atual").select("produto_id", { count: "exact", head: true }).eq("quantidade", 0),
      ]);
      setStats({
        pendentes: p.count ?? 0,
        semana: s.count ?? 0,
        produtosAtivos: pa.count ?? 0,
        estoqueZero: ez.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { to: "/admin/lista-compras", icon: ShoppingCart, titulo: "Lista de compras", desc: "Consolidado do dia para comprar" },
    { to: "/admin/requisicoes", icon: ClipboardList, titulo: "Requisições", desc: "Aprovar ou cancelar pedidos" },
    { to: "/admin/produtos", icon: Package, titulo: "Produtos", desc: "Cadastrar e editar itens" },
    { to: "/admin/estoque", icon: Boxes, titulo: "Estoque", desc: "Ajustar quantidades" },
    { to: "/admin/usuarios", icon: Users, titulo: "Usuários", desc: "Perfis e permissões" },
  ] as const;

  const indicators = [
    { label: "Pendentes", value: stats.pendentes, accent: true },
    { label: "Últimos 7 dias", value: stats.semana },
    { label: "Produtos ativos", value: stats.produtosAtivos },
    { label: "Estoque zero", value: stats.estoqueZero, alert: stats.estoqueZero > 0 },
  ];

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Administração</p>
            <h1 className="text-lg font-bold text-foreground">Painel admin</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-5 px-6 pt-6">
        <div className="grid grid-cols-2 gap-2">
          {indicators.map((i) => (
            <div
              key={i.label}
              className={`rounded-xl border bg-card px-4 py-3 ${
                i.accent ? "border-primary/60" : "border-border"
              }`}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.label}</p>
              <p
                className={`mt-1 text-2xl font-black tabular-nums ${
                  i.alert ? "text-destructive" : i.accent ? "text-primary" : "text-foreground"
                }`}
              >
                {i.value}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {cards.map((c) => (
            <button
              key={c.to}
              onClick={() => navigate({ to: c.to })}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 text-left text-foreground transition hover:border-primary/60"
            >
              <c.icon size={22} className="text-primary" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">{c.titulo}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, ShoppingCart, ClipboardList, Share2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Misturaria Fina Mezcla — Requisições" },
      { name: "description", content: "Sistema de requisições de compras da Misturaria Fina Mezcla." },
    ],
  }),
  component: HomePage,
});

function useRelogio() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

function formatarData(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatarHora(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function HomePage() {
  const navigate = useNavigate();
  const { user, usuario, perfil, isAdmin, loading } = useAuth();
  const agora = useRelogio();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const diaSemana = agora.getDay(); // 0 = dom, 3 = qua
  const isDiaPedido = diaSemana === 0 || diaSemana === 3;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const nomeExibicao = usuario?.nome ?? user.email?.split("@")[0] ?? "";

  return (
    <main className="min-h-screen bg-background px-6 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        {/* Topo */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Misturaria · Fina Mezcla</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Saudação */}
        <section className="mt-8">
          <h1 className="text-3xl font-bold text-foreground">
            Olá, <span className="text-primary">{nomeExibicao}</span>
          </h1>
          {perfil && (
            <p className="mt-1 text-sm text-muted-foreground">Perfil: {perfil.nome}</p>
          )}
          <div className="mt-3 flex flex-col gap-0.5">
            <p className="text-sm capitalize text-foreground/80">{formatarData(agora)}</p>
            <p className="text-2xl font-mono font-light tabular-nums text-foreground">
              {formatarHora(agora)}
            </p>
          </div>
        </section>

        {/* Banner dia de pedido */}
        {isDiaPedido && (
          <div className="mt-6 rounded-lg border border-primary/40 bg-primary/15 px-4 py-3">
            <p className="text-sm font-semibold text-primary">
              Hoje é dia de pedido
            </p>
            <p className="mt-0.5 text-xs text-foreground/80">
              {diaSemana === 0 ? "Domingo" : "Quarta-feira"} — não esqueça de fechar a requisição.
            </p>
          </div>
        )}

        {/* Botões */}
        <section className="mt-8 space-y-3">
          <button
            onClick={() => navigate({ to: "/pedido" })}
            className="flex w-full items-center gap-4 rounded-xl bg-primary px-5 py-6 text-left text-primary-foreground transition hover:opacity-95"
          >
            <ShoppingCart size={28} />
            <div>
              <p className="text-lg font-bold uppercase tracking-wide">Fazer pedido</p>
              <p className="text-xs opacity-80">Montar nova requisição de compras</p>
            </div>
          </button>

          <button
            onClick={() => navigate({ to: "/historico" })}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 text-left text-foreground transition hover:border-primary/50"
          >
            <ClipboardList size={24} className="text-primary" />
            <div>
              <p className="text-base font-semibold uppercase tracking-wide">Histórico</p>
              <p className="text-xs text-muted-foreground">Ver pedidos anteriores</p>
            </div>
          </button>

          <button
            onClick={() => navigate({ to: "/exportar" })}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 text-left text-foreground transition hover:border-primary/50"
          >
            <Share2 size={24} className="text-primary" />
            <div>
              <p className="text-base font-semibold uppercase tracking-wide">Exportar último pedido</p>
              <p className="text-xs text-muted-foreground">Compartilhar com o fornecedor</p>
            </div>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 text-left text-foreground transition hover:border-primary/50"
            >
              <Settings size={24} className="text-primary" />
              <div>
                <p className="text-base font-semibold uppercase tracking-wide">Admin</p>
                <p className="text-xs text-muted-foreground">Produtos, estoque e usuários</p>
              </div>
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

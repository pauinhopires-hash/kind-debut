import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Boxes, Package, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHub,
});

function AdminHub() {
  const navigate = useNavigate();
  const cards = [
    { to: "/admin/produtos", icon: Package, titulo: "Produtos", desc: "Cadastrar e editar itens" },
    { to: "/admin/estoque", icon: Boxes, titulo: "Estoque", desc: "Ajustar quantidades" },
    { to: "/admin/usuarios", icon: Users, titulo: "Usuários", desc: "Perfis e permissões" },
  ] as const;

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

      <div className="mx-auto max-w-md space-y-3 px-6 pt-6">
        {cards.map((c) => (
          <button
            key={c.to}
            onClick={() => navigate({ to: c.to })}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 text-left text-foreground transition hover:border-primary/60"
          >
            <c.icon size={24} className="text-primary" />
            <div>
              <p className="text-base font-semibold uppercase tracking-wide">{c.titulo}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

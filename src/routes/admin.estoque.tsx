import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/estoque")({
  component: AdminEstoque,
});

type Linha = { produto_id: string; nome: string; unidade: string; quantidade: number };

function AdminEstoque() {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setCarregando(true);
    const [{ data: prods }, { data: est }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);
    const mapEst: Record<string, number> = {};
    (est ?? []).forEach((r: { produto_id: string; quantidade: number }) => {
      mapEst[r.produto_id] = Number(r.quantidade);
    });
    setLinhas(
      ((prods ?? []) as Array<{ id: string; nome: string; unidade: string }>).map((p) => ({
        produto_id: p.id,
        nome: p.nome,
        unidade: p.unidade,
        quantidade: mapEst[p.id] ?? 0,
      })),
    );
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const setQtd = (id: string, v: number) =>
    setLinhas((ls) => ls.map((l) => (l.produto_id === id ? { ...l, quantidade: v } : l)));

  const salvar = async (l: Linha) => {
    setSalvando(l.produto_id);
    const { error } = await supabase
      .from("estoque_atual")
      .upsert({ produto_id: l.produto_id, quantidade: l.quantidade });
    setSalvando(null);
    if (error) toast.error("Erro ao salvar", { description: error.message });
    else toast.success(`${l.nome} atualizado`);
  };

  const filtradas = linhas.filter((l) =>
    l.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Estoque</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        <input
          type="search"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
        />
        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <ul className="space-y-2">
            {filtradas.map((l) => (
              <li
                key={l.produto_id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm font-semibold text-foreground">{l.nome}</p>
                  <p className="text-xs text-muted-foreground">Unid.: {l.unidade}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={l.quantidade}
                    onChange={(e) => setQtd(l.produto_id, Number(e.target.value) || 0)}
                    className="h-9 w-20 rounded-md border border-border bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => salvar(l)}
                    disabled={salvando === l.produto_id}
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                    aria-label="Salvar"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

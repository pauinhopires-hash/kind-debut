import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Misturaria Fina Mezcla" },
      { name: "description", content: "Histórico de requisições de compras." },
    ],
  }),
  component: HistoricoPage,
});

type Requisicao = {
  id: string;
  status: string;
  observacao: string | null;
  created_at: string;
};

type Item = {
  id: string;
  requisicao_id: string;
  quantidade: number;
  produto_id: string;
  produtos: { nome: string; unidade: string } | null;
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoricoPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [reqs, setReqs] = useState<Requisicao[]>([]);
  const [itens, setItens] = useState<Record<string, Item[]>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("requisicoes")
      .select("id, status, observacao, created_at")
      .order("created_at", { ascending: false });
    if (error) setErro(error.message);
    setReqs((data ?? []) as Requisicao[]);
    setCarregando(false);
  };

  useEffect(() => {
    if (!user) return;
    carregar();
  }, [user]);

  const toggle = async (id: string) => {
    if (aberto === id) {
      setAberto(null);
      return;
    }
    setAberto(id);
    if (!itens[id]) {
      const { data } = await supabase
        .from("requisicao_itens")
        .select("id, requisicao_id, quantidade, produto_id, produtos(nome, unidade)")
        .eq("requisicao_id", id);
      setItens((prev) => ({ ...prev, [id]: (data ?? []) as unknown as Item[] }));
    }
  };

  const cancelar = async (r: Requisicao) => {
    if (!confirm("Cancelar esta requisição?")) return;
    const { error } = await supabase
      .from("requisicoes")
      .update({ status: "cancelada" })
      .eq("id", r.id);
    if (error) return toast.error("Erro ao cancelar", { description: error.message });
    toast.success("Requisição cancelada");
    carregar();
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

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
            <p className="text-xs uppercase tracking-widest text-primary">Pedidos anteriores</p>
            <h1 className="text-lg font-bold text-foreground">Histórico</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : erro ? (
          <p className="py-12 text-center text-sm text-destructive">{erro}</p>
        ) : reqs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock size={32} className="mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma requisição registrada ainda.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {reqs.map((r) => {
              const isAberto = aberto === r.id;
              const lista = itens[r.id] ?? [];
              const pendente = r.status === "pendente";
              return (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <button
                    onClick={() => toggle(r.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-card/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatarDataHora(r.created_at)}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                          r.status === "cancelada"
                            ? "bg-destructive/15 text-destructive"
                            : r.status === "aprovada"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : pendente
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.status === "cancelada"
                              ? "bg-destructive"
                              : r.status === "aprovada"
                                ? "bg-emerald-500"
                                : pendente
                                  ? "bg-primary"
                                  : "bg-muted-foreground"
                          }`}
                        />
                        {r.status}
                      </span>
                    </div>
                    {isAberto ? (
                      <ChevronUp size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    )}
                  </button>
                  {isAberto && (
                    <div className="border-t border-border px-4 py-3">
                      {lista.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Carregando itens...</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {lista.map((it) => (
                            <li
                              key={it.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-foreground">
                                {it.produtos?.nome ?? "Produto"}
                              </span>
                              <span className="font-mono tabular-nums text-muted-foreground">
                                {it.quantidade} {it.produtos?.unidade ?? ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {r.observacao && (
                        <p className="mt-3 border-t border-border pt-2 text-xs italic text-muted-foreground">
                          "{r.observacao}"
                        </p>
                      )}
                      {pendente && (
                        <div className="mt-3 flex gap-2 border-t border-border pt-3">
                          <button
                            onClick={() =>
                              navigate({ to: "/pedido/editar/$id", params: { id: r.id } })
                            }
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            onClick={() => cancelar(r)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                          >
                            <XCircle size={12} /> Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

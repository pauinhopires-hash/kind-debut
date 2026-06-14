import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Plus, Share2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/requisicoes")({
  component: AdminRequisicoes,
});

type Req = {
  id: string;
  status: string;
  observacao: string | null;
  created_at: string;
  usuario_id: string;
  usuarios: { nome: string } | null;
};

type Item = {
  id: string;
  quantidade: number;
  unidade: string | null;
  produtos: { nome: string; unidade: string } | null;
};

type Filtro = "todas" | "pendente" | "aprovada" | "cancelada";

function formatar(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminRequisicoes() {
  const navigate = useNavigate();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [itens, setItens] = useState<Record<string, Item[]>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendente");
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    let q = supabase
      .from("requisicoes")
      .select("id, status, observacao, created_at, usuario_id, usuarios(nome)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filtro !== "todas") q = q.eq("status", filtro);
    const { data, error } = await q;
    if (error) toast.error("Erro", { description: error.message });
    setReqs((data ?? []) as unknown as Req[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, [filtro]);

  const toggle = async (id: string) => {
    if (aberto === id) return setAberto(null);
    setAberto(id);
    if (!itens[id]) {
      const { data } = await supabase
        .from("requisicao_itens")
        .select("id, quantidade, unidade, produtos(nome, unidade)")
        .eq("requisicao_id", id);
      setItens((prev) => ({ ...prev, [id]: (data ?? []) as unknown as Item[] }));
    }
  };

  const mudarStatus = async (r: Req, status: "aprovada" | "cancelada") => {
    const label = status === "aprovada" ? "Aprovar" : "Cancelar";
    if (!confirm(`${label} esta requisição?`)) return;
    const { error } = await supabase.from("requisicoes").update({ status }).eq("id", r.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(`Requisição ${status}`);
    carregar();
  };

  const recarregarItens = async (reqId: string) => {
    const { data } = await supabase
      .from("requisicao_itens")
      .select("id, quantidade, unidade, produtos(nome, unidade)")
      .eq("requisicao_id", reqId);
    setItens((prev) => ({ ...prev, [reqId]: (data ?? []) as unknown as Item[] }));
  };

  const atualizarQtd = async (reqId: string, itemId: string, novaQtd: number) => {
    if (novaQtd <= 0) return;
    // otimista
    setItens((prev) => ({
      ...prev,
      [reqId]: (prev[reqId] ?? []).map((i) => (i.id === itemId ? { ...i, quantidade: novaQtd } : i)),
    }));
    const { error } = await supabase
      .from("requisicao_itens")
      .update({ quantidade: novaQtd })
      .eq("id", itemId);
    if (error) {
      toast.error("Erro ao atualizar", { description: error.message });
      recarregarItens(reqId);
    }
  };

  const excluirItem = async (reqId: string, itemId: string, nome: string) => {
    if (!confirm(`Excluir "${nome}" da requisição?`)) return;
    const { error } = await supabase.from("requisicao_itens").delete().eq("id", itemId);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Item excluído");
    recarregarItens(reqId);
  };

  const compartilharWhatsApp = (r: Req) => {
    const lista = itens[r.id] ?? [];
    if (lista.length === 0) return toast.error("Sem itens para compartilhar");
    const linhas = lista.map((it) => {
      const u = it.unidade || it.produtos?.unidade || "";
      const alt = it.unidade && it.produtos && it.unidade !== it.produtos.unidade ? ` (era ${it.produtos.unidade})` : "";
      return `• ${it.produtos?.nome ?? "—"} — ${it.quantidade} ${u}${alt}`.trim();
    });
    const texto = [
      `*Requisição de Compra*`,
      `Solicitante: ${r.usuarios?.nome ?? "—"}`,
      `Data: ${formatar(r.created_at)}`,
      ``,
      ...linhas,
      r.observacao ? `\nObs: ${r.observacao}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };


  const filtros: { id: Filtro; label: string }[] = [
    { id: "pendente", label: "Pendentes" },
    { id: "aprovada", label: "Aprovadas" },
    { id: "cancelada", label: "Canceladas" },
    { id: "todas", label: "Todas" },
  ];

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
            <h1 className="text-lg font-bold text-foreground">Requisições</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        <p className="mb-3 rounded-md border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          Requisições aprovadas continuam aparecendo na <span className="font-semibold text-foreground">Lista de Compras</span> até serem marcadas como compradas.
        </p>


        <div className="mb-3 flex gap-1 overflow-x-auto">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                filtro === f.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : reqs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma requisição.</p>
        ) : (
          <ul className="space-y-2">
            {reqs.map((r) => {
              const isAberto = aberto === r.id;
              const lista = itens[r.id] ?? [];
              const pendente = r.status === "pendente";
              return (
                <li key={r.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <button
                    onClick={() => toggle(r.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-card/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.usuarios?.nome ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatar(r.created_at)}</p>
                      <p
                        className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest ${
                          r.status === "cancelada"
                            ? "text-destructive"
                            : pendente
                              ? "text-primary"
                              : "text-foreground/70"
                        }`}
                      >
                        {r.status}
                      </p>
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
                            <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 flex-1 truncate text-foreground">
                                {it.produtos?.nome ?? "—"}
                              </span>
                              {pendente ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => atualizarQtd(r.id, it.id, it.quantidade - 1)}
                                    disabled={it.quantidade <= 1}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground disabled:opacity-40"
                                    aria-label="Diminuir"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={1}
                                    value={it.quantidade}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      if (Number.isFinite(v) && v > 0) atualizarQtd(r.id, it.id, v);
                                    }}
                                    className="h-7 w-12 rounded-md border border-border bg-background text-center text-xs font-semibold tabular-nums text-foreground outline-none focus:border-primary"
                                  />
                                  <button
                                    onClick={() => atualizarQtd(r.id, it.id, it.quantidade + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                                    aria-label="Aumentar"
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <span className={`ml-1 w-16 text-[10px] uppercase ${it.unidade && it.produtos && it.unidade !== it.produtos.unidade ? "font-bold text-primary" : "text-muted-foreground"}`}>
                                    {it.unidade || it.produtos?.unidade || ""}
                                  </span>
                                  <button
                                    onClick={() => excluirItem(r.id, it.id, it.produtos?.nome ?? "item")}
                                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-mono tabular-nums text-muted-foreground">
                                  {it.quantidade} {it.produtos?.unidade ?? ""}
                                </span>
                              )}
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
                        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                          <button
                            onClick={() => compartilharWhatsApp(r)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-card"
                          >
                            <Share2 size={12} /> Compartilhar no WhatsApp
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => mudarStatus(r, "aprovada")}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition hover:opacity-90"
                            >
                              <Check size={12} /> Aprovar
                            </button>
                            <button
                              onClick={() => mudarStatus(r, "cancelada")}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                            >
                              <XCircle size={12} /> Cancelar
                            </button>
                          </div>
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

import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Minus, Pencil, Plus, Share2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { useConfirm } from "@/hooks/use-confirm";
import { notificar } from "@/lib/notificar";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

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
  nome_custom: string | null;
  produtos: { nome: string; unidade: string } | null;
};

type Filtro = "todas" | "pendente" | "aprovada" | "recebida" | "cancelada";

function formatar(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminRequisicoes() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const { confirm, promptText, ConfirmDialog } = useConfirm();
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
      const { data, error } = await supabase
        .from("requisicao_itens")
        .select("id, quantidade, unidade, nome_custom, produtos(nome, unidade)")
        .eq("requisicao_id", id);
      if (error) { toast.error("Erro ao carregar itens", { description: error.message }); return; }
      setItens((prev) => ({ ...prev, [id]: (data ?? []) as unknown as Item[] }));
    }
  };

  const mudarStatus = async (r: Req, status: "aprovada" | "cancelada") => {
    const label = status === "aprovada" ? "Aprovar" : "Cancelar";
    if (!(await confirm({ message: `${label} esta requisição?`, confirmLabel: label, destructive: status === "cancelada" }))) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("requisicoes")
      .update({ status, decidido_por: user?.id ?? null, decidido_em: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(`Requisição ${status}`);
    notificar(
      r.usuario_id,
      status === "aprovada" ? "Requisição de compra aprovada" : "Requisição de compra cancelada",
      status === "aprovada" ? "Sua requisição foi aprovada e vai pra lista de compras." : "Sua requisição foi cancelada.",
      "/historico",
    );
    carregar();
  };

  const recarregarItens = async (reqId: string) => {
    const { data, error } = await supabase
      .from("requisicao_itens")
      .select("id, quantidade, unidade, nome_custom, produtos(nome, unidade)")
      .eq("requisicao_id", reqId);
    if (error) { toast.error("Erro ao recarregar itens", { description: error.message }); return; }
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
    if (!(await confirm({ message: `Excluir "${nome}" da requisição?`, confirmLabel: "Excluir", destructive: true }))) return;
    const { error } = await supabase.from("requisicao_itens").delete().eq("id", itemId);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Item excluído");
    recarregarItens(reqId);
  };

  const editarNome = async (reqId: string, it: Item) => {
    const original = it.produtos?.nome ?? "";
    const atual = it.nome_custom ?? original;
    const novo = await promptText({ title: "Editar nome do produto", message: `Só nesta requisição.\nOriginal: ${original}`, defaultValue: atual });
    if (novo === null) return;
    const trimmed = novo.trim();
    const valor = !trimmed || trimmed === original ? null : trimmed;
    const { error } = await supabase
      .from("requisicao_itens")
      .update({ nome_custom: valor })
      .eq("id", it.id);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    toast.success("Nome atualizado");
    recarregarItens(reqId);
  };

  const compartilharWhatsApp = (r: Req) => {
    const lista = itens[r.id] ?? [];
    if (lista.length === 0) return toast.error("Sem itens para compartilhar");
    const linhas = lista.map((it) => {
      const nome = it.nome_custom || it.produtos?.nome || "—";
      const u = it.unidade || it.produtos?.unidade || "";
      const alt = it.unidade && it.produtos && it.unidade !== it.produtos.unidade ? ` (era ${it.produtos.unidade})` : "";
      return `• ${nome} — ${it.quantidade} ${u}${alt}`.trim();
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
    { id: "recebida", label: "Recebidas" },
    { id: "cancelada", label: "Canceladas" },
    { id: "todas", label: "Todas" },
  ];

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md md:max-w-2xl items-center gap-3">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={voltar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={tap}
            onClick={avancar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Avançar"
          >
            <ArrowRight size={18} />
          </motion.button>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Requisições</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md md:max-w-2xl px-6 pt-4">
        <p className="mb-3 rounded-md border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          Requisições aprovadas continuam aparecendo na <span className="font-semibold text-foreground">Lista de Compras</span> até serem marcadas como compradas.
        </p>


        <div className="mb-3 flex gap-1 overflow-x-auto">
          {filtros.map((f) => (
            <motion.button
              key={f.id}
              whileTap={tap}
              onClick={() => setFiltro(f.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                filtro === f.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {carregando ? (
          <SkeletonStack rows={6} />
        ) : reqs.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma requisição.
          </motion.p>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {reqs.map((r) => {
              const isAberto = aberto === r.id;
              const lista = itens[r.id] ?? [];
              const pendente = r.status === "pendente";
              return (
                <motion.li
                  key={r.id}
                  variants={listItem}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md hover:shadow-primary/5"
                >
                  <button
                    onClick={() => toggle(r.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
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
                  <AnimatePresence initial={false}>
                  {isAberto && (
                    <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseY} className="border-t border-border px-4 py-3">
                      {lista.length === 0 ? (
                        <SkeletonStack rows={2} />
                      ) : (
                        <ul className="space-y-2">
                          {lista.map((it) => (
                            <li key={it.id} className="rounded-lg bg-background/60 px-2 py-2 text-sm">
                              <div className="min-w-0">
                                <div className="flex items-start gap-1.5">
                                  <span className={`break-words ${it.nome_custom ? "font-semibold text-primary" : "text-foreground"}`}>
                                    {it.nome_custom || it.produtos?.nome || "—"}
                                  </span>
                                  {pendente && (
                                    <button
                                      onClick={() => editarNome(r.id, it)}
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                      aria-label="Editar nome"
                                      title="Editar nome só nesta requisição"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                </div>
                                {it.nome_custom && (
                                  <p className="break-words text-[10px] text-muted-foreground">
                                    original: {it.produtos?.nome ?? "—"}
                                  </p>
                                )}
                              </div>
                              {pendente ? (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => atualizarQtd(r.id, it.id, it.quantidade - 1)}
                                    disabled={it.quantidade <= 1}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-40"
                                    aria-label="Diminuir"
                                  >
                                    <Minus size={12} />
                                  </motion.button>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={1}
                                    value={it.quantidade}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      if (Number.isFinite(v) && v > 0) atualizarQtd(r.id, it.id, v);
                                    }}
                                    className="h-7 w-12 rounded-md border border-border bg-background text-center text-xs font-semibold tabular-nums text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                  />
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => atualizarQtd(r.id, it.id, it.quantidade + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                    aria-label="Aumentar"
                                  >
                                    <Plus size={12} />
                                  </motion.button>
                                  <span className={`ml-1 text-[10px] uppercase ${it.unidade && it.produtos && it.unidade !== it.produtos.unidade ? "font-bold text-primary" : "text-muted-foreground"}`}>
                                    {it.unidade || it.produtos?.unidade || ""}
                                  </span>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => excluirItem(r.id, it.id, it.produtos?.nome ?? "item")}
                                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-destructive/40 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 size={12} />
                                  </motion.button>
                                </div>
                              ) : (
                                <span className={`mt-1 block font-mono text-xs tabular-nums ${it.unidade && it.produtos && it.unidade !== it.produtos.unidade ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                  {it.quantidade} {it.unidade || it.produtos?.unidade || ""}
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
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={tap}
                            onClick={() => compartilharWhatsApp(r)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                          >
                            <Share2 size={12} /> Compartilhar no WhatsApp
                          </motion.button>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={tap}
                              onClick={() => mudarStatus(r, "aprovada")}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            >
                              <Check size={12} /> Aprovar
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={tap}
                              onClick={() => mudarStatus(r, "cancelada")}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                            >
                              <XCircle size={12} /> Cancelar
                            </motion.button>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
      {ConfirmDialog}
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { useConfirm } from "@/hooks/use-confirm";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/receitas")({
  component: AdminReceitas,
});

type Produto = { id: string; nome: string; unidade: string };

type Receita = {
  id: string;
  produto_id: string;
  rendimento: number;
  unidade_rendimento: string;
  ativo: boolean;
  status: string;
  usuario_id: string | null;
  usuarios: { nome: string } | null;
  produtos: { nome: string; unidade: string } | null;
  totalItens: number;
};

type ItemForm = { insumo_id: string; quantidade: string; unidade: string };
type Filtro = "todas" | "pendente" | "aprovada" | "rejeitada";

function AdminReceitas() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const { confirm, ConfirmDialog } = useConfirm();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Receita | null>(null);
  const [novo, setNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    produto_id: "",
    rendimento: "1",
    unidade_rendimento: "UND",
    ativo: true,
  });
  const [itens, setItens] = useState<ItemForm[]>([]);

  const carregar = async () => {
    setCarregando(true);
    let q = supabase
      .from("receitas")
      .select("id, produto_id, rendimento, unidade_rendimento, ativo, status, usuario_id, usuarios(nome), produtos(nome, unidade), receita_itens(count)")
      .order("criado_em", { ascending: false });
    if (filtro !== "todas") q = q.eq("status", filtro);
    const [{ data: prods }, { data: recs }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      q,
    ]);
    setProdutos((prods ?? []) as Produto[]);
    setReceitas(
      ((recs ?? []) as any[]).map((r) => ({
        ...r,
        totalItens: r.receita_itens?.[0]?.count ?? 0,
      })),
    );
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, [filtro]);

  const mudarStatus = async (r: Receita, status: "aprovada" | "rejeitada") => {
    const label = status === "aprovada" ? "Aprovar" : "Rejeitar";
    if (!(await confirm({ message: `${label} a ficha técnica de "${r.produtos?.nome}"?`, confirmLabel: label, destructive: status === "rejeitada" }))) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("receitas")
      .update({ status, decidido_por: user?.id ?? null, decidido_em: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(`Ficha técnica ${status === "aprovada" ? "aprovada" : "rejeitada"}`);
    carregar();
  };

  const filtros: { id: Filtro; label: string }[] = [
    { id: "pendente", label: "Pendentes" },
    { id: "aprovada", label: "Aprovadas" },
    { id: "rejeitada", label: "Rejeitadas" },
    { id: "todas", label: "Todas" },
  ];

  const abrirNovo = () => {
    setForm({ produto_id: "", rendimento: "1", unidade_rendimento: "UND", ativo: true });
    setItens([{ insumo_id: "", quantidade: "", unidade: "" }]);
    setEditando(null);
    setNovo(true);
  };

  const abrirEditar = async (r: Receita) => {
    setForm({
      produto_id: r.produto_id,
      rendimento: String(r.rendimento),
      unidade_rendimento: r.unidade_rendimento,
      ativo: r.ativo,
    });
    const { data } = await supabase
      .from("receita_itens")
      .select("insumo_id, quantidade, unidade")
      .eq("receita_id", r.id);
    setItens(
      (data ?? []).map((i) => ({
        insumo_id: i.insumo_id,
        quantidade: String(i.quantidade),
        unidade: i.unidade ?? "",
      })),
    );
    setEditando(r);
    setNovo(false);
  };

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const addItem = () => setItens((its) => [...its, { insumo_id: "", quantidade: "", unidade: "" }]);
  const removeItem = (idx: number) => setItens((its) => its.filter((_, i) => i !== idx));
  const setItem = (idx: number, patch: Partial<ItemForm>) =>
    setItens((its) => its.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const salvar = async () => {
    if (!form.produto_id) return toast.error("Selecione o produto final");
    const rendimento = Number(form.rendimento.replace(",", "."));
    if (!rendimento || rendimento <= 0) return toast.error("Rendimento inválido");
    const itensValidos = itens.filter((i) => i.insumo_id && Number(i.quantidade) > 0);
    if (itensValidos.length === 0) return toast.error("Adicione ao menos um insumo");

    setSalvando(true);
    try {
      let receitaId = editando?.id;
      if (editando) {
        const { error } = await supabase
          .from("receitas")
          .update({
            produto_id: form.produto_id,
            rendimento,
            unidade_rendimento: form.unidade_rendimento,
            ativo: form.ativo,
          })
          .eq("id", editando.id);
        if (error) throw error;
        const { error: errDel } = await supabase.from("receita_itens").delete().eq("receita_id", editando.id);
        if (errDel) throw errDel;
      } else {
        const { data, error } = await supabase
          .from("receitas")
          .insert({
            produto_id: form.produto_id,
            rendimento,
            unidade_rendimento: form.unidade_rendimento,
            ativo: form.ativo,
          })
          .select("id")
          .single();
        if (error) throw error;
        receitaId = data.id;
      }
      if (!receitaId) throw new Error("Falha ao identificar a receita");

      const { error: errItens } = await supabase.from("receita_itens").insert(
        itensValidos.map((i) => ({
          receita_id: receitaId,
          insumo_id: i.insumo_id,
          quantidade: Number(i.quantidade.replace(",", ".")),
          unidade: i.unidade || null,
        })),
      );
      if (errItens) throw errItens;

      toast.success(editando ? "Receita atualizada" : "Receita criada");
      fechar();
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (r: Receita) => {
    if (!(await confirm({ message: `Excluir a ficha técnica de "${r.produtos?.nome}"?`, confirmLabel: "Excluir", destructive: true }))) return;
    const { error } = await supabase.from("receitas").delete().eq("id", r.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Receita excluída");
    carregar();
  };

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
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Fichas técnicas ({receitas.length})</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={abrirNovo}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          >
            <Plus size={14} /> Nova
          </motion.button>
        </div>
      </header>

      <div className="mx-auto max-w-md md:max-w-2xl px-6 pt-4">
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
        ) : receitas.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma ficha técnica cadastrada.
          </motion.p>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {receitas.map((r) => {
              const pendente = r.status === "pendente";
              return (
              <motion.li
                key={r.id}
                variants={listItem}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="break-words text-sm font-semibold text-foreground">
                      {r.produtos?.nome ?? "—"}
                      {!r.ativo && <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">(inativa)</span>}
                    </p>
                    {r.status !== "aprovada" && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          pendente ? "bg-yellow-900/30 text-yellow-400" : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {pendente ? "Pendente" : "Rejeitada"}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Rende {r.rendimento} {r.unidade_rendimento} · {r.totalItens} insumo(s)
                    {r.usuarios?.nome && <> · proposta por {r.usuarios.nome}</>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={tap}
                    onClick={() => abrirEditar(r)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={tap}
                    onClick={() => excluir(r)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-destructive transition hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
                </div>
                {pendente && (
                  <div className="flex gap-2 border-t border-border pt-2">
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
                      onClick={() => mudarStatus(r, "rejeitada")}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                    >
                      <X size={12} /> Rejeitar
                    </motion.button>
                  </div>
                )}
              </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>

      <AnimatePresence>
        {(novo || editando) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">
                  {editando ? "Editar ficha técnica" : "Nova ficha técnica"}
                </h2>
                <motion.button
                  whileTap={tap}
                  onClick={fechar}
                  aria-label="Fechar"
                  className="rounded-md p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  <X size={18} />
                </motion.button>
              </div>
              <div className="space-y-3">
                <Field label="Produto final">
                  <select
                    value={form.produto_id}
                    onChange={(e) => setForm((f) => ({ ...f, produto_id: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Selecione —</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rendimento">
                    <input
                      inputMode="decimal"
                      value={form.rendimento}
                      onChange={(e) => setForm((f) => ({ ...f, rendimento: e.target.value }))}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Unidade do rendimento">
                    <input
                      value={form.unidade_rendimento}
                      onChange={(e) => setForm((f) => ({ ...f, unidade_rendimento: e.target.value }))}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Ativa
                </label>

                <div className="pt-2">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Insumos</p>
                  <div className="space-y-2">
                    {itens.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={it.insumo_id}
                          onChange={(e) => setItem(idx, { insumo_id: e.target.value })}
                          className={`${inputCls} mt-0 flex-1`}
                        >
                          <option value="">— Insumo —</option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                        <input
                          inputMode="decimal"
                          placeholder="Qtd"
                          value={it.quantidade}
                          onChange={(e) => setItem(idx, { quantidade: e.target.value })}
                          className={`${inputCls} mt-0 w-20`}
                        />
                        <motion.button
                          whileTap={tap}
                          onClick={() => removeItem(idx)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                          aria-label="Remover insumo"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={tap}
                    onClick={addItem}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
                  >
                    <Plus size={13} /> Adicionar insumo
                  </motion.button>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={tap}
                onClick={salvar}
                disabled={salvando}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-60"
              >
                <Check size={16} /> {salvando ? "Salvando..." : "Salvar"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {ConfirmDialog}
    </main>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs uppercase tracking-wider text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

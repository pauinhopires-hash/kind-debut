import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { linkCotacaoWhatsapp } from "@/lib/whatsapp";
import { collapseY, fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/fornecedores")({
  component: AdminFornecedores,
});

type Produto = { id: string; nome: string };

type Fornecedor = {
  id: string;
  nome_empresa: string;
  whatsapp: string;
  ativo: boolean;
  produtosVinculados: { id: string; nome: string }[];
};

function AdminFornecedores() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [novo, setNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome_empresa: "", whatsapp: "", ativo: true });
  const [produtosVinculados, setProdutosVinculados] = useState<string[]>([]);
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: prods }, { data: forns }] = await Promise.all([
      supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
      supabase
        .from("fornecedores")
        .select("id, nome_empresa, whatsapp, ativo, produto_fornecedores(produtos(id, nome))")
        .order("nome_empresa"),
    ]);
    setProdutos((prods ?? []) as Produto[]);
    setFornecedores(
      ((forns ?? []) as any[]).map((f) => ({
        id: f.id,
        nome_empresa: f.nome_empresa,
        whatsapp: f.whatsapp,
        ativo: f.ativo,
        produtosVinculados: (f.produto_fornecedores ?? [])
          .map((v: any) => v.produtos)
          .filter(Boolean)
          .sort((a: any, b: any) => a.nome.localeCompare(b.nome)),
      })),
    );
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setForm({ nome_empresa: "", whatsapp: "", ativo: true });
    setProdutosVinculados([]);
    setProdutoParaAdicionar("");
    setEditando(null);
    setNovo(true);
  };

  const abrirEditar = async (f: Fornecedor) => {
    setForm({ nome_empresa: f.nome_empresa, whatsapp: f.whatsapp, ativo: f.ativo });
    const { data } = await supabase
      .from("produto_fornecedores")
      .select("produto_id")
      .eq("fornecedor_id", f.id);
    setProdutosVinculados((data ?? []).map((v) => v.produto_id));
    setProdutoParaAdicionar("");
    setEditando(f);
    setNovo(false);
  };

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const adicionarProduto = () => {
    if (!produtoParaAdicionar || produtosVinculados.includes(produtoParaAdicionar)) return;
    setProdutosVinculados((v) => [...v, produtoParaAdicionar]);
    setProdutoParaAdicionar("");
  };
  const removerProduto = (produtoId: string) =>
    setProdutosVinculados((v) => v.filter((id) => id !== produtoId));

  const salvar = async () => {
    if (!form.nome_empresa.trim()) return toast.error("Informe o nome da empresa");
    if (!form.whatsapp.trim()) return toast.error("Informe o WhatsApp");

    setSalvando(true);
    try {
      let fornecedorId = editando?.id;
      if (editando) {
        const { error } = await supabase
          .from("fornecedores")
          .update({ nome_empresa: form.nome_empresa.trim(), whatsapp: form.whatsapp.trim(), ativo: form.ativo })
          .eq("id", editando.id);
        if (error) throw error;
        const { error: errDel } = await supabase
          .from("produto_fornecedores")
          .delete()
          .eq("fornecedor_id", editando.id);
        if (errDel) throw errDel;
      } else {
        const { data, error } = await supabase
          .from("fornecedores")
          .insert({ nome_empresa: form.nome_empresa.trim(), whatsapp: form.whatsapp.trim(), ativo: form.ativo })
          .select("id")
          .single();
        if (error) throw error;
        fornecedorId = data.id;
      }
      if (!fornecedorId) throw new Error("Falha ao identificar o fornecedor");

      if (produtosVinculados.length > 0) {
        const { error: errVinculos } = await supabase.from("produto_fornecedores").insert(
          produtosVinculados.map((produto_id) => ({ produto_id, fornecedor_id: fornecedorId })),
        );
        if (errVinculos) throw errVinculos;
      }

      toast.success(editando ? "Fornecedor atualizado" : "Fornecedor criado");
      fechar();
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (f: Fornecedor) => {
    if (!confirm(`Excluir o fornecedor "${f.nome_empresa}"?`)) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", f.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Fornecedor excluído");
    carregar();
  };

  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? id;

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
            <h1 className="text-lg font-bold text-foreground">Fornecedores ({fornecedores.length})</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={abrirNovo}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          >
            <Plus size={14} /> Novo
          </motion.button>
        </div>
      </header>

      <div className="mx-auto max-w-md md:max-w-2xl space-y-3 px-6 pt-4">
        {carregando ? (
          <SkeletonStack rows={6} />
        ) : fornecedores.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="py-12 text-center text-sm text-muted-foreground">
            Nenhum fornecedor cadastrado.
          </motion.p>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {fornecedores.map((f) => (
              <motion.li
                key={f.id}
                variants={listItem}
                className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-2 px-4 py-3">
                  <button
                    onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                    aria-expanded={expandedId === f.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {f.nome_empresa}
                        {!f.ativo && <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">(inativo)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {f.whatsapp} · {f.produtosVinculados.length} produto(s)
                      </p>
                    </div>
                    {expandedId === f.id ? <ChevronUp size={16} className="mt-0.5 text-muted-foreground" /> : <ChevronDown size={16} className="mt-0.5 text-muted-foreground" />}
                  </button>
                  <div className="flex gap-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={tap}
                      onClick={() => abrirEditar(f)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                      aria-label="Editar"
                    >
                      <Pencil size={14} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={tap}
                      onClick={() => excluir(f)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-destructive transition hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {expandedId === f.id && (
                    <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseY} className="border-t border-border px-4 py-3">
                      {f.produtosVinculados.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum produto vinculado ainda.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {f.produtosVinculados.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5">
                              <span className="min-w-0 flex-1 break-words text-sm text-foreground">{p.nome}</span>
                              <a
                                href={linkCotacaoWhatsapp(f.whatsapp, p.nome)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                              >
                                <MessageCircle size={13} /> Mandar mensagem
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
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
                  {editando ? "Editar fornecedor" : "Novo fornecedor"}
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
                <Field label="Nome da empresa">
                  <input
                    value={form.nome_empresa}
                    onChange={(e) => setForm((f) => ({ ...f, nome_empresa: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="WhatsApp">
                  <input
                    value={form.whatsapp}
                    onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className={inputCls}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Ativo
                </label>

                <div className="pt-2">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Produtos vinculados
                  </p>
                  <div className="space-y-2">
                    {produtosVinculados.map((produtoId) => (
                      <div key={produtoId} className="flex items-center gap-2">
                        <span className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                          {nomeProduto(produtoId)}
                        </span>
                        <motion.button
                          whileTap={tap}
                          onClick={() => removerProduto(produtoId)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                          aria-label="Remover produto"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={produtoParaAdicionar}
                      onChange={(e) => setProdutoParaAdicionar(e.target.value)}
                      className={`${inputCls} mt-0 flex-1`}
                    >
                      <option value="">— Selecione um produto —</option>
                      {produtos
                        .filter((p) => !produtosVinculados.includes(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={tap}
                      onClick={adicionarProduto}
                      disabled={!produtoParaAdicionar}
                      className="flex h-9 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-foreground transition hover:border-primary disabled:opacity-40"
                    >
                      <Plus size={13} /> Add
                    </motion.button>
                  </div>
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

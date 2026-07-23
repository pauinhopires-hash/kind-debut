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

export const Route = createFileRoute("/admin/setores")({
  component: AdminSetoresLocais,
});

type Registro = { id: string; nome: string; ativo: boolean };

function AdminSetoresLocais() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const { confirm, ConfirmDialog } = useConfirm();
  const [setores, setSetores] = useState<Registro[]>([]);
  const [locais, setLocais] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: fcs }, { data: lcs }] = await Promise.all([
      supabase.from("funcoes").select("id, nome, ativo").order("nome"),
      supabase.from("locais").select("id, nome, ativo").order("nome"),
    ]);
    setSetores((fcs ?? []) as Registro[]);
    setLocais((lcs ?? []) as Registro[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

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
            <h1 className="text-lg font-bold text-foreground">Setores e Locais</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md md:max-w-2xl space-y-8 px-6 pt-4">
        <SecaoRegistros
          titulo="Setores"
          descricao='Departamentos/áreas donas de cada produto (ex: Cozinha, Frente). Um produto pode ter vários. Diferente de "Perfil" (cargo da pessoa) — veja a tela Perfis pra isso.'
          tabela="funcoes"
          registros={setores}
          carregando={carregando}
          confirm={confirm}
          onSalvou={carregar}
        />
        <SecaoRegistros
          titulo="Locais"
          descricao="Onde o estoque fisicamente fica (ex: Geladeira, Estoque Central). Usado nos filtros de local e no cadastro de produto/estoque."
          tabela="locais"
          registros={locais}
          carregando={carregando}
          confirm={confirm}
          onSalvou={carregar}
        />
      </div>

      {ConfirmDialog}
    </main>
  );
}

function SecaoRegistros({
  titulo,
  descricao,
  tabela,
  registros,
  carregando,
  confirm,
  onSalvou,
}: {
  titulo: string;
  descricao: string;
  tabela: "funcoes" | "locais";
  registros: Registro[];
  carregando: boolean;
  confirm: (opts: { message: string; confirmLabel?: string; destructive?: boolean }) => Promise<boolean>;
  onSalvou: () => void;
}) {
  const [editando, setEditando] = useState<Registro | null>(null);
  const [novo, setNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", ativo: true });

  const abrirNovo = () => {
    setForm({ nome: "", ativo: true });
    setEditando(null);
    setNovo(true);
  };

  const abrirEditar = (r: Registro) => {
    setForm({ nome: r.nome, ativo: r.ativo });
    setEditando(r);
    setNovo(false);
  };

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const label = titulo === "Setores" ? "setor" : "local";

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error(`Informe o nome do ${label}`);
    setSalvando(true);
    try {
      if (editando) {
        const { error } = await supabase
          .from(tabela)
          .update({ nome: form.nome.trim().toUpperCase(), ativo: form.ativo })
          .eq("id", editando.id);
        if (error) throw error;
        toast.success(`${titulo.slice(0, -1)} atualizado`);
      } else {
        const { error } = await supabase
          .from(tabela)
          .insert({ nome: form.nome.trim().toUpperCase(), ativo: form.ativo });
        if (error) throw error;
        toast.success(`${titulo.slice(0, -1)} criado`);
      }
      fechar();
      onSalvou();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (r: Registro) => {
    const aviso =
      tabela === "funcoes"
        ? `Excluir o setor "${r.nome}"? Produtos vinculados perdem esse vínculo.`
        : `Excluir o local "${r.nome}"? Produtos/estoque com esse local não são afetados, mas ele some da lista de opções.`;
    if (!(await confirm({ message: aviso, confirmLabel: "Excluir", destructive: true }))) return;
    const { error } = await supabase.from(tabela).delete().eq("id", r.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success(`${titulo.slice(0, -1)} excluído`);
    onSalvou();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">{titulo} ({registros.length})</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={tap}
          onClick={abrirNovo}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
        >
          <Plus size={14} /> Novo
        </motion.button>
      </div>

      {carregando ? (
        <SkeletonStack rows={3} />
      ) : registros.length === 0 ? (
        <motion.p initial="hidden" animate="visible" variants={fadeIn} className="py-6 text-center text-sm text-muted-foreground">
          Nenhum {label} cadastrado.
        </motion.p>
      ) : (
        <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
          {registros.map((r) => (
            <motion.li
              key={r.id}
              variants={listItem}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-md hover:shadow-primary/5"
            >
              <p className="truncate text-sm font-semibold text-foreground">
                {r.nome}
                {!r.ativo && <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">(inativo)</span>}
              </p>
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
            </motion.li>
          ))}
        </motion.ul>
      )}

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
              className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">
                  {editando ? `Editar ${label}` : `Novo ${label}`}
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
                <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                  Nome
                  <input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Ativo
                </label>
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
    </section>
  );
}

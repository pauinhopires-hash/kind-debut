import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/perfis")({
  component: AdminPerfis,
});

type Perfil = { id: string; nome: string; slug: string };

function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function AdminPerfis() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Perfil | null>(null);
  const [novo, setNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");

  const carregar = async () => {
    setCarregando(true);
    const { data } = await supabase.from("perfis").select("id, nome, slug").order("nome");
    setPerfis((data ?? []) as Perfil[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setNome("");
    setEditando(null);
    setNovo(true);
  };

  const abrirEditar = (p: Perfil) => {
    setNome(p.nome);
    setEditando(p);
    setNovo(false);
  };

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const salvar = async () => {
    if (!nome.trim()) return toast.error("Informe o nome do perfil");
    setSalvando(true);
    try {
      if (editando) {
        // slug nunca muda depois de criado — evita colidir com o "admin"
        // já existente ou quebrar quem depende dele.
        const { error } = await supabase.from("perfis").update({ nome: nome.trim() }).eq("id", editando.id);
        if (error) throw error;
        toast.success("Perfil atualizado");
      } else {
        const { error } = await supabase.from("perfis").insert({ nome: nome.trim(), slug: slugify(nome) });
        if (error) throw error;
        toast.success("Perfil criado");
      }
      fechar();
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (p: Perfil) => {
    if (!confirm(`Excluir o perfil "${p.nome}"?`)) return;
    const { error } = await supabase.from("perfis").delete().eq("id", p.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Perfil excluído");
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
            <h1 className="text-lg font-bold text-foreground">Perfis ({perfis.length})</h1>
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
        <p className="text-xs text-muted-foreground">
          Perfis são os cargos das pessoas (ex: Líder Cozinha, Pizzaiolo). É diferente de "Setor"
          (departamento dono do produto) — veja a tela Setores pra isso.
        </p>
        {carregando ? (
          <SkeletonStack rows={4} />
        ) : perfis.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="py-12 text-center text-sm text-muted-foreground">
            Nenhum perfil cadastrado.
          </motion.p>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {perfis.map((p) => (
              <motion.li
                key={p.id}
                variants={listItem}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="truncate text-[10px] uppercase text-muted-foreground">{p.slug}</p>
                </div>
                <div className="flex gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={tap}
                    onClick={() => abrirEditar(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={tap}
                    onClick={() => excluir(p)}
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
              className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">
                  {editando ? "Editar perfil" : "Novo perfil"}
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
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Pizzaiolo"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  {editando
                    ? <>Identificador interno (fixo): <span className="font-mono">{editando.slug}</span></>
                    : <>Identificador interno gerado automaticamente: <span className="font-mono">{slugify(nome) || "—"}</span></>}
                </p>
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

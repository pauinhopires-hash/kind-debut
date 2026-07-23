import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2, X, Check, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProdutos,
});

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  ativo: boolean;
  perfil_id: string | null;
  grupo: string | null;
  subgrupo: string | null;
  local: string | null;
  valor_unitario: number | null;
  funcoes: string[];
};

type Perfil = { id: string; nome: string };
type Funcao = { id: string; nome: string };

const UNIDADES = ["UND", "KG", "CX", "PC", "PCT", "LT"];
const LOCAIS = ["CONGELADOR", "GELADEIRA", "PRATELEIRA", "ESTOQUE CENTRAL"];

function AdminProdutos() {
  const navigate = useNavigate();
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [form, setForm] = useState({
    nome: "",
    unidade: "UND",
    perfil_id: "",
    grupo: "",
    subgrupo: "",
    local: "",
    valor_unitario: "" as string,
    ativo: true,
  });
  const [funcoesVinculadas, setFuncoesVinculadas] = useState<string[]>([]);
  const [funcaoParaAdicionar, setFuncaoParaAdicionar] = useState("");

  const carregar = async () => {
    setCarregando(true);
    const [{ data: prods }, { data: pfs }, { data: fcs }, { data: vinculos }] = await Promise.all([
      supabase
        .from("produtos")
        .select("id, nome, unidade, ativo, perfil_id, grupo, subgrupo, local, valor_unitario")
        .order("nome"),
      supabase.from("perfis").select("id, nome").order("nome"),
      supabase.from("funcoes").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("produto_funcoes").select("produto_id, funcoes(nome)"),
    ]);
    const mapaFuncoes: Record<string, string[]> = {};
    ((vinculos ?? []) as any[]).forEach((v) => {
      if (!v.funcoes?.nome) return;
      if (!mapaFuncoes[v.produto_id]) mapaFuncoes[v.produto_id] = [];
      mapaFuncoes[v.produto_id].push(v.funcoes.nome);
    });
    setProdutos(
      ((prods ?? []) as any[]).map((p) => ({ ...p, funcoes: mapaFuncoes[p.id] ?? [] })),
    );
    setPerfis((pfs ?? []) as Perfil[]);
    setFuncoes((fcs ?? []) as Funcao[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (filtroPerfil && p.perfil_id !== filtroPerfil) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [produtos, busca, filtroPerfil]);

  const abrirNovo = () => {
    setForm({
      nome: "",
      unidade: "UND",
      perfil_id: usuario?.perfil_id ?? "",
      grupo: "",
      subgrupo: "",
      local: "",
      valor_unitario: "",
      ativo: true,
    });
    setFuncoesVinculadas([]);
    setFuncaoParaAdicionar("");
    setEditando(null);
    setNovo(true);
  };

  const abrirEditar = async (p: Produto) => {
    setForm({
      nome: p.nome,
      unidade: p.unidade,
      perfil_id: p.perfil_id ?? "",
      grupo: p.grupo ?? "",
      subgrupo: p.subgrupo ?? "",
      local: p.local ?? "",
      valor_unitario: p.valor_unitario != null ? String(p.valor_unitario) : "",
      ativo: p.ativo,
    });
    const { data } = await supabase.from("produto_funcoes").select("funcao_id").eq("produto_id", p.id);
    setFuncoesVinculadas((data ?? []).map((v) => v.funcao_id));
    setFuncaoParaAdicionar("");
    setEditando(p);
    setNovo(false);
  };

  const adicionarFuncao = () => {
    if (!funcaoParaAdicionar || funcoesVinculadas.includes(funcaoParaAdicionar)) return;
    setFuncoesVinculadas((v) => [...v, funcaoParaAdicionar]);
    setFuncaoParaAdicionar("");
  };
  const removerFuncao = (funcaoId: string) =>
    setFuncoesVinculadas((v) => v.filter((id) => id !== funcaoId));
  const nomeFuncao = (id: string) => funcoes.find((f) => f.id === id)?.nome ?? id;

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    const valor = form.valor_unitario.trim()
      ? Number(form.valor_unitario.replace(",", "."))
      : null;
    if (valor !== null && Number.isNaN(valor)) return toast.error("Valor inválido");
    const payload = {
      nome: form.nome.trim(),
      unidade: form.unidade.trim() || "UND",
      perfil_id: form.perfil_id || null,
      grupo: form.grupo.trim() || null,
      subgrupo: form.subgrupo.trim() || null,
      local: form.local || null,
      valor_unitario: valor,
      ativo: form.ativo,
    };
    try {
      let produtoId = editando?.id;
      if (editando) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", editando.id);
        if (error) throw error;
        const { error: errDel } = await supabase
          .from("produto_funcoes")
          .delete()
          .eq("produto_id", editando.id);
        if (errDel) throw errDel;
      } else {
        const { data, error } = await supabase.from("produtos").insert(payload).select("id").single();
        if (error) throw error;
        produtoId = data.id;
      }
      if (!produtoId) throw new Error("Falha ao identificar o produto");

      if (funcoesVinculadas.length > 0) {
        const { error: errFuncoes } = await supabase.from("produto_funcoes").insert(
          funcoesVinculadas.map((funcao_id) => ({ produto_id: produtoId, funcao_id })),
        );
        if (errFuncoes) throw errFuncoes;
      }

      toast.success(editando ? "Produto atualizado" : "Produto criado");
      fechar();
      carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    }
  };

  const excluir = async (p: Produto) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Produto excluído");
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
            <h1 className="text-lg font-bold text-foreground">Produtos ({produtos.length})</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={() => navigate({ to: "/admin/importar-estoque" })}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          >
            <FileSpreadsheet size={14} /> Importar em massa
          </motion.button>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
        </div>
        <select
          value={filtroPerfil}
          onChange={(e) => setFiltroPerfil(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
        >
          <option value="">Todos os perfis</option>
          {perfis.map((pf) => (
            <option key={pf.id} value={pf.id}>{pf.nome}</option>
          ))}
        </select>

        {carregando ? (
          <SkeletonStack rows={6} />
        ) : filtrados.length === 0 ? (
          <motion.p initial="hidden" animate="visible" variants={fadeIn} className="py-12 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </motion.p>
        ) : (
          <motion.ul initial="hidden" animate="visible" variants={staggerList()} className="space-y-2">
            {filtrados.map((p) => (
              <motion.li
                key={p.id}
                variants={listItem}
                className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-md hover:shadow-primary/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-foreground">
                    {p.nome}
                    {!p.ativo && (
                      <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">(inativo)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.unidade}
                    {p.grupo && ` · ${p.grupo}${p.subgrupo ? "/" + p.subgrupo : ""}`}
                  </p>
                  <p className="truncate text-[10px] uppercase text-muted-foreground">
                    {[p.funcoes.join(", "), p.local, perfis.find((pf) => pf.id === p.perfil_id)?.nome].filter(Boolean).join(" · ")}
                    {p.valor_unitario != null && ` · R$ ${p.valor_unitario.toFixed(2)}`}
                  </p>
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
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {editando ? "Editar produto" : "Novo produto"}
              </h2>
              <motion.button
                whileTap={tap}
                onClick={fechar}
                aria-label="Fechar"
                className="text-muted-foreground rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                <X size={18} />
              </motion.button>
            </div>
            <div className="space-y-3">
              <Field label="Nome">
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unidade">
                  <select
                    value={form.unidade}
                    onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                    className={inputCls}
                  >
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Valor unit. (R$)">
                  <input
                    inputMode="decimal"
                    value={form.valor_unitario}
                    onChange={(e) => setForm((f) => ({ ...f, valor_unitario: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Perfil (líder responsável)">
                <select
                  value={form.perfil_id}
                  onChange={(e) => setForm((f) => ({ ...f, perfil_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Sem perfil —</option>
                  {perfis.map((pf) => <option key={pf.id} value={pf.id}>{pf.nome}</option>)}
                </select>
              </Field>
              <Field label="Local padrão (produtos novos)">
                <select
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>

              <div className="pt-2">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Setores (departamentos donos deste produto)
                </p>
                <div className="space-y-2">
                  {funcoesVinculadas.map((funcaoId) => (
                    <div key={funcaoId} className="flex items-center gap-2">
                      <span className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                        {nomeFuncao(funcaoId)}
                      </span>
                      <motion.button
                        whileTap={tap}
                        onClick={() => removerFuncao(funcaoId)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                        aria-label="Remover setor"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={funcaoParaAdicionar}
                    onChange={(e) => setFuncaoParaAdicionar(e.target.value)}
                    className={`${inputCls} mt-0 flex-1`}
                  >
                    <option value="">— Selecione um setor —</option>
                    {funcoes
                      .filter((f) => !funcoesVinculadas.includes(f.id))
                      .map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                  </select>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={tap}
                    onClick={adicionarFuncao}
                    disabled={!funcaoParaAdicionar}
                    className="flex h-9 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-foreground transition hover:border-primary disabled:opacity-40"
                  >
                    <Plus size={13} /> Add
                  </motion.button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Grupo">
                  <input
                    value={form.grupo}
                    onChange={(e) => setForm((f) => ({ ...f, grupo: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Subgrupo">
                  <input
                    value={form.subgrupo}
                    onChange={(e) => setForm((f) => ({ ...f, subgrupo: e.target.value }))}
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
                Ativo
              </label>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={tap}
              onClick={salvar}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              <Check size={16} /> Salvar
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

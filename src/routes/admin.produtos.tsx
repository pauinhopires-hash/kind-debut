import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProdutos,
});

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  ativo: boolean;
  perfil_id: string | null;
};

type Perfil = { id: string; nome: string };

function AdminProdutos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState<{ nome: string; unidade: string; perfil_id: string; ativo: boolean }>({
    nome: "",
    unidade: "un",
    perfil_id: "",
    ativo: true,
  });

  const carregar = async () => {
    setCarregando(true);
    const [{ data: prods }, { data: pfs }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade, ativo, perfil_id").order("nome"),
      supabase.from("perfis").select("id, nome").order("nome"),
    ]);
    setProdutos((prods ?? []) as Produto[]);
    setPerfis((pfs ?? []) as Perfil[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setForm({ nome: "", unidade: "un", perfil_id: usuario?.perfil_id ?? "", ativo: true });
    setEditando(null);
    setNovo(true);
  };

  const abrirEditar = (p: Produto) => {
    setForm({ nome: p.nome, unidade: p.unidade, perfil_id: p.perfil_id ?? "", ativo: p.ativo });
    setEditando(p);
    setNovo(false);
  };

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    const payload = {
      nome: form.nome.trim(),
      unidade: form.unidade.trim() || "un",
      perfil_id: form.perfil_id || null,
      ativo: form.ativo,
    };
    if (editando) {
      const { error } = await supabase.from("produtos").update(payload).eq("id", editando.id);
      if (error) return toast.error("Erro ao salvar", { description: error.message });
      toast.success("Produto atualizado");
    } else {
      const { error } = await supabase.from("produtos").insert(payload);
      if (error) return toast.error("Erro ao criar", { description: error.message });
      toast.success("Produto criado");
    }
    fechar();
    carregar();
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
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Produtos</h1>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : produtos.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {produtos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.nome}
                    {!p.ativo && (
                      <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">
                        (inativo)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unidade: {p.unidade}
                    {p.perfil_id && (
                      <> · Perfil: {perfis.find((pf) => pf.id === p.perfil_id)?.nome ?? "?"}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => excluir(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-destructive transition hover:border-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(novo || editando) && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {editando ? "Editar produto" : "Novo produto"}
              </h2>
              <button onClick={fechar} aria-label="Fechar" className="text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                Nome
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                Unidade
                <input
                  value={form.unidade}
                  onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                Perfil
                <select
                  value={form.perfil_id}
                  onChange={(e) => setForm((f) => ({ ...f, perfil_id: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="">— Sem perfil —</option>
                  {perfis.map((pf) => (
                    <option key={pf.id} value={pf.id}>
                      {pf.nome}
                    </option>
                  ))}
                </select>
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
            <button
              onClick={salvar}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground transition hover:opacity-95"
            >
              <Check size={16} /> Salvar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

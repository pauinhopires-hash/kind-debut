import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/pedido/editar/$id")({
  head: () => ({ meta: [{ title: "Editar pedido — Misturaria Fina Mezcla" }] }),
  component: EditarPedido,
});

type Produto = { id: string; nome: string; unidade: string };

function EditarPedido() {
  const { id } = useParams({ from: "/pedido/editar/$id" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [naoEditavel, setNaoEditavel] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCarregando(true);
      const [{ data: req }, { data: itens }, { data: prods }] = await Promise.all([
        supabase
          .from("requisicoes")
          .select("id, status, observacao")
          .eq("id", id)
          .eq("usuario_id", user.id)
          .maybeSingle(),
        supabase.from("requisicao_itens").select("produto_id, quantidade").eq("requisicao_id", id),
        supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      ]);
      if (!req || req.status !== "pendente") {
        setNaoEditavel(true);
        setCarregando(false);
        return;
      }
      setObservacao(req.observacao ?? "");
      const map: Record<string, number> = {};
      (itens ?? []).forEach((i: { produto_id: string; quantidade: number }) => {
        map[i.produto_id] = Number(i.quantidade);
      });
      setQuantidades(map);
      setProdutos((prods ?? []) as Produto[]);
      setCarregando(false);
    })();
  }, [user, id]);

  const setQtd = (pid: string, v: number) => {
    setQuantidades((q) => {
      const n = { ...q };
      if (v <= 0) delete n[pid];
      else n[pid] = v;
      return n;
    });
  };

  const itensSelecionados = useMemo(
    () => Object.entries(quantidades).filter(([, v]) => v > 0),
    [quantidades],
  );

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(q));
  }, [produtos, busca]);

  const salvar = async () => {
    if (itensSelecionados.length === 0) {
      toast.error("Adicione ao menos um item");
      return;
    }
    setSalvando(true);
    const { data: updated, error: e1 } = await supabase
      .from("requisicoes")
      .update({ observacao: observacao.trim() || null })
      .eq("id", id)
      .eq("status", "pendente")
      .select("id");
    if (e1) {
      setSalvando(false);
      return toast.error("Erro ao atualizar", { description: e1.message });
    }
    if (!updated || updated.length === 0) {
      setSalvando(false);
      setNaoEditavel(true);
      return toast.error("Pedido não pode mais ser editado", {
        description: "O status mudou. Recarregue o histórico.",
      });
    }
    const { error: eDel } = await supabase
      .from("requisicao_itens")
      .delete()
      .eq("requisicao_id", id);
    if (eDel) {
      setSalvando(false);
      return toast.error("Erro ao limpar itens", { description: eDel.message });
    }
    const rows = itensSelecionados.map(([produto_id, quantidade]) => ({
      requisicao_id: id,
      produto_id,
      quantidade,
    }));
    const { error: e2 } = await supabase.from("requisicao_itens").insert(rows);
    setSalvando(false);
    if (e2) return toast.error("Erro ao salvar itens", { description: e2.message });
    toast.success("Pedido atualizado");
    navigate({ to: "/historico" });
  };

  if (loading || !user || carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (naoEditavel) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <p className="text-sm text-muted-foreground">Esta requisição não pode mais ser editada.</p>
        <button
          onClick={() => navigate({ to: "/historico" })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground"
        >
          Voltar ao histórico
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => navigate({ to: "/historico" })}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Edição</p>
            <h1 className="text-lg font-bold text-foreground">Editar pedido</h1>
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
        <ul className="space-y-2">
          {produtosFiltrados.map((p) => {
            const qtd = quantidades[p.id] ?? 0;
            const ativo = qtd > 0;
            const fracionavel = ["KG", "LT"].includes(p.unidade.toUpperCase());
            const step = fracionavel ? 0.1 : 1;
            const arred = (v: number) =>
              fracionavel ? Math.round(v * 1000) / 1000 : Math.round(v);
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl border bg-card px-4 py-3 ${
                  ativo ? "border-primary/60" : "border-border"
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Unid.: {p.unidade}
                    {fracionavel && " (aceita decimal, ex: 0,5)"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQtd(p.id, Math.max(0, arred(qtd - step)))}
                    disabled={qtd === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground disabled:opacity-40"
                    aria-label="-"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={step}
                    value={qtd === 0 ? "" : qtd}
                    onChange={(e) => {
                      const v = Number(e.target.value.replace(",", "."));
                      setQtd(p.id, Number.isFinite(v) && v > 0 ? arred(v) : 0);
                    }}
                    placeholder="0"
                    className="h-9 w-16 rounded-md border border-border bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setQtd(p.id, arred(qtd + step))}
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                    aria-label="+"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
            Observação
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Itens</p>
            <p className="text-lg font-bold text-foreground">{itensSelecionados.length}</p>
          </div>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
          >
            <Check size={18} />
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </main>
  );
}

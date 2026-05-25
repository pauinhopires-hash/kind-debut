import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/pedido")({
  head: () => ({
    meta: [
      { title: "Fazer pedido — Misturaria Fina Mezcla" },
      { name: "description", content: "Monte uma nova requisição de compras." },
    ],
  }),
  component: PedidoPage,
});

type Produto = {
  id: string;
  nome: string;
  unidade: string;
};

function PedidoPage() {
  const navigate = useNavigate();
  const { user, usuario, loading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCarregando(true);
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, unidade")
        .eq("ativo", true)
        .order("nome");
      if (error) setErro(error.message);
      setProdutos((data ?? []) as Produto[]);
      setCarregando(false);
    })();
  }, [user]);

  const setQtd = (id: string, valor: number) => {
    setQuantidades((q) => {
      const novo = { ...q };
      if (valor <= 0) delete novo[id];
      else novo[id] = valor;
      return novo;
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

  const handleSalvar = async () => {
    if (!user || !usuario || itensSelecionados.length === 0) return;
    setSalvando(true);
    setErro(null);

    const { data: req, error: e1 } = await supabase
      .from("requisicoes")
      .insert({
        usuario_id: user.id,
        perfil_id: usuario.perfil_id,
        observacao: observacao.trim() || null,
        status: "pendente",
      })
      .select("id")
      .single();

    if (e1 || !req) {
      setErro(e1?.message ?? "Erro ao criar requisição");
      setSalvando(false);
      return;
    }

    const itens = itensSelecionados.map(([produto_id, quantidade]) => ({
      requisicao_id: req.id,
      produto_id,
      quantidade,
    }));

    const { error: e2 } = await supabase.from("requisicao_itens").insert(itens);
    setSalvando(false);
    if (e2) {
      setErro(e2.message);
      return;
    }
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-32">
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
            <p className="text-xs uppercase tracking-widest text-primary">Nova requisição</p>
            <h1 className="text-lg font-bold text-foreground">Fazer pedido</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        <input
          type="search"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary"
        />

        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando produtos...</p>
        ) : produtos.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum produto disponível para o seu perfil.
          </p>
        ) : produtosFiltrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nada encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {produtosFiltrados.map((p) => {
              const qtd = quantidades[p.id] ?? 0;
              const ativo = qtd > 0;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition ${
                    ativo ? "border-primary/60" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate text-sm font-semibold text-foreground">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">Unidade: {p.unidade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQtd(p.id, Math.max(0, qtd - 1))}
                      disabled={qtd === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:border-primary disabled:opacity-40"
                      aria-label="Diminuir"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={qtd === 0 ? "" : qtd}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setQtd(p.id, Number.isFinite(v) && v > 0 ? v : 0);
                      }}
                      placeholder="0"
                      className="h-9 w-14 rounded-md border border-border bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => setQtd(p.id, qtd + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90"
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {itensSelecionados.length > 0 && (
          <div className="mt-6">
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
              Observação (opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Marca preferida, urgência, etc."
            />
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-destructive">{erro}</p>}
      </div>

      {/* Barra fixa de envio */}
      {itensSelecionados.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Itens selecionados
              </p>
              <p className="text-lg font-bold text-foreground">{itensSelecionados.length}</p>
            </div>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
            >
              <Check size={18} />
              {salvando ? "Enviando..." : "Enviar pedido"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

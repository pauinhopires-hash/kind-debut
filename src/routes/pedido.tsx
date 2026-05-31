import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
  perfil_id: string | null;
  grupo: string | null;
  subgrupo: string | null;
};
type Perfil = { id: string; nome: string };

function PedidoPage() {
  const navigate = useNavigate();
  const { user, usuario, isAdmin, loading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [estoque, setEstoque] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState<string>("");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCarregando(true);
      const [{ data: prods, error: e1 }, { data: est }, { data: pfs }] = await Promise.all([
        supabase
          .from("produtos")
          .select("id, nome, unidade, perfil_id, grupo, subgrupo")
          .eq("ativo", true)
          .order("nome"),
        supabase.from("estoque_atual").select("produto_id, quantidade"),
        supabase.from("perfis").select("id, nome").order("nome"),
      ]);
      if (e1) toast.error("Erro ao carregar produtos", { description: e1.message });
      setProdutos((prods ?? []) as Produto[]);
      setPerfis((pfs ?? []) as Perfil[]);
      const map: Record<string, number> = {};
      (est ?? []).forEach((r: { produto_id: string; quantidade: number }) => {
        map[r.produto_id] = Number(r.quantidade);
      });
      setEstoque(map);
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

  const repetirUltimo = async () => {
    if (!user) return;
    const { data: req } = await supabase
      .from("requisicoes")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!req) {
      toast.info("Nenhum pedido anterior encontrado");
      return;
    }
    const { data: itens } = await supabase
      .from("requisicao_itens")
      .select("produto_id, quantidade")
      .eq("requisicao_id", req.id);
    if (!itens || itens.length === 0) {
      toast.info("Pedido anterior estava vazio");
      return;
    }
    const map: Record<string, number> = {};
    itens.forEach((i) => {
      map[i.produto_id] = Number(i.quantidade);
    });
    setQuantidades(map);
    toast.success(`${itens.length} itens carregados do último pedido`);
  };

  const itensSelecionados = useMemo(
    () => Object.entries(quantidades).filter(([, v]) => v > 0),
    [quantidades],
  );

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (perfilFiltro && p.perfil_id !== perfilFiltro) return false;
      if (grupoFiltro && (p.grupo ?? "Outros") !== grupoFiltro) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [produtos, busca, perfilFiltro, grupoFiltro]);

  const gruposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (perfilFiltro && p.perfil_id !== perfilFiltro) return;
      set.add(p.grupo ?? "Outros");
    });
    return Array.from(set).sort();
  }, [produtos, perfilFiltro]);

  const produtosAgrupados = useMemo(() => {
    const map = new Map<string, Map<string, Produto[]>>();
    produtosFiltrados.forEach((p) => {
      const g = p.grupo ?? "Outros";
      const sg = p.subgrupo ?? "—";
      if (!map.has(g)) map.set(g, new Map());
      const sub = map.get(g)!;
      if (!sub.has(sg)) sub.set(sg, []);
      sub.get(sg)!.push(p);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([grupo, subs]) => ({
        grupo,
        subgrupos: Array.from(subs.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subgrupo, itens]) => ({ subgrupo, itens })),
      }));
  }, [produtosFiltrados]);

  const handleSalvar = async () => {
    if (!user || !usuario || itensSelecionados.length === 0) return;

    // Determina perfil_id da requisição: admin → escolhido no filtro ou perfil do 1º produto
    let perfilDaReq: string | null = usuario.perfil_id;
    if (isAdmin) {
      if (perfilFiltro) {
        perfilDaReq = perfilFiltro;
      } else {
        const primeiro = produtos.find((p) => p.id === itensSelecionados[0][0]);
        perfilDaReq = primeiro?.perfil_id ?? null;
      }
    }

    setSalvando(true);

    const { data: req, error: e1 } = await supabase
      .from("requisicoes")
      .insert({
        usuario_id: user.id,
        perfil_id: perfilDaReq,
        observacao: observacao.trim() || null,
        status: "pendente",
      })
      .select("id")
      .single();

    if (e1 || !req) {
      toast.error("Erro ao criar requisição", { description: e1?.message });
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
      toast.error("Erro ao salvar itens", { description: e2.message });
      return;
    }
    toast.success("Pedido enviado", { description: `${itens.length} itens registrados.` });
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
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-primary">Nova requisição</p>
            <h1 className="text-lg font-bold text-foreground">Fazer pedido</h1>
          </div>
          <button
            onClick={repetirUltimo}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary"
          >
            <RotateCcw size={14} />
            Repetir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        {isAdmin && (
          <div className="mb-3">
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Setor / Perfil (master)
            </label>
            <select
              value={perfilFiltro}
              onChange={(e) => setPerfilFiltro(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Todos os setores</option>
              {perfis.map((pf) => (
                <option key={pf.id} value={pf.id}>
                  {pf.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <input
          type="search"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-3 w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary"
        />

        {gruposDisponiveis.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setGrupoFiltro("")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                grupoFiltro === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              Todos
            </button>
            {gruposDisponiveis.map((g) => (
              <button
                key={g}
                onClick={() => setGrupoFiltro(g)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                  grupoFiltro === g
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando produtos...</p>
        ) : produtos.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum produto disponível para o seu perfil.
          </p>
        ) : produtosFiltrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nada encontrado.</p>
        ) : (
          <div className="space-y-6">
            {produtosAgrupados.map(({ grupo, subgrupos }) => (
              <section key={grupo}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
                  {grupo}
                </h2>
                <div className="space-y-4">
                  {subgrupos.map(({ subgrupo, itens }) => (
                    <div key={subgrupo}>
                      {subgrupos.length > 1 || subgrupo !== "—" ? (
                        <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                          {subgrupo}
                        </p>
                      ) : null}
                      <ul className="space-y-2">
                        {itens.map((p) => {
                          const qtd = quantidades[p.id] ?? 0;
                          const ativo = qtd > 0;
                          const est = estoque[p.id];
                          return (
                            <li
                              key={p.id}
                              className={`flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition ${
                                ativo ? "border-primary/60" : "border-border"
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-3">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {p.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Unid.: {p.unidade}
                                  {est !== undefined && (
                                    <>
                                      {" · "}
                                      <span
                                        className={
                                          est <= 0 ? "text-destructive" : "text-foreground/70"
                                        }
                                      >
                                        Estoque: {est}
                                      </span>
                                    </>
                                  )}
                                </p>
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
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
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

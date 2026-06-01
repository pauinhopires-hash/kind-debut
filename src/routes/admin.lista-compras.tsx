import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/lista-compras")({
  head: () => ({
    meta: [
      { title: "Lista de compras — Admin" },
      { name: "description", content: "Lista consolidada de compras do dia." },
    ],
  }),
  component: ListaComprasPage,
});

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  grupo: string | null;
  perfil_id: string | null;
};
type Perfil = { id: string; nome: string };
type ItemRow = {
  id: string;
  produto_id: string;
  quantidade: number;
  comprado: boolean;
  requisicao_id: string;
  requisicoes: { perfil_id: string | null; usuario_id: string } | null;
};

type LinhaConsolidada = {
  produto: Produto;
  pedido: number;
  estoque: number;
  aComprar: number;
  itemIds: string[];
  todosComprados: boolean;
  setores: Set<string>;
};


function ListaComprasPage() {
  const navigate = useNavigate();
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [perfilFiltro, setPerfilFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [produtos, setProdutos] = useState<Record<string, Produto>>({});
  const [estoque, setEstoque] = useState<Record<string, number>>({});
  const [itens, setItens] = useState<ItemRow[]>([]);
  const [ajustes, setAjustes] = useState<Record<string, number>>({});

  const carregar = async () => {
    setCarregando(true);
    const inicio = new Date(`${data}T00:00:00`).toISOString();
    const fim = new Date(`${data}T23:59:59.999`).toISOString();

    const [{ data: reqs }, { data: pfs }, { data: prods }, { data: est }] = await Promise.all([
      supabase
        .from("requisicoes")
        .select("id, perfil_id, usuario_id, created_at, status")
        .gte("created_at", inicio)
        .lte("created_at", fim)
        .in("status", ["pendente", "comprada"]),
      supabase.from("perfis").select("id, nome").order("nome"),
      supabase.from("produtos").select("id, nome, unidade, grupo, perfil_id"),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);

    const reqIds = (reqs ?? []).map((r) => r.id);
    let itensData: ItemRow[] = [];
    if (reqIds.length > 0) {
      const { data: its, error } = await supabase
        .from("requisicao_itens")
        .select("id, produto_id, quantidade, comprado, requisicao_id, requisicoes!inner(perfil_id, usuario_id)")
        .in("requisicao_id", reqIds);
      if (error) toast.error("Erro ao carregar itens", { description: error.message });
      itensData = (its ?? []) as unknown as ItemRow[];
    }

    setPerfis((pfs ?? []) as Perfil[]);
    const prodMap: Record<string, Produto> = {};
    (prods ?? []).forEach((p) => {
      prodMap[p.id] = p as Produto;
    });
    setProdutos(prodMap);
    const estMap: Record<string, number> = {};
    (est ?? []).forEach((r: { produto_id: string; quantidade: number }) => {
      estMap[r.produto_id] = Number(r.quantidade);
    });
    setEstoque(estMap);
    setItens(itensData);
    setAjustes({});
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const linhas: LinhaConsolidada[] = useMemo(() => {
    const map = new Map<string, LinhaConsolidada>();
    const q = busca.trim().toLowerCase();
    itens.forEach((it) => {
      if (perfilFiltro && it.requisicoes?.perfil_id !== perfilFiltro) return;
      const prod = produtos[it.produto_id];
      if (!prod) return;
      if (q && !prod.nome.toLowerCase().includes(q)) return;
      let linha = map.get(it.produto_id);
      if (!linha) {
        const est = estoque[it.produto_id] ?? 0;
        linha = {
          produto: prod,
          pedido: 0,
          estoque: est,
          aComprar: 0,
          itemIds: [],
          todosComprados: true,
          setores: new Set(),
        };
        map.set(it.produto_id, linha);
      }
      linha.pedido += Number(it.quantidade);
      linha.itemIds.push(it.id);
      if (!it.comprado) linha.todosComprados = false;
      if (it.requisicoes?.perfil_id) linha.setores.add(it.requisicoes.perfil_id);
    });
    map.forEach((l) => {
      const sugestao = Math.max(0, l.pedido - l.estoque);
      l.aComprar = ajustes[l.produto.id] ?? sugestao;
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.produto.grupo ?? "zz").localeCompare(b.produto.grupo ?? "zz") ||
      a.produto.nome.localeCompare(b.produto.nome)
    );
  }, [itens, produtos, estoque, ajustes, perfilFiltro, busca]);

  const porGrupo = useMemo(() => {
    const m = new Map<string, LinhaConsolidada[]>();
    linhas.forEach((l) => {
      const g = l.produto.grupo ?? "Outros";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(l);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [linhas]);

  const setAjuste = (id: string, v: number) =>
    setAjustes((a) => ({ ...a, [id]: Math.max(0, v) }));

  const marcarComprado = async (linha: LinhaConsolidada, comprado: boolean) => {
    const { error } = await supabase
      .from("requisicao_itens")
      .update({ comprado, comprado_em: comprado ? new Date().toISOString() : null })
      .in("id", linha.itemIds);
    if (error) {
      toast.error("Erro ao atualizar", { description: error.message });
      return;
    }
    setItens((prev) =>
      prev.map((it) =>
        linha.itemIds.includes(it.id) ? { ...it, comprado } : it
      )
    );
  };

  const fecharDia = async () => {
    const reqIds = Array.from(new Set(itens.map((i) => i.requisicao_id)));
    if (reqIds.length === 0) return;
    const ok = window.confirm(
      `Marcar todos os ${linhas.length} itens como comprados e fechar ${reqIds.length} requisição(ões) do dia?`
    );
    if (!ok) return;
    const todosIds = itens.map((i) => i.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase
        .from("requisicao_itens")
        .update({ comprado: true, comprado_em: new Date().toISOString() })
        .in("id", todosIds),
      supabase.from("requisicoes").update({ status: "comprada" }).in("id", reqIds),
    ]);
    if (e1 || e2) {
      toast.error("Erro ao fechar dia", { description: (e1 ?? e2)?.message });
      return;
    }
    toast.success("Lista fechada");
    carregar();
  };

  const gerarTextoWhats = () => {
    const dataFmt = new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const linhasParaComprar = linhas.filter((l) => l.aComprar > 0 && !l.todosComprados);
    if (linhasParaComprar.length === 0) {
      toast.info("Nada a comprar nesta lista");
      return;
    }
    let txt = `🛒 *Lista de compras — ${dataFmt}*\n`;
    const grupos = new Map<string, LinhaConsolidada[]>();
    linhasParaComprar.forEach((l) => {
      const g = (l.produto.grupo ?? "Outros").toUpperCase();
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g)!.push(l);
    });
    Array.from(grupos.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([g, items]) => {
        txt += `\n*${g}*\n`;
        items.forEach((l) => {
          txt += `• ${l.produto.nome} — ${l.aComprar} ${l.produto.unidade}\n`;
        });
      });
    navigator.clipboard
      .writeText(txt.trim())
      .then(() => toast.success("Lista copiada para a área de transferência"))
      .catch(() => toast.error("Não foi possível copiar"));
  };

  const totalAComprar = linhas.reduce((s, l) => s + (l.todosComprados ? 0 : l.aComprar), 0);
  const totalItens = linhas.length;
  const totalComprados = linhas.filter((l) => l.todosComprados).length;

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Lista de compras</h1>
          </div>
          <button
            onClick={carregar}
            className="rounded-md border border-border bg-card p-2 text-muted-foreground transition hover:border-primary hover:text-foreground"
            aria-label="Recarregar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-4">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Itens</p>
            <p className="text-xl font-black tabular-nums text-foreground">{totalItens}</p>
          </div>
          <div className="rounded-xl border border-primary/60 bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">A comprar</p>
            <p className="text-xl font-black tabular-nums text-primary">{totalAComprar}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comprados</p>
            <p className="text-xl font-black tabular-nums text-foreground">{totalComprados}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendentes</p>
            <p className="text-xl font-black tabular-nums text-foreground">{totalItens - totalComprados}</p>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Setor
            </label>
            <select
              value={perfilFiltro}
              onChange={(e) => setPerfilFiltro(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Todos</option>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Buscar
            </label>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do produto"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum pedido em {new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR")}.
          </p>
        ) : (
          <div className="space-y-6">
            {porGrupo.map(([grupo, items]) => (
              <section key={grupo}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
                  {grupo}
                </h2>
                <ul className="space-y-2">
                  {items.map((l) => {
                    const sugestao = Math.max(0, l.pedido - l.estoque);
                    return (
                      <li
                        key={l.produto.id}
                        className={`rounded-xl border bg-card px-4 py-3 transition ${
                          l.todosComprados ? "border-border opacity-60" : "border-border"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold text-foreground ${
                                l.todosComprados ? "line-through" : ""
                              }`}
                            >
                              {l.produto.nome}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {l.setores.size} setor(es) · unid.: {l.produto.unidade}
                            </p>
                          </div>
                          <button
                            onClick={() => marcarComprado(l, !l.todosComprados)}
                            className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold uppercase tracking-wider transition ${
                              l.todosComprados
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground hover:border-primary"
                            }`}
                          >
                            <Check size={14} />
                            {l.todosComprados ? "Comprado" : "Marcar"}
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-md border border-border bg-background py-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Pedido
                            </p>
                            <p className="text-sm font-bold tabular-nums text-foreground">
                              {l.pedido}
                            </p>
                          </div>
                          <div className="rounded-md border border-border bg-background py-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Estoque
                            </p>
                            <p
                              className={`text-sm font-bold tabular-nums ${
                                l.estoque <= 0 ? "text-destructive" : "text-foreground"
                              }`}
                            >
                              {l.estoque}
                            </p>
                          </div>
                          <div className="rounded-md border border-primary/60 bg-background py-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              A comprar
                            </p>
                            <input
                              type="number"
                              min={0}
                              value={l.aComprar}
                              onChange={(e) => setAjuste(l.produto.id, Number(e.target.value) || 0)}
                              className="w-full bg-transparent text-center text-sm font-bold tabular-nums text-primary outline-none"
                            />
                            {sugestao !== l.aComprar && (
                              <button
                                onClick={() => setAjuste(l.produto.id, sugestao)}
                                className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-primary"
                              >
                                sugestão: {sugestao}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {linhas.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2">
            <button
              onClick={fecharDia}
              className="rounded-md border border-border bg-card px-4 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition hover:border-primary"
            >
              Fechar dia
            </button>
            <button
              onClick={gerarTextoWhats}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-95"
            >
              <Copy size={14} />
              Copiar para WhatsApp
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

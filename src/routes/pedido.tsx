import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Check, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SkeletonStack } from "@/components/skeleton";
import { FiltroPill } from "@/components/filtro-pill";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { easeOutExpo, listItem, staggerList, tap } from "@/lib/motion";

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
  local: string | null;
  funcoes: string[];
  funcaoIds: string[];
};
type Perfil = { id: string; nome: string };

function PedidoPage() {
  const navigate = useNavigate();
  const { voltar, avancar } = useVoltarAvancar("/");
  const { user, usuario, isAdmin, loading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [estoque, setEstoque] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [quantidades, setQuantidades, limparQuantidades] = usePersistedState<Record<string, number>>(
    "pedido_quantidades",
    {},
  );
  const [unidadesOverride, setUnidadesOverride, limparUnidades] = usePersistedState<Record<string, string>>(
    "pedido_unidades_override",
    {},
  );
  const [observacao, setObservacao, limparObservacao] = usePersistedState("pedido_observacao", "");
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState<string>("");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("");
  const [setorFiltro, setSetorFiltro] = useState<string>("");
  const [localFiltro, setLocalFiltro] = useState<string>("");

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
          .select("id, nome, unidade, perfil_id, grupo, subgrupo, local, produto_funcoes(funcoes(id, nome))")
          .eq("ativo", true)
          .order("nome"),
        supabase.from("estoque_atual").select("produto_id, quantidade"),
        supabase.from("perfis").select("id, nome").order("nome"),
      ]);
      if (e1) toast.error("Erro ao carregar produtos", { description: e1.message });
      setProdutos(
        ((prods ?? []) as any[]).map((p) => ({
          ...p,
          funcoes: (p.produto_funcoes ?? []).map((v: any) => v.funcoes?.nome).filter(Boolean),
          funcaoIds: (p.produto_funcoes ?? []).map((v: any) => v.funcoes?.id).filter(Boolean),
        })),
      );
      setPerfis((pfs ?? []) as Perfil[]);
      // Soma por produto (um produto pode ter estoque em vários locais).
      const map: Record<string, number> = {};
      (est ?? []).forEach((r: { produto_id: string; quantidade: number }) => {
        map[r.produto_id] = (map[r.produto_id] ?? 0) + Number(r.quantidade);
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
      .eq("usuario_id", user.id)
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

  // Restrição por função: admin, "vê todos os setores" e usuários sem
  // função atribuída ainda continuam vendo tudo. Só quem tem função E
  // não tem o escape hatch marcado fica restrito aos produtos dela.
  const restritoPorFuncao =
    !isAdmin && !!usuario?.funcao_id && !usuario?.ve_todos_setores;

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (restritoPorFuncao && !p.funcaoIds.includes(usuario!.funcao_id!)) return false;
      if (perfilFiltro && p.perfil_id !== perfilFiltro) return false;
      if (grupoFiltro && (p.grupo ?? "Outros") !== grupoFiltro) return false;
      if (setorFiltro && !p.funcoes.includes(setorFiltro)) return false;
      if (localFiltro && p.local !== localFiltro) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [produtos, busca, perfilFiltro, grupoFiltro, setorFiltro, localFiltro, restritoPorFuncao, usuario]);

  const gruposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (restritoPorFuncao && !p.funcaoIds.includes(usuario!.funcao_id!)) return;
      if (perfilFiltro && p.perfil_id !== perfilFiltro) return;
      set.add(p.grupo ?? "Outros");
    });
    return Array.from(set).sort();
  }, [produtos, perfilFiltro, restritoPorFuncao, usuario]);

  const setoresDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (restritoPorFuncao && !p.funcaoIds.includes(usuario!.funcao_id!)) return;
      p.funcoes.forEach((f) => set.add(f));
    });
    return Array.from(set).sort();
  }, [produtos, restritoPorFuncao, usuario]);

  const locaisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (restritoPorFuncao && !p.funcaoIds.includes(usuario!.funcao_id!)) return;
      if (p.local) set.add(p.local);
    });
    return Array.from(set).sort();
  }, [produtos, restritoPorFuncao, usuario]);

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
      unidade: unidadesOverride[produto_id] || null,
    }));

    const { error: e2 } = await supabase.from("requisicao_itens").insert(itens);
    setSalvando(false);
    if (e2) {
      toast.error("Erro ao salvar itens", { description: e2.message });
      return;
    }
    toast.success("Pedido enviado", { description: `${itens.length} itens registrados.` });
    limparQuantidades();
    limparUnidades();
    limparObservacao();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="mx-auto min-h-screen max-w-md space-y-3 bg-background px-6 pt-8 md:max-w-3xl">
        <SkeletonStack rows={6} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md md:max-w-3xl items-center gap-3">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={voltar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={tap}
            onClick={avancar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Avançar"
          >
            <ArrowRight size={18} />
          </motion.button>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOutExpo }}
            className="flex-1"
          >
            <p className="text-xs uppercase tracking-widest text-primary">Nova requisição</p>
            <h1 className="text-lg font-bold text-foreground">Fazer pedido</h1>
          </motion.div>
          <motion.button
            whileHover={{ y: -1, borderColor: "hsl(var(--primary))" }}
            whileTap={tap}
            onClick={repetirUltimo}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
          >
            <RotateCcw size={14} />
            Repetir
          </motion.button>
        </div>
      </header>


      <div className="mx-auto max-w-md md:max-w-3xl px-6 pt-4">
        {isAdmin && (
          <div className="mb-3">
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Setor / Perfil (master)
            </label>
            <select
              value={perfilFiltro}
              onChange={(e) => setPerfilFiltro(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
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
          className="mb-3 w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
        />

        {setoresDisponiveis.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <FiltroPill label="Todos os setores" ativo={setorFiltro === ""} onClick={() => setSetorFiltro("")} />
            {setoresDisponiveis.map((s) => (
              <FiltroPill key={s} label={s} ativo={setorFiltro === s} onClick={() => setSetorFiltro(s)} />
            ))}
          </div>
        )}
        {locaisDisponiveis.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <FiltroPill label="Todos os locais" ativo={localFiltro === ""} onClick={() => setLocalFiltro("")} />
            {locaisDisponiveis.map((l) => (
              <FiltroPill key={l} label={l} ativo={localFiltro === l} onClick={() => setLocalFiltro(l)} />
            ))}
          </div>
        )}

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

        <AnimatePresence mode="wait" initial={false}>
        {carregando ? (
          <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <SkeletonStack rows={6} />
          </motion.div>
        ) : produtos.length === 0 ? (
          <motion.p key="empty1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-sm text-muted-foreground">
            Nenhum produto disponível para o seu perfil.
          </motion.p>
        ) : produtosFiltrados.length === 0 ? (
          <motion.p key="empty2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-sm text-muted-foreground">Nada encontrado.</motion.p>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
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
                          const unidadeAtual = (unidadesOverride[p.id] || p.unidade).toUpperCase();
                          const unidadeOriginal = p.unidade.toUpperCase();
                          const alterada = unidadeAtual !== unidadeOriginal;
                          const fracionavel = ["KG", "LT"].includes(unidadeAtual);
                          const step = fracionavel ? 0.1 : 1;
                          const arred = (v: number) =>
                            fracionavel ? Math.round(v * 1000) / 1000 : Math.round(v);
                          return (
                            <motion.li
                              key={p.id}
                              layout
                              animate={{
                                borderColor: ativo ? "rgba(232,101,10,0.6)" : "hsl(var(--border))",
                                boxShadow: ativo
                                  ? "0 4px 16px -6px rgba(232,101,10,0.35)"
                                  : "0 0 0 0 rgba(0,0,0,0)",
                              }}
                              transition={{ duration: 0.25, ease: easeOutExpo }}
                              className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
                            >
                              <div className="min-w-0 flex-1 pr-3">
                                <p className="break-words text-sm font-semibold text-foreground">
                                  {p.nome}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <span>Unid.:</span>
                                  <select
                                    value={unidadeAtual}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setUnidadesOverride((u) => {
                                        const novo = { ...u };
                                        if (v.toUpperCase() === unidadeOriginal) delete novo[p.id];
                                        else novo[p.id] = v;
                                        return novo;
                                      });
                                    }}
                                    className={`rounded border bg-background px-1.5 py-0.5 text-[11px] font-semibold uppercase outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                                      alterada ? "border-primary text-primary" : "border-border text-foreground"
                                    }`}
                                  >
                                    {["UND", "KG", "CX", "PC", "PCT", "LT"].map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                        {u === unidadeOriginal ? " (padrão)" : ""}
                                      </option>
                                    ))}
                                  </select>
                                  {fracionavel && <span>(aceita decimal)</span>}
                                  {est !== undefined && (
                                    <span
                                      className={est <= 0 ? "text-destructive" : "text-foreground/70"}
                                    >
                                      · Estoque: {est}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <motion.button
                                  whileTap={{ scale: 0.88 }}
                                  whileHover={qtd === 0 ? undefined : { scale: 1.05 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                  onClick={() => setQtd(p.id, Math.max(0, arred(qtd - step)))}
                                  disabled={qtd === 0}
                                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:border-primary disabled:opacity-40"
                                  aria-label="Diminuir"
                                >
                                  <Minus size={14} />
                                </motion.button>
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
                                  className="h-9 w-16 rounded-md border border-border bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                />
                                <motion.button
                                  whileTap={{ scale: 0.88 }}
                                  whileHover={{ scale: 1.08, boxShadow: "0 0 0 4px rgba(232,101,10,0.18)" }}
                                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                  onClick={() => setQtd(p.id, arred(qtd + step))}
                                  className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"
                                  aria-label="Aumentar"
                                >
                                  <Plus size={14} />
                                </motion.button>
                              </div>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </motion.div>
        )}
        </AnimatePresence>

        {itensSelecionados.length > 0 && (
          <div className="mt-6">
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
              Observação (opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
              placeholder="Marca preferida, urgência, etc."
            />
          </div>
        )}
      </div>

      {/* Barra fixa de envio */}
      <AnimatePresence>
        {itensSelecionados.length > 0 && (
          <motion.div
            key="submit-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 py-4 backdrop-blur"
          >
            <div className="mx-auto flex max-w-md md:max-w-3xl items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Itens selecionados
                </p>
                <motion.p
                  key={itensSelecionados.length}
                  initial={{ scale: 0.6, opacity: 0, y: -4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="text-lg font-bold text-foreground"
                >
                  {itensSelecionados.length}
                </motion.p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 12px 30px -8px rgba(232,101,10,0.55)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                onClick={handleSalvar}
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
              >
                <motion.span
                  animate={salvando ? { rotate: 360 } : { rotate: 0 }}
                  transition={salvando ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
                >
                  <Check size={18} />
                </motion.span>
                {salvando ? "Enviando..." : "Enviar pedido"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

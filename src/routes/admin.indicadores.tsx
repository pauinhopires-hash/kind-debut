import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonStack } from "@/components/skeleton";
import { listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/indicadores")({
  component: AdminIndicadores,
});

type Periodo = 7 | 30 | 90 | 0; // 0 = tudo

type ItemCompra = {
  quantidade: number;
  produtos: { nome: string; valor_unitario: number | null } | null;
  requisicoes: { status: string; created_at: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "#f59e0b",
  aprovada: "#3b82f6",
  cancelada: "#ef4444",
  rejeitada: "#ef4444",
  entregue: "#22c55e",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminIndicadores() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [carregando, setCarregando] = useState(true);
  const [itensCompra, setItensCompra] = useState<ItemCompra[]>([]);
  const [statusInternas, setStatusInternas] = useState<string[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<{ nome: string; atual: number; minimo: number }[]>([]);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try {
        const cutoffIso =
          periodo === 0
            ? "1970-01-01T00:00:00Z"
            : new Date(Date.now() - periodo * 24 * 60 * 60 * 1000).toISOString();

        const [{ data: itens, error: e1 }, { data: reqInternas, error: e2 }, { data: produtosRes, error: e3 }, { data: estoqueRes, error: e4 }] =
          await Promise.all([
            supabase
              .from("requisicao_itens")
              .select("quantidade, produtos(nome, valor_unitario), requisicoes!inner(status, created_at)")
              .gte("requisicoes.created_at", cutoffIso),
            supabase
              .from("requisicoes_internas")
              .select("status")
              .gte("created_at", cutoffIso),
            supabase.from("produtos").select("id, nome, estoque_minimo").eq("ativo", true).gt("estoque_minimo", 0),
            supabase.from("estoque_atual").select("produto_id, quantidade"),
          ]);

        if (e1 || e2 || e3 || e4) {
          toast.error("Erro ao carregar indicadores", { description: (e1 ?? e2 ?? e3 ?? e4)?.message });
          setCarregando(false);
          return;
        }

        setItensCompra((itens ?? []) as unknown as ItemCompra[]);
        setStatusInternas((reqInternas ?? []).map((r) => r.status));

        // Soma por produto (um produto pode ter estoque em vários locais).
        const mapEstoque: Record<string, number> = {};
        (estoqueRes ?? []).forEach((r) => {
          mapEstoque[r.produto_id] = (mapEstoque[r.produto_id] ?? 0) + Number(r.quantidade);
        });
        const baixos = (produtosRes ?? [])
          .map((p) => ({ nome: p.nome, atual: mapEstoque[p.id] ?? 0, minimo: Number(p.estoque_minimo) }))
          .filter((p) => p.atual < p.minimo)
          .sort((a, b) => a.atual - b.atual);
        setEstoqueBaixo(baixos);
      } finally {
        setCarregando(false);
      }
    })();
  }, [periodo]);

  const gastoTotal = useMemo(
    () =>
      itensCompra
        .filter((it) => it.requisicoes?.status === "aprovada" || it.requisicoes?.status === "recebida")
        .reduce((acc, it) => acc + it.quantidade * (it.produtos?.valor_unitario ?? 0), 0),
    [itensCompra],
  );

  const topProdutos = useMemo(() => {
    const totals = new Map<string, number>();
    itensCompra.forEach((it) => {
      const nome = it.produtos?.nome ?? "—";
      totals.set(nome, (totals.get(nome) ?? 0) + Number(it.quantidade));
    });
    return Array.from(totals.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [itensCompra]);

  const funilInternas = useMemo(() => {
    const counts: Record<string, number> = {};
    statusInternas.forEach((s) => {
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, valor]) => ({ status, valor }));
  }, [statusInternas]);

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md md:max-w-3xl items-center gap-3">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={() => navigate({ to: "/admin" })}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Indicadores</h1>
          </div>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value) as Periodo)}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={0}>Tudo</option>
          </select>
        </div>
      </header>

      <div className="mx-auto max-w-md md:max-w-3xl space-y-6 px-6 pt-4">
        {carregando ? (
          <SkeletonStack rows={6} />
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="space-y-6">
            <motion.div variants={listItem} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Gasto aprovado no período
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">{formatBRL(gastoTotal)}</p>
            </motion.div>

            <motion.div variants={listItem} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Produtos mais requisitados
              </p>
              {topProdutos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={topProdutos} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="nome"
                        width={110}
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 16) + "…" : v)}
                      />
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
                      />
                      <Bar dataKey="quantidade" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>

            <motion.div variants={listItem} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Requisições internas por status
              </p>
              {funilInternas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div style={{ width: 140, height: 140 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={funilInternas} dataKey="valor" nameKey="status" innerRadius={35} outerRadius={60}>
                          {funilInternas.map((entry) => (
                            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#71717a"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {funilInternas.map((f) => (
                      <li key={f.status} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: STATUS_COLORS[f.status] ?? "#71717a" }}
                        />
                        <span className="capitalize text-foreground">{f.status}</span>
                        <span className="text-muted-foreground">— {f.valor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            <motion.div variants={listItem} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <AlertTriangle size={13} className="text-destructive" /> Estoque baixo
              </p>
              {estoqueBaixo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum produto abaixo do mínimo.</p>
              ) : (
                <ul className="space-y-1.5">
                  {estoqueBaixo.map((p) => (
                    <li key={p.nome} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{p.nome}</span>
                      <span className="text-destructive">
                        {p.atual} / mín. {p.minimo}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

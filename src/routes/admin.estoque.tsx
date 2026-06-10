import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/estoque")({
  component: AdminEstoque,
});

type ProdutoEstoque = {
  id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  novaQuantidade: string;
};

function AdminEstoque() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      fetchEstoque();
    };
    init();
  }, []);

  const fetchEstoque = async () => {
    setLoading(true);
    const [{ data: prods, error: errP }, { data: estoques }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);
    if (errP) { toast.error("Erro ao carregar produtos"); setLoading(false); return; }
    const estoqueMap: Record<string, number> = {};
    (estoques || []).forEach((e: any) => { estoqueMap[e.produto_id] = e.quantidade; });
    setProdutos((prods || []).map((p: any) => ({
      id: p.id, nome: p.nome, unidade: p.unidade,
      quantidade: estoqueMap[p.id] ?? 0, novaQuantidade: "",
    })));
    setLoading(false);
  };

  const handleNovaQuantidade = (id: string, value: string) => {
    setProdutos(prods => prods.map(p => p.id === id ? { ...p, novaQuantidade: value } : p));
  };

  const salvarEstoque = async (produto: ProdutoEstoque) => {
    if (!produto.novaQuantidade) return;
    const nova = parseFloat(produto.novaQuantidade);
    if (isNaN(nova) || nova < 0) { toast.error("Quantidade inválida"); return; }
    if (!userId) { toast.error("Sessão expirada"); return; }
    setSaving(produto.id);
    try {
      const qtdMov = Math.abs(nova - produto.quantidade);
      if (qtdMov > 0) {
        const { error: errMov } = await supabase.from("movimentacoes_estoque").insert({
          usuario_id: userId,
          produto_id: produto.id,
          tipo: "ajuste",
          quantidade: qtdMov,
          estoque_antes: produto.quantidade,
          estoque_depois: nova,
          observacao: `Ajuste manual: ${produto.quantidade} → ${nova}`,
        });
        if (errMov) throw errMov;
      }
      const { error: errEst } = await supabase.from("estoque_atual").upsert(
        { produto_id: produto.id, quantidade: nova },
        { onConflict: "produto_id" }
      );
      if (errEst) throw errEst;
      toast.success(`Estoque de ${produto.nome} atualizado`);
      handleNovaQuantidade(produto.id, "");
      fetchEstoque();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ to: "/admin" })} className="text-gray-400 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-orange-500">Gestão de Estoque</h1>
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-12">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum produto cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {produtos.map(p => (
              <div key={p.id} className="bg-zinc-900 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {p.quantidade <= 0 && <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />}
                    <p className="text-white font-medium truncate">{p.nome}</p>
                  </div>
                  <p className={`text-sm mt-0.5 ${p.quantidade <= 0 ? "text-orange-400" : "text-gray-400"}`}>
                    Atual: {p.quantidade} {p.unidade}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={String(p.quantidade)}
                    value={p.novaQuantidade}
                    onChange={e => handleNovaQuantidade(p.id, e.target.value)}
                    className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => salvarEstoque(p)}
                    disabled={!p.novaQuantidade || saving === p.id}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white rounded-lg p-2"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
        }import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/estoque")({
  component: AdminEstoque,
});

type Linha = {
  produto_id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  estoque_minimo: number;
};

function AdminEstoque() {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setCarregando(true);
    const [{ data: prods }, { data: est }] = await Promise.all([
      supabase.from("produtos").select("id, nome, unidade, estoque_minimo").eq("ativo", true).order("nome"),
      supabase.from("estoque_atual").select("produto_id, quantidade"),
    ]);

    const mapEst: Record<string, number> = {};
    (est ?? []).forEach((r: { produto_id: string; quantidade: number }) => {
      mapEst[r.produto_id] = Number(r.quantidade);
    });

    setLinhas(
      (
        (prods ?? []) as Array<{
          id: string;
          nome: string;
          unidade: string;
          estoque_minimo: number;
        }>
      ).map((p) => ({
        produto_id: p.id,
        nome: p.nome,
        unidade: p.unidade,
        quantidade: mapEst[p.id] ?? 0,
        estoque_minimo: p.estoque_minimo ?? 0,
      })),
    );
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const setQtd = (id: string, v: number) =>
    setLinhas((ls) => ls.map((l) => (l.produto_id === id ? { ...l, quantidade: v } : l)));

  const setMin = (id: string, v: number) =>
    setLinhas((ls) => ls.map((l) => (l.produto_id === id ? { ...l, estoque_minimo: v } : l)));

  const salvar = async (l: Linha) => {
    setSalvando(l.produto_id);
    try {
      // Lê estoque atual para registrar a movimentação de ajuste
      const { data: estRow } = await supabase
        .from("estoque_atual")
        .select("quantidade")
        .eq("produto_id", l.produto_id)
        .maybeSingle();
      const estoqueAntes = estRow ? Number(estRow.quantidade) : 0;
      const estoqueDepois = l.quantidade;
      const delta = estoqueDepois - estoqueAntes;

      const { error: e1 } = await supabase
        .from("estoque_atual")
        .upsert({ produto_id: l.produto_id, quantidade: estoqueDepois });
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("produtos")
        .update({ estoque_minimo: l.estoque_minimo })
        .eq("id", l.produto_id);
      if (e2) throw e2;

      if (delta !== 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const { error: eMov } = await supabase.from("movimentacoes_estoque").insert({
          tipo: "ajuste",
          produto_id: l.produto_id,
          quantidade: Math.abs(delta),
          estoque_antes: estoqueAntes,
          estoque_depois: estoqueDepois,
          usuario_id: session?.user.id ?? null,
          observacao: `Ajuste manual de estoque (${delta > 0 ? "+" : ""}${delta})`,
        });
        if (eMov) throw eMov;
      }

      toast.success(`${l.nome} salvo`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", { description: msg });
    } finally {
      setSalvando(null);
    }
  };

  const filtradas = linhas.filter((l) => l.nome.toLowerCase().includes(busca.toLowerCase()));

  const emAlerta = linhas.filter((l) => l.quantidade < l.estoque_minimo).length;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ to: "/admin" })}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl font-bold">Estoque atual</h1>
          {emAlerta > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-900/60 text-red-300 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {emAlerta} abaixo do mínimo
            </span>
          )}
        </div>

        {/* Busca */}
        <input
          className="w-full mb-4 px-3 py-2 rounded bg-zinc-800 text-sm placeholder-gray-500 border border-zinc-700 focus:outline-none focus:border-orange-500"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-zinc-700">
                  <th className="text-left py-2 pr-3">Produto</th>
                  <th className="text-center py-2 px-2 w-28">Quantidade</th>
                  <th className="text-center py-2 px-2 w-24">Mínimo</th>
                  <th className="text-center py-2 w-12">Un</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((l) => {
                  const abaixoMinimo = l.estoque_minimo > 0 && l.quantidade < l.estoque_minimo;
                  return (
                    <tr
                      key={l.produto_id}
                      className={`border-b border-zinc-800 ${abaixoMinimo ? "bg-red-950/30" : ""}`}
                    >
                      <td className="py-2 pr-3 flex items-center gap-2">
                        {abaixoMinimo && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                        <span className={abaixoMinimo ? "text-red-300" : ""}>{l.nome}</span>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          value={l.quantidade}
                          onChange={(e) => setQtd(l.produto_id, Number(e.target.value))}
                          className={`w-full text-center rounded px-2 py-1 bg-zinc-800 border focus:outline-none focus:border-orange-500 ${
                            abaixoMinimo ? "border-red-700 text-red-300" : "border-zinc-700"
                          }`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          value={l.estoque_minimo}
                          onChange={(e) => setMin(l.produto_id, Number(e.target.value))}
                          className="w-full text-center rounded px-2 py-1 bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-orange-500 text-gray-400"
                        />
                      </td>
                      <td className="py-2 text-center text-gray-500">{l.unidade}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => salvar(l)}
                          disabled={salvando === l.produto_id}
                          className="p-1 text-orange-400 hover:text-orange-300 disabled:opacity-40"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtradas.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum produto encontrado.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

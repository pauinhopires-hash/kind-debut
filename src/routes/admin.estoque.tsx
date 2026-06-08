import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("estoque_atual").upsert({ produto_id: l.produto_id, quantidade: l.quantidade }),
      supabase.from("produtos").update({ estoque_minimo: l.estoque_minimo }).eq("id", l.produto_id),
    ]);
    setSalvando(null);
    if (e1 || e2)
      toast.error("Erro ao salvar", {
        description: (e1 ?? e2)?.message,
      });
    else toast.success(`${l.nome} salvo`);
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

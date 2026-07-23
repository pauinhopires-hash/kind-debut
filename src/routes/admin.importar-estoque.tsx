import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Upload, Download, Loader2, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/importar-estoque")({
  component: AdminImportarEstoque,
});

const LOCAIS = ["CONGELADOR", "GELADEIRA", "PRATELEIRA", "ESTOQUE CENTRAL"];
const COLUNAS_MODELO = [
  "nome",
  "unidade",
  "setor",
  "local",
  "grupo",
  "subgrupo",
  "valor_unitario",
  "estoque_minimo",
  "quantidade",
];

type ProdutoExistente = {
  id: string;
  nome: string;
  chave: string;
};

type LinhaPreview = {
  incluir: boolean;
  nome: string;
  unidade: string;
  setor: string;
  local: string;
  grupo: string;
  subgrupo: string;
  valor_unitario: string;
  estoque_minimo: string;
  quantidade: number;
  produtoId: string | null;
  quantidadeAtualNoLocal: number | null;
  duplicataAviso: string | null;
  erro: string | null;
};

type Ausente = { produto_id: string; nome: string; quantidade: number; incluir: boolean };

function normalizar(nome: string) {
  return nome.trim().toLowerCase();
}

function distanciaLevenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
    }
  }
  return d[m][n];
}

function AdminImportarEstoque() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const [modo, setModo] = usePersistedState<"parcial" | "completa">("importar_estoque_modo", "parcial");
  const [localReconciliacao, setLocalReconciliacao] = usePersistedState(
    "importar_estoque_local",
    "ESTOQUE CENTRAL",
  );
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);
  const [nomeArquivo, setNomeArquivo, limparNomeArquivo] = usePersistedState<string | null>(
    "importar_estoque_nome_arquivo",
    null,
  );
  const [linhas, setLinhas, limparLinhas] = usePersistedState<LinhaPreview[]>("importar_estoque_linhas", []);
  const [ausentes, setAusentes, limparAusentes] = usePersistedState<Ausente[]>("importar_estoque_ausentes", []);
  const [aplicando, setAplicando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [resultado, setResultado] = useState<{ criados: number; atualizados: number; zerados: number } | null>(null);

  const processarArquivo = async (file: File) => {
    setCarregandoArquivo(true);
    setResultado(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length === 0) {
        toast.error("Planilha vazia ou sem cabeçalho reconhecido");
        setCarregandoArquivo(false);
        return;
      }

      const { data: produtosRes, error: errProd } = await supabase
        .from("produtos")
        .select("id, nome")
        .eq("ativo", true);
      if (errProd) throw errProd;
      const produtos: ProdutoExistente[] = (produtosRes ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        chave: normalizar(p.nome),
      }));
      const porChave = new Map(produtos.map((p) => [p.chave, p]));

      const linhaLocalPadrao = modo === "completa" ? localReconciliacao : "";

      const idsUsados = new Set<string>();
      const estoquePorProdutoLocal = new Map<string, number>();
      if (modo === "completa") {
        const idsAtivos = produtos.map((p) => p.id);
        if (idsAtivos.length > 0) {
          const { data: estRows, error: errEst } = await supabase
            .from("estoque_atual")
            .select("produto_id, quantidade")
            .eq("local", localReconciliacao)
            .in("produto_id", idsAtivos);
          if (errEst) throw errEst;
          (estRows ?? []).forEach((r) => estoquePorProdutoLocal.set(r.produto_id, Number(r.quantidade)));
        }
      }

      const processadas: LinhaPreview[] = rows.map((raw) => {
        const nome = String(raw.nome ?? "").trim();
        const local = String(raw.local ?? linhaLocalPadrao ?? "").trim().toUpperCase() || linhaLocalPadrao;
        const quantidade = Number(raw.quantidade);
        let erro: string | null = null;
        if (!nome) erro = "Nome vazio";
        else if (!LOCAIS.includes(local)) erro = `Local inválido: "${local}"`;
        else if (!Number.isFinite(quantidade) || quantidade < 0) erro = "Quantidade inválida";

        const chave = normalizar(nome);
        const existente = porChave.get(chave) ?? null;
        if (existente) idsUsados.add(existente.id);

        let duplicataAviso: string | null = null;
        if (!existente && nome) {
          const proximo = produtos.find(
            (p) => p.chave !== chave && distanciaLevenshtein(chave, p.chave) <= 2 && Math.abs(chave.length - p.chave.length) <= 3,
          );
          if (proximo) duplicataAviso = proximo.nome;
        }

        return {
          incluir: !erro,
          nome,
          unidade: String(raw.unidade ?? "").trim().toUpperCase() || "UND",
          setor: String(raw.setor ?? "").trim().toUpperCase(),
          local,
          grupo: String(raw.grupo ?? "").trim(),
          subgrupo: String(raw.subgrupo ?? "").trim(),
          valor_unitario: String(raw.valor_unitario ?? "").trim(),
          estoque_minimo: String(raw.estoque_minimo ?? "").trim(),
          quantidade,
          produtoId: existente?.id ?? null,
          quantidadeAtualNoLocal: existente ? estoquePorProdutoLocal.get(existente.id) ?? (modo === "completa" ? 0 : null) : null,
          duplicataAviso,
          erro,
        };
      });

      setLinhas(processadas);

      if (modo === "completa") {
        const ausentesCalc: Ausente[] = [];
        estoquePorProdutoLocal.forEach((quantidade, produtoId) => {
          if (!idsUsados.has(produtoId) && quantidade > 0) {
            const p = produtos.find((pp) => pp.id === produtoId);
            ausentesCalc.push({ produto_id: produtoId, nome: p?.nome ?? produtoId, quantidade, incluir: false });
          }
        });
        setAusentes(ausentesCalc.sort((a, b) => a.nome.localeCompare(b.nome)));
      } else {
        setAusentes([]);
      }

      setNomeArquivo(file.name);
      toast.success(`${processadas.length} linha(s) lida(s) — confira a prévia antes de confirmar`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao ler o arquivo", { description: msg });
    } finally {
      setCarregandoArquivo(false);
    }
  };

  const baixarModelo = async () => {
    const XLSX = await import("xlsx");
    const exemplo = [
      {
        nome: "Farinha de Trigo",
        unidade: "KG",
        setor: "COZINHA, FRENTE",
        local: "ESTOQUE CENTRAL",
        grupo: "Secos",
        subgrupo: "Farinhas",
        valor_unitario: "6.5",
        estoque_minimo: "10",
        quantidade: "25",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(exemplo, { header: COLUNAS_MODELO });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    XLSX.writeFile(wb, "modelo-importacao-estoque.xlsx");
  };

  const exportarAtual = async () => {
    setExportando(true);
    try {
      const [{ data: produtos, error: errProd }, { data: estoques, error: errEst }, { data: funcaoRows, error: errFuncoes }] = await Promise.all([
        supabase
          .from("produtos")
          .select("id, nome, unidade, local, grupo, subgrupo, valor_unitario, estoque_minimo")
          .eq("ativo", true)
          .order("nome"),
        supabase.from("estoque_atual").select("produto_id, local, quantidade"),
        supabase.from("produto_funcoes").select("produto_id, funcoes(nome)"),
      ]);
      if (errProd) throw errProd;
      if (errEst) throw errEst;
      if (errFuncoes) throw errFuncoes;

      const estoquesPorProduto = new Map<string, { local: string; quantidade: number }[]>();
      (estoques ?? []).forEach((e) => {
        const lista = estoquesPorProduto.get(e.produto_id) ?? [];
        lista.push({ local: e.local, quantidade: Number(e.quantidade) });
        estoquesPorProduto.set(e.produto_id, lista);
      });

      const funcoesPorProduto = new Map<string, string[]>();
      (funcaoRows ?? []).forEach((r: any) => {
        if (!r.funcoes?.nome) return;
        const lista = funcoesPorProduto.get(r.produto_id) ?? [];
        lista.push(r.funcoes.nome);
        funcoesPorProduto.set(r.produto_id, lista);
      });

      const linhasExport: Record<string, string | number>[] = [];
      (produtos ?? []).forEach((p) => {
        const locais = estoquesPorProduto.get(p.id);
        const base = {
          nome: p.nome,
          unidade: p.unidade,
          setor: (funcoesPorProduto.get(p.id) ?? []).join(", "),
          grupo: p.grupo ?? "",
          subgrupo: p.subgrupo ?? "",
          valor_unitario: p.valor_unitario ?? "",
          estoque_minimo: p.estoque_minimo ?? "",
        };
        if (!locais || locais.length === 0) {
          linhasExport.push({ ...base, local: p.local ?? "ESTOQUE CENTRAL", quantidade: 0 });
        } else {
          locais
            .sort((a, b) => a.local.localeCompare(b.local))
            .forEach((l) => linhasExport.push({ ...base, local: l.local, quantidade: l.quantidade }));
        }
      });

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(linhasExport, { header: COLUNAS_MODELO });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estoque");
      const dataFmt = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `estoque-${dataFmt}.xlsx`);
      toast.success(`${linhasExport.length} linha(s) exportada(s)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao exportar", { description: msg });
    } finally {
      setExportando(false);
    }
  };

  const totalIncluidas = useMemo(() => linhas.filter((l) => l.incluir).length, [linhas]);
  const totalAusentesMarcados = useMemo(() => ausentes.filter((a) => a.incluir).length, [ausentes]);

  const alternarLinha = (idx: number) =>
    setLinhas((ls) => ls.map((l, i) => (i === idx ? { ...l, incluir: !l.incluir } : l)));
  const alternarAusente = (idx: number) =>
    setAusentes((as_) => as_.map((a, i) => (i === idx ? { ...a, incluir: !a.incluir } : a)));
  const marcarTodosAusentes = (valor: boolean) =>
    setAusentes((as_) => as_.map((a) => ({ ...a, incluir: valor })));

  const confirmarImportacao = async () => {
    const paraEnviar = linhas.filter((l) => l.incluir && !l.erro);
    if (paraEnviar.length === 0 && totalAusentesMarcados === 0) {
      toast.error("Nada selecionado pra importar");
      return;
    }
    setAplicando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const payload = paraEnviar.map((l) => ({
        nome: l.nome,
        unidade: l.unidade,
        setor: l.setor,
        local: l.local,
        grupo: l.grupo,
        subgrupo: l.subgrupo,
        valor_unitario: l.valor_unitario,
        estoque_minimo: l.estoque_minimo,
        quantidade: l.quantidade,
        observacao: `Importação de planilha (${nomeArquivo ?? "arquivo"}) em ${new Date().toLocaleDateString("pt-BR")}`,
      }));

      const { data, error } = await supabase.rpc("import_estoque_rows", {
        p_rows: payload,
        p_usuario_id: session.user.id,
        p_zerar_produto_ids: modo === "completa" ? ausentes.filter((a) => a.incluir).map((a) => a.produto_id) : [],
        p_zerar_local: modo === "completa" ? localReconciliacao : null,
      });
      if (error) throw error;

      setResultado(data as { criados: number; atualizados: number; zerados: number });
      toast.success("Importação concluída");
      limparLinhas();
      limparAusentes();
      limparNomeArquivo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao importar", { description: msg });
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={voltar}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={tap}
            onClick={avancar}
            className="text-gray-400 hover:text-white rounded-md p-2 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Avançar"
          >
            <ArrowRight size={22} />
          </motion.button>
          <h1 className="text-xl font-bold text-orange-500 flex-1">Estoque em planilha</h1>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={baixarModelo}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <Download size={14} /> Baixar modelo
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={exportarAtual}
            disabled={exportando}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-50"
          >
            {exportando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exportando ? "Exportando..." : "Exportar estoque atual"}
          </motion.button>
        </div>

        {resultado && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 mb-4">
            <p className="text-emerald-400 font-semibold">Importação concluída</p>
            <p className="text-sm text-gray-300 mt-1">
              {resultado.criados} produto(s) criado(s), {resultado.atualizados} linha(s) de estoque atualizada(s)
              {resultado.zerados > 0 ? `, ${resultado.zerados} zerada(s) por reconciliação` : ""}.
            </p>
          </div>
        )}

        <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["parcial", "completa"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                  modo === m
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-700 bg-zinc-900 text-gray-400 hover:border-orange-500/60"
                }`}
              >
                {m === "parcial" ? "Atualização parcial" : "Reconciliação completa"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {modo === "parcial"
              ? "Só mexe no que está na planilha: nome novo cria produto, nome+local novo cria a linha de estoque, nome+local já existentes atualizam a quantidade."
              : "Além do que a atualização parcial faz, mostra os produtos desse local que não apareceram no arquivo — nada é zerado sem você marcar."}
          </p>
          {modo === "completa" && (
            <label className="block text-xs uppercase tracking-wider text-gray-400">
              Este arquivo representa o estoque completo de
              <select
                value={localReconciliacao}
                onChange={(e) => setLocalReconciliacao(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm transition focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                {LOCAIS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 py-8 cursor-pointer hover:border-orange-500/60 transition-colors">
            <Upload size={22} className="text-gray-500" />
            <span className="text-sm text-gray-400">
              {carregandoArquivo ? "Lendo arquivo..." : nomeArquivo ? nomeArquivo : "Clique pra escolher .xlsx ou .csv"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={carregandoArquivo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processarArquivo(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {linhas.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              Prévia — {totalIncluidas} de {linhas.length} selecionada(s)
            </h2>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {linhas.map((l, idx) => {
                const status = l.erro
                  ? "erro"
                  : !l.produtoId
                    ? "novo-produto"
                    : l.quantidadeAtualNoLocal === null
                      ? "novo-local"
                      : "atualiza";
                const statusLabel = {
                  erro: "Erro",
                  "novo-produto": "NOVO PRODUTO",
                  "novo-local": "NOVO LOCAL",
                  atualiza: "Atualiza",
                }[status];
                const statusColor = {
                  erro: "text-red-400 bg-red-400/10",
                  "novo-produto": "text-blue-400 bg-blue-400/10",
                  "novo-local": "text-purple-400 bg-purple-400/10",
                  atualiza: "text-green-400 bg-green-400/10",
                }[status];
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 ${
                      l.erro ? "bg-red-950/20" : "bg-zinc-800/60"
                    }`}
                  >
                    <button
                      onClick={() => !l.erro && alternarLinha(idx)}
                      disabled={!!l.erro}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        l.incluir ? "bg-orange-600 border-orange-600" : "border-zinc-600"
                      } disabled:opacity-30`}
                      aria-label="Incluir linha"
                    >
                      {l.incluir && <Check size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <p className="text-sm text-white break-words">{l.nome || "(sem nome)"}</p>
                        <span className="text-xs text-gray-500">· {l.local}</span>
                      </div>
                      {l.erro ? (
                        <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={11} /> {l.erro}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {l.quantidadeAtualNoLocal !== null ? `${l.quantidadeAtualNoLocal} → ` : ""}
                          <span className="text-orange-400 font-medium">{l.quantidade}</span> {l.unidade}
                        </p>
                      )}
                      {l.duplicataAviso && (
                        <p className="text-xs text-yellow-500 mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={11} /> Parecido com produto existente "{l.duplicataAviso}" — confira se não é duplicata
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {ausentes.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-4 md:p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Ausentes no arquivo ({localReconciliacao})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => marcarTodosAusentes(true)}
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  Marcar todos
                </button>
                <button
                  onClick={() => marcarTodosAusentes(false)}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Esses produtos têm estoque em {localReconciliacao} hoje mas não apareceram no arquivo. Marque os que
              devem ser zerados — nada aqui é alterado sem marcação.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {ausentes.map((a, idx) => (
                <div key={a.produto_id} className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-3 py-2">
                  <button
                    onClick={() => alternarAusente(idx)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      a.incluir ? "bg-red-700 border-red-700" : "border-zinc-600"
                    }`}
                    aria-label="Marcar pra zerar"
                  >
                    {a.incluir && <X size={12} />}
                  </button>
                  <p className="min-w-0 flex-1 text-sm text-white break-words">{a.nome}</p>
                  <span className="shrink-0 text-xs text-gray-400">{a.quantidade} → 0</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(linhas.length > 0 || totalAusentesMarcados > 0) && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={tap}
            onClick={confirmarImportacao}
            disabled={aplicando || (totalIncluidas === 0 && totalAusentesMarcados === 0)}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {aplicando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {aplicando
              ? "Importando..."
              : `Confirmar importação (${totalIncluidas + totalAusentesMarcados} alteração(ões))`}
          </motion.button>
        )}
      </div>
    </div>
  );
}

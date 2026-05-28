import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Check, Share2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/exportar")({
  head: () => ({
    meta: [
      { title: "Exportar pedido — Misturaria Fina Mezcla" },
      { name: "description", content: "Exportar o último pedido." },
    ],
  }),
  component: ExportarPage,
});

type ItemExport = {
  quantidade: number;
  produtos: { nome: string; unidade: string } | null;
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ExportarPage() {
  const navigate = useNavigate();
  const { user, usuario, perfil, loading } = useAuth();
  const [texto, setTexto] = useState("");
  const [vazio, setVazio] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const csvRef = useRef<{ nome: string; rows: Array<[string, number, string]> }>({ nome: "pedido", rows: [] });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCarregando(true);
      const { data: req, error: e1 } = await supabase
        .from("requisicoes")
        .select("id, observacao, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (e1) {
        setErro(e1.message);
        setCarregando(false);
        return;
      }
      if (!req) {
        setVazio(true);
        setCarregando(false);
        return;
      }

      const { data: itens, error: e2 } = await supabase
        .from("requisicao_itens")
        .select("quantidade, produtos(nome, unidade)")
        .eq("requisicao_id", req.id);

      if (e2) {
        setErro(e2.message);
        setCarregando(false);
        return;
      }

      const lista = (itens ?? []) as unknown as ItemExport[];
      const linhas = [
        `*Misturaria Fina Mezcla*`,
        `Requisição — ${formatarDataHora(req.created_at)}`,
        perfil ? `Perfil: ${perfil.nome}` : null,
        usuario ? `Solicitante: ${usuario.nome}` : null,
        ``,
        ...lista.map(
          (it) =>
            `• ${it.produtos?.nome ?? "Produto"} — ${it.quantidade} ${it.produtos?.unidade ?? ""}`.trim(),
        ),
        ...(req.observacao ? [``, `Obs.: ${req.observacao}`] : []),
      ]
        .filter(Boolean)
        .join("\n");

      csvRef.current = {
        nome: `pedido-${new Date(req.created_at).toISOString().slice(0, 10)}`,
        rows: lista.map((it) => [it.produtos?.nome ?? "Produto", it.quantidade, it.produtos?.unidade ?? ""]),
      };

      setTexto(linhas);
      setCarregando(false);
    })();
  }, [user, usuario, perfil]);

  const baixarCSV = () => {
    const header = "Produto,Quantidade,Unidade\n";
    const body = csvRef.current.rows
      .map((r) => `"${r[0].replace(/"/g, '""')}",${r[1]},${r[2]}`)
      .join("\n");
    const blob = new Blob(["\ufeff" + header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvRef.current.nome}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
      } catch {
        // cancelado
      }
    } else {
      copiar();
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-12">
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
            <p className="text-xs uppercase tracking-widest text-primary">Compartilhar</p>
            <h1 className="text-lg font-bold text-foreground">Exportar último pedido</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 pt-4">
        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : erro ? (
          <p className="py-12 text-center text-sm text-destructive">{erro}</p>
        ) : vazio ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum pedido encontrado para exportar.
          </p>
        ) : (
          <>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={14}
              className="w-full resize-none rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-primary"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={copiar}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary"
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
              <button
                onClick={compartilhar}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition hover:opacity-95"
              >
                <Share2 size={16} />
                Compartilhar
              </button>
            </div>
            <button
              onClick={baixarCSV}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary"
            >
              <Download size={16} />
              Baixar CSV
            </button>
          </>
        )}
      </div>
    </main>
  );
}

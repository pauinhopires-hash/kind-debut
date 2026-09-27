import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Plus, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removerFuncionario, salvarFuncionario } from "@/lib/funcionarios.functions";
import { fadeUp, listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/funcionarios")({
  component: AdminFuncionarios,
});

type Funcionario = {
  id: string;
  nome: string;
  funcao: string | null;
  login_email: string;
  ativo: boolean;
};

function AdminFuncionarios() {
  const salvar = useServerFn(salvarFuncionario);
  const remover = useServerFn(removerFuncionario);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [mostrarPins, setMostrarPins] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", funcao: "", pin: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: lista }, { data: listaPins }] = await Promise.all([
      supabase.from("funcionarios").select("id, nome, funcao, login_email, ativo").order("nome"),
      supabase.from("funcionario_pins").select("funcionario_id, pin"),
    ]);
    setFuncionarios(lista ?? []);
    setPins(Object.fromEntries((listaPins ?? []).map((p) => [p.funcionario_id, p.pin])));
    setCarregando(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setNovo(true);
    setForm({ nome: "", funcao: "", pin: "" });
  };

  const abrirEdicao = (f: Funcionario) => {
    setNovo(false);
    setEditando(f);
    setForm({ nome: f.nome, funcao: f.funcao ?? "", pin: pins[f.id] ?? "" });
  };

  const fechar = () => {
    setEditando(null);
    setNovo(false);
  };

  const submeter = async () => {
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome do funcionário");
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      toast.error("O PIN precisa ter 4 números");
      return;
    }
    setSalvando(true);
    const res = await salvar({
      data: {
        ...(editando ? { id: editando.id } : {}),
        nome: form.nome.trim(),
        funcao: form.funcao.trim(),
        pin: form.pin,
        ativo: editando ? editando.ativo : true,
      },
    });
    setSalvando(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(editando ? "Funcionário atualizado" : "Funcionário cadastrado");
    fechar();
    void carregar();
  };

  const desativar = async (f: Funcionario) => {
    const res = await remover({ data: { id: f.id } });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(`${f.nome} não entra mais no app`);
    void carregar();
  };

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-primary">FUNCIONÁRIOS</h1>
          <p className="text-sm text-muted-foreground">Quem entra no app com PIN</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarPins((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
          >
            {mostrarPins ? <EyeOff size={14} /> : <Eye size={14} />}
            {mostrarPins ? "Ocultar PINs" : "Ver PINs"}
          </button>
          <motion.button
            whileTap={tap}
            onClick={abrirNovo}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground"
          >
            <Plus size={14} /> Novo
          </motion.button>
        </div>
      </motion.div>

      {(novo || editando) && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-foreground">{editando ? `Editar ${editando.nome}` : "Novo funcionário"}</p>
            <button onClick={fechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome"
              disabled={!!editando}
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary disabled:opacity-60"
            />
            <input
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
              placeholder="Função (ex: Atendente)"
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
            />
            <input
              value={form.pin}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="PIN de 4 números"
              className="w-full rounded-md border border-border bg-background px-4 py-3 tracking-[0.5em] text-foreground outline-none focus:border-primary"
            />
            <motion.button
              whileTap={tap}
              disabled={salvando}
              onClick={submeter}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
            >
              {salvando && <Loader2 className="animate-spin" size={16} />} Salvar
            </motion.button>
          </div>
        </motion.div>
      )}

      {carregando ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={staggerList(0.04, 0.05)} className="space-y-2">
          {funcionarios.map((f) => (
            <motion.div
              key={f.id}
              variants={listItem}
              className={`flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 ${f.ativo ? "" : "opacity-50"}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                <UserRound size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{f.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{f.funcao ?? "Sem função"}</p>
              </div>
              <span className="font-mono text-sm tracking-widest text-foreground">
                {mostrarPins ? (pins[f.id] ?? "----") : "••••"}
              </span>
              <button onClick={() => abrirEdicao(f)} className="text-xs uppercase tracking-wider text-primary hover:underline">
                Editar
              </button>
              {f.ativo && (
                <button onClick={() => desativar(f)} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive">
                  Desativar
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

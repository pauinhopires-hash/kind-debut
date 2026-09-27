import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Delete, Loader2, Search, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fadeIn, listItem, staggerList, tap } from "@/lib/motion";
import { senhaDoPin } from "@/lib/pin";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Misturaria Fina Mezcla" },
      { name: "description", content: "Acesso da equipe da Misturaria Fina Mezcla: compras e baixa de estoque." },
      { property: "og:title", content: "Entrar — Misturaria Fina Mezcla" },
      { property: "og:description", content: "Acesso da equipe por PIN para compras e baixa de estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

type Funcionario = { id: string; nome: string; funcao: string | null; login_email: string };

function LoginPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"pin" | "admin">("pin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="mb-8 text-center">
          <h1 className="font-display text-5xl tracking-tight text-primary">MISTURARIA</h1>
          <p className="mt-1 text-sm font-light uppercase tracking-[0.35em] text-foreground/70">Fina Mezcla</p>
          <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Compras e Estoque</p>
        </motion.div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
          {([
            { id: "pin", label: "Funcionário", icon: UserRound },
            { id: "admin", label: "Administrador", icon: ShieldCheck },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setModo(t.id)}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                modo === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {modo === "pin" ? (
            <motion.div key="pin" initial="hidden" animate="visible" exit="hidden" variants={fadeIn}>
              <EntradaPorPin />
            </motion.div>
          ) : (
            <motion.div key="admin" initial="hidden" animate="visible" exit="hidden" variants={fadeIn}>
              <EntradaAdmin />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function EntradaPorPin() {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Funcionario | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    supabase
      .from("funcionarios")
      .select("id, nome, funcao, login_email")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        setFuncionarios(data ?? []);
        setCarregandoLista(false);
      });
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return funcionarios;
    return funcionarios.filter((f) => f.nome.toLowerCase().includes(termo));
  }, [busca, funcionarios]);

  const entrar = async (codigo: string, func: Funcionario) => {
    setEntrando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: func.login_email,
      password: senhaDoPin(func.login_email, codigo),
    });
    setEntrando(false);
    if (error) {
      setErro("PIN incorreto. Tente de novo.");
      setPin("");
      return;
    }
    navigate({ to: "/" });
  };

  const digitar = (d: string) => {
    if (!selecionado || entrando) return;
    const novo = (pin + d).slice(0, 4);
    setPin(novo);
    setErro(null);
    if (novo.length === 4) void entrar(novo, selecionado);
  };

  if (selecionado) {
    return (
      <div className="text-center">
        <button
          onClick={() => {
            setSelecionado(null);
            setPin("");
            setErro(null);
          }}
          className="mb-4 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          ← Trocar de pessoa
        </button>
        <p className="text-lg font-bold text-foreground">{selecionado.nome}</p>
        {selecionado.funcao && <p className="text-xs uppercase tracking-wider text-muted-foreground">{selecionado.funcao}</p>}

        <div className="my-7 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full transition ${i < pin.length ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        <AnimatePresence>
          {erro && (
            <motion.p key="erro" initial="hidden" animate="visible" exit="hidden" variants={fadeIn} className="mb-3 text-sm text-destructive">
              {erro}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <motion.button
              key={d}
              whileTap={tap}
              onClick={() => digitar(d)}
              className="rounded-xl border border-border bg-card py-4 text-2xl font-bold text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {d}
            </motion.button>
          ))}
          <span />
          <motion.button
            whileTap={tap}
            onClick={() => digitar("0")}
            className="rounded-xl border border-border bg-card py-4 text-2xl font-bold text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            0
          </motion.button>
          <motion.button
            whileTap={tap}
            onClick={() => setPin((p) => p.slice(0, -1))}
            aria-label="Apagar"
            className="flex items-center justify-center rounded-xl border border-border bg-card py-4 text-muted-foreground transition hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Delete size={22} />
          </motion.button>
        </div>

        {entrando && (
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={16} /> Entrando...
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar seu nome"
          className="w-full rounded-md border border-border bg-card py-3 pl-9 pr-4 text-foreground outline-none transition focus:border-primary"
        />
      </div>

      {carregandoLista ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum funcionário encontrado.</p>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={staggerList(0.04, 0.05)} className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {filtrados.map((f) => (
            <motion.button
              key={f.id}
              variants={listItem}
              whileHover={{ y: -2 }}
              whileTap={tap}
              onClick={() => setSelecionado(f)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {f.nome.charAt(0)}
              </span>
              <span>
                <span className="block font-semibold text-foreground">{f.nome}</span>
                {f.funcao && <span className="block text-xs text-muted-foreground">{f.funcao}</span>}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function EntradaAdmin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed")) setErro("Email ainda não confirmado. Verifique sua caixa de entrada.");
      else if (msg.includes("invalid login")) setErro("Email ou senha inválidos.");
      else if (msg.includes("rate limit")) setErro("Muitas tentativas. Aguarde alguns minutos.");
      else setErro(error.message);
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <AnimatePresence>
        {erro && (
          <motion.p key="erro" initial="hidden" animate="visible" exit="hidden" variants={fadeIn} className="text-sm text-destructive">
            {erro}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={carregando}
        whileTap={tap}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
      >
        {carregando && <Loader2 className="animate-spin" size={16} />}
        Entrar
      </motion.button>

      <p className="pt-2 text-center">
        <Link to="/forgot-password" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}

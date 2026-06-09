import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Misturaria Fina Mezcla" },
      { name: "description", content: "Acesso ao sistema de requisições da Misturaria Fina Mezcla." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

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
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black tracking-tight text-primary">MISTURARIA</h1>
          <p className="mt-1 text-base font-light tracking-widest text-foreground/80">Fina Mezcla</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary"
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
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary"
            />
          </div>

          {erro && (
            <p className="text-sm text-destructive">{erro}</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="mt-4 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <p className="pt-4 text-center text-xs text-muted-foreground">
            Acesso restrito · somente por convite do administrador
          </p>
        </form>
      </div>
    </main>
  );
}

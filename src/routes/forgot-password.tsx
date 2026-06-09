import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Misturaria Fina Mezcla" },
      { name: "description", content: "Recuperação de senha do sistema." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEnviado(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-primary">Recuperar senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Informe seu email cadastrado para receber o link de redefinição.
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4 text-center">
            <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground">
              Enviamos um link para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
            </p>
            <Link to="/login" className="text-xs uppercase tracking-widest text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
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
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="mt-4 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {carregando ? "Enviando..." : "Enviar link"}
            </button>
            <p className="pt-2 text-center">
              <Link to="/login" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

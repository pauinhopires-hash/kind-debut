import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fadeIn, tap } from "@/lib/motion";

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

        <AnimatePresence mode="wait">
          {enviado ? (
            <motion.div
              key="enviado"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="space-y-4 text-center"
            >
              <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground">
                Enviamos um link para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/login" className="text-xs uppercase tracking-widest text-primary hover:underline">
                Voltar ao login
              </Link>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <motion.button
                type="submit"
                disabled={carregando}
                whileTap={tap}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-60"
              >
                {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
                {carregando ? "Enviando..." : "Enviar link"}
              </motion.button>
              <p className="pt-2 text-center">
                <Link to="/login" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
                  Voltar ao login
                </Link>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

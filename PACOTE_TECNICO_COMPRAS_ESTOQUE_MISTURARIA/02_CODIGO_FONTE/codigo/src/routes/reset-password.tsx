import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fadeIn, tap } from "@/lib/motion";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Misturaria Fina Mezcla" },
      { name: "description", content: "Definir nova senha." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Supabase processa o hash do URL e dispara PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setPronto(true);
    });
    // Caso o evento já tenha disparado antes do listener
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-primary">Definir nova senha</h1>
        </div>

        <AnimatePresence mode="wait">
          {!pronto ? (
            <motion.p
              key="validando"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center text-sm text-muted-foreground"
            >
              Validando link... Se nada acontecer, solicite um novo link.
            </motion.p>
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
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Nova senha</label>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Confirmar senha</label>
                <input
                  type="password"
                  required
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
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
                {carregando ? "Salvando..." : "Salvar nova senha"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

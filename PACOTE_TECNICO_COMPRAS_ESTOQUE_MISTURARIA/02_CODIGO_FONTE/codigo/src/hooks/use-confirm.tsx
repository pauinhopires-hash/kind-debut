import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { tap } from "@/lib/motion";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOptions = {
  title?: string;
  message?: string;
  defaultValue?: string;
  confirmLabel?: string;
};

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void };

/**
 * Substitui window.confirm()/window.prompt() por um modal no estilo do app.
 * Uso: const { confirm, promptText, ConfirmDialog } = useConfirm();
 * ...renderizar <ConfirmDialog /> uma vez na árvore do componente.
 */
export function useConfirm() {
  const [state, setState] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", options: opts, resolve });
    });
  }, []);

  const promptText = useCallback((options: PromptOptions) => {
    setPromptValue(options.defaultValue ?? "");
    return new Promise<string | null>((resolve) => {
      setState({ kind: "prompt", options, resolve });
    });
  }, []);

  const close = (result: boolean | string | null) => {
    setState((current) => {
      if (!current) return null;
      current.resolve(result as never);
      return null;
    });
  };

  const ConfirmDialog = (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => close(state.kind === "confirm" ? false : null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state.options.title && (
              <h2 className="mb-2 text-base font-bold text-foreground">{state.options.title}</h2>
            )}
            {state.options.message && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{state.options.message}</p>
            )}
            {state.kind === "prompt" && (
              <input
                autoFocus
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && close(promptValue)}
                className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
              />
            )}
            <div className="mt-5 flex gap-2">
              <motion.button
                whileTap={tap}
                onClick={() => close(state.kind === "confirm" ? false : null)}
                className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                {state.kind === "confirm" ? state.options.cancelLabel ?? "Cancelar" : "Cancelar"}
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={() => close(state.kind === "confirm" ? true : promptValue)}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                  state.kind === "confirm" && state.options.destructive
                    ? "bg-destructive text-destructive-foreground hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {state.kind === "confirm" ? state.options.confirmLabel ?? "Confirmar" : state.options.confirmLabel ?? "Salvar"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { confirm, promptText, ConfirmDialog };
}

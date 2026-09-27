import { useNavigate, useRouter } from "@tanstack/react-router";

export function useVoltarAvancar(fallback: string) {
  const navigate = useNavigate();
  const router = useRouter();

  const voltar = () => {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ to: fallback } as Parameters<typeof navigate>[0]);
  };

  const avancar = () => router.history.forward();

  return { voltar, avancar };
}

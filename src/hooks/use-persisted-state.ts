import { useState } from "react";

// useState que sincroniza com sessionStorage — sobrevive a navegação (voltar/
// avançar) e reload da aba, mas some ao fechar a aba. Pra não perder um
// carrinho/prévia em andamento se o usuário navegar pra fora sem finalizar.
export function usePersistedState<T>(chave: string, valorInicial: T) {
  const [valor, setValorState] = useState<T>(() => {
    if (typeof window === "undefined") return valorInicial;
    try {
      const salvo = sessionStorage.getItem(chave);
      return salvo ? (JSON.parse(salvo) as T) : valorInicial;
    } catch {
      return valorInicial;
    }
  });

  const setValor: typeof setValorState = (novo) => {
    setValorState((atual) => {
      const resolvido = typeof novo === "function" ? (novo as (prev: T) => T)(atual) : novo;
      try {
        sessionStorage.setItem(chave, JSON.stringify(resolvido));
      } catch {
        // sessionStorage indisponível (modo privado, quota) — segue só em memória
      }
      return resolvido;
    });
  };

  const limpar = () => {
    try {
      sessionStorage.removeItem(chave);
    } catch {
      // ignora
    }
    setValorState(valorInicial);
  };

  return [valor, setValor, limpar] as const;
}

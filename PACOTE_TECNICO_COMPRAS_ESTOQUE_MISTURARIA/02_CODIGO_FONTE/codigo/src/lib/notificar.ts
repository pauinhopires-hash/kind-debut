import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara uma notificação push pro usuário. Nunca lança — falha em notificar
 * (sem subscription, push expirado, etc.) não deve travar a ação principal
 * de quem aprovou/rejeitou.
 */
export async function notificar(usuarioId: string, titulo: string, corpo?: string, url?: string) {
  try {
    await supabase.functions.invoke("enviar-notificacao", {
      body: { usuario_id: usuarioId, titulo, corpo, url },
    });
  } catch (err) {
    console.warn("[notificar] falha ao enviar notificação:", err);
  }
}

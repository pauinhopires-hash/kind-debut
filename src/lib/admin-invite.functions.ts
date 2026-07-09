import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteSchema = z.object({
  email: z.string().email().max(255),
  nome: z.string().min(1).max(255),
  redirectTo: z.string().url().max(500),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { supabase, userId } = context;

      // Confirm caller is admin (RLS on user_roles + has_role)
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (rolesErr) {
        return { success: false as const, error: `Falha ao verificar permissões: ${rolesErr.message}` };
      }
      const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin) {
        return { success: false as const, error: "Apenas administradores podem convidar usuários" };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
        {
          redirectTo: data.redirectTo,
          data: { nome: data.nome },
        },
      );
      if (error) {
        console.error("[inviteUser] Supabase error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        const parts = [error.message, error.name, (error as { status?: number }).status, (error as { code?: string }).code]
          .filter((v) => v !== undefined && v !== null && v !== "");
        return { success: false as const, error: parts.length > 0 ? parts.join(" | ") : JSON.stringify(error) };
      }
      return { success: true as const, userId: invited.user?.id ?? null };
    } catch (err) {
      console.error("[inviteUser] Unexpected error:", err instanceof Error ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : err);
      const message = err instanceof Error && err.message ? err.message : JSON.stringify(err);
      return {
        success: false as const,
        error: message || String(err),
      };
    }
  });

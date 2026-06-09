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
    const { supabase, userId } = context;

    // Confirm caller is admin (RLS on user_roles + has_role)
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error("Falha ao verificar permissões");
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas administradores podem convidar usuários");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: data.redirectTo,
        data: { nome: data.nome },
      },
    );
    if (error) throw new Error(error.message);
    return { userId: invited.user?.id ?? null };
  });

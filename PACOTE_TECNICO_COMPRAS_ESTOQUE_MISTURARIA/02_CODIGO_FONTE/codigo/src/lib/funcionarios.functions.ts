import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emailDoFuncionario, senhaDoPin } from "@/lib/pin";

const SalvarSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(120),
  funcao: z.string().trim().max(120).optional(),
  pin: z.string().regex(/^\d{4,6}$/, "O PIN deve ter de 4 a 6 números"),
  ativo: z.boolean().default(true),
});

const RemoverSchema = z.object({ id: z.string().uuid() });

async function garantirAdmin(context: { supabase: any; userId: string }) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) return `Falha ao verificar permissões: ${error.message}`;
  const isAdmin = (roles ?? []).some((r: { role: string | null }) => r.role === "admin");
  return isAdmin ? null : "Apenas administradores podem gerenciar funcionários";
}

export const salvarFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SalvarSchema.parse(data))
  .handler(async ({ data, context }) => {
    const negado = await garantirAdmin(context);
    if (negado) return { success: false as const, error: negado };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let loginEmail: string;
    let userId: string | null = null;

    if (data.id) {
      const { data: atual, error } = await supabaseAdmin
        .from("funcionarios")
        .select("login_email, user_id")
        .eq("id", data.id)
        .single();
      if (error || !atual) return { success: false as const, error: "Funcionário não encontrado" };
      loginEmail = atual.login_email;
      userId = atual.user_id;
    } else {
      loginEmail = emailDoFuncionario(data.nome);
      const { data: existente } = await supabaseAdmin
        .from("funcionarios")
        .select("id")
        .eq("login_email", loginEmail)
        .maybeSingle();
      if (existente) return { success: false as const, error: "Já existe um funcionário com esse nome" };
    }

    const senha = senhaDoPin(loginEmail, data.pin);

    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: senha });
      if (error) return { success: false as const, error: error.message };
    } else {
      const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
        email: loginEmail,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: data.nome },
      });
      if (error || !criado?.user) {
        return { success: false as const, error: error?.message ?? "Não foi possível criar o acesso" };
      }
      userId = criado.user.id;
    }

    const { data: salvo, error: erroFunc } = await supabaseAdmin
      .from("funcionarios")
      .upsert(
        {
          ...(data.id ? { id: data.id } : {}),
          user_id: userId,
          nome: data.nome,
          funcao: data.funcao || null,
          login_email: loginEmail,
          ativo: data.ativo,
        },
        { onConflict: "login_email" },
      )
      .select("id")
      .single();
    if (erroFunc || !salvo) {
      return { success: false as const, error: erroFunc?.message ?? "Falha ao salvar o funcionário" };
    }

    const { error: erroPin } = await supabaseAdmin
      .from("funcionario_pins")
      .upsert({ funcionario_id: salvo.id, pin: data.pin }, { onConflict: "funcionario_id" });
    if (erroPin) return { success: false as const, error: erroPin.message };

    return { success: true as const, id: salvo.id };
  });

export const removerFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RemoverSchema.parse(data))
  .handler(async ({ data, context }) => {
    const negado = await garantirAdmin(context);
    if (negado) return { success: false as const, error: negado };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("funcionarios")
      .update({ ativo: false })
      .eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

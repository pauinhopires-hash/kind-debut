import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, ShieldOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inviteUser } from "@/lib/admin-invite.functions";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuarios,
});

type Usuario = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfil_id: string | null;
};
type Perfil = { id: string; nome: string };
type RoleRow = { user_id: string; role: string };

function AdminUsuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [meuId, setMeuId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const invite = useServerFn(inviteUser);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteNome) return;
    setEnviandoConvite(true);
    try {
      await invite({
        data: {
          email: inviteEmail.trim(),
          nome: inviteNome.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      toast.success("Convite enviado", { description: `Email enviado para ${inviteEmail}` });
      setInviteEmail("");
      setInviteNome("");
      carregar();
    } catch (err) {
      toast.error("Falha ao convidar", { description: (err as Error).message });
    } finally {
      setEnviandoConvite(false);
    }
  };

  const carregar = async () => {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    setMeuId(session?.user.id ?? null);
    const [{ data: us }, { data: pfs }, { data: rs }] = await Promise.all([
      supabase.from("usuarios").select("id, nome, email, ativo, perfil_id").order("nome"),
      supabase.from("perfis").select("id, nome").order("nome"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsuarios((us ?? []) as Usuario[]);
    setPerfis((pfs ?? []) as Perfil[]);
    const ids = new Set<string>();
    ((rs ?? []) as RoleRow[]).forEach((r) => {
      if (r.role === "admin") ids.add(r.user_id);
    });
    setAdminIds(ids);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const mudarPerfil = async (u: Usuario, perfil_id: string) => {
    const { error } = await supabase
      .from("usuarios")
      .update({ perfil_id: perfil_id || null })
      .eq("id", u.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Perfil atualizado");
    carregar();
  };

  const toggleAtivo = async (u: Usuario) => {
    if (u.id === meuId && u.ativo) {
      toast.error("Você não pode desativar a si mesmo");
      return;
    }
    const { error } = await supabase.from("usuarios").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(u.ativo ? "Usuário desativado" : "Usuário ativado");
    carregar();
  };

  const toggleAdmin = async (u: Usuario) => {
    const eraAdmin = adminIds.has(u.id);
    if (eraAdmin && u.id === meuId) {
      toast.error("Você não pode remover seu próprio acesso de admin");
      return;
    }
    if (eraAdmin && adminIds.size <= 1) {
      toast.error("Não é possível remover o último admin do sistema");
      return;
    }
    if (eraAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", u.id)
        .eq("role", "admin");
      if (error) return toast.error("Erro", { description: error.message });
      toast.success("Admin removido");
    } else {
      const { error } = await supabase.from("user_roles")
        .insert({ user_id: u.id, role: "admin" });
      if (error) return toast.error("Erro", { description: error.message });
      toast.success("Promovido a admin");
    }
    carregar();
  };

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Usuários</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-2 px-6 pt-4">
        {carregando ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          usuarios.map((u) => {
            const ehAdmin = adminIds.has(u.id);
            return (
              <div
                key={u.id}
                className="rounded-xl border border-border bg-card px-4 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {u.nome}
                      {ehAdmin && (
                        <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                          admin
                        </span>
                      )}
                      {!u.ativo && (
                        <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">
                          (inativo)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <select
                  value={u.perfil_id ?? ""}
                  onChange={(e) => mudarPerfil(u, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="">— Sem perfil —</option>
                  {perfis.map((pf) => (
                    <option key={pf.id} value={pf.id}>
                      {pf.nome}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAtivo(u)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary"
                  >
                    {u.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => toggleAdmin(u)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary"
                  >
                    {ehAdmin ? <ShieldOff size={12} /> : <Shield size={12} />}
                    {ehAdmin ? "Remover admin" : "Tornar admin"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

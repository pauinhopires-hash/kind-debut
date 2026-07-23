import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Shield, ShieldOff, UserPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inviteUser, deleteUser } from "@/lib/admin-invite.functions";
import { SkeletonStack } from "@/components/skeleton";
import { useVoltarAvancar } from "@/hooks/use-voltar-avancar";
import { useConfirm } from "@/hooks/use-confirm";
import { listItem, staggerList, tap } from "@/lib/motion";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuarios,
});

type Usuario = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfil_id: string | null;
  funcao_id: string | null;
  ve_todos_setores: boolean;
};
type Perfil = { id: string; nome: string };
type Funcao = { id: string; nome: string };
type RoleRow = { user_id: string; role: string };

function AdminUsuarios() {
  const { voltar, avancar } = useVoltarAvancar("/admin");
  const { confirm, ConfirmDialog } = useConfirm();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [meuId, setMeuId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const invite = useServerFn(inviteUser);
  const remover = useServerFn(deleteUser);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteNome) return;
    setEnviandoConvite(true);
    try {
      const result = await invite({
        data: {
          email: inviteEmail.trim(),
          nome: inviteNome.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      if (!result.success) {
        toast.error("Falha ao convidar", { description: result.error });
        return;
      }
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
    const [{ data: us }, { data: pfs }, { data: fcs }, { data: rs }] = await Promise.all([
      supabase.from("usuarios").select("id, nome, email, ativo, perfil_id, funcao_id, ve_todos_setores").order("nome"),
      supabase.from("perfis").select("id, nome").order("nome"),
      supabase.from("funcoes").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsuarios((us ?? []) as Usuario[]);
    setPerfis((pfs ?? []) as Perfil[]);
    setFuncoes((fcs ?? []) as Funcao[]);
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

  const mudarFuncao = async (u: Usuario, funcao_id: string) => {
    const { error } = await supabase
      .from("usuarios")
      .update({ funcao_id: funcao_id || null })
      .eq("id", u.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Função atualizada");
    carregar();
  };

  const toggleVeTodosSetores = async (u: Usuario) => {
    const { error } = await supabase
      .from("usuarios")
      .update({ ve_todos_setores: !u.ve_todos_setores })
      .eq("id", u.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(u.ve_todos_setores ? "Não vê mais todos os setores" : "Agora vê todos os setores");
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

  const excluirUsuario = async (u: Usuario) => {
    if (u.id === meuId) {
      toast.error("Você não pode excluir a si mesmo");
      return;
    }
    if (adminIds.has(u.id) && adminIds.size <= 1) {
      toast.error("Não é possível excluir o último admin do sistema");
      return;
    }
    if (!(await confirm({ message: `Excluir "${u.nome}" (${u.email}) permanentemente? Essa ação não pode ser desfeita.`, confirmLabel: "Excluir", destructive: true }))) return;
    setExcluindo(u.id);
    try {
      const result = await remover({ data: { userId: u.id } });
      if (!result.success) {
        toast.error("Falha ao excluir", { description: result.error });
        return;
      }
      toast.success("Usuário excluído");
      carregar();
    } catch (err) {
      toast.error("Falha ao excluir", { description: (err as Error).message });
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md md:max-w-2xl items-center gap-3">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={tap}
            onClick={voltar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={tap}
            onClick={avancar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            aria-label="Avançar"
          >
            <ArrowRight size={18} />
          </motion.button>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-bold text-foreground">Usuários</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md md:max-w-2xl space-y-4 px-6 pt-4">
        <form onSubmit={handleInvite} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <UserPlus size={14} /> Convidar usuário
          </p>
          <input
            type="text"
            required
            placeholder="Nome"
            value={inviteNome}
            onChange={(e) => setInviteNome(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
          <input
            type="email"
            required
            placeholder="email@exemplo.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
          />
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={tap}
            type="submit"
            disabled={enviandoConvite}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-60"
          >
            {enviandoConvite && <Loader2 size={14} className="animate-spin" />}
            {enviandoConvite ? "Enviando..." : "Enviar convite"}
          </motion.button>
        </form>


        {carregando ? (
          <SkeletonStack rows={5} />
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerList()} className="space-y-4">
          {usuarios.map((u) => {
            const ehAdmin = adminIds.has(u.id);
            return (
              <motion.div
                key={u.id}
                variants={listItem}
                className="rounded-xl border border-border bg-card px-4 py-3 space-y-2 transition-shadow hover:shadow-md hover:shadow-primary/5"
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
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Perfil (cargo)
                  <select
                    value={u.perfil_id ?? ""}
                    onChange={(e) => mudarPerfil(u, e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  >
                    <option value="">— Sem perfil —</option>
                    {perfis.map((pf) => (
                      <option key={pf.id} value={pf.id}>
                        {pf.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Setor
                  <select
                    value={u.funcao_id ?? ""}
                    onChange={(e) => mudarFuncao(u, e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  >
                    <option value="">— Sem setor —</option>
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={u.ve_todos_setores}
                    onChange={() => toggleVeTodosSetores(u)}
                  />
                  Vê todos os setores (além do setor próprio)
                </label>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={tap}
                    onClick={() => toggleAtivo(u)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  >
                    {u.ativo ? "Desativar" : "Ativar"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={tap}
                    onClick={() => toggleAdmin(u)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                  >
                    {ehAdmin ? <ShieldOff size={12} /> : <Shield size={12} />}
                    {ehAdmin ? "Remover admin" : "Tornar admin"}
                  </motion.button>
                  {u.id !== meuId && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={tap}
                      onClick={() => excluirUsuario(u)}
                      disabled={excluindo === u.id}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-destructive transition hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                      aria-label="Excluir usuário"
                    >
                      {excluindo === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
          </motion.div>
        )}
      </div>
      {ConfirmDialog}
    </main>
  );
}

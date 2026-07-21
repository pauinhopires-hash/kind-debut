import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  perfil_id: string | null;
  ativo: boolean;
  funcao_id: string | null;
  ve_todos_setores: boolean;
};

export type PerfilRow = { id: string; nome: string };

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<UsuarioRow | null>(null);
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setUsuario(null);
        setPerfil(null);
        setIsAdmin(false);
        setProfileLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (!data.session?.user) setProfileLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      const { data: u } = await supabase
        .from("usuarios")
        .select("id, nome, email, perfil_id, ativo, funcao_id, ve_todos_setores")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setUsuario(u as UsuarioRow | null);
      if (u?.perfil_id) {
        const { data: p } = await supabase
          .from("perfis")
          .select("id, nome")
          .eq("id", u.perfil_id)
          .maybeSingle();
        if (!cancelled) setPerfil(p as PerfilRow | null);
      } else if (!cancelled) {
        setPerfil(null);
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!cancelled) {
        const list = (roles ?? []) as Array<{ role: string }>;
        setIsAdmin(list.some((r) => r.role === "admin"));
        setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { session, user, usuario, perfil, isAdmin, loading, profileLoading };
}

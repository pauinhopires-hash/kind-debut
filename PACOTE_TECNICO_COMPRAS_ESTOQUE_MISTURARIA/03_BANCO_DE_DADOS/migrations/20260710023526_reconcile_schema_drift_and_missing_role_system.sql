-- Reconciliation migration — 2026-07-09/10.
--
-- This project's live Supabase database ("MISTURARIA COMPRAS") had drifted
-- significantly from the migrations already checked into this repo — it was
-- never actually built by replaying these files, and picked up its own
-- history of ad-hoc schema edits and an authorization model
-- (perfil-slug-based) that predates the user_roles/has_role design these
-- migrations assume. This file makes the schema match what the app code in
-- this repo actually expects, without discarding the perfil-based RLS that
-- was already live and working. Applied by hand via the Supabase SQL editor
-- on 2026-07-09; recorded here after the fact so future migration replays
-- don't regress it.

-- 1. requisicoes.status allowed only the legacy values ('ENVIADO','RECEBIDO')
--    from an older version of the app. Current code only ever writes
--    'pendente' / 'aprovada' / 'cancelada'.
ALTER TABLE public.requisicoes DROP CONSTRAINT IF EXISTS requisicoes_status_check;
ALTER TABLE public.requisicoes ADD CONSTRAINT requisicoes_status_check
  CHECK (status = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'cancelada'::text]));

-- 2. requisicao_itens had legacy column names that don't match the app.
ALTER TABLE public.requisicao_itens RENAME COLUMN quantidade_sol TO quantidade;
ALTER TABLE public.requisicao_itens RENAME COLUMN nome_livre TO nome_custom;

-- 3. produtos.local (used by admin.produtos.tsx) was named mapa_fisico, and
--    was NOT NULL even though the app treats it as optional ("-- Sem local -").
ALTER TABLE public.produtos RENAME COLUMN mapa_fisico TO local;
ALTER TABLE public.produtos ALTER COLUMN local DROP NOT NULL;

-- 4. requisicoes.created_at (ordered/displayed in historico.tsx and
--    pedido.tsx's "repetir último pedido") was named criado_em.
ALTER TABLE public.requisicoes RENAME COLUMN criado_em TO created_at;

-- 5. The app calls rpc('has_role', {_user_id, _role}) and also directly
--    selects from a `user_roles` table (see src/hooks/use-auth.ts and
--    src/lib/admin-invite.functions.ts) — neither existed. This database's
--    real admin check is perfil-based: get_meu_perfil_slug() = 'admin'
--    (see existing RLS policies across produtos/estoque_atual/usuarios/etc).
--    Rather than introduce a second, competing source of truth, has_role()
--    and the user_roles view are thin wrappers around that same mechanism.
--
--    Trade-off accepted deliberately: the app's "Tornar admin"/"Remover
--    admin" buttons in admin.usuarios.tsx write to public.user_roles, which
--    is a read-only view here — those actions currently have no effect.
--    Promoting someone to admin means changing their *perfil* (to one with
--    slug='admin'), not using that button. See conversation notes for the
--    "full alignment" alternative (real user_roles table + rewritten RLS)
--    that was considered and deferred.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    JOIN public.perfis p ON p.id = u.perfil_id
    WHERE u.id = _user_id AND p.slug = _role
  )
$$;

-- No `security_invoker` here on purpose: an invoker-rights view repeatedly
-- returned empty for legitimate admins whenever it was queried from a
-- context (e.g. this project's TanStack Start server functions) where the
-- underlying usuarios/perfis RLS didn't resolve the same way it does for a
-- normal browser session — see conversation notes for the debugging trail.
-- Running as the view owner sidesteps that inconsistency entirely.
CREATE OR REPLACE VIEW public.user_roles AS
SELECT u.id AS user_id, p.slug AS role
FROM public.usuarios u
JOIN public.perfis p ON p.id = u.perfil_id
WHERE p.slug IS NOT NULL;

GRANT SELECT ON public.user_roles TO authenticated;

-- 6. perfis had RLS enabled with zero policies at all — reads were silently
--    denied for everyone, including admins (this also broke has_role's own
--    join whenever it *did* need to respect RLS, and made every perfil
--    dropdown in the app show "-- Sem perfil --").
CREATE POLICY "perfis_select_auth" ON public.perfis FOR SELECT TO authenticated USING (true);

-- 7. estoque_atual had UPDATE and SELECT policies but no INSERT policy, so
--    `.upsert()` from admin.estoque.tsx / admin.lista-compras.tsx /
--    admin.requisicoes-internas.tsx failed the first time a product had no
--    stock row yet (upsert needs to insert, not just update, in that case).
CREATE POLICY "estoque_admin_insere" ON public.estoque_atual
FOR INSERT TO authenticated
WITH CHECK (get_meu_perfil_slug() = 'admin');

-- 8. usuarios.perfil_id was NOT NULL, but the app's own UI (admin.usuarios.tsx)
--    treats "-- Sem perfil --" as a normal, valid state.
ALTER TABLE public.usuarios ALTER COLUMN perfil_id DROP NOT NULL;

-- 9. THE root cause of every "Database error saving new user" failure (both
--    the app's invite flow and Supabase's own dashboard "Add user"): this
--    trigger function had no fixed search_path and referenced `usuarios`/
--    `perfis` unqualified. Whatever internal context Supabase Auth invokes
--    triggers under didn't resolve those names, raising
--    `relation "usuarios" does not exist` (confirmed via Postgres logs) and
--    rolling back the entire auth.users insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil_id)
  SELECT
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    p.id
  FROM public.perfis p WHERE p.slug = 'admin'  -- temporary profile until an admin reassigns it
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 10. Supabase's advisor flagged these SECURITY DEFINER functions as
--     callable by the anonymous (logged-out) role via PostgREST RPC, which
--     none of them need — has_role/get_meu_perfil_* only make sense for an
--     already-authenticated auth.uid(), and handle_new_user is trigger-only.
--     Only revoking from `anon`, not `authenticated`: RLS policies across
--     this schema call get_meu_perfil_slug()/get_meu_perfil_id() as the
--     querying (authenticated) user, and index.tsx calls has_role() via
--     rpc() after login — revoking authenticated's EXECUTE would break both.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_meu_perfil_slug() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_meu_perfil_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Deferred (not applied — flagged by the advisor, but out of scope for this
-- reconciliation; revisit deliberately, not as a side effect of this pass):
--   - `movimentacoes_estoque`, `requisicao_interna_itens`, `requisicoes_internas`
--     each have an "admin ..." named policy whose USING/WITH CHECK is
--     unconditionally `true` — any authenticated user (not just admins) can
--     currently insert/modify rows there. Predates this session; confirm
--     intended behavior before tightening.
--   - `get_meu_perfil_slug`/`get_meu_perfil_id` still lack `SET search_path`,
--     the same class of bug fixed in handle_new_user() above (#9) — they
--     happen to work today, but are one search_path hijack away from the
--     same failure mode. Worth hardening the same way once there's a
--     maintenance window to verify nothing depends on current behavior.
--   - Auth > Policies: "leaked password protection" is disabled project-wide
--     (checks new passwords against haveibeenpwned.org) — recommended, not
--     required.

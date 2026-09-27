-- 1. Fix req_itens_delete_own policy: only allow delete from pending requisitions
DROP POLICY IF EXISTS req_itens_delete_own ON public.requisicao_itens;

CREATE POLICY req_itens_delete_own ON public.requisicao_itens
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.requisicoes r
    WHERE r.id = requisicao_itens.requisicao_id
      AND r.usuario_id = auth.uid()
      AND r.status = 'pendente'
  )
);

-- 2. Prevent non-admin users from changing requisicoes.status
CREATE OR REPLACE FUNCTION public.prevent_non_admin_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status da requisição'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_status_change ON public.requisicoes;
CREATE TRIGGER trg_prevent_non_admin_status_change
BEFORE UPDATE ON public.requisicoes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_status_change();

-- Lock down execute on the new trigger function — only trigger context should call it
REVOKE EXECUTE ON FUNCTION public.prevent_non_admin_status_change() FROM PUBLIC, anon, authenticated;
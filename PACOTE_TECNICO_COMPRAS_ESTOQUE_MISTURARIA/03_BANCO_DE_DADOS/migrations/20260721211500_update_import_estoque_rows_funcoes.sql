-- Atualiza import_estoque_rows: a coluna "setor" da planilha agora vira
-- uma lista de funções (separadas por vírgula), vinculadas via
-- produto_funcoes em vez de escrever no produtos.setor (descontinuado).
-- Aplicado via Supabase MCP em 2026-07-21.
CREATE OR REPLACE FUNCTION public.import_estoque_rows(
  p_rows jsonb,
  p_usuario_id uuid,
  p_zerar_produto_ids uuid[] DEFAULT '{}',
  p_zerar_local text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_produto_id uuid;
  v_nome text;
  v_local text;
  v_quantidade numeric;
  v_antes numeric;
  v_criados int := 0;
  v_atualizados int := 0;
  v_zerados int := 0;
  v_pid uuid;
  v_funcao_nome text;
  v_funcao_id uuid;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_nome := trim(v_row->>'nome');
    v_local := v_row->>'local';
    v_quantidade := (v_row->>'quantidade')::numeric;

    SELECT id INTO v_produto_id FROM public.produtos WHERE lower(trim(nome)) = lower(v_nome) LIMIT 1;

    IF v_produto_id IS NULL THEN
      INSERT INTO public.produtos (nome, unidade, local, grupo, subgrupo, valor_unitario, estoque_minimo)
      VALUES (
        v_nome,
        COALESCE(v_row->>'unidade', 'UND'),
        NULLIF(v_row->>'local', ''),
        NULLIF(v_row->>'grupo', ''),
        NULLIF(v_row->>'subgrupo', ''),
        NULLIF(v_row->>'valor_unitario', '')::numeric,
        COALESCE(NULLIF(v_row->>'estoque_minimo', '')::int, 0)
      )
      RETURNING id INTO v_produto_id;
      v_criados := v_criados + 1;
    END IF;

    -- Funções: lista separada por vírgula, cria a função se ainda não existir.
    IF NULLIF(v_row->>'setor', '') IS NOT NULL THEN
      FOREACH v_funcao_nome IN ARRAY string_to_array(v_row->>'setor', ',')
      LOOP
        v_funcao_nome := upper(trim(v_funcao_nome));
        IF v_funcao_nome = '' THEN CONTINUE; END IF;

        SELECT id INTO v_funcao_id FROM public.funcoes WHERE nome = v_funcao_nome;
        IF v_funcao_id IS NULL THEN
          INSERT INTO public.funcoes (nome) VALUES (v_funcao_nome) RETURNING id INTO v_funcao_id;
        END IF;

        INSERT INTO public.produto_funcoes (produto_id, funcao_id)
        VALUES (v_produto_id, v_funcao_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    SELECT quantidade INTO v_antes FROM public.estoque_atual
      WHERE produto_id = v_produto_id AND local = v_local;
    v_antes := COALESCE(v_antes, 0);

    IF v_antes IS DISTINCT FROM v_quantidade THEN
      INSERT INTO public.movimentacoes_estoque
        (usuario_id, produto_id, local, tipo, quantidade, estoque_antes, estoque_depois, observacao)
      VALUES (
        p_usuario_id, v_produto_id, v_local, 'ajuste', abs(v_quantidade - v_antes), v_antes, v_quantidade,
        COALESCE(v_row->>'observacao', 'Importação de planilha')
      );

      INSERT INTO public.estoque_atual (produto_id, local, quantidade, atualizado_por)
      VALUES (v_produto_id, v_local, v_quantidade, p_usuario_id)
      ON CONFLICT (produto_id, local) DO UPDATE
        SET quantidade = EXCLUDED.quantidade, atualizado_por = p_usuario_id, atualizado_em = now();

      v_atualizados := v_atualizados + 1;
    END IF;
  END LOOP;

  IF p_zerar_local IS NOT NULL THEN
    FOREACH v_pid IN ARRAY p_zerar_produto_ids
    LOOP
      SELECT quantidade INTO v_antes FROM public.estoque_atual
        WHERE produto_id = v_pid AND local = p_zerar_local;
      v_antes := COALESCE(v_antes, 0);
      IF v_antes <> 0 THEN
        INSERT INTO public.movimentacoes_estoque
          (usuario_id, produto_id, local, tipo, quantidade, estoque_antes, estoque_depois, observacao)
        VALUES (p_usuario_id, v_pid, p_zerar_local, 'ajuste', v_antes, v_antes, 0, 'Reconciliação de planilha — ausente no arquivo');

        INSERT INTO public.estoque_atual (produto_id, local, quantidade, atualizado_por)
        VALUES (v_pid, p_zerar_local, 0, p_usuario_id)
        ON CONFLICT (produto_id, local) DO UPDATE
          SET quantidade = 0, atualizado_por = p_usuario_id, atualizado_em = now();
        v_zerados := v_zerados + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('criados', v_criados, 'atualizados', v_atualizados, 'zerados', v_zerados);
END;
$$;

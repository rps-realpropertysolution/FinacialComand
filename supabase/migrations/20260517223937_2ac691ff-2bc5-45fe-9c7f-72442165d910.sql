
-- Forecast module: versionamento + linhas + RPCs

CREATE TABLE IF NOT EXISTS public.forecast_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  cenario text NOT NULL DEFAULT 'base',
  mes_inicio date NOT NULL,
  horizonte_meses int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'rascunho',
  ativo boolean NOT NULL DEFAULT false,
  premissas jsonb NOT NULL DEFAULT '{"inflacao":4.5,"reajuste_contratos":5.0,"crescimento_receita":0,"reducao_custos":0,"dissidio_folha":5.0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY fv_select ON public.forecast_versoes FOR SELECT TO authenticated
  USING (empresa_id = current_empresa_id());
CREATE POLICY fv_insert ON public.forecast_versoes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = current_empresa_id() AND (has_role(auth.uid(),'diretor') OR has_role(auth.uid(),'gerente')));
CREATE POLICY fv_update ON public.forecast_versoes FOR UPDATE TO authenticated
  USING (empresa_id = current_empresa_id() AND (has_role(auth.uid(),'diretor') OR has_role(auth.uid(),'gerente')));
CREATE POLICY fv_delete ON public.forecast_versoes FOR DELETE TO authenticated
  USING (empresa_id = current_empresa_id() AND has_role(auth.uid(),'diretor'));

CREATE TRIGGER fv_set_updated_at BEFORE UPDATE ON public.forecast_versoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.forecast_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  versao_id uuid NOT NULL REFERENCES public.forecast_versoes(id) ON DELETE CASCADE,
  mes date NOT NULL,
  tipo text NOT NULL,                  -- receita | despesa
  grupo text NOT NULL,                 -- operacional | fiscal | folha | sede | empreendimento
  categoria text NOT NULL,
  descricao text,
  empreendimento_id uuid,
  valor_previsto numeric(14,2) NOT NULL DEFAULT 0,
  valor_realizado numeric(14,2) NOT NULL DEFAULT 0,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fl_versao ON public.forecast_linhas(versao_id);
CREATE INDEX IF NOT EXISTS idx_fl_mes ON public.forecast_linhas(mes);
CREATE INDEX IF NOT EXISTS idx_fl_emp ON public.forecast_linhas(empreendimento_id);

ALTER TABLE public.forecast_linhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY fl_select ON public.forecast_linhas FOR SELECT TO authenticated
  USING (empresa_id = current_empresa_id());
CREATE POLICY fl_insert ON public.forecast_linhas FOR INSERT TO authenticated
  WITH CHECK (empresa_id = current_empresa_id() AND (has_role(auth.uid(),'diretor') OR has_role(auth.uid(),'gerente')));
CREATE POLICY fl_update ON public.forecast_linhas FOR UPDATE TO authenticated
  USING (empresa_id = current_empresa_id() AND (has_role(auth.uid(),'diretor') OR has_role(auth.uid(),'gerente')));
CREATE POLICY fl_delete ON public.forecast_linhas FOR DELETE TO authenticated
  USING (empresa_id = current_empresa_id() AND (has_role(auth.uid(),'diretor') OR has_role(auth.uid(),'gerente')));

CREATE TRIGGER fl_set_updated_at BEFORE UPDATE ON public.forecast_linhas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- RPC: gerar nova versão de forecast
-- =====================================================================
CREATE OR REPLACE FUNCTION public.forecast_gerar_versao(
  _nome text,
  _cenario text,
  _mes_inicio date,
  _horizonte int,
  _premissas jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _vid uuid;
  _inicio date := date_trunc('month', _mes_inicio)::date;
  _horizon int := COALESCE(_horizonte, 12);
  _prem jsonb;
  _inflacao numeric;
  _reaj_contr numeric;
  _cresc_rec numeric;
  _red_cus numeric;
  _dissidio numeric;
  i int;
  _mes date;
  _meses_offset numeric;
  _fator_inflacao numeric;
  _fator_receita numeric;
  c record;
  d record;
  g record;
  f record;
  _valor numeric;
  _anos int;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;

  _prem := COALESCE(_premissas, '{"inflacao":4.5,"reajuste_contratos":5.0,"crescimento_receita":0,"reducao_custos":0,"dissidio_folha":5.0}'::jsonb);
  _inflacao := COALESCE((_prem->>'inflacao')::numeric, 0);
  _reaj_contr := COALESCE((_prem->>'reajuste_contratos')::numeric, 0);
  _cresc_rec := COALESCE((_prem->>'crescimento_receita')::numeric, 0);
  _red_cus := COALESCE((_prem->>'reducao_custos')::numeric, 0);
  _dissidio := COALESCE((_prem->>'dissidio_folha')::numeric, 0);

  INSERT INTO public.forecast_versoes(empresa_id, nome, cenario, mes_inicio, horizonte_meses, premissas, status)
  VALUES (_emp, _nome, COALESCE(_cenario,'base'), _inicio, _horizon, _prem, 'rascunho')
  RETURNING id INTO _vid;

  -- Para cada mês do horizonte, gerar linhas
  FOR i IN 0.._horizon-1 LOOP
    _mes := (_inicio + (i || ' month')::interval)::date;
    _meses_offset := i::numeric / 12.0;
    _fator_inflacao := power(1 + _inflacao/100.0, _meses_offset);
    _fator_receita := power(1 + _cresc_rec/100.0, _meses_offset);

    -- RECEITAS: contratos ativos com reajuste anual composto
    FOR c IN
      SELECT * FROM public.contratos
       WHERE empresa_id = _emp AND ativo = true
         AND data_inicio <= (_mes + interval '1 month' - interval '1 day')::date
    LOOP
      _anos := GREATEST(0, extract(year from age(_mes, c.data_inicio))::int);
      _valor := round(c.valor_mensal
        * power(1 + (c.percentual_reajuste/100.0), _anos)
        * _fator_receita, 2);
      INSERT INTO public.forecast_linhas(empresa_id, versao_id, mes, tipo, grupo, categoria, descricao, empreendimento_id, valor_previsto, origem)
      VALUES (_emp, _vid, _mes, 'receita', 'operacional', 'Contrato', c.descricao, c.empreendimento_id, _valor, 'contrato');
    END LOOP;

    -- DESPESAS SEDE: últimas recorrentes com inflação
    FOR d IN
      SELECT DISTINCT ON (categoria, descricao, fornecedor)
             categoria::text AS categoria, descricao, fornecedor, valor, empreendimento_id
        FROM public.despesas_sede
       WHERE empresa_id = _emp AND recorrente = true
       ORDER BY categoria, descricao, fornecedor, competencia DESC
    LOOP
      _valor := round(d.valor * _fator_inflacao * (1 - _red_cus/100.0), 2);
      INSERT INTO public.forecast_linhas(empresa_id, versao_id, mes, tipo, grupo, categoria, descricao, empreendimento_id, valor_previsto, origem)
      VALUES (_emp, _vid, _mes, 'despesa', 'sede', d.categoria, d.descricao, d.empreendimento_id, _valor, 'replicado');
    END LOOP;

    -- FOLHA: colaboradores ativos com dissidio composto anual
    FOR f IN
      SELECT id, nome, cargo, salario_base, vale_refeicao, vale_transporte, plano_saude, outros_beneficios, empreendimento_id, alocacao
        FROM public.colaboradores
       WHERE empresa_id = _emp AND ativo = true
    LOOP
      -- Custo bruto estimado: salario + beneficios + 70% encargos sobre salario
      _valor := round(
        (f.salario_base * 1.70 + COALESCE(f.vale_refeicao,0) + COALESCE(f.vale_transporte,0) + COALESCE(f.plano_saude,0) + COALESCE(f.outros_beneficios,0))
        * power(1 + _dissidio/100.0, _meses_offset), 2);
      INSERT INTO public.forecast_linhas(empresa_id, versao_id, mes, tipo, grupo, categoria, descricao, empreendimento_id, valor_previsto, origem)
      VALUES (_emp, _vid, _mes, 'despesa', 'folha', COALESCE(f.cargo,'Folha'), f.nome, f.empreendimento_id, _valor, 'calculado');
    END LOOP;

    -- FISCAL: média móvel últimos 3 meses por categoria
    FOR g IN
      SELECT categoria::text AS categoria, ROUND(AVG(valor),2) AS valor_medio, empreendimento_id
        FROM public.guias_fiscais
       WHERE empresa_id = _emp
         AND competencia >= (_inicio - interval '3 month')::date
         AND competencia < _inicio
       GROUP BY categoria, empreendimento_id
    LOOP
      _valor := round(g.valor_medio * _fator_inflacao, 2);
      INSERT INTO public.forecast_linhas(empresa_id, versao_id, mes, tipo, grupo, categoria, descricao, empreendimento_id, valor_previsto, origem)
      VALUES (_emp, _vid, _mes, 'despesa', 'fiscal', g.categoria, 'Guia '||g.categoria, g.empreendimento_id, _valor, 'calculado');
    END LOOP;
  END LOOP;

  RETURN _vid;
END; $$;

-- =====================================================================
-- RPC: atualizar coluna realizado da versão
-- =====================================================================
CREATE OR REPLACE FUNCTION public.forecast_atualizar_realizado(_versao_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _upd int := 0;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;

  -- Receitas operacionais: cashflow tipo receita
  UPDATE public.forecast_linhas fl SET valor_realizado = sub.tot
    FROM (
      SELECT mes, COALESCE(empreendimento_id, '00000000-0000-0000-0000-000000000000'::uuid) AS emp,
             SUM(realizado) AS tot
        FROM public.cashflow
       WHERE empresa_id = _emp AND tipo = 'receita'
       GROUP BY mes, empreendimento_id
    ) sub
    WHERE fl.versao_id = _versao_id
      AND fl.tipo='receita' AND fl.grupo='operacional'
      AND fl.mes = sub.mes
      AND COALESCE(fl.empreendimento_id, '00000000-0000-0000-0000-000000000000'::uuid) = sub.emp;
  GET DIAGNOSTICS _upd = ROW_COUNT;

  -- Despesas sede: tabela despesas_sede valor_pago
  UPDATE public.forecast_linhas fl SET valor_realizado = sub.tot
    FROM (
      SELECT competencia AS mes, categoria::text AS categoria, SUM(COALESCE(valor_pago, valor)) AS tot
        FROM public.despesas_sede
       WHERE empresa_id = _emp
       GROUP BY competencia, categoria
    ) sub
    WHERE fl.versao_id = _versao_id AND fl.grupo='sede'
      AND fl.mes = sub.mes AND fl.categoria = sub.categoria;

  -- Fiscal
  UPDATE public.forecast_linhas fl SET valor_realizado = sub.tot
    FROM (
      SELECT competencia AS mes, categoria::text AS categoria, SUM(COALESCE(valor_pago, valor)) AS tot
        FROM public.guias_fiscais
       WHERE empresa_id = _emp
       GROUP BY competencia, categoria
    ) sub
    WHERE fl.versao_id = _versao_id AND fl.grupo='fiscal'
      AND fl.mes = sub.mes AND fl.categoria = sub.categoria;

  -- Folha
  UPDATE public.forecast_linhas fl SET valor_realizado = sub.tot
    FROM (
      SELECT competencia AS mes, SUM(COALESCE(custo_total, salario+beneficios+bonus+horas_extras+inss+fgts+irrf+outros_encargos)) AS tot
        FROM public.folha_pagamento
       WHERE empresa_id = _emp
       GROUP BY competencia
    ) sub
    WHERE fl.versao_id = _versao_id AND fl.grupo='folha'
      AND fl.mes = sub.mes;

  RETURN _upd;
END; $$;

-- =====================================================================
-- RPC: duplicar versão
-- =====================================================================
CREATE OR REPLACE FUNCTION public.forecast_duplicar_versao(_versao_id uuid, _novo_nome text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _new uuid;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;

  INSERT INTO public.forecast_versoes(empresa_id, nome, descricao, cenario, mes_inicio, horizonte_meses, premissas, status)
  SELECT empresa_id, _novo_nome, descricao, cenario, mes_inicio, horizonte_meses, premissas, 'rascunho'
    FROM public.forecast_versoes WHERE id=_versao_id AND empresa_id=_emp
  RETURNING id INTO _new;

  INSERT INTO public.forecast_linhas(empresa_id, versao_id, mes, tipo, grupo, categoria, descricao, empreendimento_id, valor_previsto, origem)
  SELECT empresa_id, _new, mes, tipo, grupo, categoria, descricao, empreendimento_id, valor_previsto, origem
    FROM public.forecast_linhas WHERE versao_id=_versao_id AND empresa_id=_emp;

  RETURN _new;
END; $$;

-- =====================================================================
-- RPC: aplicar premissa percentual
-- =====================================================================
CREATE OR REPLACE FUNCTION public.forecast_aplicar_premissa(
  _versao_id uuid,
  _tipo text,       -- 'receita' | 'despesa' | null = todos
  _grupo text,      -- null = todos
  _percentual numeric
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _emp uuid := current_empresa_id(); _upd int;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;
  UPDATE public.forecast_linhas
     SET valor_previsto = ROUND(valor_previsto * (1 + _percentual/100.0), 2)
   WHERE versao_id = _versao_id AND empresa_id = _emp
     AND (_tipo IS NULL OR tipo = _tipo)
     AND (_grupo IS NULL OR grupo = _grupo);
  GET DIAGNOSTICS _upd = ROW_COUNT;
  RETURN _upd;
END; $$;

-- =====================================================================
-- RPC: ativar versão (única por empresa)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.forecast_ativar_versao(_versao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _emp uuid := current_empresa_id();
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;
  UPDATE public.forecast_versoes SET ativo=false WHERE empresa_id=_emp;
  UPDATE public.forecast_versoes SET ativo=true, status='ativo' WHERE id=_versao_id AND empresa_id=_emp;
END; $$;

-- Replicar lançamentos de cashflow do mês anterior
CREATE OR REPLACE FUNCTION public.replicar_cashflow_mes_anterior(_mes date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _comp date := date_trunc('month', _mes)::date;
  _ant date := (_comp - interval '1 month')::date;
  _ins int := 0;
  r record;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;
  FOR r IN
    SELECT empreendimento_id, contrato_id, tipo, categoria, descricao, previsto
      FROM public.cashflow
     WHERE empresa_id = _emp AND mes = _ant AND origem <> 'fis'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.cashflow
       WHERE empresa_id = _emp AND mes = _comp
         AND coalesce(empreendimento_id::text,'') = coalesce(r.empreendimento_id::text,'')
         AND tipo = r.tipo AND categoria = r.categoria
         AND coalesce(descricao,'') = coalesce(r.descricao,'')
    ) THEN
      INSERT INTO public.cashflow(empresa_id, empreendimento_id, contrato_id, mes, tipo, categoria, descricao, previsto, realizado, origem)
      VALUES (_emp, r.empreendimento_id, r.contrato_id, _comp, r.tipo, r.categoria, r.descricao, r.previsto, 0, 'replicado');
      _ins := _ins + 1;
    END IF;
  END LOOP;
  RETURN _ins;
END; $$;

-- Replicar TODAS despesas da sede do mês anterior (não só recorrentes)
CREATE OR REPLACE FUNCTION public.replicar_despesas_sede_mes_anterior(_mes date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _comp date := date_trunc('month', _mes)::date;
  _ant date := (_comp - interval '1 month')::date;
  _ins int := 0;
  r record;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;
  FOR r IN
    SELECT categoria, descricao, fornecedor, valor, data_vencimento, recorrente, empreendimento_id
      FROM public.despesas_sede
     WHERE empresa_id = _emp AND competencia = _ant
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.despesas_sede
       WHERE empresa_id = _emp AND competencia = _comp
         AND categoria = r.categoria
         AND coalesce(descricao,'') = coalesce(r.descricao,'')
         AND coalesce(fornecedor,'') = coalesce(r.fornecedor,'')
    ) THEN
      INSERT INTO public.despesas_sede(empresa_id, categoria, descricao, fornecedor, competencia, data_vencimento, valor, recorrente, status, empreendimento_id)
      VALUES (
        _emp, r.categoria, r.descricao, r.fornecedor, _comp,
        (_comp + (extract(day from r.data_vencimento)::int - 1))::date,
        r.valor, r.recorrente, 'previsto', r.empreendimento_id
      );
      _ins := _ins + 1;
    END IF;
  END LOOP;
  RETURN _ins;
END; $$;

-- Replicar guias fiscais do mês anterior
CREATE OR REPLACE FUNCTION public.replicar_guias_fiscais_mes_anterior(_mes date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _comp date := date_trunc('month', _mes)::date;
  _ant date := (_comp - interval '1 month')::date;
  _ins int := 0;
  r record;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;
  FOR r IN
    SELECT categoria, descricao, codigo_receita, valor, data_vencimento, empreendimento_id
      FROM public.guias_fiscais
     WHERE empresa_id = _emp AND competencia = _ant
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.guias_fiscais
       WHERE empresa_id = _emp AND competencia = _comp
         AND categoria = r.categoria
         AND coalesce(descricao,'') = coalesce(r.descricao,'')
    ) THEN
      INSERT INTO public.guias_fiscais(empresa_id, categoria, descricao, codigo_receita, competencia, data_vencimento, valor, status, empreendimento_id)
      VALUES (
        _emp, r.categoria, r.descricao, r.codigo_receita, _comp,
        (_comp + (extract(day from r.data_vencimento)::int - 1))::date,
        r.valor, 'pendente', r.empreendimento_id
      );
      _ins := _ins + 1;
    END IF;
  END LOOP;
  RETURN _ins;
END; $$;
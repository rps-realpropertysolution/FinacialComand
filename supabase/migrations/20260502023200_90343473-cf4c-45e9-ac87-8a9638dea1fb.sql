-- Expandir emissor_config
ALTER TABLE public.emissor_config
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS codigo_tributacao_municipio text,
  ADD COLUMN IF NOT EXISTS natureza_operacao text DEFAULT 'tributacao_no_municipio',
  ADD COLUMN IF NOT EXISTS regime_especial_tributacao text,
  ADD COLUMN IF NOT EXISTS optante_simples boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS incentivador_cultural boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cidade text DEFAULT 'São Paulo',
  ADD COLUMN IF NOT EXISTS uf text DEFAULT 'SP',
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email text;

-- Expandir faturamentos com espelho da NF
ALTER TABLE public.faturamentos
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS codigo_tributacao_municipio text,
  ADD COLUMN IF NOT EXISTS descricao_servico text,
  ADD COLUMN IF NOT EXISTS unidade text DEFAULT 'mês',
  ADD COLUMN IF NOT EXISTS quantidade numeric(14,4) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_deducoes numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_calculo numeric(14,2),
  ADD COLUMN IF NOT EXISTS aliquota_iss numeric(6,4),
  ADD COLUMN IF NOT EXISTS valor_iss numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iss_retido boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_pis numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cofins numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_inss numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ir numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_csll numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_outras_retencoes numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_bruto numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_liquido numeric(14,2);

-- Função para próximo número de NFS-e (baseado em histórico)
CREATE OR REPLACE FUNCTION public.proximo_numero_nfse()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp uuid := current_empresa_id();
  _max int;
BEGIN
  IF _emp IS NULL THEN RAISE EXCEPTION 'no empresa'; END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_nfse, '\D', '', 'g'), '')::int), 0)
    INTO _max
    FROM public.faturamentos
   WHERE empresa_id = _emp AND numero_nfse IS NOT NULL;
  RETURN _max + 1;
END; $$;
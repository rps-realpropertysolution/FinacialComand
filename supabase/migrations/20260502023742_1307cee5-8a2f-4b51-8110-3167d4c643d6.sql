ALTER TABLE public.despesas_sede
  ADD COLUMN IF NOT EXISTS empreendimento_id uuid;

CREATE INDEX IF NOT EXISTS idx_despesas_sede_emp ON public.despesas_sede(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_guias_fiscais_emp ON public.guias_fiscais(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_emp ON public.faturamentos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_contratos_emp ON public.contratos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_emp ON public.colaboradores(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_emp ON public.cashflow(empreendimento_id);
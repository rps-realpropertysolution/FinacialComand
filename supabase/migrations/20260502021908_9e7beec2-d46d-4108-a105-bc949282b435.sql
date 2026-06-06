-- ============ GUIAS FISCAIS ============
create type public.guia_fiscal_categoria as enum ('inss','fgts','iss','irrf','das','pis','cofins','csll','irpj','outros');
create type public.guia_fiscal_status as enum ('pendente','pago','vencido','cancelado');

create table public.guias_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  categoria public.guia_fiscal_categoria not null,
  descricao text not null,
  competencia date not null,
  data_vencimento date not null,
  data_pagamento date,
  valor numeric(14,2) not null default 0,
  valor_pago numeric(14,2),
  status public.guia_fiscal_status not null default 'pendente',
  codigo_receita text,
  numero_documento text,
  observacoes text,
  empreendimento_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guias_fiscais enable row level security;
create policy gf_select on public.guias_fiscais for select to authenticated using (empresa_id = current_empresa_id());
create policy gf_insert on public.guias_fiscais for insert to authenticated with check (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy gf_update on public.guias_fiscais for update to authenticated using (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy gf_delete on public.guias_fiscais for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create trigger trg_gf_updated before update on public.guias_fiscais for each row execute function public.tg_set_updated_at();
create index idx_gf_emp_comp on public.guias_fiscais(empresa_id, competencia);
create index idx_gf_venc on public.guias_fiscais(empresa_id, data_vencimento);

-- ============ COLABORADORES ============
create type public.colaborador_vinculo as enum ('clt','pj','estagio','socio','autonomo');
create type public.colaborador_alocacao as enum ('sede','empreendimento');

create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  nome text not null,
  cpf text,
  cargo text,
  vinculo public.colaborador_vinculo not null default 'clt',
  alocacao public.colaborador_alocacao not null default 'sede',
  empreendimento_id uuid,
  salario_base numeric(14,2) not null default 0,
  vale_refeicao numeric(14,2) not null default 0,
  vale_transporte numeric(14,2) not null default 0,
  plano_saude numeric(14,2) not null default 0,
  outros_beneficios numeric(14,2) not null default 0,
  data_admissao date,
  data_demissao date,
  ativo boolean not null default true,
  email text,
  telefone text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.colaboradores enable row level security;
create policy col_select on public.colaboradores for select to authenticated using (empresa_id = current_empresa_id());
create policy col_insert on public.colaboradores for insert to authenticated with check (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create policy col_update on public.colaboradores for update to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create policy col_delete on public.colaboradores for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create trigger trg_col_updated before update on public.colaboradores for each row execute function public.tg_set_updated_at();

-- ============ FOLHA MENSAL ============
create table public.folha_pagamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  colaborador_id uuid not null,
  competencia date not null,
  salario numeric(14,2) not null default 0,
  beneficios numeric(14,2) not null default 0,
  bonus numeric(14,2) not null default 0,
  horas_extras numeric(14,2) not null default 0,
  descontos numeric(14,2) not null default 0,
  inss numeric(14,2) not null default 0,
  fgts numeric(14,2) not null default 0,
  irrf numeric(14,2) not null default 0,
  outros_encargos numeric(14,2) not null default 0,
  liquido numeric(14,2) generated always as (salario + beneficios + bonus + horas_extras - descontos - inss - irrf) stored,
  custo_total numeric(14,2) generated always as (salario + beneficios + bonus + horas_extras + fgts + outros_encargos) stored,
  status text not null default 'pendente',
  data_pagamento date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (colaborador_id, competencia)
);
alter table public.folha_pagamento enable row level security;
create policy fp_select on public.folha_pagamento for select to authenticated using (empresa_id = current_empresa_id());
create policy fp_insert on public.folha_pagamento for insert to authenticated with check (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy fp_update on public.folha_pagamento for update to authenticated using (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy fp_delete on public.folha_pagamento for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create trigger trg_fp_updated before update on public.folha_pagamento for each row execute function public.tg_set_updated_at();
create index idx_fp_emp_comp on public.folha_pagamento(empresa_id, competencia);

-- ============ DESPESAS SEDE ============
create type public.despesa_sede_categoria as enum ('aluguel','condominio','luz','agua','internet','telefone','material_escritorio','salario_backoffice','reembolso','viagem','transporte','alimentacao','software','contabilidade','juridico','marketing','manutencao','outros');
create type public.despesa_sede_status as enum ('previsto','pago','vencido','cancelado');

create table public.despesas_sede (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  categoria public.despesa_sede_categoria not null,
  descricao text not null,
  fornecedor text,
  competencia date not null,
  data_vencimento date not null,
  data_pagamento date,
  valor numeric(14,2) not null default 0,
  valor_pago numeric(14,2),
  recorrente boolean not null default false,
  status public.despesa_sede_status not null default 'previsto',
  forma_pagamento text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.despesas_sede enable row level security;
create policy ds_select on public.despesas_sede for select to authenticated using (empresa_id = current_empresa_id());
create policy ds_insert on public.despesas_sede for insert to authenticated with check (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy ds_update on public.despesas_sede for update to authenticated using (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy ds_delete on public.despesas_sede for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create trigger trg_ds_updated before update on public.despesas_sede for each row execute function public.tg_set_updated_at();
create index idx_ds_emp_comp on public.despesas_sede(empresa_id, competencia);

-- ============ Função para gerar despesas recorrentes do mês ============
create or replace function public.gerar_despesas_sede_recorrentes(_mes date)
returns int
language plpgsql security definer set search_path=public as $$
declare _emp uuid := current_empresa_id(); _ins int := 0; r record; _comp date;
begin
  if _emp is null then raise exception 'no empresa'; end if;
  _comp := date_trunc('month', _mes)::date;
  for r in
    select distinct on (categoria, descricao, fornecedor) categoria, descricao, fornecedor, valor, data_vencimento
    from public.despesas_sede
    where empresa_id=_emp and recorrente=true and competencia < _comp
    order by categoria, descricao, fornecedor, competencia desc
  loop
    if not exists (
      select 1 from public.despesas_sede
      where empresa_id=_emp and recorrente=true and competencia=_comp
        and categoria=r.categoria and descricao=r.descricao and coalesce(fornecedor,'')=coalesce(r.fornecedor,'')
    ) then
      insert into public.despesas_sede(empresa_id, categoria, descricao, fornecedor, competencia, data_vencimento, valor, recorrente, status)
      values (_emp, r.categoria, r.descricao, r.fornecedor, _comp,
              (_comp + (extract(day from r.data_vencimento)::int - 1))::date,
              r.valor, true, 'previsto');
      _ins := _ins + 1;
    end if;
  end loop;
  return _ins;
end; $$;
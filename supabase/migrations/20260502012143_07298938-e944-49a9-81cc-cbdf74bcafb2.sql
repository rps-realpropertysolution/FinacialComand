
-- Enum de papéis
create type public.app_role as enum ('diretor','gerente','operador');

-- Empresas (tenants)
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text unique,
  created_at timestamptz not null default now()
);
alter table public.empresas enable row level security;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  email text not null,
  role app_role not null default 'operador',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create index profiles_empresa_idx on public.profiles(empresa_id);

-- Função security definer para obter empresa do usuário
create or replace function public.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = _user_id and role = _role);
$$;

-- Empreendimentos
create table public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  codigo text,
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);
alter table public.empreendimentos enable row level security;
create index emp_empresa_idx on public.empreendimentos(empresa_id);

-- Contratos
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  descricao text not null,
  valor_mensal numeric(14,2) not null default 0,
  percentual_reajuste numeric(5,2) not null default 0,
  mes_reajuste int not null default 1 check (mes_reajuste between 1 and 12),
  data_inicio date not null default current_date,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.contratos enable row level security;
create index contratos_empresa_idx on public.contratos(empresa_id);
create index contratos_emp_idx on public.contratos(empreendimento_id);

-- Cashflow
create table public.cashflow (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empreendimento_id uuid references public.empreendimentos(id) on delete set null,
  contrato_id uuid references public.contratos(id) on delete set null,
  mes date not null, -- primeiro dia do mês
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text not null,
  descricao text,
  previsto numeric(14,2) not null default 0,
  realizado numeric(14,2) not null default 0,
  origem text not null default 'manual', -- 'manual' | 'fis'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cashflow enable row level security;
create index cashflow_empresa_idx on public.cashflow(empresa_id);
create index cashflow_mes_idx on public.cashflow(mes);
-- idempotência FIS: 1 lançamento de receita FIS por contrato/mês
create unique index cashflow_fis_unique on public.cashflow(contrato_id, mes, categoria) where origem = 'fis';

-- Trigger updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger cashflow_updated_at before update on public.cashflow
for each row execute function public.tg_set_updated_at();

-- ===== RLS =====
-- profiles: usuário vê o próprio perfil e perfis da mesma empresa
create policy "profiles_self_select" on public.profiles for select to authenticated
  using (id = auth.uid() or empresa_id = public.current_empresa_id());
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid());

-- empresas: vê só a própria
create policy "empresas_select" on public.empresas for select to authenticated
  using (id = public.current_empresa_id());

-- empreendimentos
create policy "emp_select" on public.empreendimentos for select to authenticated
  using (empresa_id = public.current_empresa_id());
create policy "emp_insert" on public.empreendimentos for insert to authenticated
  with check (empresa_id = public.current_empresa_id() and public.has_role(auth.uid(),'diretor'));
create policy "emp_update" on public.empreendimentos for update to authenticated
  using (empresa_id = public.current_empresa_id() and public.has_role(auth.uid(),'diretor'));
create policy "emp_delete" on public.empreendimentos for delete to authenticated
  using (empresa_id = public.current_empresa_id() and public.has_role(auth.uid(),'diretor'));

-- contratos
create policy "contratos_select" on public.contratos for select to authenticated
  using (empresa_id = public.current_empresa_id());
create policy "contratos_insert" on public.contratos for insert to authenticated
  with check (empresa_id = public.current_empresa_id() and public.has_role(auth.uid(),'diretor'));
create policy "contratos_update" on public.contratos for update to authenticated
  using (empresa_id = public.current_empresa_id() and public.has_role(auth.uid(),'diretor'));
create policy "contratos_delete" on public.contratos for delete to authenticated
  using (empresa_id = public.current_empresa_id() and public.has_role(auth.uid(),'diretor'));

-- cashflow
create policy "cf_select" on public.cashflow for select to authenticated
  using (empresa_id = public.current_empresa_id());
create policy "cf_insert" on public.cashflow for insert to authenticated
  with check (empresa_id = public.current_empresa_id());
create policy "cf_update" on public.cashflow for update to authenticated
  using (empresa_id = public.current_empresa_id());
create policy "cf_delete" on public.cashflow for delete to authenticated
  using (empresa_id = public.current_empresa_id());

-- ===== RPCs =====

-- Registrar empresa + diretor (chamado logo após signUp)
create or replace function public.register_empresa(
  _nome_empresa text,
  _cnpj text,
  _nome_usuario text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _empresa_id uuid;
  _email text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile already exists';
  end if;

  insert into public.empresas(nome, cnpj) values (_nome_empresa, _cnpj)
  returning id into _empresa_id;

  select email into _email from auth.users where id = auth.uid();

  insert into public.profiles(id, empresa_id, nome, email, role)
  values (auth.uid(), _empresa_id, _nome_usuario, _email, 'diretor');

  return _empresa_id;
end; $$;

-- Gerar FIS (idempotente) para o mês informado (primeiro dia do mês)
create or replace function public.gerar_fis(_mes date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _emp uuid := public.current_empresa_id();
  _ins int := 0;
  _mes date := date_trunc('month', _mes)::date;
  c record;
  _valor numeric(14,2);
  _anos int;
begin
  if _emp is null then raise exception 'no empresa'; end if;

  for c in
    select * from public.contratos
    where empresa_id = _emp and ativo = true
      and data_inicio <= (_mes + interval '1 month' - interval '1 day')::date
  loop
    -- aplica reajuste anual (composto) se já passou o mês de aniversário em anos anteriores
    _anos := greatest(0, extract(year from age(_mes, c.data_inicio))::int);
    _valor := round(c.valor_mensal * power(1 + (c.percentual_reajuste/100.0), _anos), 2);

    insert into public.cashflow(
      empresa_id, empreendimento_id, contrato_id, mes, tipo, categoria,
      descricao, previsto, realizado, origem
    )
    values (
      _emp, c.empreendimento_id, c.id, _mes, 'receita', 'FIS',
      'Receita prevista — ' || c.descricao, _valor, 0, 'fis'
    )
    on conflict (contrato_id, mes, categoria) where origem = 'fis' do nothing;

    if found then _ins := _ins + 1; end if;
  end loop;

  return _ins;
end; $$;

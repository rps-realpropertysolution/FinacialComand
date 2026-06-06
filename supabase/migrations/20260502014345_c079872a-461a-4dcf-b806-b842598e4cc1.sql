
-- 1) Tomadores (clientes que recebem a NF)
create table public.tomadores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empreendimento_id uuid references public.empreendimentos(id) on delete set null,
  nome text not null,
  razao_social text,
  cnpj text,
  inscricao_municipal text,
  endereco text,
  cidade text default 'São Paulo',
  uf text default 'SP',
  cep text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tomadores(empresa_id);
create index on public.tomadores(empreendimento_id);
alter table public.tomadores enable row level security;
create policy tom_select on public.tomadores for select to authenticated using (empresa_id = current_empresa_id());
create policy tom_insert on public.tomadores for insert to authenticated with check (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create policy tom_update on public.tomadores for update to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create policy tom_delete on public.tomadores for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create trigger trg_tom_upd before update on public.tomadores for each row execute function public.tg_set_updated_at();

-- 2) Configuração do emissor NFS-e
create table public.emissor_config (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  cnpj_emissor text,
  inscricao_municipal text,
  razao_social text,
  regime_tributario text default 'simples_nacional',
  codigo_servico text default '17.19',
  aliquota_iss numeric(5,2) default 5.00,
  iss_retido boolean default false,
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao','producao')),
  serie_rps text default '1',
  proximo_numero_rps integer not null default 1,
  observacoes text,
  updated_at timestamptz not null default now()
);
alter table public.emissor_config enable row level security;
create policy emc_select on public.emissor_config for select to authenticated using (empresa_id = current_empresa_id());
create policy emc_upsert on public.emissor_config for insert to authenticated with check (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create policy emc_update on public.emissor_config for update to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));

-- 3) Faturamentos
create type public.faturamento_status as enum ('pendente','emitida','paga','vencida','cancelada');

create table public.faturamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empreendimento_id uuid references public.empreendimentos(id) on delete set null,
  tomador_id uuid references public.tomadores(id) on delete set null,
  contrato_id uuid references public.contratos(id) on delete set null,
  competencia date not null,           -- mês de referência (1º dia)
  data_emissao date,
  data_vencimento date not null,
  -- valores quebrados (espelha planilha)
  valor_honorarios numeric(14,2) not null default 0,
  valor_massa_salarial numeric(14,2) not null default 0,
  valor_relatorios numeric(14,2) not null default 0,
  valor_juridico numeric(14,2) not null default 0,
  valor_viagem numeric(14,2) not null default 0,
  valor_total numeric(14,2) generated always as (
    coalesce(valor_honorarios,0)+coalesce(valor_massa_salarial,0)+
    coalesce(valor_relatorios,0)+coalesce(valor_juridico,0)+coalesce(valor_viagem,0)
  ) stored,
  -- reajuste
  indice_reajuste text,
  mes_base_reajuste text,
  vigencia_contratual text,
  -- NFS-e
  status public.faturamento_status not null default 'pendente',
  numero_nfse text,
  numero_rps text,
  serie_rps text,
  xml_rps text,
  link_nfse text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.faturamentos(empresa_id, competencia);
create index on public.faturamentos(tomador_id);
create index on public.faturamentos(status);
create unique index ux_fat_unique on public.faturamentos(empresa_id, tomador_id, competencia);

alter table public.faturamentos enable row level security;
create policy fat_select on public.faturamentos for select to authenticated using (empresa_id = current_empresa_id());
create policy fat_insert on public.faturamentos for insert to authenticated with check (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create policy fat_update on public.faturamentos for update to authenticated using (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy fat_delete on public.faturamentos for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));
create trigger trg_fat_upd before update on public.faturamentos for each row execute function public.tg_set_updated_at();

-- 4) Pagamentos / conciliação
create table public.faturamento_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  faturamento_id uuid not null references public.faturamentos(id) on delete cascade,
  data_pagamento date not null,
  valor_pago numeric(14,2) not null,
  forma_pagamento text default 'pix',
  observacao text,
  created_at timestamptz not null default now()
);
create index on public.faturamento_pagamentos(faturamento_id);
alter table public.faturamento_pagamentos enable row level security;
create policy fpg_select on public.faturamento_pagamentos for select to authenticated using (empresa_id = current_empresa_id());
create policy fpg_insert on public.faturamento_pagamentos for insert to authenticated with check (empresa_id = current_empresa_id() and (has_role(auth.uid(),'diretor') or has_role(auth.uid(),'gerente')));
create policy fpg_delete on public.faturamento_pagamentos for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));

-- 5) Alertas
create type public.alerta_tipo as enum ('reajuste','vencimento_proximo','vencido','conciliacao_pendente','emissao_pendente');

create table public.alertas_faturamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  faturamento_id uuid references public.faturamentos(id) on delete cascade,
  tomador_id uuid references public.tomadores(id) on delete set null,
  tipo public.alerta_tipo not null,
  mensagem text not null,
  severidade text not null default 'info' check (severidade in ('info','warning','critical')),
  resolvido boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.alertas_faturamento(empresa_id, resolvido);
alter table public.alertas_faturamento enable row level security;
create policy alf_select on public.alertas_faturamento for select to authenticated using (empresa_id = current_empresa_id());
create policy alf_update on public.alertas_faturamento for update to authenticated using (empresa_id = current_empresa_id());
create policy alf_insert on public.alertas_faturamento for insert to authenticated with check (empresa_id = current_empresa_id());
create policy alf_delete on public.alertas_faturamento for delete to authenticated using (empresa_id = current_empresa_id() and has_role(auth.uid(),'diretor'));

-- 6) RPC: registrar pagamento
create or replace function public.marcar_faturamento_pago(
  _faturamento_id uuid,
  _data_pagamento date,
  _valor numeric,
  _forma text default 'pix',
  _obs text default null
) returns void
language plpgsql security definer set search_path=public as $$
declare _emp uuid := current_empresa_id();
begin
  if _emp is null then raise exception 'no empresa'; end if;
  if not exists (select 1 from public.faturamentos where id=_faturamento_id and empresa_id=_emp) then
    raise exception 'faturamento not found';
  end if;
  insert into public.faturamento_pagamentos(empresa_id, faturamento_id, data_pagamento, valor_pago, forma_pagamento, observacao)
  values (_emp, _faturamento_id, _data_pagamento, _valor, _forma, _obs);
  update public.faturamentos set status='paga', updated_at=now() where id=_faturamento_id;
  update public.alertas_faturamento set resolvido=true
    where faturamento_id=_faturamento_id and tipo in ('vencido','vencimento_proximo','conciliacao_pendente');
end; $$;

-- 7) RPC: gerar alertas
create or replace function public.gerar_alertas_faturamento() returns integer
language plpgsql security definer set search_path=public as $$
declare _emp uuid := current_empresa_id(); _ins int := 0; r record;
begin
  if _emp is null then raise exception 'no empresa'; end if;

  -- vencidos
  for r in
    select f.id, f.data_vencimento, t.nome as tomador
    from public.faturamentos f
    left join public.tomadores t on t.id=f.tomador_id
    where f.empresa_id=_emp
      and f.status in ('pendente','emitida','vencida')
      and f.data_vencimento < current_date
  loop
    update public.faturamentos set status='vencida' where id=r.id and status<>'vencida';
    if not exists (select 1 from public.alertas_faturamento where faturamento_id=r.id and tipo='vencido' and resolvido=false) then
      insert into public.alertas_faturamento(empresa_id, faturamento_id, tipo, mensagem, severidade)
      values (_emp, r.id, 'vencido', 'Faturamento vencido em '||to_char(r.data_vencimento,'DD/MM/YYYY')||' — '||coalesce(r.tomador,''), 'critical');
      _ins := _ins+1;
    end if;
  end loop;

  -- vencimento em até 5 dias
  for r in
    select f.id, f.data_vencimento, t.nome as tomador
    from public.faturamentos f left join public.tomadores t on t.id=f.tomador_id
    where f.empresa_id=_emp and f.status in ('pendente','emitida')
      and f.data_vencimento between current_date and current_date + interval '5 days'
  loop
    if not exists (select 1 from public.alertas_faturamento where faturamento_id=r.id and tipo='vencimento_proximo' and resolvido=false) then
      insert into public.alertas_faturamento(empresa_id, faturamento_id, tipo, mensagem, severidade)
      values (_emp, r.id, 'vencimento_proximo','Vence em '||to_char(r.data_vencimento,'DD/MM/YYYY')||' — '||coalesce(r.tomador,''),'warning');
      _ins := _ins+1;
    end if;
  end loop;

  -- emissão pendente (competência atual ou anterior, sem nfse)
  for r in
    select f.id, f.competencia, t.nome as tomador
    from public.faturamentos f left join public.tomadores t on t.id=f.tomador_id
    where f.empresa_id=_emp and f.status='pendente'
      and f.numero_nfse is null
      and f.competencia <= date_trunc('month', current_date)::date
  loop
    if not exists (select 1 from public.alertas_faturamento where faturamento_id=r.id and tipo='emissao_pendente' and resolvido=false) then
      insert into public.alertas_faturamento(empresa_id, faturamento_id, tipo, mensagem, severidade)
      values (_emp, r.id,'emissao_pendente','NF pendente de emissão — '||coalesce(r.tomador,'')||' ('||to_char(r.competencia,'MM/YYYY')||')','warning');
      _ins := _ins+1;
    end if;
  end loop;

  return _ins;
end; $$;

-- 8) RPC: gerar XML RPS no padrão ABRASF/SP
create or replace function public.gerar_xml_rps_sp(_faturamento_id uuid) returns text
language plpgsql security definer set search_path=public as $$
declare
  _emp uuid := current_empresa_id();
  f record; t record; e record;
  _numero int; _xml text;
begin
  if _emp is null then raise exception 'no empresa'; end if;
  select * into f from public.faturamentos where id=_faturamento_id and empresa_id=_emp;
  if f is null then raise exception 'faturamento not found'; end if;
  select * into t from public.tomadores where id=f.tomador_id;
  select * into e from public.emissor_config where empresa_id=_emp;
  if e is null then raise exception 'configurar emissor antes de gerar RPS'; end if;

  _numero := e.proximo_numero_rps;
  update public.emissor_config set proximo_numero_rps = proximo_numero_rps+1, updated_at=now() where empresa_id=_emp;

  _xml := '<?xml version="1.0" encoding="UTF-8"?>'||chr(10)||
'<PedidoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">'||chr(10)||
'  <Cabecalho Versao="1"><CPFCNPJRemetente><CNPJ>'||regexp_replace(coalesce(e.cnpj_emissor,''),'\D','','g')||'</CNPJ></CPFCNPJRemetente></Cabecalho>'||chr(10)||
'  <RPS>'||chr(10)||
'    <Assinatura>PENDENTE_ASSINATURA_DIGITAL</Assinatura>'||chr(10)||
'    <ChaveRPS>'||chr(10)||
'      <InscricaoPrestador>'||coalesce(e.inscricao_municipal,'')||'</InscricaoPrestador>'||chr(10)||
'      <SerieRPS>'||coalesce(e.serie_rps,'1')||'</SerieRPS>'||chr(10)||
'      <NumeroRPS>'||_numero||'</NumeroRPS>'||chr(10)||
'    </ChaveRPS>'||chr(10)||
'    <TipoRPS>RPS</TipoRPS>'||chr(10)||
'    <DataEmissao>'||to_char(coalesce(f.data_emissao,current_date),'YYYY-MM-DD')||'</DataEmissao>'||chr(10)||
'    <StatusRPS>N</StatusRPS>'||chr(10)||
'    <TributacaoRPS>T</TributacaoRPS>'||chr(10)||
'    <ValorServicos>'||to_char(f.valor_total,'FM999999990.00')||'</ValorServicos>'||chr(10)||
'    <ValorDeducoes>0.00</ValorDeducoes>'||chr(10)||
'    <CodigoServico>'||replace(coalesce(e.codigo_servico,'17.19'),'.','')||'</CodigoServico>'||chr(10)||
'    <AliquotaServicos>'||to_char(coalesce(e.aliquota_iss,5)/100,'FM0.0000')||'</AliquotaServicos>'||chr(10)||
'    <ISSRetido>'||case when coalesce(e.iss_retido,false) then 'true' else 'false' end||'</ISSRetido>'||chr(10)||
'    <CPFCNPJTomador><CNPJ>'||regexp_replace(coalesce(t.cnpj,''),'\D','','g')||'</CNPJ></CPFCNPJTomador>'||chr(10)||
'    <RazaoSocialTomador>'||coalesce(t.razao_social,t.nome,'')||'</RazaoSocialTomador>'||chr(10)||
'    <EmailTomador>'||coalesce(t.email,'')||'</EmailTomador>'||chr(10)||
'    <Discriminacao>Honorarios competencia '||to_char(f.competencia,'MM/YYYY')||
        case when f.valor_honorarios>0 then ' | Honorarios: '||to_char(f.valor_honorarios,'FM999999990.00') else '' end||
        case when f.valor_massa_salarial>0 then ' | Massa Salarial: '||to_char(f.valor_massa_salarial,'FM999999990.00') else '' end||
        case when f.valor_relatorios>0 then ' | Relatorios: '||to_char(f.valor_relatorios,'FM999999990.00') else '' end||
        case when f.valor_juridico>0 then ' | Juridico: '||to_char(f.valor_juridico,'FM999999990.00') else '' end||
        case when f.valor_viagem>0 then ' | Viagem: '||to_char(f.valor_viagem,'FM999999990.00') else '' end||
        '</Discriminacao>'||chr(10)||
'  </RPS>'||chr(10)||
'</PedidoEnvioRPS>';

  update public.faturamentos
     set xml_rps=_xml, numero_rps=_numero::text, serie_rps=coalesce(e.serie_rps,'1'),
         data_emissao=coalesce(data_emissao,current_date), updated_at=now()
   where id=_faturamento_id;
  return _xml;
end; $$;

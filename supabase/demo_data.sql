-- ============================================================================
-- DADOS FICTÍCIOS DE DEMONSTRAÇÃO — empresa RPS (33333333-...)
-- Re-executável: limpa o demo anterior e reinsere.
-- ============================================================================
begin;

-- limpeza (filhos -> pais)
delete from public.faturamento_pagamentos where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.faturamentos          where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.folha_pagamento       where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.colaboradores         where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.cashflow              where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.guias_fiscais         where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.despesas_sede         where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.alertas_faturamento   where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.contratos             where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.tomadores             where empresa_id = '33333333-3333-3333-3333-333333333333';
delete from public.empreendimentos       where empresa_id = '33333333-3333-3333-3333-333333333333';

-- EMPREENDIMENTOS
insert into public.empreendimentos (id, empresa_id, nome, codigo, status) values
 ('e0000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Edifício Faria Lima Square','EMP-001','ativo'),
 ('e0000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','Condomínio Parque das Águas','EMP-002','ativo'),
 ('e0000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Centro Empresarial Berrini','EMP-003','ativo'),
 ('e0000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','Residencial Vila Nova','EMP-004','ativo');

-- TOMADORES (clientes)
insert into public.tomadores (id, empresa_id, empreendimento_id, nome, razao_social, cnpj, cidade, uf, ativo) values
 ('70000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','e0000001-0000-0000-0000-000000000001','Cond. Faria Lima Square','Condomínio Edifício Faria Lima Square','12.345.678/0001-90','São Paulo','SP',true),
 ('70000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','e0000002-0000-0000-0000-000000000002','Cond. Parque das Águas','Condomínio Parque das Águas','23.456.789/0001-01','São Paulo','SP',true),
 ('70000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','e0000003-0000-0000-0000-000000000003','Cond. Berrini','Centro Empresarial Berrini','34.567.890/0001-12','São Paulo','SP',true),
 ('70000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','e0000004-0000-0000-0000-000000000004','Cond. Vila Nova','Condomínio Residencial Vila Nova','45.678.901/0001-23','São Paulo','SP',true);

-- CONTRATOS (honorários mensais)
insert into public.contratos (id, empresa_id, empreendimento_id, descricao, valor_mensal, percentual_reajuste, mes_reajuste, data_inicio, ativo) values
 ('c0000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','e0000001-0000-0000-0000-000000000001','Honorários de administração predial',18000,5.5,1,'2025-01-01',true),
 ('c0000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','e0000002-0000-0000-0000-000000000002','Honorários de administração condominial',12000,5.0,1,'2025-03-01',true),
 ('c0000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','e0000003-0000-0000-0000-000000000003','Honorários de administração predial corporativa',22000,6.0,1,'2024-07-01',true),
 ('c0000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','e0000004-0000-0000-0000-000000000004','Honorários de administração condominial',7500,4.5,1,'2025-06-01',true);

-- CASHFLOW — receitas (honorários) jan..jun/2026
insert into public.cashflow (empresa_id, empreendimento_id, contrato_id, mes, tipo, categoria, descricao, previsto, realizado, origem)
select '33333333-3333-3333-3333-333333333333', e.id, e.cid, m.mes, 'receita', 'honorarios',
       'Honorários ' || to_char(m.mes,'MM/YYYY'), e.valor,
       case when m.mes < date '2026-06-01' then round((e.valor * (0.95 + random()*0.08))::numeric, 2) else 0 end, 'fis'
from (values
  ('e0000001-0000-0000-0000-000000000001'::uuid,'c0000001-0000-0000-0000-000000000001'::uuid,18000::numeric),
  ('e0000002-0000-0000-0000-000000000002'::uuid,'c0000002-0000-0000-0000-000000000002'::uuid,12000),
  ('e0000003-0000-0000-0000-000000000003'::uuid,'c0000003-0000-0000-0000-000000000003'::uuid,22000),
  ('e0000004-0000-0000-0000-000000000004'::uuid,'c0000004-0000-0000-0000-000000000004'::uuid,7500)
) as e(id,cid,valor)
cross join (select generate_series(date '2026-01-01', date '2026-06-01', interval '1 month')::date as mes) m;

-- CASHFLOW — despesas da sede jan..jun/2026
insert into public.cashflow (empresa_id, mes, tipo, categoria, descricao, previsto, realizado, origem)
select '33333333-3333-3333-3333-333333333333', m.mes, 'despesa', d.cat, d.descr, d.val,
       case when m.mes < date '2026-06-01' then round((d.val * (0.97 + random()*0.06))::numeric, 2) else 0 end, 'manual'
from (values
  ('folha','Folha de pagamento (sede)', 42000::numeric),
  ('aluguel','Aluguel + condomínio sede', 9500),
  ('impostos','Tributos e guias', 11800),
  ('operacional','Despesas operacionais', 6200)
) as d(cat,descr,val)
cross join (select generate_series(date '2026-01-01', date '2026-06-01', interval '1 month')::date as mes) m;

-- FATURAMENTOS — mensais por empreendimento
insert into public.faturamentos (empresa_id, empreendimento_id, tomador_id, contrato_id, competencia, data_emissao, data_vencimento, valor_honorarios, valor_massa_salarial, valor_relatorios, valor_juridico, valor_viagem, status)
select '33333333-3333-3333-3333-333333333333', e.id, e.tid, e.cid, m.mes,
       case when m.mes <= date '2026-05-01' then m.mes + 2 else null end,
       m.mes + 10,
       e.valor, round(e.valor*0.25,2), 350, 0, 0,
       (case when m.mes <= date '2026-04-01' then 'paga'
             when m.mes = date '2026-05-01' then 'emitida'
             else 'pendente' end)::public.faturamento_status
from (values
  ('e0000001-0000-0000-0000-000000000001'::uuid,'70000001-0000-0000-0000-000000000001'::uuid,'c0000001-0000-0000-0000-000000000001'::uuid,18000::numeric),
  ('e0000002-0000-0000-0000-000000000002'::uuid,'70000002-0000-0000-0000-000000000002'::uuid,'c0000002-0000-0000-0000-000000000002'::uuid,12000),
  ('e0000003-0000-0000-0000-000000000003'::uuid,'70000003-0000-0000-0000-000000000003'::uuid,'c0000003-0000-0000-0000-000000000003'::uuid,22000),
  ('e0000004-0000-0000-0000-000000000004'::uuid,'70000004-0000-0000-0000-000000000004'::uuid,'c0000004-0000-0000-0000-000000000004'::uuid,7500)
) as e(id,tid,cid,valor)
cross join (select generate_series(date '2026-01-01', date '2026-06-01', interval '1 month')::date as mes) m;

-- DESPESAS DA SEDE
insert into public.despesas_sede (empresa_id, categoria, descricao, fornecedor, competencia, data_vencimento, data_pagamento, valor, valor_pago, recorrente, status)
select '33333333-3333-3333-3333-333333333333', d.cat::public.despesa_sede_categoria, d.descr, d.forn, m.mes, m.mes + 9,
       case when m.mes < date '2026-06-01' then m.mes + 8 else null end,
       d.val, case when m.mes < date '2026-06-01' then d.val else null end, true,
       (case when m.mes < date '2026-06-01' then 'pago' else 'previsto' end)::public.despesa_sede_status
from (values
  ('aluguel','Aluguel sede Av. Paulista','Imobiliária Central',7800::numeric),
  ('luz','Energia elétrica','Enel SP',1850),
  ('internet','Link dedicado 500MB','Vivo Empresas',590),
  ('software','Licenças SaaS (ERP/BI)','Diversos',1450),
  ('contabilidade','Honorários contábeis','Contábil Prime',2600)
) as d(cat,descr,forn,val)
cross join (select generate_series(date '2026-01-01', date '2026-06-01', interval '1 month')::date as mes) m;

-- GUIAS FISCAIS
insert into public.guias_fiscais (empresa_id, categoria, descricao, competencia, data_vencimento, data_pagamento, valor, valor_pago, status)
select '33333333-3333-3333-3333-333333333333', g.cat::public.guia_fiscal_categoria, g.descr, m.mes, m.mes + 19,
       case when m.mes < date '2026-06-01' then m.mes + 18 else null end,
       g.val, case when m.mes < date '2026-06-01' then g.val else null end,
       (case when m.mes < date '2026-06-01' then 'pago' else 'pendente' end)::public.guia_fiscal_status
from (values
  ('inss','INSS sobre folha',9200::numeric),
  ('fgts','FGTS',3360),
  ('iss','ISS sobre serviços',2950),
  ('das','DAS Simples Nacional',5400)
) as g(cat,descr,val)
cross join (select generate_series(date '2026-01-01', date '2026-06-01', interval '1 month')::date as mes) m;

-- COLABORADORES
insert into public.colaboradores (id, empresa_id, nome, cpf, cargo, vinculo, alocacao, empreendimento_id, salario_base, vale_refeicao, vale_transporte, plano_saude, outros_beneficios, data_admissao, ativo, email) values
 ('c1000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Ana Paula Souza','111.111.111-11','Analista Financeiro','clt','sede',null,4800,660,220,420,0,'2024-02-01',true,'ana.souza@rpsglobal.com.br'),
 ('c1000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','Carlos Mendes','222.222.222-22','Contador','pj','sede',null,8500,0,0,0,0,'2023-09-15',true,'carlos.mendes@rpsglobal.com.br'),
 ('c1000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Mariana Lima','333.333.333-33','Gerente Operacional','clt','empreendimento','e0000003-0000-0000-0000-000000000003',7200,880,300,650,0,'2024-06-10',true,'mariana.lima@rpsglobal.com.br'),
 ('c1000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','João Pereira','444.444.444-44','Assistente Administrativo','clt','sede',null,3200,550,200,420,0,'2025-01-20',true,'joao.pereira@rpsglobal.com.br');

-- FOLHA DE PAGAMENTO (competência 05/2026)
insert into public.folha_pagamento (empresa_id, colaborador_id, competencia, salario, beneficios, bonus, horas_extras, descontos, inss, fgts, irrf, outros_encargos, status, data_pagamento)
select '33333333-3333-3333-3333-333333333333', c.id, date '2026-05-01', c.salario_base,
       (c.vale_refeicao + c.vale_transporte + c.plano_saude), 0, 0, 0,
       round(c.salario_base*0.11,2), round(c.salario_base*0.08,2), round(c.salario_base*0.075,2), round(c.salario_base*0.20,2),
       'pago', date '2026-06-05'
from public.colaboradores c where c.empresa_id = '33333333-3333-3333-3333-333333333333';

-- ALERTAS
insert into public.alertas_faturamento (empresa_id, tipo, mensagem, severidade, resolvido) values
 ('33333333-3333-3333-3333-333333333333','emissao_pendente','3 faturamentos de 06/2026 aguardando emissão de NFS-e.','critical',false),
 ('33333333-3333-3333-3333-333333333333','vencimento_proximo','Guia DAS de 06/2026 vence em 20/07.','warning',false),
 ('33333333-3333-3333-3333-333333333333','reajuste','Contrato EMP-003 entra em reajuste (6%) em 01/2027.','info',false);

commit;

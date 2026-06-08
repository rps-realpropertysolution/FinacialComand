-- ============================================================================
-- DADOS FICTÍCIOS DE DEMONSTRAÇÃO — empresa RPS (33333333-...)
-- Dataset com VARIAÇÃO realista (não-linear): crescimento, sazonalidade,
-- inadimplência/disputa, churn de cliente, novo contrato grande, picos de
-- despesa (reforma, bônus, campanha). Re-executável (limpa e reinsere).
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

-- EMPREENDIMENTOS (e4 encerrado; e5 novo cliente)
insert into public.empreendimentos (id, empresa_id, nome, codigo, status) values
 ('e0000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Edifício Faria Lima Square','EMP-001','ativo'),
 ('e0000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','Condomínio Parque das Águas','EMP-002','ativo'),
 ('e0000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Centro Empresarial Berrini','EMP-003','ativo'),
 ('e0000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','Residencial Vila Nova','EMP-004','encerrado'),
 ('e0000005-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','Centro Logístico Anhanguera','EMP-005','ativo');

insert into public.tomadores (id, empresa_id, empreendimento_id, nome, razao_social, cnpj, cidade, uf, ativo) values
 ('70000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','e0000001-0000-0000-0000-000000000001','Cond. Faria Lima Square','Condomínio Edifício Faria Lima Square','12.345.678/0001-90','São Paulo','SP',true),
 ('70000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','e0000002-0000-0000-0000-000000000002','Cond. Parque das Águas','Condomínio Parque das Águas','23.456.789/0001-01','São Paulo','SP',true),
 ('70000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','e0000003-0000-0000-0000-000000000003','Cond. Berrini','Centro Empresarial Berrini','34.567.890/0001-12','São Paulo','SP',true),
 ('70000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','e0000004-0000-0000-0000-000000000004','Cond. Vila Nova','Condomínio Residencial Vila Nova','45.678.901/0001-23','São Paulo','SP',false),
 ('70000005-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','e0000005-0000-0000-0000-000000000005','Centro Logístico Anhanguera','Anhanguera Logística S.A.','56.789.012/0001-34','Osasco','SP',true);

insert into public.contratos (id, empresa_id, empreendimento_id, descricao, valor_mensal, percentual_reajuste, mes_reajuste, data_inicio, ativo) values
 ('c0000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','e0000001-0000-0000-0000-000000000001','Honorários de administração predial',19000,5.5,3,'2025-01-01',true),
 ('c0000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','e0000002-0000-0000-0000-000000000002','Honorários de administração condominial',12600,5.0,5,'2026-03-01',true),
 ('c0000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','e0000003-0000-0000-0000-000000000003','Honorários de administração corporativa',23300,6.0,3,'2024-07-01',true),
 ('c0000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','e0000004-0000-0000-0000-000000000004','Honorários de administração condominial',7500,4.5,1,'2025-06-01',false),
 ('c0000005-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','e0000005-0000-0000-0000-000000000005','Honorários de administração logística',26000,6.5,5,'2026-05-01',true);

-- ===== Receitas por empreendimento/mês (previsto x realizado) — NÃO lineares =====
-- e1 estável c/ leve crescimento; e2 entrou em Mar; e3 grande com disputa em Abr
-- e recuperação em Mai; e4 declinou e encerrou em Mai; e5 novo cliente desde Mai.
create temp table _rec(emp_id uuid, tid uuid, cid uuid, mes date, previsto numeric, realizado numeric) on commit drop;
insert into _rec values
 ('e0000001-0000-0000-0000-000000000001','70000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','2026-01-01',18000,17500),
 ('e0000001-0000-0000-0000-000000000001','70000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','2026-02-01',18000,18000),
 ('e0000001-0000-0000-0000-000000000001','70000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','2026-03-01',19000,16200),
 ('e0000001-0000-0000-0000-000000000001','70000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','2026-04-01',19000,19800),
 ('e0000001-0000-0000-0000-000000000001','70000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','2026-05-01',19000,19000),
 ('e0000001-0000-0000-0000-000000000001','70000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','2026-06-01',19500,0),
 ('e0000002-0000-0000-0000-000000000002','70000002-0000-0000-0000-000000000002','c0000002-0000-0000-0000-000000000002','2026-03-01',12000,11000),
 ('e0000002-0000-0000-0000-000000000002','70000002-0000-0000-0000-000000000002','c0000002-0000-0000-0000-000000000002','2026-04-01',12000,12000),
 ('e0000002-0000-0000-0000-000000000002','70000002-0000-0000-0000-000000000002','c0000002-0000-0000-0000-000000000002','2026-05-01',12600,9800),
 ('e0000002-0000-0000-0000-000000000002','70000002-0000-0000-0000-000000000002','c0000002-0000-0000-0000-000000000002','2026-06-01',12600,0),
 ('e0000003-0000-0000-0000-000000000003','70000003-0000-0000-0000-000000000003','c0000003-0000-0000-0000-000000000003','2026-01-01',22000,22000),
 ('e0000003-0000-0000-0000-000000000003','70000003-0000-0000-0000-000000000003','c0000003-0000-0000-0000-000000000003','2026-02-01',22000,21000),
 ('e0000003-0000-0000-0000-000000000003','70000003-0000-0000-0000-000000000003','c0000003-0000-0000-0000-000000000003','2026-03-01',23300,23300),
 ('e0000003-0000-0000-0000-000000000003','70000003-0000-0000-0000-000000000003','c0000003-0000-0000-0000-000000000003','2026-04-01',23300,8000),
 ('e0000003-0000-0000-0000-000000000003','70000003-0000-0000-0000-000000000003','c0000003-0000-0000-0000-000000000003','2026-05-01',23300,35000),
 ('e0000003-0000-0000-0000-000000000003','70000003-0000-0000-0000-000000000003','c0000003-0000-0000-0000-000000000003','2026-06-01',23300,0),
 ('e0000004-0000-0000-0000-000000000004','70000004-0000-0000-0000-000000000004','c0000004-0000-0000-0000-000000000004','2026-01-01',7500,7500),
 ('e0000004-0000-0000-0000-000000000004','70000004-0000-0000-0000-000000000004','c0000004-0000-0000-0000-000000000004','2026-02-01',7500,7000),
 ('e0000004-0000-0000-0000-000000000004','70000004-0000-0000-0000-000000000004','c0000004-0000-0000-0000-000000000004','2026-03-01',7500,7500),
 ('e0000004-0000-0000-0000-000000000004','70000004-0000-0000-0000-000000000004','c0000004-0000-0000-0000-000000000004','2026-04-01',7500,3500),
 ('e0000004-0000-0000-0000-000000000004','70000004-0000-0000-0000-000000000004','c0000004-0000-0000-0000-000000000004','2026-05-01',3000,3000),
 ('e0000005-0000-0000-0000-000000000005','70000005-0000-0000-0000-000000000005','c0000005-0000-0000-0000-000000000005','2026-05-01',26000,26000),
 ('e0000005-0000-0000-0000-000000000005','70000005-0000-0000-0000-000000000005','c0000005-0000-0000-0000-000000000005','2026-06-01',26000,0);

insert into public.cashflow (empresa_id, empreendimento_id, contrato_id, mes, tipo, categoria, descricao, previsto, realizado, origem)
select '33333333-3333-3333-3333-333333333333', emp_id, cid, mes, 'receita', 'honorarios',
       'Honorários ' || to_char(mes,'MM/YYYY'), previsto, realizado, 'fis'
from _rec;

-- ===== Despesas (sede) por mês — com picos (reforma em Abr, bônus em Mai, campanha) =====
insert into public.cashflow (empresa_id, mes, tipo, categoria, descricao, previsto, realizado, origem) values
 ('33333333-3333-3333-3333-333333333333','2026-01-01','despesa','folha','Folha + encargos (sede)',40000,39500,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-02-01','despesa','folha','Folha + encargos (sede)',40000,40000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-03-01','despesa','folha','Folha + encargos (sede)',41000,40800,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-04-01','despesa','folha','Folha + encargos (sede)',41000,41000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-05-01','despesa','folha','Folha + bônus + contratações',58000,57500,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-06-01','despesa','folha','Folha + encargos (sede)',44000,0,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-01-01','despesa','impostos','Tributos e guias',11000,11000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-02-01','despesa','impostos','Tributos e guias',10500,10500,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-03-01','despesa','impostos','Tributos e guias',12500,12500,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-04-01','despesa','impostos','Tributos e guias',9000,9000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-05-01','despesa','impostos','Tributos e guias',16000,16000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-06-01','despesa','impostos','Tributos e guias',12000,0,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-01-01','despesa','operacional','Despesas operacionais',6000,5800,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-02-01','despesa','operacional','Despesas operacionais',5500,5500,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-03-01','despesa','operacional','Despesas operacionais',6500,6500,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-04-01','despesa','operacional','Reforma + mudança da sede (one-off)',21000,21000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-05-01','despesa','operacional','Despesas operacionais',7000,7000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-06-01','despesa','operacional','Despesas operacionais',6000,0,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-03-01','despesa','marketing','Material institucional',4000,4000,'manual'),
 ('33333333-3333-3333-3333-333333333333','2026-05-01','despesa','marketing','Campanha de captação de clientes',12000,12000,'manual');

-- ===== Faturamentos (status variado a partir das receitas) =====
insert into public.faturamentos (empresa_id, empreendimento_id, tomador_id, contrato_id, competencia, data_emissao, data_vencimento, valor_honorarios, valor_massa_salarial, valor_relatorios, valor_juridico, valor_viagem, status)
select '33333333-3333-3333-3333-333333333333', emp_id, tid, cid, mes,
       case when mes <= date '2026-05-01' then mes + 3 else null end,
       mes + 12, previsto, round(previsto*0.25,2), 350, 0, 0,
       (case
          when mes <= date '2026-03-01' then 'paga'
          when mes = date '2026-04-01' and emp_id in ('e0000003-0000-0000-0000-000000000003','e0000004-0000-0000-0000-000000000004') then 'vencida'
          when mes = date '2026-04-01' then 'paga'
          when mes = date '2026-05-01' then 'emitida'
          else 'pendente'
        end)::public.faturamento_status
from _rec;

-- ===== Despesas da sede (tabela própria) — valores variando + uma vencida =====
insert into public.despesas_sede (empresa_id, categoria, descricao, fornecedor, competencia, data_vencimento, data_pagamento, valor, valor_pago, recorrente, status)
select '33333333-3333-3333-3333-333333333333', d.cat::public.despesa_sede_categoria, d.descr, d.forn, m.mes, m.mes + 9,
       case when m.mes < date '2026-06-01' then m.mes + 8 else null end,
       round(d.base * (0.9 + (extract(month from m.mes)::numeric/20)), 2),
       case when m.mes < date '2026-06-01' then round(d.base * (0.9 + (extract(month from m.mes)::numeric/20)), 2) else null end,
       true,
       (case when m.mes < date '2026-05-01' then 'pago' else 'previsto' end)::public.despesa_sede_status
from (values
  ('aluguel','Aluguel sede Av. Paulista','Imobiliária Central',7800::numeric),
  ('luz','Energia elétrica','Enel SP',1900),
  ('internet','Link dedicado 500MB','Vivo Empresas',590),
  ('software','Licenças SaaS (ERP/BI)','Diversos',1450),
  ('contabilidade','Honorários contábeis','Contábil Prime',2600)
) as d(cat,descr,forn,base)
cross join (select generate_series(date '2026-01-01', date '2026-06-01', interval '1 month')::date as mes) m;
-- conta de luz de Abr esquecida -> vencida
update public.despesas_sede set status = 'vencido', data_pagamento = null, valor_pago = null
 where empresa_id = '33333333-3333-3333-3333-333333333333' and categoria = 'luz' and competencia = date '2026-04-01';

-- ===== Guias fiscais — valores acompanham a folha/receita do mês =====
insert into public.guias_fiscais (empresa_id, categoria, descricao, competencia, data_vencimento, data_pagamento, valor, valor_pago, status)
select '33333333-3333-3333-3333-333333333333', g.cat::public.guia_fiscal_categoria, g.descr, fator.mes, fator.mes + 19,
       case when fator.mes < date '2026-06-01' then fator.mes + 18 else null end,
       round(g.base * fator.f, 2),
       case when fator.mes < date '2026-06-01' then round(g.base * fator.f, 2) else null end,
       (case when fator.mes < date '2026-06-01' then 'pago' else 'pendente' end)::public.guia_fiscal_status
from (values
  ('inss','INSS sobre folha',9200::numeric),
  ('fgts','FGTS',3360),
  ('iss','ISS sobre serviços',2950),
  ('das','DAS Simples Nacional',5400)
) as g(cat,descr,base)
cross join (values
  (date '2026-01-01',0.95),(date '2026-02-01',0.98),(date '2026-03-01',1.05),
  (date '2026-04-01',1.00),(date '2026-05-01',1.35),(date '2026-06-01',1.05)
) as fator(mes,f);

-- ===== Colaboradores (1 demitido, 1 recém-contratado) + folha 05/2026 c/ bônus =====
insert into public.colaboradores (id, empresa_id, nome, cpf, cargo, vinculo, alocacao, empreendimento_id, salario_base, vale_refeicao, vale_transporte, plano_saude, outros_beneficios, data_admissao, data_demissao, ativo, email) values
 ('c1000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Ana Paula Souza','111.111.111-11','Analista Financeiro Sênior','clt','sede',null,5400,660,220,420,0,'2024-02-01',null,true,'ana.souza@rpsglobal.com.br'),
 ('c1000002-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','Carlos Mendes','222.222.222-22','Contador','pj','sede',null,8500,0,0,0,0,'2023-09-15',null,true,'carlos.mendes@rpsglobal.com.br'),
 ('c1000003-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Mariana Lima','333.333.333-33','Gerente Operacional','clt','empreendimento','e0000003-0000-0000-0000-000000000003',7200,880,300,650,0,'2024-06-10',null,true,'mariana.lima@rpsglobal.com.br'),
 ('c1000004-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','João Pereira','444.444.444-44','Assistente Administrativo','clt','sede',null,3200,550,200,420,0,'2025-01-20','2026-04-30',false,'joao.pereira@rpsglobal.com.br'),
 ('c1000005-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','Rafael Antunes','555.555.555-55','Coordenador de Faturamento','clt','sede',null,6100,770,260,520,0,'2026-05-05',null,true,'rafael.antunes@rpsglobal.com.br');

insert into public.folha_pagamento (empresa_id, colaborador_id, competencia, salario, beneficios, bonus, horas_extras, descontos, inss, fgts, irrf, outros_encargos, status, data_pagamento)
select '33333333-3333-3333-3333-333333333333', c.id, date '2026-05-01', c.salario_base,
       (c.vale_refeicao + c.vale_transporte + c.plano_saude),
       case when c.cargo ilike '%Gerente%' or c.cargo ilike '%Coordenador%' then round(c.salario_base*0.30,2) else 0 end,
       case when c.cargo ilike '%Assistente%' then 0 else round((random()*800)::numeric,2) end,
       0, round(c.salario_base*0.11,2), round(c.salario_base*0.08,2), round(c.salario_base*0.075,2), round(c.salario_base*0.20,2),
       'pago', date '2026-06-05'
from public.colaboradores c
where c.empresa_id = '33333333-3333-3333-3333-333333333333' and c.ativo = true;

-- ===== Alertas =====
insert into public.alertas_faturamento (empresa_id, tipo, mensagem, severidade, resolvido) values
 ('33333333-3333-3333-3333-333333333333','vencido','Honorários de 04/2026 do Berrini (EMP-003) vencidos — em disputa.','critical',false),
 ('33333333-3333-3333-3333-333333333333','emissao_pendente','5 faturamentos de 06/2026 aguardando emissão de NFS-e.','warning',false),
 ('33333333-3333-3333-3333-333333333333','reajuste','Novo contrato Anhanguera (EMP-005) reajusta 6,5% em 05/2027.','info',false),
 ('33333333-3333-3333-3333-333333333333','conciliacao_pendente','Extrato de 05/2026 com 3 lançamentos não conciliados.','warning',false);

commit;

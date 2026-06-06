# RPS Financial Command — Comando Financeiro

> **O que é:** ERP financeiro da RPS enquanto **administradora**. Controla o financeiro da **sede**
> e de cada **empreendimento**: faturamento (NFS-e/honorários), contratos, fluxo de caixa, conciliação
> bancária, fiscal (guias de tributos), RH/folha, despesas da sede, YTD, forecast e um Painel de BI.

---

## 1. Conceito e público

- **Usuário-alvo:** diretor/gerente/operador financeiro da RPS (modelo **multi-tenant por empresa**).
- **Objetivo:** dar à RPS o controle do próprio negócio (receita de honorários, custos, tributos,
  folha) e do financeiro que ela administra para cada empreendimento — com conciliação bancária e projeções.
- **Diferença dos outros:** foco em **finanças/contabilidade da administradora**, não na operação predial.

## 2. Stack técnica

Vite 5 + React 18 + TS · shadcn/ui + Tailwind · React Query · react-router v6 ·
Supabase (projeto `nnvytoyhcmpwhxhbolet`) · Recharts · Zod · Vitest.

## 3. Estrutura e fluxos

```
src/
  App.tsx                → "/" redireciona p/ "/app"; /auth; rotas /app/* protegidas (RequireAuth + AppLayout)
  hooks/
    useAuth.tsx          → sessão Supabase + carrega profile (com role) + empresa (tenant)
    useEmpreendimentos.ts
  components/app/         → AppLayout, RequireAuth
  pages/
    Auth.tsx
    app/PainelBI         → BI consolidado (home)
    app/Empreendimentos + EmpreendimentoExtrato
    app/Contratos, Cashflow, Alertas
    app/Faturamentos     → emissão/cobrança de honorários (NFS-e)
    app/Conciliacao      → conciliação bancária (usa lib/bank-statement.ts)
    app/Fiscal           → guias fiscais (INSS, FGTS, ISS, IRRF, DAS…)
    app/RH               → colaboradores + folha de pagamento
    app/DespesasSede, YTD, Forecast, EmissorConfig
  data/honorarios-import.json → carga inicial de honorários
  lib/bank-statement.ts  → parser de extrato bancário; lib/format.ts
supabase/
  migrations/            → schema financeiro/fiscal/RH (ver abaixo)
```

## 4. Modelo de dados (Supabase)

- **Papéis:** `app_role(diretor, gerente, operador)` — aqui o papel é uma **coluna** em `profiles`
  (não há tabela `user_roles` separada). `has_role()` consulta `profiles.role`.
- **Multi-tenant:** `empresas` (NOT NULL em `profiles.empresa_id`) + `current_empresa_id()`.
- **Sem trigger `handle_new_user`:** o vínculo usuário↔empresa↔perfil é feito por uma **RPC de setup**
  (cria empresa + profile com role `diretor` para o primeiro usuário autenticado).
- **Tabelas:** `empresas`, `profiles`, `empreendimentos`, `contratos`, `cashflow`,
  `tomadores`, `emissor_config`, `faturamentos` + `faturamento_pagamentos`, `alertas_faturamento`,
  `guias_fiscais`, `colaboradores` + `folha_pagamento`, `despesas_sede`,
  `forecast_versoes` + `forecast_linhas`.
- **Enums** fiscais/RH detalhados (categoria de guia, vínculo do colaborador, status de faturamento, etc.).

## 5. Estado atual

- ✅ **Login Supabase já implementado** (`pages/Auth.tsx` + `hooks/useAuth.tsx`, que carrega profile e empresa).
- ⚠️ **Modelo de papel via coluna** (em vez de `user_roles`): mais simples, porém menos flexível e com
  leve risco de escalonamento se o `UPDATE` em `profiles.role` não estiver bem restrito por RLS — **revisar**.
- ⚠️ `profiles.empresa_id` é NOT NULL e o cadastro depende da RPC de setup — usuário sem empresa fica "preso".

## 6. Melhorias propostas (priorizadas)

**Alta**
1. **RLS de `profiles.role`:** garantir que um usuário **não** consiga alterar o próprio `role`
   (apenas `diretor`/admin via política). Como o papel é coluna, isso é crítico.
2. **Fluxo de cadastro multi-tenant:** o `seed.sql` cria a empresa **RPS** e já vincula os 2 usuários
   (lucas=diretor, bruno=gerente), evitando o estado "logado sem empresa".
3. **Restringir signup** ao domínio corporativo.

**Média**
4. Robustez do parser de extrato (`bank-statement.ts`): cobrir formatos de banco diferentes e casos de
   borda (datas, sinais, encoding) com testes — é o ponto mais sensível a erro financeiro.
5. Idempotência das cargas (`honorarios-import.json`, `gerar_fis`) para não duplicar lançamentos.
6. Estados de loading/erro padronizados e máscaras de moeda/percentual consistentes.

**Baixa**
7. Lazy-load das páginas pesadas (PainelBI, Forecast, Conciliacao).
8. Auditoria de alterações financeiras (quem mudou o quê) — trilha imutável.
9. Testes dos cálculos de YTD/forecast e dos status de faturamento/guia.

## 7. Como rodar

```bash
npm install
npm run dev
npm run build
npm run test
```

## 8. Usuários de acesso (seed)

`supabase/seed.sql` cria a empresa **RPS** e os usuários `lucas.fernandes@rpsglobal.com.br`
(**diretor**) e `bruno.aleixo@rpsglobal.com.br` (**gerente**) — rodar após as migrations.

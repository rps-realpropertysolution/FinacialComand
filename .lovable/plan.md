## Módulo Forecast — Visão Geral

Um módulo robusto de projeção financeira que consolida receitas, despesas, fiscal, folha e despesas sede em uma visão **12 meses rolling** com cenários, versionamento e comparativo Previsto x Realizado x Forecast.

---

## 1. Estrutura de Dados (Banco)

### Tabela `forecast_versoes`
Versionamento de cenários (Base, Otimista, Pessimista, Revisão Q1, etc.)
- `nome`, `descricao`, `cenario` (base/otimista/pessimista/custom)
- `ano_base`, `mes_inicio`, `horizonte_meses` (default 12)
- `status` (rascunho/ativo/arquivado), `ativo` (boolean único por empresa)
- `premissas` (jsonb: inflação, reajuste médio, crescimento receita, etc.)

### Tabela `forecast_linhas`
Linha a linha por mês/categoria/centro de custo.
- `versao_id`, `mes`, `tipo` (receita/despesa), `grupo` (operacional/fiscal/folha/sede/empreendimento)
- `categoria`, `descricao`, `empreendimento_id`
- `valor_previsto`, `valor_realizado` (preenchido por gatilho a partir de cashflow/guias/folha/despesas_sede)
- `origem` (contrato/replicado/manual/calculado)

### Funções RPC
- `forecast_gerar_versao(_nome, _cenario, _mes_inicio, _horizonte, _premissas)` — cria versão e popula 12 meses a partir de: contratos ativos (com reajuste), despesas sede recorrentes, folha vigente, guias fiscais médias, cashflow histórico.
- `forecast_atualizar_realizado(_versao_id)` — atualiza coluna `realizado` cruzando com dados reais.
- `forecast_duplicar_versao(_versao_id, _novo_nome)` — clona para simular ajustes.
- `forecast_aplicar_premissa(_versao_id, _tipo, _percentual)` — aplica % linear (ex: +5% em todas receitas).

---

## 2. Interface (`src/pages/app/Forecast.tsx`)

### Header
- Seletor de **Versão ativa** + badge cenário
- Botões: "Nova versão", "Duplicar", "Atualizar realizado", "Aplicar premissa"
- Filtros: empreendimento (Sede/Projeto), grupo, período (3/6/12/24 meses)

### KPIs Topo (4 cards)
- Receita Forecast 12m | Despesa Forecast 12m
- EBITDA projetado | Margem %
- Variação vs versão anterior (delta)

### Visualizações
1. **Gráfico linha**: Receita x Despesa x Resultado (12 meses) com comparativo Previsto/Realizado/Forecast
2. **Gráfico barras empilhadas**: composição por grupo (operacional, fiscal, folha, sede)
3. **Tabela pivot**: linhas = categoria, colunas = meses (J/F/M…), totais e variação YoY
4. **Heatmap de variação**: cores indicando % desvio realizado vs previsto

### Painel de Premissas (lateral)
- Inflação anual, reajuste médio contratos, crescimento receita %, redução custos %
- Sliders/inputs que recalculam preview ao vivo

### Tabela Detalhada (editável inline)
- Linha por categoria + 12 colunas mensais
- Edição inline com debounce
- Linha de totais sticky
- Export CSV

---

## 3. Integrações com Módulos Existentes

- **Contratos**: base de receita prevista com reajuste anual aplicado
- **Despesas Sede**: replica recorrentes e aplica inflação
- **Folha Pagamento**: projeta custo total + dissídio
- **Guias Fiscais**: média móvel 3 meses dos impostos
- **Cashflow**: alimenta coluna realizado
- **Empreendimentos**: dimensão central para drill-down

---

## 4. Navegação

Adicionar item "Forecast" no `AppLayout.tsx` (ícone `TrendingUp`) entre YTD e Alertas, e rota `/app/forecast` em `App.tsx`.

---

## 5. Arquivos a criar/editar

**Criar:**
- `supabase/migrations/...forecast.sql` (tabelas + 4 RPCs + RLS)
- `src/pages/app/Forecast.tsx` (página principal)
- `src/components/forecast/ForecastChart.tsx`
- `src/components/forecast/ForecastTable.tsx`
- `src/components/forecast/PremissasPanel.tsx`
- `src/hooks/useForecast.ts`

**Editar:**
- `src/App.tsx` (rota)
- `src/components/app/AppLayout.tsx` (nav)

---

Posso prosseguir com a implementação?

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpreendimentos } from "@/hooks/useEmpreendimentos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Copy, Loader2, Plus, RefreshCw, Sparkles, TrendingDown, TrendingUp, Wallet, Zap, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

interface Versao {
  id: string;
  nome: string;
  cenario: string;
  mes_inicio: string;
  horizonte_meses: number;
  status: string;
  ativo: boolean;
  premissas: Record<string, number>;
  descricao: string | null;
}
interface Linha {
  id: string;
  versao_id: string;
  mes: string;
  tipo: "receita" | "despesa";
  grupo: string;
  categoria: string;
  descricao: string | null;
  empreendimento_id: string | null;
  valor_previsto: number;
  valor_realizado: number;
  origem: string;
}

const GRUPOS = ["operacional", "fiscal", "folha", "sede", "empreendimento"];
const CENARIOS = ["base", "otimista", "pessimista", "custom"];

const monthLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

export default function Forecast() {
  const { profile } = useAuth();
  const { empreendimentos, nomeOf } = useEmpreendimentos();
  const isDiretor = profile?.role === "diretor";
  const podeEditar = isDiretor || profile?.role === "gerente";

  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [versaoId, setVersaoId] = useState<string>("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // filtros
  const [filtroEmp, setFiltroEmp] = useState<string>("all");
  const [filtroGrupo, setFiltroGrupo] = useState<string>("all");

  // dialog nova versão
  const [openNew, setOpenNew] = useState(false);
  const today = new Date();
  const defaultIni = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [novoForm, setNovoForm] = useState({
    nome: `Forecast ${today.getFullYear()}`,
    descricao: "",
    cenario: "base",
    mes_inicio: defaultIni,
    horizonte_meses: 12,
    inflacao: 4.5,
    reajuste_contratos: 5,
    crescimento_receita: 0,
    reducao_custos: 0,
    dissidio_folha: 5,
  });

  // dialog premissa
  const [openPrem, setOpenPrem] = useState(false);
  const [premForm, setPremForm] = useState({ tipo: "all", grupo: "all", percentual: 0 });

  const loadVersoes = async () => {
    const { data } = await supabase
      .from("forecast_versoes")
      .select("*")
      .order("created_at", { ascending: false });
    const lista = (data as Versao[]) ?? [];
    setVersoes(lista);
    if (!versaoId && lista.length) {
      const ativa = lista.find((v) => v.ativo) ?? lista[0];
      setVersaoId(ativa.id);
    }
    if (!lista.length) setLoading(false);
  };

  const loadLinhas = async (vid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("forecast_linhas")
      .select("*")
      .eq("versao_id", vid)
      .order("mes")
      .order("grupo")
      .order("categoria");
    setLinhas((data as Linha[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadVersoes(); }, []);
  useEffect(() => { if (versaoId) loadLinhas(versaoId); }, [versaoId]);

  const versaoAtual = versoes.find((v) => v.id === versaoId);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((l) => {
      if (filtroGrupo !== "all" && l.grupo !== filtroGrupo) return false;
      if (filtroEmp === "sede" && l.empreendimento_id) return false;
      if (filtroEmp !== "all" && filtroEmp !== "sede" && l.empreendimento_id !== filtroEmp) return false;
      return true;
    });
  }, [linhas, filtroEmp, filtroGrupo]);

  // === Agregação por mês ===
  const meses = useMemo(() => {
    const set = new Set(linhasFiltradas.map((l) => l.mes));
    return Array.from(set).sort();
  }, [linhasFiltradas]);

  const seriesMensal = useMemo(() => {
    return meses.map((m) => {
      const ls = linhasFiltradas.filter((l) => l.mes === m);
      const receita = ls.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor_previsto), 0);
      const despesa = ls.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor_previsto), 0);
      const realReceita = ls.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor_realizado), 0);
      const realDespesa = ls.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor_realizado), 0);
      return {
        mes: monthLabel(m),
        Receita: receita,
        Despesa: despesa,
        Resultado: receita - despesa,
        "Rec. Real": realReceita,
        "Desp. Real": realDespesa,
      };
    });
  }, [linhasFiltradas, meses]);

  const composicao = useMemo(() => {
    return meses.map((m) => {
      const ls = linhasFiltradas.filter((l) => l.mes === m && l.tipo === "despesa");
      const row: Record<string, number | string> = { mes: monthLabel(m) };
      GRUPOS.forEach((g) => {
        row[g] = ls.filter((l) => l.grupo === g).reduce((s, l) => s + Number(l.valor_previsto), 0);
      });
      return row;
    });
  }, [linhasFiltradas, meses]);

  const kpis = useMemo(() => {
    const receita = linhasFiltradas.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor_previsto), 0);
    const despesa = linhasFiltradas.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor_previsto), 0);
    const ebitda = receita - despesa;
    const margem = receita > 0 ? (ebitda / receita) * 100 : 0;
    return { receita, despesa, ebitda, margem };
  }, [linhasFiltradas]);

  // pivot tabela: linhas = grupo+categoria, colunas = meses
  const pivot = useMemo(() => {
    const map = new Map<string, { grupo: string; categoria: string; tipo: string; valores: Record<string, number> }>();
    linhasFiltradas.forEach((l) => {
      const key = `${l.tipo}|${l.grupo}|${l.categoria}`;
      if (!map.has(key)) map.set(key, { grupo: l.grupo, categoria: l.categoria, tipo: l.tipo, valores: {} });
      const row = map.get(key)!;
      row.valores[l.mes] = (row.valores[l.mes] ?? 0) + Number(l.valor_previsto);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.tipo === b.tipo ? (a.grupo + a.categoria).localeCompare(b.grupo + b.categoria) : a.tipo === "receita" ? -1 : 1
    );
  }, [linhasFiltradas]);

  // === Ações ===
  const criarVersao = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("forecast_gerar_versao", {
      _nome: novoForm.nome,
      _cenario: novoForm.cenario,
      _mes_inicio: novoForm.mes_inicio,
      _horizonte: novoForm.horizonte_meses,
      _premissas: {
        inflacao: novoForm.inflacao,
        reajuste_contratos: novoForm.reajuste_contratos,
        crescimento_receita: novoForm.crescimento_receita,
        reducao_custos: novoForm.reducao_custos,
        dissidio_folha: novoForm.dissidio_folha,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Versão criada com sucesso");
    setOpenNew(false);
    await loadVersoes();
    if (data) setVersaoId(data as string);
  };

  const duplicar = async () => {
    if (!versaoAtual) return;
    const nome = prompt("Nome da nova versão:", `${versaoAtual.nome} (cópia)`);
    if (!nome) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("forecast_duplicar_versao", {
      _versao_id: versaoId,
      _novo_nome: nome,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Versão duplicada");
    await loadVersoes();
    if (data) setVersaoId(data as string);
  };

  const atualizarRealizado = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("forecast_atualizar_realizado", { _versao_id: versaoId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Realizado atualizado");
    loadLinhas(versaoId);
  };

  const ativar = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("forecast_ativar_versao", { _versao_id: versaoId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Versão ativada");
    loadVersoes();
  };

  const aplicarPrem = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("forecast_aplicar_premissa", {
      _versao_id: versaoId,
      _tipo: premForm.tipo === "all" ? null : premForm.tipo,
      _grupo: premForm.grupo === "all" ? null : premForm.grupo,
      _percentual: Number(premForm.percentual),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Premissa aplicada (${premForm.percentual}%)`);
    setOpenPrem(false);
    loadLinhas(versaoId);
  };

  const excluir = async () => {
    if (!versaoAtual || !confirm(`Excluir versão "${versaoAtual.nome}"?`)) return;
    const { error } = await supabase.from("forecast_versoes").delete().eq("id", versaoId);
    if (error) return toast.error(error.message);
    toast.success("Versão excluída");
    setVersaoId("");
    setLinhas([]);
    loadVersoes();
  };

  const exportarCsv = () => {
    const headers = ["Tipo", "Grupo", "Categoria", ...meses.map(monthLabel), "Total"];
    const rows = pivot.map((r) => {
      const vals = meses.map((m) => r.valores[m] ?? 0);
      const tot = vals.reduce((s, v) => s + v, 0);
      return [r.tipo, r.grupo, r.categoria, ...vals.map((v) => v.toFixed(2)), tot.toFixed(2)].join(";");
    });
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forecast-${versaoAtual?.nome ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-executive">Forecast</h2>
          <p className="text-sm text-muted-foreground">
            Projeção financeira consolidada com cenários, versionamento e comparativo previsto x realizado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={versaoId} onValueChange={setVersaoId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecione uma versão" />
            </SelectTrigger>
            <SelectContent>
              {versoes.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.ativo ? "★ " : ""}{v.nome} · {v.cenario}
                </SelectItem>
              ))}
              {versoes.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nenhuma versão</div>}
            </SelectContent>
          </Select>
          {podeEditar && (
            <>
              <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nova versão</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nova versão de Forecast</DialogTitle>
                    <DialogDescription>
                      Gera linhas a partir de contratos ativos, despesas sede, folha vigente e média fiscal.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label>Nome</Label>
                      <Input value={novoForm.nome} onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Cenário</Label>
                      <Select value={novoForm.cenario} onValueChange={(v) => setNovoForm({ ...novoForm, cenario: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CENARIOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Horizonte (meses)</Label>
                      <Input type="number" min={1} max={36} value={novoForm.horizonte_meses}
                        onChange={(e) => setNovoForm({ ...novoForm, horizonte_meses: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Mês inicial</Label>
                      <Input type="date" value={novoForm.mes_inicio}
                        onChange={(e) => setNovoForm({ ...novoForm, mes_inicio: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Inflação anual (%)</Label>
                      <Input type="number" step="0.1" value={novoForm.inflacao}
                        onChange={(e) => setNovoForm({ ...novoForm, inflacao: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Reajuste contratos (%)</Label>
                      <Input type="number" step="0.1" value={novoForm.reajuste_contratos}
                        onChange={(e) => setNovoForm({ ...novoForm, reajuste_contratos: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Crescimento receita (%)</Label>
                      <Input type="number" step="0.1" value={novoForm.crescimento_receita}
                        onChange={(e) => setNovoForm({ ...novoForm, crescimento_receita: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Redução custos (%)</Label>
                      <Input type="number" step="0.1" value={novoForm.reducao_custos}
                        onChange={(e) => setNovoForm({ ...novoForm, reducao_custos: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Dissídio folha (%)</Label>
                      <Input type="number" step="0.1" value={novoForm.dissidio_folha}
                        onChange={(e) => setNovoForm({ ...novoForm, dissidio_folha: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Descrição</Label>
                      <Textarea rows={2} value={novoForm.descricao}
                        onChange={(e) => setNovoForm({ ...novoForm, descricao: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                    <Button onClick={criarVersao} disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar forecast
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </header>

      {versaoAtual && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">Cenário: {versaoAtual.cenario}</Badge>
          <Badge variant={versaoAtual.ativo ? "default" : "secondary"}>
            {versaoAtual.ativo ? "Ativa" : versaoAtual.status}
          </Badge>
          <Badge variant="outline">{versaoAtual.horizonte_meses} meses</Badge>
          <Badge variant="outline">Início {monthLabel(versaoAtual.mes_inicio)}</Badge>
          {podeEditar && (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={atualizarRealizado} disabled={busy}>
                <RefreshCw className="mr-1 h-4 w-4" /> Atualizar realizado
              </Button>
              <Button size="sm" variant="outline" onClick={duplicar} disabled={busy}>
                <Copy className="mr-1 h-4 w-4" /> Duplicar
              </Button>
              <Dialog open={openPrem} onOpenChange={setOpenPrem}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Zap className="mr-1 h-4 w-4" /> Premissa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aplicar premissa percentual</DialogTitle>
                    <DialogDescription>Multiplica os valores previstos pelo % informado.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Tipo</Label>
                      <Select value={premForm.tipo} onValueChange={(v) => setPremForm({ ...premForm, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Grupo</Label>
                      <Select value={premForm.grupo} onValueChange={(v) => setPremForm({ ...premForm, grupo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Percentual (%)</Label>
                      <Input type="number" step="0.1" value={premForm.percentual}
                        onChange={(e) => setPremForm({ ...premForm, percentual: Number(e.target.value) })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenPrem(false)}>Cancelar</Button>
                    <Button onClick={aplicarPrem} disabled={busy}>Aplicar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {!versaoAtual.ativo && (
                <Button size="sm" variant="outline" onClick={ativar} disabled={busy}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Ativar
                </Button>
              )}
              {isDiretor && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={excluir}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Empreendimento</Label>
          <Select value={filtroEmp} onValueChange={setFiltroEmp}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sede">Sede (sem projeto)</SelectItem>
              {empreendimentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo</Label>
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto self-end">
          <Button size="sm" variant="outline" onClick={exportarCsv} disabled={!pivot.length}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-kpi">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Receita projetada</CardDescription>
            <CardTitle className="text-xl text-success">{brl(kpis.receita)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-kpi">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> Despesa projetada</CardDescription>
            <CardTitle className="text-xl text-destructive">{brl(kpis.despesa)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-kpi">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> EBITDA</CardDescription>
            <CardTitle className={`text-xl ${kpis.ebitda >= 0 ? "text-success" : "text-destructive"}`}>
              {brl(kpis.ebitda)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-kpi">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Margem</CardDescription>
            <CardTitle className="text-xl">{kpis.margem.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!versaoId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhuma versão de forecast criada. Clique em <strong>Nova versão</strong> para começar.
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="evolucao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
            <TabsTrigger value="composicao">Composição</TabsTrigger>
            <TabsTrigger value="pivot">Tabela detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="evolucao">
            <Card>
              <CardHeader>
                <CardTitle>Receita x Despesa x Resultado</CardTitle>
                <CardDescription>Linhas pontilhadas representam o realizado.</CardDescription>
              </CardHeader>
              <CardContent className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesMensal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip formatter={(v: number) => brl(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="Receita" stroke="hsl(var(--success))" strokeWidth={2} />
                    <Line type="monotone" dataKey="Despesa" stroke="hsl(var(--destructive))" strokeWidth={2} />
                    <Line type="monotone" dataKey="Resultado" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="Rec. Real" stroke="hsl(var(--success))" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Desp. Real" stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="composicao">
            <Card>
              <CardHeader>
                <CardTitle>Composição de despesas por grupo</CardTitle>
                <CardDescription>Empilhado mensal — operacional, fiscal, folha, sede.</CardDescription>
              </CardHeader>
              <CardContent className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={composicao}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip formatter={(v: number) => brl(v)} />
                    <Legend />
                    <Bar dataKey="operacional" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="fiscal" stackId="a" fill="hsl(var(--accent))" />
                    <Bar dataKey="folha" stackId="a" fill="hsl(var(--destructive))" />
                    <Bar dataKey="sede" stackId="a" fill="hsl(var(--muted-foreground))" />
                    <Bar dataKey="empreendimento" stackId="a" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pivot">
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento linha a linha</CardTitle>
                <CardDescription>Valores previstos por categoria e mês.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">Tipo</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Categoria</TableHead>
                      {meses.map((m) => (
                        <TableHead key={m} className="text-right">{monthLabel(m)}</TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivot.map((r, i) => {
                      const total = meses.reduce((s, m) => s + (r.valores[m] ?? 0), 0);
                      return (
                        <TableRow key={i}>
                          <TableCell className="sticky left-0 bg-background">
                            <Badge variant={r.tipo === "receita" ? "default" : "secondary"} className="capitalize">
                              {r.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{r.grupo}</TableCell>
                          <TableCell>{r.categoria}</TableCell>
                          {meses.map((m) => (
                            <TableCell key={m} className="text-right text-xs">
                              {brl(r.valores[m] ?? 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right text-xs font-semibold">{brl(total)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {pivot.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={meses.length + 4} className="py-8 text-center text-muted-foreground">
                          Sem linhas para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <p className="mt-2 text-xs text-muted-foreground">
                  {linhasFiltradas.length} linhas · {pivot.length} categorias · {nomeOf(filtroEmp === "all" || filtroEmp === "sede" ? null : filtroEmp)}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
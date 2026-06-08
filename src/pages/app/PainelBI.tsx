import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Sparkles, TrendingUp, Wallet, Building2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { brl, monthInputValue, firstOfMonth } from "@/lib/format";

interface CashRow {
  mes: string;
  tipo: "receita" | "despesa";
  previsto: number;
  realizado: number;
  empreendimento_id: string | null;
  empreendimentos?: { nome: string } | null;
}

export default function PainelBI() {
  const { empresa } = useAuth();
  const [rows, setRows] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
    const { data, error } = await supabase
      .from("cashflow")
      .select("mes, tipo, previsto, realizado, empreendimento_id, empreendimentos(nome)")
      .gte("mes", startStr);
    if (error) toast.error(error.message);
    setRows((data as unknown as CashRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const series = useMemo(() => {
    // 12 meses
    const map = new Map<string, { mes: string; receitaPrev: number; receitaReal: number; despesaPrev: number; despesaReal: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, {
        mes: d.toLocaleDateString("pt-BR", { month: "short" }),
        receitaPrev: 0, receitaReal: 0, despesaPrev: 0, despesaReal: 0,
      });
    }
    rows.forEach((r) => {
      const key = String(r.mes).slice(0, 7);
      const slot = map.get(key);
      if (!slot) return;
      if (r.tipo === "receita") {
        slot.receitaPrev += Number(r.previsto);
        slot.receitaReal += Number(r.realizado);
      } else {
        slot.despesaPrev += Number(r.previsto);
        slot.despesaReal += Number(r.realizado);
      }
    });
    return Array.from(map.values());
  }, [rows]);

  const totais = useMemo(() => {
    return series.reduce(
      (a, s) => ({
        receitaPrev: a.receitaPrev + s.receitaPrev,
        receitaReal: a.receitaReal + s.receitaReal,
        despesaPrev: a.despesaPrev + s.despesaPrev,
        despesaReal: a.despesaReal + s.despesaReal,
      }),
      { receitaPrev: 0, receitaReal: 0, despesaPrev: 0, despesaReal: 0 },
    );
  }, [series]);

  const ranking = useMemo(() => {
    const m = new Map<string, { nome: string; receita: number; despesa: number }>();
    rows.forEach((r) => {
      const id = r.empreendimento_id ?? "geral";
      const nome = r.empreendimentos?.nome ?? "Geral";
      if (!m.has(id)) m.set(id, { nome, receita: 0, despesa: 0 });
      const slot = m.get(id)!;
      if (r.tipo === "receita") slot.receita += Number(r.realizado);
      else slot.despesa += Number(r.realizado);
    });
    return Array.from(m.values())
      .map((x) => ({ ...x, saldo: x.receita - x.despesa }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [rows]);

  const gerarFis = async () => {
    setGenerating(true);
    const { data, error } = await supabase.rpc("gerar_fis", {
      _mes: firstOfMonth(monthInputValue(new Date())),
    });
    setGenerating(false);
    if (error) return toast.error(error.message);
    toast.success(`FIS do mês: ${data ?? 0} novos lançamentos`);
    load();
  };

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-executive">Painel Geral</h2>
          <p className="text-sm text-muted-foreground">
            Últimos 12 meses de cashflow consolidado por empreendimento.
          </p>
        </div>
        <Button onClick={gerarFis} disabled={generating} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Gerar FIS do mês atual
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Receita prevista (12m)" value={brl(totais.receitaPrev)} tone="primary" />
        <Kpi icon={Wallet} label="Receita realizada (12m)" value={brl(totais.receitaReal)} tone="success" />
        <Kpi icon={Receipt} label="Despesa realizada (12m)" value={brl(totais.despesaReal)} tone="warning" />
        <Kpi icon={Building2} label="Saldo realizado (12m)" value={brl(totais.receitaReal - totais.despesaReal)}
          tone={totais.receitaReal - totais.despesaReal >= 0 ? "success" : "destructive"} />
      </div>

      <Card className="shadow-kpi">
        <CardHeader>
          <CardTitle>Receita: previsto vs realizado</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Line type="monotone" dataKey="receitaPrev" name="Receita prevista" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="receitaReal" name="Receita realizada" stroke="hsl(var(--success))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-kpi">
        <CardHeader>
          <CardTitle>Despesas mensais</CardTitle>
          <CardDescription>Previsto vs realizado</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Bar dataKey="despesaPrev" name="Despesa prevista" fill="hsl(var(--secondary))" />
                <Bar dataKey="despesaReal" name="Despesa realizada" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking por empreendimento</CardTitle>
          <CardDescription>Saldo realizado nos últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empreendimento</TableHead>
                <TableHead className="text-right">Receita realizada</TableHead>
                <TableHead className="text-right">Despesa realizada</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-right">{brl(r.receita)}</TableCell>
                  <TableCell className="text-right">{brl(r.despesa)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={r.saldo >= 0
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-destructive/40 bg-destructive/10 text-destructive"}>
                      {brl(r.saldo)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Sem dados ainda. Cadastre contratos e gere o FIS do mês.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: {
  icon: any; label: string; value: string;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const map = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/10 text-warning",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;
  return (
    <div className={`rounded-lg border p-4 shadow-kpi ${map[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
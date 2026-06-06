import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Hourglass, BellRing, FileWarning, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

interface CashRow {
  id: string;
  mes: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string | null;
  previsto: number;
  realizado: number;
  origem: string;
  empreendimentos?: { nome: string } | null;
}

interface AlertaFat {
  id: string;
  tipo: string;
  mensagem: string;
  severidade: "info" | "warning" | "critical";
  resolvido: boolean;
  created_at: string;
}

export default function Alertas() {
  const [rows, setRows] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertasFat, setAlertasFat] = useState<AlertaFat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
      const start = new Date();
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
      const [{ data }, { data: af }] = await Promise.all([
        supabase
          .from("cashflow")
          .select("id, mes, tipo, categoria, descricao, previsto, realizado, origem, empreendimentos(nome)")
          .gte("mes", startStr)
          .order("mes", { ascending: false }),
        supabase
          .from("alertas_faturamento")
          .select("id, tipo, mensagem, severidade, resolvido, created_at")
          .eq("resolvido", false)
          .order("created_at", { ascending: false }),
      ]);
      setRows((data as unknown as CashRow[]) ?? []);
      setAlertasFat((af as AlertaFat[]) ?? []);
      setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const regenerar = async () => {
    setRefreshing(true);
    const { data, error } = await supabase.rpc("gerar_alertas_faturamento");
    setRefreshing(false);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} novos alertas`);
    load();
  };

  const excessos = useMemo(
    () =>
      rows.filter(
        (r) => r.tipo === "despesa" && Number(r.previsto) > 0 && Number(r.realizado) > Number(r.previsto),
      ),
    [rows],
  );
  const pendentes = useMemo(
    () =>
      rows.filter(
        (r) => r.tipo === "receita" && Number(r.previsto) > 0 && Number(r.realizado) < Number(r.previsto),
      ),
    [rows],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-executive">Alertas</h2>
          <p className="text-sm text-muted-foreground">
            Excessos, receitas pendentes, vencimentos e cobranças em atraso.
          </p>
        </div>
        <Button variant="outline" onClick={regenerar} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recalcular
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" /> Faturamentos
            <Badge variant="outline" className="ml-2 border-primary/40 bg-primary/10 text-primary">
              {alertasFat.length}
            </Badge>
          </CardTitle>
          <CardDescription>Vencimentos próximos, atrasos, reajustes e emissão pendente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {alertasFat.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem alertas. ✅</p>
          ) : (
            alertasFat.map((a) => (
              <div key={a.id} className={
                "flex items-center justify-between rounded-md border p-3 " +
                (a.severidade === "critical" ? "border-destructive/30 bg-destructive/5" :
                 a.severidade === "warning" ? "border-warning/30 bg-warning/5" :
                 "border-primary/30 bg-primary/5")
              }>
                <div className="flex items-center gap-3">
                  <FileWarning className={
                    "h-4 w-4 " +
                    (a.severidade === "critical" ? "text-destructive" :
                     a.severidade === "warning" ? "text-warning" : "text-primary")
                  } />
                  <div>
                    <p className="font-semibold">{a.mensagem}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.tipo.replace("_", " ")}</p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{a.severidade}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Excessos de custo
            <Badge variant="outline" className="ml-2 border-destructive/40 bg-destructive/10 text-destructive">
              {excessos.length}
            </Badge>
          </CardTitle>
          <CardDescription>Despesas com realizado &gt; previsto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {excessos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem excessos. 👏</p>
          ) : (
            excessos.map((r) => {
              const desv = Number(r.realizado) - Number(r.previsto);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <div>
                    <p className="font-semibold">{r.categoria} — {r.empreendimentos?.nome ?? "Geral"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.mes).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · {r.descricao}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Prev: {brl(Number(r.previsto))}</p>
                    <p className="font-bold text-destructive">+{brl(desv)}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Hourglass className="h-5 w-5" /> Receitas pendentes
            <Badge variant="outline" className="ml-2 border-warning/40 bg-warning/10 text-warning">
              {pendentes.length}
            </Badge>
          </CardTitle>
          <CardDescription>Receitas previstas ainda não realizadas integralmente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendentes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tudo recebido. 🎯</p>
          ) : (
            pendentes.map((r) => {
              const falta = Number(r.previsto) - Number(r.realizado);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-warning/30 bg-warning/5 p-3">
                  <div>
                    <p className="font-semibold">{r.categoria} — {r.empreendimentos?.nome ?? "Geral"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.mes).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · {r.descricao}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Prev: {brl(Number(r.previsto))}</p>
                    <p className="font-bold text-warning">Faltam {brl(falta)}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
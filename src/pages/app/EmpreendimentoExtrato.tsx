import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

interface Lanc {
  id: string;
  mes: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string | null;
  previsto: number;
  realizado: number;
  origem: string;
}
interface Emp { id: string; nome: string; codigo: string | null; status: string }

export default function EmpreendimentoExtrato() {
  const { id } = useParams<{ id: string }>();
  const [emp, setEmp] = useState<Emp | null>(null);
  const [rows, setRows] = useState<Lanc[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [tipo, setTipo] = useState<string>("todos");
  const [categoria, setCategoria] = useState<string>("todas");
  const [origem, setOrigem] = useState<string>("todas");
  const [mesIni, setMesIni] = useState<string>("");
  const [mesFim, setMesFim] = useState<string>("");
  const [busca, setBusca] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: e }, { data: c }] = await Promise.all([
        supabase.from("empreendimentos").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("cashflow")
          .select("id, mes, tipo, categoria, descricao, previsto, realizado, origem")
          .eq("empreendimento_id", id)
          .order("mes", { ascending: false }),
      ]);
      if (e) setEmp(e as Emp);
      setRows((c as Lanc[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const categorias = useMemo(
    () => Array.from(new Set(rows.map((r) => r.categoria))).sort(),
    [rows],
  );
  const origens = useMemo(
    () => Array.from(new Set(rows.map((r) => r.origem))).sort(),
    [rows],
  );

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (tipo !== "todos" && r.tipo !== tipo) return false;
      if (categoria !== "todas" && r.categoria !== categoria) return false;
      if (origem !== "todas" && r.origem !== origem) return false;
      if (mesIni && r.mes < mesIni) return false;
      if (mesFim && r.mes > mesFim) return false;
      if (busca && !(r.descricao ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [rows, tipo, categoria, origem, mesIni, mesFim, busca]);

  const totReceita = filtradas.filter((r) => r.tipo === "receita").reduce((s, r) => s + Number(r.realizado || r.previsto || 0), 0);
  const totDespesa = filtradas.filter((r) => r.tipo === "despesa").reduce((s, r) => s + Number(r.realizado || r.previsto || 0), 0);
  const saldo = totReceita - totDespesa;

  // agrupado por mês
  const porMes = useMemo(() => {
    const map = new Map<string, { receita: number; despesa: number }>();
    for (const r of filtradas) {
      const key = r.mes.slice(0, 7);
      const cur = map.get(key) ?? { receita: 0, despesa: 0 };
      const v = Number(r.realizado || r.previsto || 0);
      if (r.tipo === "receita") cur.receita += v; else cur.despesa += v;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtradas]);

  const exportCsv = () => {
    const header = "mes;tipo;categoria;descricao;previsto;realizado;origem\n";
    const body = filtradas
      .map((r) =>
        [r.mes, r.tipo, r.categoria, (r.descricao ?? "").replace(/;/g, ","), r.previsto, r.realizado, r.origem].join(";"),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_${emp?.codigo ?? emp?.nome ?? "empreendimento"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/empreendimentos"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-executive">
              <Building2 className="h-6 w-6 text-primary" /> {emp?.nome ?? "Empreendimento"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Extrato completo · {emp?.codigo ?? "—"} · {filtradas.length} lançamentos filtrados
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Receitas</p>
          <p className="text-2xl font-bold text-success">{brl(totReceita)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Despesas</p>
          <p className="text-2xl font-bold text-destructive">{brl(totDespesa)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{brl(saldo)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Busca avançada</CardTitle>
          <CardDescription>Combine os filtros para refinar o extrato.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {origens.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Mês inicial</Label>
              <Input type="month" value={mesIni} onChange={(e) => setMesIni(e.target.value ? e.target.value + "-01" : "")} />
            </div>
            <div className="space-y-1">
              <Label>Mês final</Label>
              <Input type="month" value={mesFim} onChange={(e) => setMesFim(e.target.value ? e.target.value + "-01" : "")} />
            </div>
            <div className="space-y-1">
              <Label>Busca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porMes.map(([m, v]) => {
                const s = v.receita - v.despesa;
                return (
                  <TableRow key={m}>
                    <TableCell className="font-medium">{new Date(m + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</TableCell>
                    <TableCell className="text-right text-success">{brl(v.receita)}</TableCell>
                    <TableCell className="text-right text-destructive">{brl(v.despesa)}</TableCell>
                    <TableCell className={`text-right font-semibold ${s >= 0 ? "text-success" : "text-destructive"}`}>{brl(s)}</TableCell>
                  </TableRow>
                );
              })}
              {porMes.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Sem lançamentos no filtro.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos detalhados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.mes + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.tipo === "receita" ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}>
                      {r.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.categoria}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground" title={r.descricao ?? ""}>{r.descricao ?? "—"}</TableCell>
                  <TableCell className="text-right">{brl(Number(r.previsto))}</TableCell>
                  <TableCell className="text-right font-semibold">{brl(Number(r.realizado))}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{r.origem}</Badge></TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
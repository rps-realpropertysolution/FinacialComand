import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Receipt, Sparkles, Trash2, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { brl, firstOfMonth, monthInputValue } from "@/lib/format";

interface Empreendimento { id: string; nome: string; codigo: string | null; }
interface Lancamento {
  id: string;
  empreendimento_id: string | null;
  contrato_id: string | null;
  mes: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string | null;
  previsto: number;
  realizado: number;
  origem: string;
  empreendimentos?: { nome: string } | null;
}

const CATEGORIAS_DESPESA = ["Mão de Obra", "Materiais", "Indiretos", "Equipamentos", "Subempreiteiros", "Outros"];
const CATEGORIAS_RECEITA = ["FIS", "Aditivo", "Outros"];

export default function Cashflow() {
  const { empresa } = useAuth();
  const [mes, setMes] = useState(monthInputValue(new Date()));
  const [emps, setEmps] = useState<Empreendimento[]>([]);
  const [list, setList] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [replicating, setReplicating] = useState(false);

  const [form, setForm] = useState({
    empreendimento_id: "",
    tipo: "despesa" as "despesa" | "receita",
    categoria: "Mão de Obra",
    descricao: "",
    previsto: "",
    realizado: "",
  });

  const load = async () => {
    setLoading(true);
    const start = `${mes}-01`;
    // intervalo: mes inicial até proximo mes
    const [y, m] = mes.split("-").map(Number);
    const next = new Date(y, m, 1);
    const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("empreendimentos").select("id, nome, codigo").order("nome"),
      supabase
        .from("cashflow")
        .select("*, empreendimentos(nome)")
        .gte("mes", start)
        .lt("mes", end)
        .order("tipo", { ascending: false })
        .order("categoria"),
    ]);
    setEmps((e as Empreendimento[]) ?? []);
    setList((c as unknown as Lancamento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [mes]);

  const totals = useMemo(() => {
    const r = list.filter((l) => l.tipo === "receita");
    const d = list.filter((l) => l.tipo === "despesa");
    return {
      receitaPrev: r.reduce((s, x) => s + Number(x.previsto), 0),
      receitaReal: r.reduce((s, x) => s + Number(x.realizado), 0),
      despesaPrev: d.reduce((s, x) => s + Number(x.previsto), 0),
      despesaReal: d.reduce((s, x) => s + Number(x.realizado), 0),
    };
  }, [list]);

  const gerarFis = async () => {
    setGenerating(true);
    const { data, error } = await supabase.rpc("gerar_fis", { _mes: firstOfMonth(mes) });
    setGenerating(false);
    if (error) return toast.error(error.message);
    toast.success(`FIS gerado: ${data ?? 0} novos lançamentos`);
    load();
  };

  const replicarMesAnterior = async () => {
    setReplicating(true);
    const { data, error } = await supabase.rpc("replicar_cashflow_mes_anterior", { _mes: firstOfMonth(mes) });
    setReplicating(false);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} lançamento(s) replicado(s) do mês anterior`);
    load();
  };

  const novoLanc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa) return;
    if (!form.categoria || !form.descricao) return toast.error("Preencha categoria e descrição");
    const { error } = await supabase.from("cashflow").insert([{
      empresa_id: empresa.id,
      empreendimento_id: form.empreendimento_id || null,
      mes: firstOfMonth(mes),
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      previsto: Number(form.previsto) || 0,
      realizado: Number(form.realizado) || 0,
      origem: "manual",
    }]);
    if (error) return toast.error(error.message);
    toast.success("Lançamento adicionado");
    setForm({ ...form, descricao: "", previsto: "", realizado: "" });
    load();
  };

  const updateRealizado = async (id: string, v: string) => {
    const realizado = Number(v) || 0;
    setList((l) => l.map((x) => (x.id === id ? { ...x, realizado } : x)));
    const { error } = await supabase
      .from("cashflow")
      .update({ realizado })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from("cashflow").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    load();
  };

  const saldoPrev = totals.receitaPrev - totals.despesaPrev;
  const saldoReal = totals.receitaReal - totals.despesaReal;

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-executive">Fluxo de Caixa</h2>
          <p className="text-sm text-muted-foreground">
            Lançamentos de receitas e despesas do mês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-44"
          />
          <Button onClick={replicarMesAnterior} disabled={replicating} variant="outline">
            {replicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />}
            Replicar mês anterior
          </Button>
          <Button onClick={gerarFis} disabled={generating} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Gerar FIS do mês
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="Receita prevista" value={brl(totals.receitaPrev)} tone="primary" />
        <KpiCard label="Receita realizada" value={brl(totals.receitaReal)} tone="success" />
        <KpiCard label="Despesa prevista" value={brl(totals.despesaPrev)} tone="warning" />
        <KpiCard label="Despesa realizada" value={brl(totals.despesaReal)} tone="destructive" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Saldo previsto" value={brl(saldoPrev)} tone={saldoPrev >= 0 ? "success" : "destructive"} />
        <KpiCard label="Saldo realizado" value={brl(saldoReal)} tone={saldoReal >= 0 ? "success" : "destructive"} />
      </div>

      <Card className="shadow-kpi">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Novo lançamento manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={novoLanc} className="grid gap-3 lg:grid-cols-7">
            <div className="space-y-1 lg:col-span-2">
              <Label>Empreendimento</Label>
              <Select value={form.empreendimento_id} onValueChange={(v) => setForm({ ...form, empreendimento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Centro de custo (empreendimento)" /></SelectTrigger>
                <SelectContent>
                  {emps.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: "despesa" | "receita") => setForm({ ...form, tipo: v, categoria: v === "receita" ? "FIS" : "Mão de Obra" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Previsto</Label>
              <Input type="number" step="0.01" value={form.previsto} onChange={(e) => setForm({ ...form, previsto: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Realizado</Label>
              <Input type="number" step="0.01" value={form.realizado} onChange={(e) => setForm({ ...form, realizado: e.target.value })} />
            </div>
            <div className="lg:col-span-7">
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Lançamentos do mês
          </CardTitle>
          <CardDescription>Atualize o realizado clicando no campo</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant="outline" className={l.tipo === "receita"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-warning/40 bg-warning/10 text-warning"}>
                        {l.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{l.empreendimentos?.nome ?? "—"}</TableCell>
                    <TableCell className="font-medium">{l.categoria}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.descricao}</TableCell>
                    <TableCell className="text-right">{brl(Number(l.previsto))}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" step="0.01"
                        defaultValue={Number(l.realizado)}
                        onBlur={(e) => updateRealizado(l.id, e.target.value)}
                        className="h-8 w-28 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{l.origem}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remover(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Sem lançamentos neste mês. Use "Gerar FIS" ou adicione manualmente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" | "destructive" }) {
  const map = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/10 text-warning",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;
  return (
    <div className={`rounded-lg border p-4 shadow-kpi ${map[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
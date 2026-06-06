import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Building, RefreshCw, CheckCircle2, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { useEmpreendimentos } from "@/hooks/useEmpreendimentos";

type Categoria = "aluguel"|"condominio"|"luz"|"agua"|"internet"|"telefone"|"material_escritorio"|"salario_backoffice"|"reembolso"|"viagem"|"transporte"|"alimentacao"|"software"|"contabilidade"|"juridico"|"marketing"|"manutencao"|"outros";
type Status = "previsto"|"pago"|"vencido"|"cancelado";

interface Despesa {
  id: string; categoria: Categoria; descricao: string; fornecedor: string|null;
  competencia: string; data_vencimento: string; data_pagamento: string|null;
  valor: number; valor_pago: number|null; recorrente: boolean; status: Status;
  forma_pagamento: string|null; observacoes: string|null;
  empreendimento_id: string | null;
}

const CATS: { value: Categoria; label: string }[] = [
  { value:"aluguel", label:"Aluguel" }, { value:"condominio", label:"Condomínio" },
  { value:"luz", label:"Luz" }, { value:"agua", label:"Água" },
  { value:"internet", label:"Internet" }, { value:"telefone", label:"Telefone" },
  { value:"material_escritorio", label:"Material escritório" },
  { value:"salario_backoffice", label:"Salário backoffice" },
  { value:"reembolso", label:"Reembolso" }, { value:"viagem", label:"Viagem" },
  { value:"transporte", label:"Transporte" }, { value:"alimentacao", label:"Alimentação" },
  { value:"software", label:"Software" }, { value:"contabilidade", label:"Contabilidade" },
  { value:"juridico", label:"Jurídico" }, { value:"marketing", label:"Marketing" },
  { value:"manutencao", label:"Manutenção" }, { value:"outros", label:"Outros" },
];
const catLabel = (c: Categoria) => CATS.find(x=>x.value===c)?.label ?? c;

export default function DespesasSede() {
  const { empresa } = useAuth();
  const { empreendimentos, nomeOf } = useEmpreendimentos();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7));
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterEmp, setFilterEmp] = useState<string>("all");

  const empty = {
    categoria: "outros" as Categoria, descricao: "", fornecedor: "",
    competencia: `${mes}-01`,
    data_vencimento: new Date().toISOString().slice(0,10),
    valor: 0, recorrente: false, observacoes: "", forma_pagamento: "",
    empreendimento_id: "sede",
  };
  const [form, setForm] = useState<typeof empty>(empty);

  const load = async () => {
    if (!empresa) return;
    setLoading(true);
    const { data } = await supabase.from("despesas_sede")
      .select("*").eq("empresa_id", empresa.id)
      .eq("competencia", `${mes}-01`)
      .order("data_vencimento");
    setDespesas((data ?? []) as Despesa[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresa?.id, mes]);

  const salvar = async () => {
    if (!empresa) return;
    if (!form.descricao || form.valor <= 0) { toast.error("Descrição e valor obrigatórios"); return; }
    const { empreendimento_id, ...rest } = form;
    const { error } = await supabase.from("despesas_sede").insert({
      empresa_id: empresa.id, ...rest,
      competencia: `${mes}-01`,
      empreendimento_id: empreendimento_id === "sede" ? null : empreendimento_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Despesa cadastrada"); setOpen(false); setForm(empty); load();
  };

  const gerarRecorrentes = async () => {
    const { data, error } = await supabase.rpc("gerar_despesas_sede_recorrentes", { _mes: `${mes}-01` });
    if (error) { toast.error(error.message); return; }
    toast.success(`${data ?? 0} despesa(s) recorrente(s) gerada(s)`); load();
  };

  const replicarMesAnterior = async () => {
    const { data, error } = await supabase.rpc("replicar_despesas_sede_mes_anterior", { _mes: `${mes}-01` });
    if (error) { toast.error(error.message); return; }
    toast.success(`${data ?? 0} despesa(s) replicada(s) do mês anterior`); load();
  };

  const marcarPaga = async (d: Despesa) => {
    const { error } = await supabase.from("despesas_sede").update({
      status: "pago", data_pagamento: new Date().toISOString().slice(0,10), valor_pago: d.valor,
    }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marcada como paga"); load();
  };

  const filtradas = useMemo(() => despesas.filter(d =>
    (filterCat==="all" || d.categoria===filterCat) &&
    (filterEmp==="all" || (filterEmp==="sede" ? !d.empreendimento_id : d.empreendimento_id===filterEmp))
  ), [despesas, filterCat, filterEmp]);

  const totais = useMemo(() => {
    const previsto = despesas.reduce((s,d)=>s+Number(d.valor),0);
    const pago = despesas.filter(d=>d.status==="pago").reduce((s,d)=>s+Number(d.valor_pago ?? d.valor),0);
    const aberto = previsto - pago;
    return { previsto, pago, aberto };
  }, [despesas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building className="h-6 w-6" /> Despesas Sede</h1>
          <p className="text-sm text-muted-foreground">Despesas fixas e variáveis do escritório central</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={mes} onChange={e=>setMes(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={replicarMesAnterior}><CopyPlus className="h-4 w-4 mr-1" /> Replicar mês anterior</Button>
          <Button variant="outline" onClick={gerarRecorrentes}><RefreshCw className="h-4 w-4 mr-1" /> Gerar recorrentes</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova despesa</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Cadastrar despesa</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} /></div>
                <div><Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v:Categoria)=>setForm({...form,categoria:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={e=>setForm({...form,fornecedor:e.target.value})} /></div>
                <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:+e.target.value})} /></div>
                <div><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} /></div>
                <div className="col-span-2"><Label>Empreendimento (centro de custo)</Label>
                  <Select value={form.empreendimento_id} onValueChange={v=>setForm({...form,empreendimento_id:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sede">Sede / Geral</SelectItem>
                      {empreendimentos.map(e=><SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-3 pt-2">
                  <Switch checked={form.recorrente} onCheckedChange={v=>setForm({...form,recorrente:v})} />
                  <Label>Despesa recorrente mensal</Label>
                </div>
                <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Previsto no mês</CardDescription><CardTitle className="text-2xl">{brl(totais.previsto)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pago</CardDescription><CardTitle className="text-2xl text-emerald-600">{brl(totais.pago)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Em aberto</CardDescription><CardTitle className="text-2xl text-amber-600">{brl(totais.aberto)}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <CardTitle>Lançamentos — {mes}</CardTitle>
            <div className="flex gap-2">
              <Select value={filterEmp} onValueChange={setFilterEmp}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos empreendimentos</SelectItem>
                  <SelectItem value="sede">Sede / Geral</SelectItem>
                  {empreendimentos.map(e=><SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CATS.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Categoria</TableHead><TableHead>Descrição</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtradas.map(d => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline">{catLabel(d.categoria)}{d.recorrente && " ↻"}</Badge></TableCell>
                    <TableCell className="font-medium">{d.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.empreendimento_id ? nomeOf(d.empreendimento_id) : "Sede"}</TableCell>
                    <TableCell className="text-muted-foreground">{d.fornecedor ?? "—"}</TableCell>
                    <TableCell>{new Date(d.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono">{brl(Number(d.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={d.status==="pago"?"default":d.status==="vencido"?"destructive":"secondary"}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.status !== "pago" && (
                        <Button size="sm" variant="outline" onClick={()=>marcarPaga(d)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtradas.length===0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma despesa neste mês</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, Loader2, Receipt, AlertTriangle, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { useEmpreendimentos } from "@/hooks/useEmpreendimentos";

type Categoria = "inss"|"fgts"|"iss"|"irrf"|"das"|"pis"|"cofins"|"csll"|"irpj"|"outros";
type Status = "pendente"|"pago"|"vencido"|"cancelado";

interface Guia {
  id: string; categoria: Categoria; descricao: string;
  competencia: string; data_vencimento: string; data_pagamento: string | null;
  valor: number; valor_pago: number | null; status: Status;
  codigo_receita: string | null; numero_documento: string | null; observacoes: string | null;
  empreendimento_id: string | null;
}

const CATEGORIAS: { value: Categoria; label: string; cor: string }[] = [
  { value: "inss", label: "INSS", cor: "bg-blue-100 text-blue-800" },
  { value: "fgts", label: "FGTS", cor: "bg-cyan-100 text-cyan-800" },
  { value: "iss",  label: "ISS",  cor: "bg-purple-100 text-purple-800" },
  { value: "irrf", label: "IRRF", cor: "bg-amber-100 text-amber-800" },
  { value: "das",  label: "DAS",  cor: "bg-emerald-100 text-emerald-800" },
  { value: "pis",  label: "PIS",  cor: "bg-pink-100 text-pink-800" },
  { value: "cofins",label:"COFINS",cor:"bg-rose-100 text-rose-800" },
  { value: "csll", label: "CSLL", cor: "bg-indigo-100 text-indigo-800" },
  { value: "irpj", label: "IRPJ", cor: "bg-orange-100 text-orange-800" },
  { value: "outros",label:"Outros",cor:"bg-slate-100 text-slate-800" },
];
const catLabel = (c: Categoria) => CATEGORIAS.find(x=>x.value===c)?.label ?? c;
const catCor = (c: Categoria) => CATEGORIAS.find(x=>x.value===c)?.cor ?? "bg-slate-100";

export default function Fiscal() {
  const { empresa } = useAuth();
  const { empreendimentos, nomeOf } = useEmpreendimentos();
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterEmp, setFilterEmp] = useState<string>("all");
  const [mesReplicar, setMesReplicar] = useState(new Date().toISOString().slice(0,7));

  const empty = {
    categoria: "inss" as Categoria, descricao: "",
    competencia: new Date().toISOString().slice(0,7) + "-01",
    data_vencimento: new Date().toISOString().slice(0,10),
    valor: 0, codigo_receita: "", numero_documento: "", observacoes: "",
    empreendimento_id: "sede",
  };
  const [form, setForm] = useState<typeof empty>(empty);

  const load = async () => {
    if (!empresa) return;
    setLoading(true);
    const { data } = await supabase.from("guias_fiscais")
      .select("*").eq("empresa_id", empresa.id)
      .order("data_vencimento", { ascending: false });
    // marcar vencidas
    const hoje = new Date().toISOString().slice(0,10);
    const venc = (data ?? []).filter(g => g.status==="pendente" && g.data_vencimento < hoje);
    if (venc.length > 0) {
      await supabase.from("guias_fiscais").update({ status: "vencido" })
        .in("id", venc.map(v=>v.id));
    }
    const { data: data2 } = await supabase.from("guias_fiscais")
      .select("*").eq("empresa_id", empresa.id)
      .order("data_vencimento", { ascending: false });
    setGuias((data2 ?? []) as Guia[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresa?.id]);

  const salvar = async () => {
    if (!empresa) return;
    if (!form.descricao || form.valor <= 0) { toast.error("Descrição e valor são obrigatórios"); return; }
    const { empreendimento_id, ...rest } = form;
    const { error } = await supabase.from("guias_fiscais").insert({
      empresa_id: empresa.id,
      ...rest,
      empreendimento_id: empreendimento_id === "sede" ? null : empreendimento_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Guia cadastrada"); setOpen(false); setForm(empty); load();
  };

  const marcarPaga = async (g: Guia) => {
    const { error } = await supabase.from("guias_fiscais").update({
      status: "pago", data_pagamento: new Date().toISOString().slice(0,10),
      valor_pago: g.valor,
    }).eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marcada como paga"); load();
  };

  const replicarMesAnterior = async () => {
    const { data, error } = await supabase.rpc("replicar_guias_fiscais_mes_anterior", { _mes: `${mesReplicar}-01` });
    if (error) { toast.error(error.message); return; }
    toast.success(`${data ?? 0} guia(s) replicada(s) do mês anterior para ${mesReplicar}`); load();
  };

  const filtradas = useMemo(() => guias.filter(g =>
    (filterStatus==="all" || g.status===filterStatus) &&
    (filterCat==="all" || g.categoria===filterCat) &&
    (filterEmp==="all" || (filterEmp==="sede" ? !g.empreendimento_id : g.empreendimento_id===filterEmp))
  ), [guias, filterStatus, filterCat, filterEmp]);

  const totais = useMemo(() => {
    const pendente = guias.filter(g=>g.status==="pendente").reduce((s,g)=>s+Number(g.valor),0);
    const vencido = guias.filter(g=>g.status==="vencido").reduce((s,g)=>s+Number(g.valor),0);
    const pago = guias.filter(g=>g.status==="pago").reduce((s,g)=>s+Number(g.valor_pago ?? g.valor),0);
    return { pendente, vencido, pago };
  }, [guias]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Fiscal</h1>
          <p className="text-sm text-muted-foreground">Controle de guias de impostos e encargos</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input type="month" value={mesReplicar} onChange={e=>setMesReplicar(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={replicarMesAnterior}>
            <CopyPlus className="h-4 w-4 mr-1" /> Replicar mês anterior
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova guia</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar guia fiscal</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} placeholder="Ex: GPS competência 04/2026" /></div>
              <div><Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v:Categoria)=>setForm({...form,categoria:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:+e.target.value})} /></div>
              <div><Label>Competência</Label><Input type="month" value={form.competencia.slice(0,7)} onChange={e=>setForm({...form,competencia:e.target.value+"-01"})} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} /></div>
              <div><Label>Código receita</Label><Input value={form.codigo_receita} onChange={e=>setForm({...form,codigo_receita:e.target.value})} /></div>
              <div><Label>Nº documento</Label><Input value={form.numero_documento} onChange={e=>setForm({...form,numero_documento:e.target.value})} /></div>
              <div className="col-span-2"><Label>Empreendimento (centro de custo)</Label>
                <Select value={form.empreendimento_id} onValueChange={v=>setForm({...form,empreendimento_id:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sede">Sede / Geral</SelectItem>
                    {empreendimentos.map(e=><SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Pendente</CardDescription><CardTitle className="text-2xl">{brl(totais.pendente)}</CardTitle></CardHeader></Card>
        <Card className="border-destructive/50"><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Vencido</CardDescription><CardTitle className="text-2xl text-destructive">{brl(totais.vencido)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pago YTD</CardDescription><CardTitle className="text-2xl text-emerald-600">{brl(totais.pago)}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <CardTitle>Guias</CardTitle>
            <div className="flex gap-2">
              <Select value={filterEmp} onValueChange={setFilterEmp}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos empreendimentos</SelectItem>
                  <SelectItem value="sede">Sede / Geral</SelectItem>
                  {empreendimentos.map(e=><SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CATEGORIAS.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
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
                <TableHead>Competência</TableHead><TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtradas.map(g => (
                  <TableRow key={g.id}>
                    <TableCell><Badge className={catCor(g.categoria)}>{catLabel(g.categoria)}</Badge></TableCell>
                    <TableCell className="font-medium">{g.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.empreendimento_id ? nomeOf(g.empreendimento_id) : "Sede"}</TableCell>
                    <TableCell>{g.competencia.slice(0,7).split("-").reverse().join("/")}</TableCell>
                    <TableCell>{new Date(g.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono">{brl(Number(g.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={g.status==="pago"?"default":g.status==="vencido"?"destructive":"secondary"}>
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {g.status !== "pago" && (
                        <Button size="sm" variant="outline" onClick={()=>marcarPaga(g)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtradas.length===0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma guia encontrada</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
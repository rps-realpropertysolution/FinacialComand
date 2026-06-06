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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

type Vinculo = "clt"|"pj"|"estagio"|"socio"|"autonomo";
type Alocacao = "sede"|"empreendimento";

interface Colaborador {
  id: string; nome: string; cpf: string|null; cargo: string|null;
  vinculo: Vinculo; alocacao: Alocacao; empreendimento_id: string|null;
  salario_base: number; vale_refeicao: number; vale_transporte: number;
  plano_saude: number; outros_beneficios: number;
  data_admissao: string|null; ativo: boolean; email: string|null;
}
interface FolhaItem {
  id: string; colaborador_id: string; competencia: string;
  salario: number; beneficios: number; bonus: number; horas_extras: number;
  descontos: number; inss: number; fgts: number; irrf: number; outros_encargos: number;
  liquido: number; custo_total: number; status: string; data_pagamento: string|null;
}
interface Empreendimento { id: string; nome: string; codigo: string|null }

export default function RH() {
  const { empresa } = useAuth();
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [folha, setFolha] = useState<FolhaItem[]>([]);
  const [emps, setEmps] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCol, setOpenCol] = useState(false);
  const [openFolha, setOpenFolha] = useState(false);
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7));

  const emptyCol = {
    nome: "", cpf: "", cargo: "", vinculo: "clt" as Vinculo, alocacao: "sede" as Alocacao,
    empreendimento_id: "" as string, salario_base: 0, vale_refeicao: 0, vale_transporte: 0,
    plano_saude: 0, outros_beneficios: 0, data_admissao: "", email: "", telefone: "",
  };
  const [formCol, setFormCol] = useState<typeof emptyCol>(emptyCol);

  const emptyFolha = {
    colaborador_id: "", salario: 0, beneficios: 0, bonus: 0, horas_extras: 0,
    descontos: 0, inss: 0, fgts: 0, irrf: 0, outros_encargos: 0, observacoes: "",
  };
  const [formFolha, setFormFolha] = useState<typeof emptyFolha>(emptyFolha);

  const load = async () => {
    if (!empresa) return;
    setLoading(true);
    const [{ data: c }, { data: f }, { data: e }] = await Promise.all([
      supabase.from("colaboradores").select("*").eq("empresa_id", empresa.id).order("nome"),
      supabase.from("folha_pagamento").select("*").eq("empresa_id", empresa.id).eq("competencia", `${mes}-01`),
      supabase.from("empreendimentos").select("id,nome,codigo").eq("empresa_id", empresa.id).order("codigo"),
    ]);
    setColabs((c ?? []) as Colaborador[]);
    setFolha((f ?? []) as FolhaItem[]);
    setEmps((e ?? []) as Empreendimento[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresa?.id, mes]);

  const salvarCol = async () => {
    if (!empresa) return;
    if (!formCol.nome) { toast.error("Nome obrigatório"); return; }
    const payload: any = { ...formCol, empresa_id: empresa.id };
    if (!payload.empreendimento_id) payload.empreendimento_id = null;
    if (!payload.data_admissao) payload.data_admissao = null;
    const { error } = await supabase.from("colaboradores").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Colaborador cadastrado"); setOpenCol(false); setFormCol(emptyCol); load();
  };

  // Cálculo automático INSS/IRRF/FGTS simplificado (CLT 2026)
  const calcEncargos = (sal: number) => {
    let inss = 0;
    if (sal <= 1518.00) inss = sal * 0.075;
    else if (sal <= 2793.88) inss = sal * 0.09 - 22.77;
    else if (sal <= 4190.83) inss = sal * 0.12 - 106.59;
    else if (sal <= 8157.41) inss = sal * 0.14 - 190.40;
    else inss = 951.63;
    const fgts = sal * 0.08;
    const baseIr = sal - inss;
    let irrf = 0;
    if (baseIr <= 2428.80) irrf = 0;
    else if (baseIr <= 2826.65) irrf = baseIr * 0.075 - 182.16;
    else if (baseIr <= 3751.05) irrf = baseIr * 0.15 - 394.16;
    else if (baseIr <= 4664.68) irrf = baseIr * 0.225 - 675.49;
    else irrf = baseIr * 0.275 - 908.73;
    return {
      inss: +inss.toFixed(2), fgts: +fgts.toFixed(2), irrf: +Math.max(0,irrf).toFixed(2),
    };
  };

  const onSelectColFolha = (id: string) => {
    const c = colabs.find(x=>x.id===id);
    if (!c) return;
    const beneficios = Number(c.vale_refeicao)+Number(c.vale_transporte)+Number(c.plano_saude)+Number(c.outros_beneficios);
    const enc = calcEncargos(Number(c.salario_base));
    setFormFolha({
      colaborador_id: id, salario: Number(c.salario_base), beneficios,
      bonus: 0, horas_extras: 0, descontos: 0,
      inss: enc.inss, fgts: enc.fgts, irrf: enc.irrf, outros_encargos: 0, observacoes: "",
    });
  };

  const salvarFolha = async () => {
    if (!empresa || !formFolha.colaborador_id) { toast.error("Selecione colaborador"); return; }
    const { error } = await supabase.from("folha_pagamento").insert({
      empresa_id: empresa.id, competencia: `${mes}-01`, ...formFolha,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Folha lançada"); setOpenFolha(false); setFormFolha(emptyFolha); load();
  };

  const totaisFolha = useMemo(() => {
    const liq = folha.reduce((s,f)=>s+Number(f.liquido),0);
    const custo = folha.reduce((s,f)=>s+Number(f.custo_total),0);
    const enc = folha.reduce((s,f)=>s+Number(f.inss)+Number(f.fgts)+Number(f.irrf)+Number(f.outros_encargos),0);
    return { liq, custo, enc };
  }, [folha]);

  const colNome = (id: string) => colabs.find(c=>c.id===id)?.nome ?? "—";
  const empNome = (id: string|null) => id ? (emps.find(e=>e.id===id)?.codigo ?? emps.find(e=>e.id===id)?.nome ?? "—") : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Recursos Humanos</h1>
        <p className="text-sm text-muted-foreground">Cadastro de colaboradores e folha mensal</p>
      </div>

      <Tabs defaultValue="colab">
        <TabsList>
          <TabsTrigger value="colab">Colaboradores</TabsTrigger>
          <TabsTrigger value="folha">Folha mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="colab" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={openCol} onOpenChange={setOpenCol}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo colaborador</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Cadastrar colaborador</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Nome *</Label><Input value={formCol.nome} onChange={e=>setFormCol({...formCol,nome:e.target.value})} /></div>
                  <div><Label>CPF</Label><Input value={formCol.cpf} onChange={e=>setFormCol({...formCol,cpf:e.target.value})} /></div>
                  <div><Label>Cargo</Label><Input value={formCol.cargo} onChange={e=>setFormCol({...formCol,cargo:e.target.value})} /></div>
                  <div><Label>Vínculo</Label>
                    <Select value={formCol.vinculo} onValueChange={(v:Vinculo)=>setFormCol({...formCol,vinculo:v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clt">CLT</SelectItem><SelectItem value="pj">PJ</SelectItem>
                        <SelectItem value="estagio">Estágio</SelectItem><SelectItem value="socio">Sócio</SelectItem>
                        <SelectItem value="autonomo">Autônomo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Alocação</Label>
                    <Select value={formCol.alocacao} onValueChange={(v:Alocacao)=>setFormCol({...formCol,alocacao:v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sede">Sede / Backoffice</SelectItem>
                        <SelectItem value="empreendimento">Empreendimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formCol.alocacao==="empreendimento" && (
                    <div className="col-span-2"><Label>Empreendimento</Label>
                      <Select value={formCol.empreendimento_id} onValueChange={v=>setFormCol({...formCol,empreendimento_id:v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{emps.map(e=><SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label>Salário base</Label><Input type="number" step="0.01" value={formCol.salario_base} onChange={e=>setFormCol({...formCol,salario_base:+e.target.value})} /></div>
                  <div><Label>Admissão</Label><Input type="date" value={formCol.data_admissao} onChange={e=>setFormCol({...formCol,data_admissao:e.target.value})} /></div>
                  <div><Label>VR</Label><Input type="number" step="0.01" value={formCol.vale_refeicao} onChange={e=>setFormCol({...formCol,vale_refeicao:+e.target.value})} /></div>
                  <div><Label>VT</Label><Input type="number" step="0.01" value={formCol.vale_transporte} onChange={e=>setFormCol({...formCol,vale_transporte:+e.target.value})} /></div>
                  <div><Label>Plano de saúde</Label><Input type="number" step="0.01" value={formCol.plano_saude} onChange={e=>setFormCol({...formCol,plano_saude:+e.target.value})} /></div>
                  <div><Label>Outros benefícios</Label><Input type="number" step="0.01" value={formCol.outros_beneficios} onChange={e=>setFormCol({...formCol,outros_beneficios:+e.target.value})} /></div>
                  <div><Label>Email</Label><Input value={formCol.email} onChange={e=>setFormCol({...formCol,email:e.target.value})} /></div>
                  <div><Label>Telefone</Label><Input value={formCol.telefone} onChange={e=>setFormCol({...formCol,telefone:e.target.value})} /></div>
                </div>
                <DialogFooter><Button onClick={salvarCol}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card><CardContent className="pt-6">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Vínculo</TableHead>
                  <TableHead>Alocação</TableHead><TableHead className="text-right">Salário</TableHead>
                  <TableHead className="text-right">Benefícios</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {colabs.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.cargo ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{c.vinculo.toUpperCase()}</Badge></TableCell>
                      <TableCell>{c.alocacao==="sede" ? "Sede" : empNome(c.empreendimento_id)}</TableCell>
                      <TableCell className="text-right font-mono">{brl(Number(c.salario_base))}</TableCell>
                      <TableCell className="text-right font-mono">{brl(Number(c.vale_refeicao)+Number(c.vale_transporte)+Number(c.plano_saude)+Number(c.outros_beneficios))}</TableCell>
                      <TableCell><Badge variant={c.ativo?"default":"secondary"}>{c.ativo?"ativo":"inativo"}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {colabs.length===0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum colaborador cadastrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="folha" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 items-center">
              <Label>Competência:</Label>
              <Input type="month" value={mes} onChange={e=>setMes(e.target.value)} className="w-40" />
            </div>
            <Dialog open={openFolha} onOpenChange={setOpenFolha}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Lançar folha</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Lançar folha — {mes}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Colaborador</Label>
                    <Select value={formFolha.colaborador_id} onValueChange={onSelectColFolha}>
                      <SelectTrigger><SelectValue placeholder="Selecione (encargos serão calculados)" /></SelectTrigger>
                      <SelectContent>{colabs.filter(c=>c.ativo).map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Salário</Label><Input type="number" step="0.01" value={formFolha.salario} onChange={e=>setFormFolha({...formFolha,salario:+e.target.value})} /></div>
                  <div><Label>Benefícios</Label><Input type="number" step="0.01" value={formFolha.beneficios} onChange={e=>setFormFolha({...formFolha,beneficios:+e.target.value})} /></div>
                  <div><Label>Bônus</Label><Input type="number" step="0.01" value={formFolha.bonus} onChange={e=>setFormFolha({...formFolha,bonus:+e.target.value})} /></div>
                  <div><Label>Horas extras</Label><Input type="number" step="0.01" value={formFolha.horas_extras} onChange={e=>setFormFolha({...formFolha,horas_extras:+e.target.value})} /></div>
                  <div><Label>Descontos</Label><Input type="number" step="0.01" value={formFolha.descontos} onChange={e=>setFormFolha({...formFolha,descontos:+e.target.value})} /></div>
                  <div><Label>INSS</Label><Input type="number" step="0.01" value={formFolha.inss} onChange={e=>setFormFolha({...formFolha,inss:+e.target.value})} /></div>
                  <div><Label>FGTS</Label><Input type="number" step="0.01" value={formFolha.fgts} onChange={e=>setFormFolha({...formFolha,fgts:+e.target.value})} /></div>
                  <div><Label>IRRF</Label><Input type="number" step="0.01" value={formFolha.irrf} onChange={e=>setFormFolha({...formFolha,irrf:+e.target.value})} /></div>
                  <div><Label>Outros encargos</Label><Input type="number" step="0.01" value={formFolha.outros_encargos} onChange={e=>setFormFolha({...formFolha,outros_encargos:+e.target.value})} /></div>
                </div>
                <DialogFooter><Button onClick={salvarFolha}>Lançar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>Líquido da folha</CardDescription><CardTitle className="text-2xl">{brl(totaisFolha.liq)}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Encargos</CardDescription><CardTitle className="text-2xl text-amber-600">{brl(totaisFolha.enc)}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Custo total</CardDescription><CardTitle className="text-2xl text-primary">{brl(totaisFolha.custo)}</CardTitle></CardHeader></Card>
          </div>

          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Salário</TableHead>
                <TableHead className="text-right">Benef.</TableHead>
                <TableHead className="text-right">INSS</TableHead>
                <TableHead className="text-right">FGTS</TableHead>
                <TableHead className="text-right">IRRF</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead className="text-right">Custo total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {folha.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{colNome(f.colaborador_id)}</TableCell>
                    <TableCell className="text-right font-mono">{brl(Number(f.salario))}</TableCell>
                    <TableCell className="text-right font-mono">{brl(Number(f.beneficios))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{brl(Number(f.inss))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{brl(Number(f.fgts))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{brl(Number(f.irrf))}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{brl(Number(f.liquido))}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">{brl(Number(f.custo_total))}</TableCell>
                  </TableRow>
                ))}
                {folha.length===0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum lançamento neste mês</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
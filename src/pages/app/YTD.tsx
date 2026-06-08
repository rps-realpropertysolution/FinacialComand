import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart as LC, Loader2, Download } from "lucide-react";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Empreendimento { id: string; nome: string; codigo: string|null }

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Linha = {
  key: string;
  label: string;
  tipo: "receita"|"despesa"|"total";
  valores: number[]; // 12
  destacar?: boolean;
  indent?: boolean;
};

export default function YTD() {
  const { empresa } = useAuth();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [emps, setEmps] = useState<Empreendimento[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!empresa) return;
    setLoading(true);
    const ini = `${ano}-01-01`;
    const fim = `${ano}-12-31`;

    const [{ data: empsD }, { data: fatD }, { data: cfD }, { data: dsD }, { data: fpD }, { data: gfD }] = await Promise.all([
      supabase.from("empreendimentos").select("id,nome,codigo").eq("empresa_id", empresa.id).order("codigo"),
      supabase.from("faturamentos").select("competencia,empreendimento_id,valor_total,status").eq("empresa_id", empresa.id).gte("competencia", ini).lte("competencia", fim),
      supabase.from("cashflow").select("mes,tipo,realizado,empreendimento_id,categoria").eq("empresa_id", empresa.id).gte("mes", ini).lte("mes", fim),
      supabase.from("despesas_sede").select("competencia,valor,categoria,status").eq("empresa_id", empresa.id).gte("competencia", ini).lte("competencia", fim),
      supabase.from("folha_pagamento").select("competencia,custo_total,colaborador_id").eq("empresa_id", empresa.id).gte("competencia", ini).lte("competencia", fim),
      supabase.from("guias_fiscais").select("competencia,valor,categoria").eq("empresa_id", empresa.id).gte("competencia", ini).lte("competencia", fim),
    ]);

    const empList = (empsD ?? []) as Empreendimento[];
    setEmps(empList);
    const empIdx = new Map(empList.map(e => [e.id, e]));

    const zeros = () => Array(12).fill(0) as number[];
    const mesIdx = (d: string) => new Date(d).getMonth();

    // Receitas por empreendimento (faturamentos)
    const recByEmp = new Map<string, number[]>();
    empList.forEach(e => recByEmp.set(e.id, zeros()));
    const recSemEmp = zeros();
    (fatD ?? []).forEach(f => {
      const m = mesIdx(f.competencia);
      const v = Number(f.valor_total ?? 0);
      if (f.empreendimento_id && recByEmp.has(f.empreendimento_id)) {
        recByEmp.get(f.empreendimento_id)![m] += v;
      } else recSemEmp[m] += v;
    });

    // Despesas por empreendimento (cashflow tipo despesa)
    const despByEmp = new Map<string, number[]>();
    empList.forEach(e => despByEmp.set(e.id, zeros()));
    const despSemEmp = zeros();
    (cfD ?? []).filter(c=>c.tipo==="despesa").forEach(c => {
      const m = mesIdx(c.mes);
      const v = Number(c.realizado ?? 0);
      if (c.empreendimento_id && despByEmp.has(c.empreendimento_id)) {
        despByEmp.get(c.empreendimento_id)![m] += v;
      } else despSemEmp[m] += v;
    });

    // Despesas Sede
    const despSede = zeros();
    (dsD ?? []).forEach(d => { despSede[mesIdx(d.competencia)] += Number(d.valor ?? 0); });

    // Folha
    const folha = zeros();
    (fpD ?? []).forEach(f => { folha[mesIdx(f.competencia)] += Number(f.custo_total ?? 0); });

    // Encargos fiscais
    const fiscal = zeros();
    (gfD ?? []).forEach(g => { fiscal[mesIdx(g.competencia)] += Number(g.valor ?? 0); });

    const sumArr = (arrs: number[][]) => {
      const out = zeros();
      arrs.forEach(a => a.forEach((v,i)=>out[i]+=v));
      return out;
    };

    const totalReceitas = sumArr([...Array.from(recByEmp.values()), recSemEmp]);
    const totalDespEmp = sumArr([...Array.from(despByEmp.values()), despSemEmp]);
    const totalBackoffice = sumArr([despSede, folha, fiscal]);
    const resultado = totalReceitas.map((r,i) => r - totalDespEmp[i] - totalBackoffice[i]);

    const linhasOut: Linha[] = [];
    linhasOut.push({ key:"recH", label:"RECEITAS POR CENTRO DE CUSTO", tipo:"total", valores: zeros(), destacar:true });
    empList.forEach(e => {
      const v = recByEmp.get(e.id)!;
      if (v.some(x=>x!==0)) linhasOut.push({ key:`rec-${e.id}`, label:`${e.codigo ?? "—"} ${e.nome}`, tipo:"receita", valores:v, indent:true });
    });
    if (recSemEmp.some(x=>x!==0)) linhasOut.push({ key:"rec-na", label:"Sem centro de custo", tipo:"receita", valores: recSemEmp, indent:true });
    linhasOut.push({ key:"recT", label:"Total receitas", tipo:"total", valores: totalReceitas });

    linhasOut.push({ key:"backH", label:"DESPESAS BACKOFFICE (SEDE)", tipo:"total", valores: zeros(), destacar:true });
    linhasOut.push({ key:"back-folha", label:"Folha (CLT, encargos, benefícios)", tipo:"despesa", valores: folha, indent:true });
    linhasOut.push({ key:"back-fix", label:"Despesas operacionais (aluguel, utilities, etc.)", tipo:"despesa", valores: despSede, indent:true });
    linhasOut.push({ key:"back-fis", label:"Encargos e impostos (INSS, FGTS, ISS, IRRF…)", tipo:"despesa", valores: fiscal, indent:true });
    linhasOut.push({ key:"backT", label:"Total backoffice", tipo:"total", valores: totalBackoffice });

    linhasOut.push({ key:"empH", label:"DESPESAS POR EMPREENDIMENTO", tipo:"total", valores: zeros(), destacar:true });
    empList.forEach(e => {
      const v = despByEmp.get(e.id)!;
      if (v.some(x=>x!==0)) linhasOut.push({ key:`dep-${e.id}`, label:`${e.codigo ?? "—"} ${e.nome}`, tipo:"despesa", valores:v, indent:true });
    });
    if (despSemEmp.some(x=>x!==0)) linhasOut.push({ key:"dep-na", label:"Sem centro de custo", tipo:"despesa", valores: despSemEmp, indent:true });
    linhasOut.push({ key:"depT", label:"Total despesas empreendimentos", tipo:"total", valores: totalDespEmp });

    linhasOut.push({ key:"res", label:"RESULTADO LÍQUIDO", tipo:"total", valores: resultado, destacar:true });

    setLinhas(linhasOut);
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresa?.id, ano]);

  const totalLinha = (v: number[]) => v.reduce((s,x)=>s+x,0);
  const totalReceitasYTD = useMemo(() => {
    const l = linhas.find(x=>x.key==="recT"); return l ? totalLinha(l.valores) : 0;
  }, [linhas]);

  const exportCSV = () => {
    const header = ["Linha", ...MESES, "Total YTD", "% Receita"];
    const rows = linhas.map(l => {
      const tot = totalLinha(l.valores);
      const pct = totalReceitasYTD > 0 ? (tot/totalReceitasYTD*100).toFixed(1)+"%" : "";
      return [l.label, ...l.valores.map(v=>v.toFixed(2)), tot.toFixed(2), pct];
    });
    const csv = [header, ...rows].map(r=>r.map(c=>`"${c}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `YTD_${ano}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LC className="h-6 w-6" /> Acumulado do Ano — Demonstrativo Linha a Linha</h1>
          <p className="text-sm text-muted-foreground">Consolidado anual: receitas por CC, backoffice, empreendimentos e resultado</p>
        </div>
        <div className="flex gap-2 items-center">
          <Label>Ano:</Label>
          <Input type="number" value={ano} onChange={e=>setAno(+e.target.value)} className="w-24" />
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Demonstrativo {ano}</CardTitle><CardDescription>Receita = faturamentos por competência. Despesas backoffice = folha + sede + encargos. Despesas empreendimento = cashflow realizado.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background min-w-[260px]">Linha</TableHead>
                    {MESES.map(m=><TableHead key={m} className="text-right">{m}</TableHead>)}
                    <TableHead className="text-right font-bold">Acum. Ano</TableHead>
                    <TableHead className="text-right">% Rec.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map(l => {
                    const tot = totalLinha(l.valores);
                    const pct = totalReceitasYTD > 0 ? (tot/totalReceitasYTD*100) : 0;
                    const isHeader = l.destacar && l.valores.every(v=>v===0);
                    return (
                      <TableRow key={l.key} className={cn(
                        l.destacar && "bg-muted/40 font-bold",
                        l.tipo==="total" && !l.destacar && "border-t-2 font-semibold",
                      )}>
                        <TableCell className={cn("sticky left-0 bg-background", l.indent && "pl-8 text-sm font-normal", l.destacar && "bg-muted/40")}>
                          {l.label}
                        </TableCell>
                        {l.valores.map((v,i)=>(
                          <TableCell key={i} className={cn(
                            "text-right font-mono text-xs tabular-nums",
                            v===0 && "text-muted-foreground/40",
                            l.tipo==="receita" && v>0 && "text-emerald-700",
                            l.tipo==="despesa" && v>0 && "text-rose-700",
                          )}>
                            {isHeader ? "" : v===0 ? "–" : brl(v).replace("R$\u00A0","")}
                          </TableCell>
                        ))}
                        <TableCell className={cn(
                          "text-right font-mono text-xs font-bold tabular-nums",
                          l.key==="res" && tot>=0 && "text-emerald-700",
                          l.key==="res" && tot<0 && "text-rose-700",
                        )}>{isHeader ? "" : brl(tot).replace("R$\u00A0","")}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {isHeader || totalReceitasYTD===0 ? "" : `${pct.toFixed(1)}%`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
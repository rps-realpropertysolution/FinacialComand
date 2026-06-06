import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Plus, Loader2, Upload, Download, FileCode2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import importData from "@/data/honorarios-import.json";
import { useEmpreendimentos } from "@/hooks/useEmpreendimentos";

type Status = "pendente" | "emitida" | "paga" | "vencida" | "cancelada";

interface Tomador {
  id: string; nome: string; razao_social: string | null; cnpj: string | null;
  inscricao_municipal?: string | null; email?: string | null; empreendimento_id?: string | null;
}
interface Faturamento {
  id: string;
  tomador_id: string | null;
  competencia: string;
  data_emissao: string | null;
  data_vencimento: string;
  valor_honorarios: number; valor_massa_salarial: number;
  valor_relatorios: number; valor_juridico: number; valor_viagem: number;
  valor_total: number;
  status: Status;
  numero_nfse: string | null; numero_rps: string | null;
  indice_reajuste: string | null; mes_base_reajuste: string | null;
  vigencia_contratual: string | null;
  tomadores?: { nome: string; cnpj: string | null } | null;
}

const STATUS_STYLE: Record<Status, string> = {
  pendente: "border-warning/40 bg-warning/10 text-warning",
  emitida: "border-primary/40 bg-primary/10 text-primary",
  paga: "border-success/40 bg-success/10 text-success",
  vencida: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelada: "border-muted bg-muted text-muted-foreground",
};

const fmtCNPJ = (c?: string | null) =>
  !c ? "—" : c.replace(/\D/g, "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

export default function Faturamentos() {
  const { empresa, profile } = useAuth();
  const isDiretor = profile?.role === "diretor";
  const { empreendimentos } = useEmpreendimentos();
  const [tomadores, setTomadores] = useState<Tomador[]>([]);
  const [list, setList] = useState<Faturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"todos" | Status>("todos");
  const [filterMes, setFilterMes] = useState<string>("");

  const [openFat, setOpenFat] = useState(false);
  const [openTom, setOpenTom] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingFat, setSavingFat] = useState(false);

  const [fat, setFat] = useState({
    tomador_id: "",
    empreendimento_id: "",
    competencia: new Date().toISOString().slice(0, 7) + "-01",
    data_vencimento: "",
    data_emissao: "",
    valor_honorarios: "0",
    valor_massa_salarial: "0",
    valor_relatorios: "0",
    valor_juridico: "0",
    valor_viagem: "0",
    indice_reajuste: "",
    mes_base_reajuste: "",
    vigencia_contratual: "24 meses",
  });

  const [tom, setTom] = useState({
    nome: "", razao_social: "", cnpj: "", inscricao_municipal: "", email: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: f }] = await Promise.all([
      supabase.from("tomadores").select("id, nome, razao_social, cnpj, inscricao_municipal, email, empreendimento_id").order("nome"),
      supabase
        .from("faturamentos")
        .select("*, tomadores(nome, cnpj)")
        .order("competencia", { ascending: false })
        .order("data_vencimento", { ascending: true }),
    ]);
    setTomadores((t as Tomador[]) ?? []);
    setList((f as unknown as Faturamento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return list.filter((r) => {
      if (filterStatus !== "todos" && r.status !== filterStatus) return false;
      if (filterMes && !r.competencia.startsWith(filterMes)) return false;
      return true;
    });
  }, [list, filterStatus, filterMes]);

  const totals = useMemo(() => {
    const t = { total: 0, pendente: 0, paga: 0, vencida: 0 };
    for (const r of filtered) {
      t.total += Number(r.valor_total || 0);
      if (r.status === "paga") t.paga += Number(r.valor_total || 0);
      else if (r.status === "vencida") t.vencida += Number(r.valor_total || 0);
      else t.pendente += Number(r.valor_total || 0);
    }
    return t;
  }, [filtered]);

  const submitTomador = async () => {
    if (!empresa) return;
    if (!tom.nome.trim()) return toast.error("Informe o nome");
    const { error } = await supabase.from("tomadores").insert([{
      empresa_id: empresa.id,
      nome: tom.nome.trim(),
      razao_social: tom.razao_social || null,
      cnpj: tom.cnpj.replace(/\D/g, "") || null,
      inscricao_municipal: tom.inscricao_municipal || null,
      email: tom.email || null,
    }]);
    if (error) return toast.error(error.message);
    toast.success("Tomador cadastrado");
    setOpenTom(false);
    setTom({ nome: "", razao_social: "", cnpj: "", inscricao_municipal: "", email: "" });
    load();
  };

  const submitFat = async () => {
    if (!empresa) return;
    if (!fat.tomador_id || !fat.data_vencimento) return toast.error("Tomador e vencimento obrigatórios");
    setSavingFat(true);
    const { error } = await supabase.from("faturamentos").insert([{
      empresa_id: empresa.id,
      tomador_id: fat.tomador_id,
      empreendimento_id: fat.empreendimento_id || null,
      competencia: fat.competencia,
      data_vencimento: fat.data_vencimento,
      data_emissao: fat.data_emissao || null,
      valor_honorarios: Number(fat.valor_honorarios || 0),
      valor_massa_salarial: Number(fat.valor_massa_salarial || 0),
      valor_relatorios: Number(fat.valor_relatorios || 0),
      valor_juridico: Number(fat.valor_juridico || 0),
      valor_viagem: Number(fat.valor_viagem || 0),
      indice_reajuste: fat.indice_reajuste || null,
      mes_base_reajuste: fat.mes_base_reajuste || null,
      vigencia_contratual: fat.vigencia_contratual || null,
    }]);
    setSavingFat(false);
    if (error) return toast.error(error.message);
    toast.success("Faturamento criado");
    setOpenFat(false);
    load();
  };

  const gerarXml = async (f: Faturamento) => {
    const { data, error } = await supabase.rpc("gerar_xml_rps_sp", { _faturamento_id: f.id });
    if (error) return toast.error(error.message);
    const blob = new Blob([data as string], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RPS_${f.numero_rps ?? "novo"}_${f.competencia}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XML/RPS gerado");
    load();
  };

  const marcarEmitida = async (f: Faturamento) => {
    const numero = window.prompt("Nº da NFS-e devolvido pela prefeitura:");
    if (!numero) return;
    const { error } = await supabase.from("faturamentos")
      .update({ status: "emitida", numero_nfse: numero, data_emissao: f.data_emissao ?? new Date().toISOString().slice(0, 10) })
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Marcada como emitida");
    load();
  };

  const cancelar = async (f: Faturamento) => {
    if (!confirm("Cancelar este faturamento?")) return;
    const { error } = await supabase.from("faturamentos").update({ status: "cancelada" }).eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Cancelado");
    load();
  };

  const gerarAlertas = async () => {
    const { data, error } = await supabase.rpc("gerar_alertas_faturamento");
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} alertas gerados`);
  };

  const importarPlanilha = async () => {
    if (!empresa) return;
    setImporting(true);
    try {
      const { tomadores: ts, faturamentos: fs } = importData as {
        tomadores: { nome: string; razao_social: string | null; cnpj: string }[];
        faturamentos: any[];
      };

      // upsert tomadores por CNPJ
      const { data: existing } = await supabase.from("tomadores").select("id, cnpj");
      const byCnpj = new Map((existing ?? []).map((t: any) => [t.cnpj, t.id]));
      const novos = ts.filter((t) => !byCnpj.has(t.cnpj));
      if (novos.length > 0) {
        const { data: ins, error } = await supabase.from("tomadores").insert(
          novos.map((t) => ({
            empresa_id: empresa.id, nome: t.nome, razao_social: t.razao_social, cnpj: t.cnpj,
          })),
        ).select("id, cnpj");
        if (error) throw error;
        for (const r of ins ?? []) byCnpj.set((r as any).cnpj, (r as any).id);
      }

      // insert faturamentos em lote
      const payload = fs.map((f: any) => ({
        empresa_id: empresa.id,
        tomador_id: byCnpj.get(f.cnpj) ?? null,
        competencia: f.competencia,
        data_emissao: f.data_emissao,
        data_vencimento: f.data_vencimento,
        valor_honorarios: f.valor_honorarios,
        valor_massa_salarial: f.valor_massa_salarial,
        valor_relatorios: f.valor_relatorios,
        valor_juridico: f.valor_juridico,
        valor_viagem: f.valor_viagem,
        indice_reajuste: f.indice_reajuste,
        mes_base_reajuste: f.mes_base_reajuste,
        vigencia_contratual: f.vigencia_contratual,
      })).filter((p: any) => p.tomador_id);

      // upsert para evitar duplicação
      const { error: e2 } = await supabase
        .from("faturamentos")
        .upsert(payload, { onConflict: "empresa_id,tomador_id,competencia", ignoreDuplicates: true });
      if (e2) throw e2;

      toast.success(`Importação concluída: ${novos.length} novos tomadores, ${payload.length} faturamentos`);
      setOpenImport(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Falha na importação");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-executive">
            <FileText className="h-6 w-6" /> Faturamentos
          </h2>
          <p className="text-sm text-muted-foreground">
            Controle mensal de honorários, NFS-e SP, vencimentos e conciliação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={gerarAlertas}>
            <AlertCircle className="mr-2 h-4 w-4" /> Gerar alertas
          </Button>
          {isDiretor && (
            <Dialog open={openImport} onOpenChange={setOpenImport}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Importar planilha</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar planilha de honorários</DialogTitle>
                  <DialogDescription>
                    Vamos importar os tomadores e faturamentos da planilha enviada
                    (jan/25 a maio/26 — 17 abas, ~23 condomínios). Faturamentos duplicados (mesmo tomador + competência) são ignorados.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpenImport(false)}>Cancelar</Button>
                  <Button onClick={importarPlanilha} disabled={importing}>
                    {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar importação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isDiretor && (
            <Dialog open={openTom} onOpenChange={setOpenTom}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Novo tomador</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo tomador</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1"><Label>Nome / Apelido</Label>
                    <Input value={tom.nome} onChange={(e) => setTom({ ...tom, nome: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Razão social</Label>
                    <Input value={tom.razao_social} onChange={(e) => setTom({ ...tom, razao_social: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>CNPJ</Label>
                      <Input value={tom.cnpj} onChange={(e) => setTom({ ...tom, cnpj: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Inscrição municipal</Label>
                      <Input value={tom.inscricao_municipal} onChange={(e) => setTom({ ...tom, inscricao_municipal: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1"><Label>E-mail</Label>
                    <Input type="email" value={tom.email} onChange={(e) => setTom({ ...tom, email: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={submitTomador}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isDiretor && (
            <Dialog open={openFat} onOpenChange={setOpenFat}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Novo faturamento</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo faturamento</DialogTitle>
                  <DialogDescription>Espelha as faixas da planilha de honorários.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Tomador</Label>
                    <Select value={fat.tomador_id} onValueChange={(v) => setFat({ ...fat, tomador_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {tomadores.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome} — {fmtCNPJ(t.cnpj)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Empreendimento (centro de custo)</Label>
                    <Select
                      value={fat.empreendimento_id || (tomadores.find(t=>t.id===fat.tomador_id)?.empreendimento_id ?? "")}
                      onValueChange={(v) => setFat({ ...fat, empreendimento_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Vincular ao empreendimento" /></SelectTrigger>
                      <SelectContent>
                        {empreendimentos.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Competência</Label>
                    <Input type="date" value={fat.competencia} onChange={(e) => setFat({ ...fat, competencia: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Vencimento</Label>
                    <Input type="date" value={fat.data_vencimento} onChange={(e) => setFat({ ...fat, data_vencimento: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Honorários (R$)</Label>
                    <Input type="number" step="0.01" value={fat.valor_honorarios} onChange={(e) => setFat({ ...fat, valor_honorarios: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Massa salarial (R$)</Label>
                    <Input type="number" step="0.01" value={fat.valor_massa_salarial} onChange={(e) => setFat({ ...fat, valor_massa_salarial: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Relatórios (R$)</Label>
                    <Input type="number" step="0.01" value={fat.valor_relatorios} onChange={(e) => setFat({ ...fat, valor_relatorios: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Jurídico (R$)</Label>
                    <Input type="number" step="0.01" value={fat.valor_juridico} onChange={(e) => setFat({ ...fat, valor_juridico: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Viagem (R$)</Label>
                    <Input type="number" step="0.01" value={fat.valor_viagem} onChange={(e) => setFat({ ...fat, valor_viagem: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Vigência</Label>
                    <Input value={fat.vigencia_contratual} onChange={(e) => setFat({ ...fat, vigencia_contratual: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Mês base reajuste</Label>
                    <Input value={fat.mes_base_reajuste} onChange={(e) => setFat({ ...fat, mes_base_reajuste: e.target.value })} /></div>
                  <div className="space-y-1 sm:col-span-2"><Label>Índice de reajuste</Label>
                    <Textarea rows={2} value={fat.indice_reajuste} onChange={(e) => setFat({ ...fat, indice_reajuste: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={submitFat} disabled={savingFat}>
                    {savingFat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar faturamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total filtrado</p>
          <p className="text-xl font-bold text-executive">{brl(totals.total)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recebido</p>
          <p className="text-xl font-bold text-success">{brl(totals.paga)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">A receber</p>
          <p className="text-xl font-bold text-warning">{brl(totals.pendente)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vencido</p>
          <p className="text-xl font-bold text-destructive">{brl(totals.vencida)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Faturamentos</CardTitle>
              <CardDescription>{filtered.length} de {list.length} registros</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="month"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="w-40"
              />
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Tomador</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="text-right">Honor.</TableHead>
                    <TableHead className="text-right">Massa</TableHead>
                    <TableHead className="text-right">Outros</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Vencto.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NFS-e</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => {
                    const outros = Number(f.valor_relatorios) + Number(f.valor_juridico) + Number(f.valor_viagem);
                    return (
                      <TableRow key={f.id}>
                        <TableCell>{new Date(f.competencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</TableCell>
                        <TableCell className="font-medium">{f.tomadores?.nome ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtCNPJ(f.tomadores?.cnpj)}</TableCell>
                        <TableCell className="text-right">{brl(Number(f.valor_honorarios))}</TableCell>
                        <TableCell className="text-right">{brl(Number(f.valor_massa_salarial))}</TableCell>
                        <TableCell className="text-right">{brl(outros)}</TableCell>
                        <TableCell className="text-right font-semibold">{brl(Number(f.valor_total))}</TableCell>
                        <TableCell>{new Date(f.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLE[f.status]}>{f.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {f.numero_nfse ? <span className="font-mono">{f.numero_nfse}</span> :
                            f.numero_rps ? <span className="text-muted-foreground">RPS {f.numero_rps}</span> : "—"}
                        </TableCell>
                        <TableCell className="space-x-1 text-right">
                          {f.status !== "cancelada" && (
                            <>
                              <Button size="sm" variant="ghost" title="Gerar XML/RPS" onClick={() => gerarXml(f)}>
                                <FileCode2 className="h-4 w-4" />
                              </Button>
                              {f.status !== "paga" && f.status !== "emitida" && (
                                <Button size="sm" variant="ghost" title="Marcar emitida" onClick={() => marcarEmitida(f)}>
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {isDiretor && (
                                <Button size="sm" variant="ghost" title="Cancelar" onClick={() => cancelar(f)}>
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum faturamento. Use “Importar planilha” para popular dados históricos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
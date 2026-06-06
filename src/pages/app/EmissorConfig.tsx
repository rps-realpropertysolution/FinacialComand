import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings2, ShieldCheck, Plus, FileText, Receipt, Sparkles } from "lucide-react";
import { Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { useEmpreendimentos } from "@/hooks/useEmpreendimentos";

interface EmissorRow {
  empresa_id: string;
  cnpj_emissor: string | null;
  inscricao_municipal: string | null;
  razao_social: string | null;
  regime_tributario: string | null;
  codigo_servico: string | null;
  aliquota_iss: number | null;
  iss_retido: boolean | null;
  ambiente: "homologacao" | "producao";
  serie_rps: string | null;
  proximo_numero_rps: number;
  observacoes: string | null;
  cnae?: string | null;
  codigo_tributacao_municipio?: string | null;
  natureza_operacao?: string | null;
  regime_especial_tributacao?: string | null;
  optante_simples?: boolean | null;
  incentivador_cultural?: boolean | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
}

const empty: Omit<EmissorRow, "empresa_id"> = {
  cnpj_emissor: "",
  inscricao_municipal: "",
  razao_social: "",
  regime_tributario: "simples_nacional",
  codigo_servico: "17.19",
  aliquota_iss: 5,
  iss_retido: false,
  ambiente: "homologacao",
  serie_rps: "1",
  proximo_numero_rps: 1,
  observacoes: "",
  cnae: "6920601",
  codigo_tributacao_municipio: "",
  natureza_operacao: "tributacao_no_municipio",
  regime_especial_tributacao: "",
  optante_simples: true,
  incentivador_cultural: false,
  endereco: "",
  cidade: "São Paulo",
  uf: "SP",
  cep: "",
  telefone: "",
  email: "",
};

interface Tomador {
  id: string; nome: string; razao_social: string | null; cnpj: string | null;
  inscricao_municipal: string | null; email: string | null;
  endereco?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null;
  empreendimento_id?: string | null;
}

interface NotaResumo {
  id: string;
  numero_nfse: string | null;
  numero_rps: string | null;
  competencia: string;
  data_emissao: string | null;
  data_vencimento: string;
  valor_total: number | null;
  valor_liquido: number | null;
  status: string;
  descricao_servico: string | null;
  tomadores?: { nome: string; cnpj: string | null } | null;
}

const fmtCNPJ = (c?: string | null) =>
  !c ? "—" : c.replace(/\D/g, "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

const STATUS_STYLE: Record<string, string> = {
  pendente: "border-warning/40 bg-warning/10 text-warning",
  emitida: "border-primary/40 bg-primary/10 text-primary",
  paga: "border-success/40 bg-success/10 text-success",
  vencida: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelada: "border-muted bg-muted text-muted-foreground",
};

export default function EmissorConfig() {
  const { empresa, profile } = useAuth();
  const { empreendimentos } = useEmpreendimentos();
  const [form, setForm] = useState<Omit<EmissorRow, "empresa_id">>(empty);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isDiretor = profile?.role === "diretor";

  const [tomadores, setTomadores] = useState<Tomador[]>([]);
  const [notasMes, setNotasMes] = useState<NotaResumo[]>([]);
  const [ultimas, setUltimas] = useState<NotaResumo[]>([]);
  const [openNova, setOpenNova] = useState(false);
  const [savingNota, setSavingNota] = useState(false);

  const [openTom, setOpenTom] = useState(false);
  const [savingTom, setSavingTom] = useState(false);
  const emptyTom = {
    nome: "", razao_social: "", cnpj: "", inscricao_municipal: "",
    email: "", endereco: "", cidade: "São Paulo", uf: "SP", cep: "",
    empreendimento_id: "", observacoes: "",
  };
  const [tom, setTom] = useState(emptyTom);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const compMes = new Date().toISOString().slice(0, 7) + "-01";

  const [nf, setNf] = useState({
    tomador_id: "",
    empreendimento_id: "",
    competencia: compMes,
    data_emissao: hojeISO,
    data_vencimento: hojeISO,
    descricao_servico: "",
    unidade: "mês",
    quantidade: "1",
    valor_unitario: "0",
    valor_deducoes: "0",
    aliquota_iss: "5",
    iss_retido: false,
    valor_pis: "0",
    valor_cofins: "0",
    valor_inss: "0",
    valor_ir: "0",
    valor_csll: "0",
    valor_outras_retencoes: "0",
    cnae: "",
    codigo_tributacao_municipio: "",
    observacoes: "",
    auto_numerar: true,
    numero_nfse: "",
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const inicioMes = new Date(); inicioMes.setDate(1);
    const inicioMesISO = inicioMes.toISOString().slice(0, 10);
    const [{ data: cfg }, { data: tms }, { data: mes }, { data: ult }] = await Promise.all([
      supabase.from("emissor_config").select("*").maybeSingle(),
      supabase.from("tomadores").select("id, nome, razao_social, cnpj, inscricao_municipal, email, endereco, cidade, uf, cep, empreendimento_id").order("nome"),
      supabase.from("faturamentos")
        .select("id, numero_nfse, numero_rps, competencia, data_emissao, data_vencimento, valor_total, valor_liquido, status, descricao_servico, tomadores(nome, cnpj)")
        .gte("data_emissao", inicioMesISO)
        .order("data_emissao", { ascending: false }),
      supabase.from("faturamentos")
        .select("id, numero_nfse, numero_rps, competencia, data_emissao, data_vencimento, valor_total, valor_liquido, status, descricao_servico, tomadores(nome, cnpj)")
        .not("numero_nfse", "is", null)
        .order("data_emissao", { ascending: false })
        .limit(5),
    ]);
    if (cfg) {
      setExists(true);
      const { empresa_id: _e, ...rest } = cfg as EmissorRow;
      setForm({ ...empty, ...rest });
      setNf((prev) => ({
        ...prev,
        cnae: prev.cnae || (cfg as any).cnae || "",
        codigo_tributacao_municipio: prev.codigo_tributacao_municipio || (cfg as any).codigo_tributacao_municipio || "",
        aliquota_iss: prev.aliquota_iss || String((cfg as any).aliquota_iss ?? "5"),
        iss_retido: (cfg as any).iss_retido ?? false,
      }));
    }
    setTomadores((tms as Tomador[]) ?? []);
    setNotasMes((mes as unknown as NotaResumo[]) ?? []);
    setUltimas((ult as unknown as NotaResumo[]) ?? []);
    setLoading(false);
  };

  const save = async () => {
    if (!empresa) return;
    setSaving(true);
    const payload = { empresa_id: empresa.id, ...form };
    const { error } = exists
      ? await supabase.from("emissor_config").update(payload).eq("empresa_id", empresa.id)
      : await supabase.from("emissor_config").insert([payload]);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    setExists(true);
  };

  // === Cálculo do espelho da NF ===
  const qtd = Number(nf.quantidade || 1);
  const vUnit = Number(nf.valor_unitario || 0);
  const vBruto = qtd * vUnit;
  const vDed = Number(nf.valor_deducoes || 0);
  const baseCalc = Math.max(0, vBruto - vDed);
  const aliq = Number(nf.aliquota_iss || 0);
  const vIss = +(baseCalc * (aliq / 100)).toFixed(2);
  const totalRetencoes =
    Number(nf.valor_pis || 0) + Number(nf.valor_cofins || 0) +
    Number(nf.valor_inss || 0) + Number(nf.valor_ir || 0) +
    Number(nf.valor_csll || 0) + Number(nf.valor_outras_retencoes || 0) +
    (nf.iss_retido ? vIss : 0);
  const vLiquido = +(vBruto - totalRetencoes).toFixed(2);

  const tomadorSel = tomadores.find((t) => t.id === nf.tomador_id);

  const codigoTomador = (id: string) => "TOM-" + id.slice(0, 6).toUpperCase();

  const submitTomador = async () => {
    if (!empresa) return;
    if (!tom.nome.trim()) return toast.error("Informe o nome do tomador");
    setSavingTom(true);
    const payload: any = {
      empresa_id: empresa.id,
      nome: tom.nome,
      razao_social: tom.razao_social || null,
      cnpj: tom.cnpj || null,
      inscricao_municipal: tom.inscricao_municipal || null,
      email: tom.email || null,
      endereco: tom.endereco || null,
      cidade: tom.cidade || null,
      uf: tom.uf || null,
      cep: tom.cep || null,
      empreendimento_id: tom.empreendimento_id || null,
      observacoes: tom.observacoes || null,
    };
    const { data, error } = await supabase.from("tomadores").insert([payload]).select("id").maybeSingle();
    setSavingTom(false);
    if (error) return toast.error(error.message);
    toast.success("Tomador cadastrado");
    setOpenTom(false);
    setTom(emptyTom);
    await loadAll();
    if (data?.id) setNf((p) => ({ ...p, tomador_id: data.id }));
  };

  const proximoNumero = async () => {
    const { data, error } = await supabase.rpc("proximo_numero_nfse");
    if (error) return null;
    return data as number;
  };

  const submitNota = async () => {
    if (!empresa) return;
    if (!nf.tomador_id) return toast.error("Selecione o tomador");
    if (vBruto <= 0) return toast.error("Informe quantidade e valor unitário");
    setSavingNota(true);
    let numero = nf.numero_nfse;
    if (nf.auto_numerar) {
      const prox = await proximoNumero();
      if (prox != null) numero = String(prox);
    }
    const payload: any = {
      empresa_id: empresa.id,
      tomador_id: nf.tomador_id,
      empreendimento_id: nf.empreendimento_id || tomadorSel?.empreendimento_id || null,
      competencia: nf.competencia,
      data_emissao: nf.data_emissao || null,
      data_vencimento: nf.data_vencimento,
      descricao_servico: nf.descricao_servico || null,
      unidade: nf.unidade,
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_honorarios: vBruto,
      valor_total: vBruto,
      valor_bruto: vBruto,
      valor_deducoes: vDed,
      base_calculo: baseCalc,
      aliquota_iss: aliq,
      valor_iss: vIss,
      iss_retido: nf.iss_retido,
      valor_pis: Number(nf.valor_pis || 0),
      valor_cofins: Number(nf.valor_cofins || 0),
      valor_inss: Number(nf.valor_inss || 0),
      valor_ir: Number(nf.valor_ir || 0),
      valor_csll: Number(nf.valor_csll || 0),
      valor_outras_retencoes: Number(nf.valor_outras_retencoes || 0),
      valor_liquido: vLiquido,
      cnae: nf.cnae || form.cnae || null,
      codigo_tributacao_municipio: nf.codigo_tributacao_municipio || form.codigo_tributacao_municipio || null,
      observacoes: nf.observacoes || null,
      numero_nfse: numero || null,
      status: numero ? "emitida" : "pendente",
    };
    const { error } = await supabase.from("faturamentos").insert([payload]);
    setSavingNota(false);
    if (error) return toast.error(error.message);
    toast.success(numero ? `NFS-e nº ${numero} emitida` : "Nota cadastrada");
    setOpenNova(false);
    setNf({
      ...nf, tomador_id: "", descricao_servico: "", quantidade: "1", valor_unitario: "0",
      valor_deducoes: "0", valor_pis: "0", valor_cofins: "0", valor_inss: "0",
      valor_ir: "0", valor_csll: "0", valor_outras_retencoes: "0", observacoes: "", numero_nfse: "",
    });
    loadAll();
  };

  const totaisMes = notasMes.reduce(
    (a, n) => ({
      qtd: a.qtd + 1,
      bruto: a.bruto + Number(n.valor_total || 0),
      liquido: a.liquido + Number(n.valor_liquido || n.valor_total || 0),
    }),
    { qtd: 0, bruto: 0, liquido: 0 },
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
          <h2 className="flex items-center gap-2 text-2xl font-bold text-executive">
            <Receipt className="h-6 w-6" /> Emissor NFS-e — Prefeitura de SP
          </h2>
          <p className="text-sm text-muted-foreground">
            Espelho completo da NFS-e (padrão ABRASF), com numeração automática e painel resumo do mês.
          </p>
        </div>
        {isDiretor && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpenTom(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Novo tomador
            </Button>
            <Button onClick={() => setOpenNova(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova NFS-e
            </Button>
          </div>
        )}
      </header>

      {/* ===== Painel resumo do mês ===== */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-kpi"><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground">Notas emitidas no mês</p>
          <p className="text-2xl font-bold">{totaisMes.qtd}</p>
        </CardContent></Card>
        <Card className="shadow-kpi"><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground">Valor bruto</p>
          <p className="text-2xl font-bold text-primary">{brl(totaisMes.bruto)}</p>
        </CardContent></Card>
        <Card className="shadow-kpi"><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground">Valor líquido</p>
          <p className="text-2xl font-bold text-success">{brl(totaisMes.liquido)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo"><FileText className="mr-2 h-4 w-4" />Notas do mês & últimas 5</TabsTrigger>
          <TabsTrigger value="tomadores"><Users className="mr-2 h-4 w-4" />Tomadores</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="mr-2 h-4 w-4" />Configuração do emissor</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas emitidas no mês corrente</CardTitle>
              <CardDescription>Relação completa das NFS-e do mês.</CardDescription>
            </CardHeader>
            <CardContent>
              {notasMes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma nota emitida este mês.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nº NFS-e</TableHead><TableHead>Tomador</TableHead>
                    <TableHead>Emissão</TableHead><TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {notasMes.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono">{n.numero_nfse ?? `RPS ${n.numero_rps ?? "—"}`}</TableCell>
                        <TableCell>{n.tomadores?.nome ?? "—"}</TableCell>
                        <TableCell>{n.data_emissao ?? "—"}</TableCell>
                        <TableCell>{n.data_vencimento}</TableCell>
                        <TableCell className="text-right">{brl(Number(n.valor_total || 0))}</TableCell>
                        <TableCell className="text-right">{brl(Number(n.valor_liquido || n.valor_total || 0))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLE[n.status] ?? ""}>{n.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas 5 notas emitidas</CardTitle>
              <CardDescription>Histórico recente para conferência.</CardDescription>
            </CardHeader>
            <CardContent>
              {ultimas.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem histórico.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nº NFS-e</TableHead><TableHead>Tomador</TableHead>
                    <TableHead>Emissão</TableHead><TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {ultimas.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono">{n.numero_nfse}</TableCell>
                        <TableCell>{n.tomadores?.nome ?? "—"}</TableCell>
                        <TableCell>{n.data_emissao ?? "—"}</TableCell>
                        <TableCell>{n.data_vencimento}</TableCell>
                        <TableCell className="text-right">{brl(Number(n.valor_total || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tomadores" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Tomadores de serviços cadastrados</CardTitle>
                <CardDescription>Clientes habilitados para emissão de NFS-e.</CardDescription>
              </div>
              {isDiretor && (
                <Button size="sm" onClick={() => setOpenTom(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Novo tomador
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {tomadores.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum tomador cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome / Razão social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>IM</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Empreendimento</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tomadores.map((t) => {
                      const emp = empreendimentos.find((e) => e.id === t.empreendimento_id);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">{codigoTomador(t.id)}</TableCell>
                          <TableCell>
                            <p className="font-medium">{t.nome}</p>
                            {t.razao_social && t.razao_social !== t.nome && (
                              <p className="text-xs text-muted-foreground">{t.razao_social}</p>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{fmtCNPJ(t.cnpj)}</TableCell>
                          <TableCell className="text-xs">{t.inscricao_municipal ?? "—"}</TableCell>
                          <TableCell className="text-xs">
                            {t.cidade ? `${t.cidade}/${t.uf ?? ""}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{t.email ?? "—"}</TableCell>
                          <TableCell className="text-xs">
                            {emp ? `${emp.codigo ? emp.codigo + " — " : ""}${emp.nome}` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">

      <Card className="shadow-kpi">
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
          <CardDescription>
            A transmissão automática exige certificado digital A1. Por enquanto, o sistema gera o XML/RPS
            e permite registrar manualmente o número da NFS-e devolvida pela prefeitura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-1 lg:col-span-2">
              <Label>Razão social do emissor</Label>
              <Input
                value={form.razao_social ?? ""}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Ambiente</Label>
              <Select
                value={form.ambiente}
                onValueChange={(v) => setForm({ ...form, ambiente: v as "homologacao" | "producao" })}
                disabled={!isDiretor}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>CNPJ emissor</Label>
              <Input
                value={form.cnpj_emissor ?? ""}
                onChange={(e) => setForm({ ...form, cnpj_emissor: e.target.value })}
                placeholder="00.000.000/0000-00"
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Inscrição municipal (CCM)</Label>
              <Input
                value={form.inscricao_municipal ?? ""}
                onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })}
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Regime tributário</Label>
              <Select
                value={form.regime_tributario ?? "simples_nacional"}
                onValueChange={(v) => setForm({ ...form, regime_tributario: v })}
                disabled={!isDiretor}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Código de serviço LC 116</Label>
              <Input
                value={form.codigo_servico ?? ""}
                onChange={(e) => setForm({ ...form, codigo_servico: e.target.value })}
                placeholder="17.19"
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>CNAE</Label>
              <Input
                value={form.cnae ?? ""}
                onChange={(e) => setForm({ ...form, cnae: e.target.value })}
                placeholder="6920601"
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Código tributação município</Label>
              <Input
                value={form.codigo_tributacao_municipio ?? ""}
                onChange={(e) => setForm({ ...form, codigo_tributacao_municipio: e.target.value })}
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Alíquota ISS (%)</Label>
              <Input
                type="number" step="0.01"
                value={form.aliquota_iss ?? 0}
                onChange={(e) => setForm({ ...form, aliquota_iss: Number(e.target.value) })}
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Série RPS</Label>
              <Input
                value={form.serie_rps ?? "1"}
                onChange={(e) => setForm({ ...form, serie_rps: e.target.value })}
                disabled={!isDiretor}
              />
            </div>

            <div className="space-y-1">
              <Label>Próximo nº RPS</Label>
              <Input
                type="number"
                value={form.proximo_numero_rps}
                onChange={(e) => setForm({ ...form, proximo_numero_rps: Number(e.target.value) })}
                disabled={!isDiretor}
              />
            </div>
            <div className="space-y-1">
              <Label>Natureza da operação</Label>
              <Select
                value={form.natureza_operacao ?? "tributacao_no_municipio"}
                onValueChange={(v) => setForm({ ...form, natureza_operacao: v })}
                disabled={!isDiretor}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tributacao_no_municipio">Tributação no município</SelectItem>
                  <SelectItem value="tributacao_fora_municipio">Tributação fora do município</SelectItem>
                  <SelectItem value="isencao">Isenção</SelectItem>
                  <SelectItem value="imune">Imune</SelectItem>
                  <SelectItem value="exigibilidade_suspensa">Exigibilidade suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} disabled={!isDiretor} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} disabled={!isDiretor} />
            </div>
            <div className="space-y-1">
              <Label>UF / CEP</Label>
              <div className="flex gap-2">
                <Input className="w-16" value={form.uf ?? ""} onChange={(e) => setForm({ ...form, uf: e.target.value })} disabled={!isDiretor} />
                <Input value={form.cep ?? ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} disabled={!isDiretor} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} disabled={!isDiretor} />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!isDiretor} />
            </div>
            <div className="flex items-end gap-3 pb-1 lg:col-span-2">
              <Switch
                checked={!!form.iss_retido}
                onCheckedChange={(c) => setForm({ ...form, iss_retido: c })}
                disabled={!isDiretor}
              />
              <Label className="!mt-0">ISS retido pelo tomador</Label>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch checked={!!form.optante_simples} onCheckedChange={(c) => setForm({ ...form, optante_simples: c })} disabled={!isDiretor} />
              <Label className="!mt-0">Optante Simples Nacional</Label>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch checked={!!form.incentivador_cultural} onCheckedChange={(c) => setForm({ ...form, incentivador_cultural: c })} disabled={!isDiretor} />
              <Label className="!mt-0">Incentivador cultural</Label>
            </div>
          </div>

          {isDiretor && (
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ShieldCheck className="mr-2 h-4 w-4" /> Salvar configuração
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* ====== Dialog: Nova NFS-e (espelho da nota) ====== */}
      <Dialog open={openNova} onOpenChange={setOpenNova}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Nova NFS-e — Espelho da nota</DialogTitle>
            <DialogDescription>
              Preenchimento completo seguindo o leiaute da prefeitura. A numeração é gerada automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Prestador (resumo) */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground">PRESTADOR DE SERVIÇOS</p>
                <p className="text-sm font-medium">{form.razao_social || "—"} — {fmtCNPJ(form.cnpj_emissor)}</p>
                <p className="text-xs text-muted-foreground">
                  IM: {form.inscricao_municipal || "—"} · CNAE: {form.cnae || "—"} · ISS: {form.aliquota_iss}%
                </p>
              </CardContent>
            </Card>

            {/* Tomador */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">TOMADOR DE SERVIÇOS</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setOpenTom(true)}>
                  <UserPlus className="mr-2 h-3.5 w-3.5" /> Cadastrar tomador
                </Button>
              </div>
              <Select value={nf.tomador_id} onValueChange={(v) => setNf({ ...nf, tomador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tomador" /></SelectTrigger>
                <SelectContent>
                  {tomadores.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {codigoTomador(t.id)} · {t.nome} — {fmtCNPJ(t.cnpj)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tomadorSel && (
                <div className="mt-2 rounded-md border bg-muted/20 p-3 text-xs">
                  <p><strong>{tomadorSel.razao_social || tomadorSel.nome}</strong> <span className="font-mono text-muted-foreground">({codigoTomador(tomadorSel.id)})</span></p>
                  <p>CNPJ: {fmtCNPJ(tomadorSel.cnpj)} · IM: {tomadorSel.inscricao_municipal || "—"}</p>
                  <p>{tomadorSel.endereco || ""} {tomadorSel.cidade ? `· ${tomadorSel.cidade}/${tomadorSel.uf || ""}` : ""} {tomadorSel.cep || ""}</p>
                  <p>{tomadorSel.email || ""}</p>
                </div>
              )}
              <div className="mt-3 space-y-1">
                <Label className="text-xs">Empreendimento (centro de custo)</Label>
                <Select
                  value={nf.empreendimento_id || tomadorSel?.empreendimento_id || ""}
                  onValueChange={(v) => setNf({ ...nf, empreendimento_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Vincular ao empreendimento" /></SelectTrigger>
                  <SelectContent>
                    {empreendimentos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas e códigos */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label>Competência</Label>
                <Input type="date" value={nf.competencia} onChange={(e) => setNf({ ...nf, competencia: e.target.value })} /></div>
              <div className="space-y-1"><Label>Data emissão</Label>
                <Input type="date" value={nf.data_emissao} onChange={(e) => setNf({ ...nf, data_emissao: e.target.value })} /></div>
              <div className="space-y-1"><Label>Vencimento</Label>
                <Input type="date" value={nf.data_vencimento} onChange={(e) => setNf({ ...nf, data_vencimento: e.target.value })} /></div>
              <div className="space-y-1"><Label>CNAE</Label>
                <Input value={nf.cnae} onChange={(e) => setNf({ ...nf, cnae: e.target.value })} placeholder={form.cnae ?? ""} /></div>
              <div className="space-y-1"><Label>Cód. tributação município</Label>
                <Input value={nf.codigo_tributacao_municipio} onChange={(e) => setNf({ ...nf, codigo_tributacao_municipio: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cód. serviço LC 116</Label>
                <Input value={form.codigo_servico ?? ""} disabled /></div>
            </div>

            {/* Discriminação */}
            <div className="space-y-1">
              <Label>Descrição do serviço (discriminação)</Label>
              <Textarea rows={3}
                value={nf.descricao_servico}
                onChange={(e) => setNf({ ...nf, descricao_servico: e.target.value })}
                placeholder="Ex: Honorários administrativos referentes à competência MM/AAAA..." />
            </div>

            {/* Quantidade / unidade / valor */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1"><Label>Unidade</Label>
                <Input value={nf.unidade} onChange={(e) => setNf({ ...nf, unidade: e.target.value })} /></div>
              <div className="space-y-1"><Label>Quantidade</Label>
                <Input type="number" step="0.0001" value={nf.quantidade} onChange={(e) => setNf({ ...nf, quantidade: e.target.value })} /></div>
              <div className="space-y-1"><Label>Valor unitário (R$)</Label>
                <Input type="number" step="0.01" value={nf.valor_unitario} onChange={(e) => setNf({ ...nf, valor_unitario: e.target.value })} /></div>
              <div className="space-y-1"><Label>Deduções (R$)</Label>
                <Input type="number" step="0.01" value={nf.valor_deducoes} onChange={(e) => setNf({ ...nf, valor_deducoes: e.target.value })} /></div>
            </div>

            {/* ISS */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label>Alíquota ISS (%)</Label>
                <Input type="number" step="0.01" value={nf.aliquota_iss} onChange={(e) => setNf({ ...nf, aliquota_iss: e.target.value })} /></div>
              <div className="space-y-1"><Label>Base de cálculo</Label>
                <Input value={brl(baseCalc)} disabled /></div>
              <div className="space-y-1"><Label>Valor ISS</Label>
                <Input value={brl(vIss)} disabled /></div>
              <div className="flex items-end gap-3 pb-1 sm:col-span-3">
                <Switch checked={nf.iss_retido} onCheckedChange={(c) => setNf({ ...nf, iss_retido: c })} />
                <Label className="!mt-0">ISS retido pelo tomador</Label>
              </div>
            </div>

            {/* Encargos retidos */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">ENCARGOS / RETENÇÕES FEDERAIS</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1"><Label>PIS (R$)</Label>
                  <Input type="number" step="0.01" value={nf.valor_pis} onChange={(e) => setNf({ ...nf, valor_pis: e.target.value })} /></div>
                <div className="space-y-1"><Label>COFINS (R$)</Label>
                  <Input type="number" step="0.01" value={nf.valor_cofins} onChange={(e) => setNf({ ...nf, valor_cofins: e.target.value })} /></div>
                <div className="space-y-1"><Label>INSS (R$)</Label>
                  <Input type="number" step="0.01" value={nf.valor_inss} onChange={(e) => setNf({ ...nf, valor_inss: e.target.value })} /></div>
                <div className="space-y-1"><Label>IR (R$)</Label>
                  <Input type="number" step="0.01" value={nf.valor_ir} onChange={(e) => setNf({ ...nf, valor_ir: e.target.value })} /></div>
                <div className="space-y-1"><Label>CSLL (R$)</Label>
                  <Input type="number" step="0.01" value={nf.valor_csll} onChange={(e) => setNf({ ...nf, valor_csll: e.target.value })} /></div>
                <div className="space-y-1"><Label>Outras retenções (R$)</Label>
                  <Input type="number" step="0.01" value={nf.valor_outras_retencoes} onChange={(e) => setNf({ ...nf, valor_outras_retencoes: e.target.value })} /></div>
              </div>
            </div>

            {/* Totais */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="grid gap-2 pt-4 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Valor bruto</p>
                  <p className="text-lg font-bold">{brl(vBruto)}</p></div>
                <div><p className="text-xs text-muted-foreground">Total retenções</p>
                  <p className="text-lg font-bold text-destructive">{brl(totalRetencoes)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor líquido</p>
                  <p className="text-lg font-bold text-success">{brl(vLiquido)}</p></div>
              </CardContent>
            </Card>

            {/* Observações */}
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={nf.observacoes} onChange={(e) => setNf({ ...nf, observacoes: e.target.value })} />
            </div>

            {/* Numeração */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Switch checked={nf.auto_numerar} onCheckedChange={(c) => setNf({ ...nf, auto_numerar: c })} />
                  <Label className="!mt-0 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Numerar automaticamente (próximo nº baseado no histórico)
                  </Label>
                </div>
                {!nf.auto_numerar && (
                  <div className="mt-3 space-y-1">
                    <Label>Nº NFS-e (manual)</Label>
                    <Input value={nf.numero_nfse} onChange={(e) => setNf({ ...nf, numero_nfse: e.target.value })} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNova(false)}>Cancelar</Button>
            <Button onClick={submitNota} disabled={savingNota}>
              {savingNota && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Dialog: Novo tomador ====== */}
      <Dialog open={openTom} onOpenChange={setOpenTom}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Novo tomador de serviços</DialogTitle>
            <DialogDescription>
              Cadastro do cliente para emissão de NFS-e. O código é gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Nome / Apelido <span className="text-destructive">*</span></Label>
              <Input value={tom.nome} onChange={(e) => setTom({ ...tom, nome: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Razão social</Label>
              <Input value={tom.razao_social} onChange={(e) => setTom({ ...tom, razao_social: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={tom.cnpj} onChange={(e) => setTom({ ...tom, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label>Inscrição municipal (CCM)</Label>
              <Input value={tom.inscricao_municipal} onChange={(e) => setTom({ ...tom, inscricao_municipal: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>E-mail</Label>
              <Input type="email" value={tom.email} onChange={(e) => setTom({ ...tom, email: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={tom.endereco} onChange={(e) => setTom({ ...tom, endereco: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={tom.cidade} onChange={(e) => setTom({ ...tom, cidade: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>UF / CEP</Label>
              <div className="flex gap-2">
                <Input className="w-16" value={tom.uf} onChange={(e) => setTom({ ...tom, uf: e.target.value })} />
                <Input value={tom.cep} onChange={(e) => setTom({ ...tom, cep: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Empreendimento vinculado</Label>
              <Select value={tom.empreendimento_id} onValueChange={(v) => setTom({ ...tom, empreendimento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Vincular ao empreendimento (opcional)" /></SelectTrigger>
                <SelectContent>
                  {empreendimentos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.codigo ? `${e.codigo} — ` : ""}{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={tom.observacoes} onChange={(e) => setTom({ ...tom, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenTom(false)}>Cancelar</Button>
            <Button onClick={submitTomador} disabled={savingTom}>
              {savingTom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar tomador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
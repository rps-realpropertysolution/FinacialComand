import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CheckCircle2, FileUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { parseBankFile, type BankTx } from "@/lib/bank-statement";

interface Fat {
  id: string;
  competencia: string;
  data_vencimento: string;
  valor_total: number;
  status: string;
  numero_nfse: string | null;
  tomadores: { nome: string } | null;
}
interface Pag {
  id: string;
  faturamento_id: string;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento: string;
  observacao: string | null;
}

export default function Conciliacao() {
  const { profile } = useAuth();
  const podePagar = profile?.role === "diretor" || profile?.role === "gerente";
  const [aReceber, setAReceber] = useState<Fat[]>([]);
  const [pagos, setPagos] = useState<Pag[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Fat | null>(null);
  const [pag, setPag] = useState({
    data_pagamento: new Date().toISOString().slice(0, 10),
    valor: "0",
    forma: "pix",
    obs: "",
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [extrato, setExtrato] = useState<BankTx[]>([]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const txs = await parseBankFile(file);
      setExtrato(txs);
      toast.success(`${txs.length} lançamentos lidos do extrato`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao processar arquivo");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // sugestão simples: créditos do extrato com valor ≈ valor de um faturamento aberto
  const matchFaturamento = (tx: BankTx): Fat | undefined => {
    if (tx.valor <= 0) return undefined;
    return aReceber.find(
      (f) => Math.abs(Number(f.valor_total) - tx.valor) < 0.01,
    );
  };

  const baixarPorTx = async (tx: BankTx, f: Fat) => {
    const { error } = await supabase.rpc("marcar_faturamento_pago", {
      _faturamento_id: f.id,
      _data_pagamento: tx.data,
      _valor: tx.valor,
      _forma: "ted",
      _obs: `Extrato bancário: ${tx.descricao}`.slice(0, 240),
    });
    if (error) return toast.error(error.message);
    toast.success(`${f.tomadores?.nome ?? "Faturamento"} conciliado`);
    setExtrato((arr) => arr.filter((t) => t !== tx));
    load();
  };

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase
        .from("faturamentos")
        .select("id, competencia, data_vencimento, valor_total, status, numero_nfse, tomadores(nome)")
        .in("status", ["pendente", "emitida", "vencida"])
        .order("data_vencimento"),
      supabase
        .from("faturamento_pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false })
        .limit(50),
    ]);
    setAReceber((f as unknown as Fat[]) ?? []);
    setPagos((p as Pag[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalAReceber = useMemo(
    () => aReceber.reduce((s, r) => s + Number(r.valor_total || 0), 0),
    [aReceber],
  );
  const totalRecebido30 = useMemo(
    () => pagos.reduce((s, r) => s + Number(r.valor_pago || 0), 0),
    [pagos],
  );

  const abrirBaixa = (f: Fat) => {
    setTarget(f);
    setPag({
      data_pagamento: new Date().toISOString().slice(0, 10),
      valor: String(Number(f.valor_total).toFixed(2)),
      forma: "pix",
      obs: "",
    });
    setOpen(true);
  };

  const confirmar = async () => {
    if (!target) return;
    const { error } = await supabase.rpc("marcar_faturamento_pago", {
      _faturamento_id: target.id,
      _data_pagamento: pag.data_pagamento,
      _valor: Number(pag.valor),
      _forma: pag.forma,
      _obs: pag.obs || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Pagamento registrado");
    setOpen(false);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-float-in">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-executive">
          <Banknote className="h-6 w-6" /> Conciliação bancária
        </h2>
        <p className="text-sm text-muted-foreground">
          Registre o pagamento das notas e mantenha a posição financeira em dia.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" /> Importar extrato bancário
          </CardTitle>
          <CardDescription>
            Suporta arquivos <strong>XLSX</strong>, <strong>OFX/QFX</strong> e <strong>PDF</strong>. O sistema sugere a conciliação com faturamentos em aberto pelo valor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ofx,.qfx,.pdf"
              onChange={onUpload}
              className="hidden"
            />
            <Button onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Selecionar arquivo
            </Button>
            {extrato.length > 0 && (
              <Button variant="ghost" onClick={() => setExtrato([])}>Limpar</Button>
            )}
            <span className="text-xs text-muted-foreground">{extrato.length} lançamentos carregados</span>
          </div>

          {extrato.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Sugestão</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extrato.map((tx, i) => {
                  const sug = matchFaturamento(tx);
                  return (
                    <TableRow key={i}>
                      <TableCell>{new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-xs" title={tx.descricao}>{tx.descricao || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${tx.valor >= 0 ? "text-success" : "text-destructive"}`}>{brl(tx.valor)}</TableCell>
                      <TableCell>
                        {sug ? (
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                            <Sparkles className="mr-1 h-3 w-3" /> {sug.tomadores?.nome ?? "match"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {sug && podePagar && (
                          <Button size="sm" variant="outline" onClick={() => baixarPorTx(tx, sug)}>
                            <CheckCircle2 className="mr-1 h-4 w-4 text-success" /> Conciliar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total a receber</p>
          <p className="text-2xl font-bold text-warning">{brl(totalAReceber)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{aReceber.length} faturamentos abertos</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recebido (últimos 50)</p>
          <p className="text-2xl font-bold text-success">{brl(totalRecebido30)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{pagos.length} baixas registradas</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamentos em aberto</CardTitle>
          <CardDescription>Clique em “Registrar pagamento” para conciliar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tomador</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>NFS-e</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aReceber.map((f) => {
                const venc = new Date(f.data_vencimento + "T00:00:00");
                const atrasado = venc < new Date();
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.tomadores?.nome ?? "—"}</TableCell>
                    <TableCell>{new Date(f.competencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</TableCell>
                    <TableCell className={atrasado ? "text-destructive" : ""}>{venc.toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{f.numero_nfse ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{brl(Number(f.valor_total))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        f.status === "vencida" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                        f.status === "emitida" ? "border-primary/40 bg-primary/10 text-primary" :
                        "border-warning/40 bg-warning/10 text-warning"
                      }>{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {podePagar && (
                        <Button size="sm" variant="outline" onClick={() => abrirBaixa(f)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> Baixar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {aReceber.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum faturamento em aberto 🎉
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas baixas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="capitalize">{p.forma_pagamento}</TableCell>
                  <TableCell className="text-right font-semibold">{brl(Number(p.valor_pago))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.observacao ?? "—"}</TableCell>
                </TableRow>
              ))}
              {pagos.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Sem baixas registradas.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{target.tomadores?.nome}</strong> · vencimento {new Date(target.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Data do pagamento</Label>
                  <Input type="date" value={pag.data_pagamento} onChange={(e) => setPag({ ...pag, data_pagamento: e.target.value })} /></div>
                <div className="space-y-1"><Label>Valor pago</Label>
                  <Input type="number" step="0.01" value={pag.valor} onChange={(e) => setPag({ ...pag, valor: e.target.value })} /></div>
                <div className="space-y-1 col-span-2"><Label>Forma</Label>
                  <Select value={pag.forma} onValueChange={(v) => setPag({ ...pag, forma: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="ted">TED</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2"><Label>Observação</Label>
                  <Input value={pag.obs} onChange={(e) => setPag({ ...pag, obs: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmar}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
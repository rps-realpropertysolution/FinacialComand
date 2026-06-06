import { useEffect, useState } from "react";
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
import { FileSignature, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { brl } from "@/lib/format";

interface Empreendimento { id: string; nome: string; }
interface Contrato {
  id: string;
  empreendimento_id: string;
  descricao: string;
  valor_mensal: number;
  percentual_reajuste: number;
  mes_reajuste: number;
  data_inicio: string;
  ativo: boolean;
  empreendimentos?: { nome: string };
}

const schema = z.object({
  empreendimento_id: z.string().uuid(),
  descricao: z.string().trim().min(2).max(200),
  valor_mensal: z.number().nonnegative(),
  percentual_reajuste: z.number().min(0).max(100),
  mes_reajuste: z.number().int().min(1).max(12),
  data_inicio: z.string().min(8),
});

export default function Contratos() {
  const { profile, empresa } = useAuth();
  const [emps, setEmps] = useState<Empreendimento[]>([]);
  const [list, setList] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    empreendimento_id: "",
    descricao: "",
    valor_mensal: "",
    percentual_reajuste: "0",
    mes_reajuste: "1",
    data_inicio: new Date().toISOString().slice(0, 10),
  });
  const isDiretor = profile?.role === "diretor";

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("empreendimentos").select("id, nome").order("nome"),
      supabase
        .from("contratos")
        .select("*, empreendimentos(nome)")
        .order("created_at", { ascending: false }),
    ]);
    setEmps((e as Empreendimento[]) ?? []);
    setList((c as unknown as Contrato[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = schema.safeParse({
      empreendimento_id: form.empreendimento_id,
      descricao: form.descricao,
      valor_mensal: Number(form.valor_mensal),
      percentual_reajuste: Number(form.percentual_reajuste),
      mes_reajuste: Number(form.mes_reajuste),
      data_inicio: form.data_inicio,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!empresa) return;
    setSaving(true);
    const d = parsed.data;
    const { error } = await supabase.from("contratos").insert([{
      empresa_id: empresa.id,
      empreendimento_id: d.empreendimento_id,
      descricao: d.descricao,
      valor_mensal: d.valor_mensal,
      percentual_reajuste: d.percentual_reajuste,
      mes_reajuste: d.mes_reajuste,
      data_inicio: d.data_inicio,
    }]);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contrato cadastrado");
    setForm({
      empreendimento_id: "",
      descricao: "",
      valor_mensal: "",
      percentual_reajuste: "0",
      mes_reajuste: "1",
      data_inicio: new Date().toISOString().slice(0, 10),
    });
    load();
  };

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-executive">Contratos</h2>
          <p className="text-sm text-muted-foreground">
            Receitas previstas com regras de reajuste anual.
          </p>
        </div>
        <Badge variant="secondary">{list.length} contratos</Badge>
      </header>

      {isDiretor && (
        <Card className="shadow-kpi">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Novo contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 lg:grid-cols-6">
              <div className="space-y-1 lg:col-span-2">
                <Label>Empreendimento</Label>
                <Select
                  value={form.empreendimento_id}
                  onValueChange={(v) => setForm({ ...form, empreendimento_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {emps.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Mão de obra fixa"
                />
              </div>
              <div className="space-y-1">
                <Label>Valor mensal</Label>
                <Input
                  type="number" step="0.01"
                  value={form.valor_mensal}
                  onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>% Reajuste anual</Label>
                <Input
                  type="number" step="0.01"
                  value={form.percentual_reajuste}
                  onChange={(e) => setForm({ ...form, percentual_reajuste: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Mês reajuste (1-12)</Label>
                <Input
                  type="number" min={1} max={12}
                  value={form.mes_reajuste}
                  onChange={(e) => setForm({ ...form, mes_reajuste: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Data início</Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>
              <div className="lg:col-span-6">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar contrato
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" /> Contratos vigentes
          </CardTitle>
          <CardDescription>Lista completa</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor mensal</TableHead>
                  <TableHead className="text-right">% Reajuste</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.empreendimentos?.nome ?? "—"}
                    </TableCell>
                    <TableCell>{c.descricao}</TableCell>
                    <TableCell className="text-right">{brl(Number(c.valor_mensal))}</TableCell>
                    <TableCell className="text-right">{Number(c.percentual_reajuste).toFixed(2)}%</TableCell>
                    <TableCell>{new Date(c.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={c.ativo
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-muted bg-muted text-muted-foreground"}
                      >
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum contrato cadastrado.
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

interface Empreendimento {
  id: string;
  nome: string;
  codigo: string | null;
  status: string;
  created_at: string;
}

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  codigo: z.string().trim().max(40).optional().or(z.literal("")),
});

export default function Empreendimentos() {
  const { profile, empresa } = useAuth();
  const [list, setList] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", codigo: "" });
  const isDiretor = profile?.role === "diretor";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("empreendimentos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Empreendimento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!empresa) return;
    setSaving(true);
    const { error } = await supabase.from("empreendimentos").insert({
      empresa_id: empresa.id,
      nome: parsed.data.nome,
      codigo: parsed.data.codigo || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Empreendimento cadastrado");
    setForm({ nome: "", codigo: "" });
    load();
  };

  return (
    <div className="space-y-6 animate-float-in">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-executive">Empreendimentos</h2>
          <p className="text-sm text-muted-foreground">
            Empreendimentos e projetos vinculados à empresa.
          </p>
        </div>
        <Badge variant="secondary">{list.length} cadastrados</Badge>
      </header>

      {isDiretor && (
        <Card className="shadow-kpi">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Novo empreendimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Empreendimento Centro Empresarial Sul"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="EMP-001"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>Empreendimentos ativos da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum empreendimento cadastrado.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => (
                <Link
                  key={e.id}
                  to={`/app/empreendimentos/${e.id}`}
                  className="group block rounded-lg border bg-surface-raised p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-kpi"
                >
                  <div className="flex items-start justify-between">
                    <Building2 className="h-5 w-5 text-primary" />
                    <Badge
                      variant="outline"
                      className="border-success/40 bg-success/10 text-success"
                    >
                      {e.status}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{e.nome}</h3>
                  {e.codigo && (
                    <p className="text-xs text-muted-foreground">{e.codigo}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                    Ver extrato <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
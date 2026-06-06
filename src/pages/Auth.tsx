import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoRps from "@/assets/logo-rps.svg";
import { Loader2, ShieldCheck, Sparkles, BarChart3 } from "lucide-react";
import heroSkyline from "@/assets/auth-hero-skyline.jpg";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", senha: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos"
          : "Falha no login: " + error.message,
      );
      return;
    }
    toast.success("Bem-vindo!");
    navigate("/app");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background hero */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroSkyline}
          alt="Skyline corporativo de São Paulo ao entardecer"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-board-gradient opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-executive/95 via-executive/70 to-executive/40" />
        <div className="absolute inset-0 executive-grid opacity-30" />
      </div>

      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="animate-float-in space-y-6 text-executive-foreground">
          <div className="flex items-center gap-3">
            <img src={logoRps} alt="RPS" className="h-16 w-auto drop-shadow-2xl" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">
                RPS Global
              </p>
              <h1 className="text-3xl font-extrabold leading-tight drop-shadow-lg sm:text-4xl">
                Financial Command
              </h1>
            </div>
          </div>
          <p className="max-w-xl text-base text-executive-foreground/90 drop-shadow sm:text-lg">
            Cashflow, FIS, Faturamentos NFS-e e BI Executivo. Visão integrada de
            receitas previstas, realizadas e desempenho por empreendimento — no
            padrão RPScommander.
          </p>
          <ul className="space-y-3 text-sm text-executive-foreground/90">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Geração de FIS idempotente do mês
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" /> KPIs de 12 meses & ranking por empreendimento
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" /> Isolamento por empresa (RLS) + papéis
            </li>
          </ul>
        </div>

        <Card className="animate-float-in border-executive-foreground/10 bg-background/95 shadow-executive backdrop-blur-md">
          <CardHeader>
            <CardTitle>Acessar plataforma</CardTitle>
            <CardDescription>
              Entre com sua conta corporativa RPS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@rpsglobal.com.br"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-senha">Senha</Label>
                <Input
                  id="login-senha"
                  type="password"
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Acesso restrito a colaboradores RPS. Problemas para entrar? Fale com a
              diretoria.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

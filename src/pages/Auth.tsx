import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoRps from "@/assets/logo-rps.svg";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import heroSkyline from "@/assets/auth-hero-skyline.jpg";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

const registerSchema = z.object({
  nomeEmpresa: z.string().trim().min(2).max(120),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  nomeUsuario: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(6).max(100),
});

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [regForm, setRegForm] = useState({
    nomeEmpresa: "",
    cnpj: "",
    nomeUsuario: "",
    email: "",
    senha: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(loginForm);
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
      toast.error("Falha no login: " + error.message);
      return;
    }
    toast.success("Bem-vindo!");
    navigate("/app");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(regForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (signUpErr || !signUpData.user) {
      setLoading(false);
      toast.error("Falha no registro: " + (signUpErr?.message ?? "desconhecido"));
      return;
    }
    // Garantir sessão
    if (!signUpData.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.senha,
      });
      if (signInErr) {
        setLoading(false);
        toast.error("Login pós-registro falhou: " + signInErr.message);
        return;
      }
    }
    const { error: rpcErr } = await supabase.rpc("register_empresa", {
      _nome_empresa: parsed.data.nomeEmpresa,
      _cnpj: parsed.data.cnpj || null,
      _nome_usuario: parsed.data.nomeUsuario,
    });
    setLoading(false);
    if (rpcErr) {
      toast.error("Erro ao criar empresa: " + rpcErr.message);
      return;
    }
    toast.success("Empresa registrada! Bem-vindo, diretor.");
    navigate("/app");
  };

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      {/* Background hero */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroSkyline}
          alt="Skyline corporativo de São Paulo ao entardecer"
          className="h-full w-full object-cover object-center"
        />
        {/* Overlay para legibilidade */}
        <div className="absolute inset-0 bg-board-gradient opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-executive/95 via-executive/70 to-executive/40" />
        <div className="absolute inset-0 executive-grid opacity-30" />
      </div>

      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="text-executive-foreground space-y-6 animate-float-in">
          <div className="flex items-center gap-3">
            <img src={logoRps} alt="RPS" className="h-16 w-auto drop-shadow-2xl" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">
                RPS Global
              </p>
              <h1 className="text-3xl font-extrabold leading-tight drop-shadow-lg sm:text-4xl">
                Flow Manager
              </h1>
            </div>
          </div>
          <p className="max-w-xl text-base text-executive-foreground/90 drop-shadow sm:text-lg">
            Cashflow, FIS, Faturamentos NFS-e e BI Executivo multi-tenant.
            Visão integrada de receitas previstas, realizadas e desempenho por
            empreendimento — no padrão RPScommander.
          </p>
          <ul className="space-y-3 text-sm text-executive-foreground/90">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Geração de FIS idempotente do mês
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> KPIs de 12 meses & ranking por empreendimento
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" /> Isolamento por empresa (RLS)
            </li>
          </ul>
        </div>

        <Card className="border-executive-foreground/10 bg-background/95 shadow-executive backdrop-blur-md animate-float-in">
          <CardHeader>
            <CardTitle>Acessar plataforma</CardTitle>
            <CardDescription>
              Faça login ou registre uma nova empresa para começar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Registrar Empresa</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-senha">Senha</Label>
                    <Input
                      id="login-senha"
                      type="password"
                      autoComplete="current-password"
                      value={loginForm.senha}
                      onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="reg-empresa">Nome da empresa</Label>
                      <Input
                        id="reg-empresa"
                        value={regForm.nomeEmpresa}
                        onChange={(e) =>
                          setRegForm({ ...regForm, nomeEmpresa: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-cnpj">CNPJ (opcional)</Label>
                      <Input
                        id="reg-cnpj"
                        value={regForm.cnpj}
                        onChange={(e) => setRegForm({ ...regForm, cnpj: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-nome">Seu nome (diretor)</Label>
                    <Input
                      id="reg-nome"
                      value={regForm.nomeUsuario}
                      onChange={(e) =>
                        setRegForm({ ...regForm, nomeUsuario: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-mail</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-senha">Senha</Label>
                    <Input
                      id="reg-senha"
                      type="password"
                      autoComplete="new-password"
                      value={regForm.senha}
                      onChange={(e) => setRegForm({ ...regForm, senha: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar empresa
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
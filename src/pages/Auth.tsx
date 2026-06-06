import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LineChart } from "lucide-react";

// Paleta inspirada no RPScan: primário ciano -> azul; fundo navy -> azul.
const GRADIENT_PRIMARY = "linear-gradient(135deg, hsl(190 98% 43%) 0%, hsl(201 100% 36%) 100%)";
const GRADIENT_HEADER = "linear-gradient(135deg, hsl(242 50% 22%) 0%, hsl(201 100% 30%) 100%)";

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
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: GRADIENT_HEADER }}
    >
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: GRADIENT_PRIMARY }}
          >
            <LineChart className="h-8 w-8 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
            RPS Global
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Financial Command</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comando financeiro · honorários, fiscal e BI
          </p>
        </div>

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
          <Button
            type="submit"
            className="w-full text-white hover:opacity-90"
            style={{ background: GRADIENT_PRIMARY }}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito a colaboradores RPS.
        </p>
      </Card>
    </div>
  );
}

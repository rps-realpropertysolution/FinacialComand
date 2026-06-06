import { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoRps from "@/assets/logo-rps.svg";
import {
  Building2,
  FileSignature,
  LineChart,
  LogOut,
  Receipt,
  TriangleAlert,
  FileText,
  Banknote,
  Settings2,
  Users,
  Building,
  Landmark,
  TableProperties,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Painel BI", icon: LineChart, end: true },
  { to: "/app/empreendimentos", label: "Empreendimentos", icon: Building2 },
  { to: "/app/contratos", label: "Contratos", icon: FileSignature },
  { to: "/app/faturamentos", label: "Faturamentos", icon: FileText },
  { to: "/app/conciliacao", label: "Conciliação", icon: Banknote },
  { to: "/app/cashflow", label: "Cashflow", icon: Receipt },
  { to: "/app/despesas-sede", label: "Despesas Sede", icon: Building },
  { to: "/app/rh", label: "RH", icon: Users },
  { to: "/app/fiscal", label: "Fiscal", icon: Landmark },
  { to: "/app/ytd", label: "YTD", icon: TableProperties },
  { to: "/app/forecast", label: "Forecast", icon: Activity },
  { to: "/app/alertas", label: "Alertas", icon: TriangleAlert },
  { to: "/app/emissor", label: "Emissor NFS-e", icon: Settings2 },
];

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { profile, empresa, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background text-foreground executive-grid">
      <header className="bg-board-gradient text-executive-foreground shadow-executive">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoRps} alt="RPS" className="h-12 w-auto drop-shadow-lg" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                  RPS Global • Financial Command
                </p>
                <h1 className="text-lg font-bold leading-tight sm:text-xl">
                  {empresa?.nome ?? "—"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <p className="font-semibold">{profile?.nome}</p>
                <Badge variant="secondary" className="bg-accent/90 text-accent-foreground">
                  {profile?.role}
                </Badge>
              </div>
              <Button
                onClick={handleLogout}
                size="sm"
                variant="secondary"
                className="bg-executive-foreground/10 text-executive-foreground hover:bg-executive-foreground/20"
              >
                <LogOut className="mr-1 h-4 w-4" /> Sair
              </Button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    "border border-executive-foreground/20",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-kpi"
                      : "bg-executive-foreground/5 hover:bg-executive-foreground/15"
                  )
                }
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
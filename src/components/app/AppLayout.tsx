import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import logoRps from "@/assets/logo-rps.svg";
import {
  Building2, FileSignature, LineChart, LogOut, Receipt, TriangleAlert,
  FileText, Banknote, Settings2, Users, Building, Landmark, TableProperties,
  Activity, Menu, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GRADIENT_HEADER = "linear-gradient(135deg, hsl(242 50% 22%) 0%, hsl(201 100% 30%) 100%)";
const GRADIENT_PRIMARY = "linear-gradient(135deg, hsl(190 98% 43%) 0%, hsl(201 100% 36%) 100%)";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { to: "/app", label: "Painel Geral", icon: LineChart, end: true },
      { to: "/app/ytd", label: "Acumulado do Ano", icon: TableProperties },
      { to: "/app/forecast", label: "Previsão", icon: Activity },
      { to: "/app/alertas", label: "Alertas", icon: TriangleAlert },
    ],
  },
  {
    label: "Receitas & Clientes",
    items: [
      { to: "/app/empreendimentos", label: "Empreendimentos", icon: Building2 },
      { to: "/app/contratos", label: "Contratos", icon: FileSignature },
      { to: "/app/faturamentos", label: "Faturamento", icon: FileText },
    ],
  },
  {
    label: "Caixa",
    items: [
      { to: "/app/cashflow", label: "Fluxo de Caixa", icon: Receipt },
      { to: "/app/conciliacao", label: "Conciliação Bancária", icon: Banknote },
    ],
  },
  {
    label: "Custos & Pessoas",
    items: [
      { to: "/app/despesas-sede", label: "Despesas do Escritório", icon: Building },
      { to: "/app/rh", label: "Equipe & Folha", icon: Users },
      { to: "/app/fiscal", label: "Impostos & Guias", icon: Landmark },
    ],
  },
  {
    label: "Configurações",
    items: [{ to: "/app/emissor", label: "Emissor de Notas", icon: Settings2 }],
  },
];

function SidebarBody({
  profile, empresa, onLogout, onNavigate,
}: {
  profile: { nome?: string; role?: string } | null;
  empresa: { nome?: string } | null;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col text-white" style={{ background: GRADIENT_HEADER }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img src={logoRps} alt="RPS" className="h-10 w-auto drop-shadow" />
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">RPS Global</p>
          <p className="text-sm font-bold">Financial Command</p>
        </div>
      </div>
      <div className="mx-5 mb-2 truncate rounded-md bg-white/10 px-3 py-2 text-xs">
        <span className="text-white/60">Empresa: </span>
        <span className="font-semibold">{empresa?.nome ?? "—"}</span>
      </div>

      {/* Navegação agrupada */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-md"
                        style={isActive ? { background: GRADIENT_PRIMARY } : { background: "rgba(255,255,255,0.08)" }}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuário + sair */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.nome ?? "Usuário"}</p>
            <Badge variant="secondary" className="mt-0.5 bg-white/15 text-[10px] text-white hover:bg-white/15">
              {profile?.role ?? "—"}
            </Badge>
          </div>
        </div>
        <Button
          onClick={onLogout}
          size="sm"
          variant="secondary"
          className="w-full bg-white/10 text-white hover:bg-white/20"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { profile, empresa, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarBody profile={profile} empresa={empresa} onLogout={handleLogout} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarBody
            profile={profile}
            empresa={empresa}
            onLogout={handleLogout}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Conteúdo */}
      <div className="lg:pl-64">
        {/* Topbar (mobile + contexto) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-executive">{empresa?.nome ?? "RPS"}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· Financial Command</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{profile?.nome}</span>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              {profile?.role ?? "—"}
            </Badge>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

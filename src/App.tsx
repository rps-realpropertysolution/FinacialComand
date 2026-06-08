import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import RequireAuth from "@/components/app/RequireAuth";
import AppLayout from "@/components/app/AppLayout";
import ErrorBoundary from "@/components/app/ErrorBoundary";

// Páginas carregadas sob demanda (code splitting) — bundle inicial menor.
const PainelBI = lazy(() => import("@/pages/app/PainelBI"));
const Empreendimentos = lazy(() => import("@/pages/app/Empreendimentos"));
const EmpreendimentoExtrato = lazy(() => import("@/pages/app/EmpreendimentoExtrato"));
const Contratos = lazy(() => import("@/pages/app/Contratos"));
const Cashflow = lazy(() => import("@/pages/app/Cashflow"));
const Alertas = lazy(() => import("@/pages/app/Alertas"));
const Faturamentos = lazy(() => import("@/pages/app/Faturamentos"));
const Conciliacao = lazy(() => import("@/pages/app/Conciliacao"));
const EmissorConfig = lazy(() => import("@/pages/app/EmissorConfig"));
const Fiscal = lazy(() => import("@/pages/app/Fiscal"));
const RH = lazy(() => import("@/pages/app/RH"));
const DespesasSede = lazy(() => import("@/pages/app/DespesasSede"));
const YTD = lazy(() => import("@/pages/app/YTD"));
const Forecast = lazy(() => import("@/pages/app/Forecast"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/app" element={<PainelBI />} />
                  <Route path="/app/empreendimentos" element={<Empreendimentos />} />
                  <Route path="/app/empreendimentos/:id" element={<EmpreendimentoExtrato />} />
                  <Route path="/app/contratos" element={<Contratos />} />
                  <Route path="/app/cashflow" element={<Cashflow />} />
                  <Route path="/app/alertas" element={<Alertas />} />
                  <Route path="/app/faturamentos" element={<Faturamentos />} />
                  <Route path="/app/conciliacao" element={<Conciliacao />} />
                  <Route path="/app/fiscal" element={<Fiscal />} />
                  <Route path="/app/rh" element={<RH />} />
                  <Route path="/app/despesas-sede" element={<DespesasSede />} />
                  <Route path="/app/ytd" element={<YTD />} />
                  <Route path="/app/forecast" element={<Forecast />} />
                  <Route path="/app/emissor" element={<EmissorConfig />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

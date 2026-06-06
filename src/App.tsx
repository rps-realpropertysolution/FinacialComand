import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import RequireAuth from "@/components/app/RequireAuth";
import AppLayout from "@/components/app/AppLayout";
import PainelBI from "@/pages/app/PainelBI";
import Empreendimentos from "@/pages/app/Empreendimentos";
import EmpreendimentoExtrato from "@/pages/app/EmpreendimentoExtrato";
import Contratos from "@/pages/app/Contratos";
import Cashflow from "@/pages/app/Cashflow";
import Alertas from "@/pages/app/Alertas";
import Faturamentos from "@/pages/app/Faturamentos";
import Conciliacao from "@/pages/app/Conciliacao";
import EmissorConfig from "@/pages/app/EmissorConfig";
import Fiscal from "@/pages/app/Fiscal";
import RH from "@/pages/app/RH";
import DespesasSede from "@/pages/app/DespesasSede";
import YTD from "@/pages/app/YTD";
import Forecast from "@/pages/app/Forecast";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

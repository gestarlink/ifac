import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import DashboardLayout from "./layouts/DashboardLayout";
import MobileLayout from "./layouts/MobileLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminHome from "./pages/SuperAdminHome";
import Register from "./pages/Register";
import DashboardGeralHome from "./pages/DashboardGeralHome";
import BeneficiariosPage from "./pages/BeneficiariosPage";
import ChamadaPage from "./pages/ChamadaPage";
import AtividadesPage from "./pages/AtividadesPage";
import FotosPage from "./pages/FotosPage";
import EstoquePage from "./pages/EstoquePage";
import UsuariosPage from "./pages/UsuariosPage";
import ValidacoesPage from "./pages/ValidacoesPage";
import MobileHome from "./pages/mobile/MobileHome";
import MobileChamada from "./pages/mobile/MobileChamada";
import MobileAtividades from "./pages/mobile/MobileAtividades";
import MobileFotos from "./pages/mobile/MobileFotos";
import MobileMaterial from "./pages/mobile/MobileMaterial";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            
            {/* Dashboard Web - Coordenador / Coordenador Geral */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="geral" element={<DashboardGeralHome />} />
              <Route path="beneficiarios" element={<BeneficiariosPage />} />
              <Route path="chamada" element={<ChamadaPage />} />
              <Route path="atividades" element={<AtividadesPage />} />
              <Route path="fotos" element={<FotosPage />} />
              <Route path="estoque" element={<EstoquePage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="validacoes" element={<ValidacoesPage />} />
            </Route>
            {/* SuperAdmin Dashboard */}
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminHome />} />
              <Route path="config" element={<div>Configurações (em breve)</div>} />
              <Route path="panels" element={<div>Painéis (em breve)</div>} />
            </Route>
            
            {/* App Mobile - Professor/Monitor */}
            <Route path="/app" element={<MobileLayout />}>
              <Route index element={<MobileHome />} />
              <Route path="chamada" element={<MobileChamada />} />
              <Route path="atividades" element={<MobileAtividades />} />
              <Route path="fotos" element={<MobileFotos />} />
              <Route path="material" element={<MobileMaterial />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { Outlet, useLocation } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardGeralHome from "@/pages/DashboardGeralHome";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Camera,
  Package,
  FileText,
  LogOut,
  Menu,
  X,
  UserCog,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logoFac from "@/assets/logo-fac.png";

const allMobileMenuItems = [
  { icon: LayoutDashboard, label: "Painel", path: "/dashboard", roles: ["coordenador", "coordenador_geral"] },
  { icon: Users, label: "Alunos", path: "/dashboard/beneficiarios", roles: ["coordenador"] },
  { icon: ClipboardCheck, label: "Chamada", path: "/dashboard/chamada", roles: ["coordenador"] },
  { icon: FileText, label: "Atividades", path: "/dashboard/atividades", roles: ["coordenador", "coordenador_geral"] },
  { icon: Camera, label: "Fotos", path: "/dashboard/fotos", roles: ["coordenador"] },
  { icon: Package, label: "Estoque", path: "/dashboard/estoque", roles: ["coordenador", "coordenador_geral"] },
  { icon: UserCheck, label: "Validações", path: "/dashboard/validacoes", roles: ["coordenador", "coordenador_geral"] },
  { icon: UserCog, label: "Usuários", path: "/dashboard/usuarios", roles: ["coordenador"] },
];

const DashboardLayout = () => {
  const { user, loading, signOut, userRole } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If coordenador_geral is at /dashboard index, render their specific dashboard
  const isGeralAtIndex = userRole === "coordenador_geral" && location.pathname === "/dashboard";

  const mobileMenuItems = allMobileMenuItems.filter((item) => !userRole || item.roles.includes(userRole));

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0 z-50">
          <div className="flex items-center gap-2">
            <img src={logoFac} alt="FAC" className="w-8 h-8 object-contain rounded-lg bg-white/10 p-0.5" />
            <div>
              <h1 className="text-base font-display font-bold">FAC — Admin</h1>
              <p className="text-[10px] opacity-80">
                {userRole === "coordenador_geral" ? "Coordenador Geral" : "Painel do Coordenador"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors">
              {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 pt-14">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <nav className="relative bg-card border-b border-border shadow-lg p-3 space-y-1 animate-fade-in">
              {mobileMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-20">
            {isGeralAtIndex ? <DashboardGeralHome /> : <Outlet />}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-1 py-1 safe-area-bottom z-50">
          {mobileMenuItems.slice(0, 5).map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[56px] transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {isGeralAtIndex ? <DashboardGeralHome /> : <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

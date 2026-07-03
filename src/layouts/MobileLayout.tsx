import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ClipboardCheck, FileText, Camera, Package, Home, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import logoFac from "@/assets/logo-fac.png";

const tabs = [
  { icon: Home, label: "Início", path: "/app" },
  { icon: ClipboardCheck, label: "Chamada", path: "/app/chamada" },
  { icon: FileText, label: "Atividades", path: "/app/atividades" },
  { icon: Camera, label: "Fotos", path: "/app/fotos" },
  { icon: Package, label: "Material", path: "/app/material" },
];

const MobileLayout = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src={logoFac} alt="FAC" className="w-8 h-8 object-contain rounded-lg bg-white/10 p-0.5" />
          <div>
            <h1 className="text-base font-display font-bold">FAC — Campo</h1>
            <p className="text-[10px] opacity-80">Núcleo Cidade do Povo</p>
          </div>
        </div>
        <button onClick={signOut} className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          <Outlet />
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-1 py-1 safe-area-bottom z-50">
        {tabs.map((tab) => {
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
};

export default MobileLayout;

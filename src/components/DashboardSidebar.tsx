import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Camera,
  Package,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logoFac from "@/assets/logo-fac.png";

const allMenuItems = [
  { icon: LayoutDashboard, label: "Painel Geral", path: "/dashboard", roles: ["coordenador", "coordenador_geral"] },
  { icon: Users, label: "Beneficiários", path: "/dashboard/beneficiarios", roles: ["coordenador"] },
  { icon: ClipboardCheck, label: "Chamada", path: "/dashboard/chamada", roles: ["coordenador"] },
  { icon: FileText, label: "Atividades", path: "/dashboard/atividades", roles: ["coordenador", "coordenador_geral"] },
  { icon: Camera, label: "Relatório Fotográfico", path: "/dashboard/fotos", roles: ["coordenador"] },
  { icon: Package, label: "Estoque", path: "/dashboard/estoque", roles: ["coordenador", "coordenador_geral"] },
  { icon: UserCheck, label: "Validações", path: "/dashboard/validacoes", roles: ["coordenador", "coordenador_geral"] },
  { icon: UserCog, label: "Usuários", path: "/dashboard/usuarios", roles: ["coordenador"] },
];

const DashboardSidebar = () => {
  const { signOut, userRole } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = allMenuItems.filter((item) => !userRole || item.roles.includes(userRole));

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={logoFac} alt="FAC" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" />
        {!collapsed && (
          <div className="animate-slide-in overflow-hidden">
            <p className="text-sm font-display font-bold leading-tight text-sidebar-foreground">FAC</p>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Gestão Administrativa</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent w-full transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Recolher</span>}
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-sidebar-accent w-full transition-all"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;

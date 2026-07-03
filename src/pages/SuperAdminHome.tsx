import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Settings, PanelsTopLeft, Users, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SuperAdminHome = () => {
  const sections = [
    {
      icon: Settings,
      title: "Configurações",
      path: "/superadmin/config",
      bg: "bg-primary/10",
    },
    {
      icon: PanelsTopLeft,
      title: "Painéis",
      path: "/superadmin/panels",
      bg: "bg-accent/10",
    },
    {
      icon: Users,
      title: "Gestão de Usuários",
      path: "/superadmin/usuarios",
      bg: "bg-emerald-500/10",
    },
    {
      icon: BarChart2,
      title: "Relatórios",
      path: "/superadmin/relatorios",
      bg: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-display font-bold text-foreground">
        Painel SuperAdmin
      </h1>
      <p className="text-sm text-muted-foreground">
        Controle total do sistema IFAC – gerencie configurações, painéis, usuários e relatórios.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((sec) => (
          <Link
            key={sec.title}
            to={sec.path}
            className={cn(
              "block rounded-2xl p-4 border border-white/10 backdrop-blur-xl hover:shadow-lg transition-shadow",
              sec.bg
            )}
          >
            <Card className="bg-transparent border-0 shadow-none">
              <CardHeader className="flex flex-col items-center p-0">
                <sec.icon className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-center text-base font-medium text-foreground">
                  {sec.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 text-center text-sm text-muted-foreground">
                Acessar {sec.title.toLowerCase()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminHome;

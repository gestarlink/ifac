import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "@/components/StatCard";
import { Users, ClipboardCheck, Camera, Package, FileText, CheckSquare, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(215, 90%, 42%)", "hsl(195, 85%, 45%)", "hsl(142, 72%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAlunos: 0,
    presencasHoje: 0,
    atividadesPendentes: 0,
    fotosEsteMes: 0,
    itensEstoqueBaixo: 0,
  });
  const [turmasPresenca, setTurmasPresenca] = useState<{ name: string; presentes: number; faltas: number }[]>([]);
  const [atividadesRecentes, setAtividadesRecentes] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    const [alunosRes, presencasRes, atividadesRes, fotosRes, estoqueRes, turmasRes] = await Promise.all([
      supabase.from("beneficiarios").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("presencas").select("id", { count: "exact", head: true }).eq("data", today).eq("presente", true),
      supabase.from("atividades").select("*").eq("status", "pendente").order("created_at", { ascending: false }).limit(5),
      supabase.from("fotos").select("id", { count: "exact", head: true }).gte("data", startOfMonth),
      supabase.from("estoque").select("*"),
      supabase.from("turmas").select("id, nome"),
    ]);

    setStats({
      totalAlunos: alunosRes.count || 0,
      presencasHoje: presencasRes.count || 0,
      atividadesPendentes: atividadesRes.data?.length || 0,
      fotosEsteMes: fotosRes.count || 0,
      itensEstoqueBaixo: estoqueRes.data?.filter((i) => i.quantidade <= (i.estoque_minimo || 5)).length || 0,
    });

    setAtividadesRecentes(atividadesRes.data || []);

    // Load attendance by turma for today
    if (turmasRes.data) {
      const presencaData = await Promise.all(
        turmasRes.data.map(async (turma) => {
          const { count: presentes } = await supabase
            .from("presencas")
            .select("id", { count: "exact", head: true })
            .eq("turma_id", turma.id)
            .eq("data", today)
            .eq("presente", true);
          const { count: faltas } = await supabase
            .from("presencas")
            .select("id", { count: "exact", head: true })
            .eq("turma_id", turma.id)
            .eq("data", today)
            .eq("presente", false);
          return { name: turma.nome, presentes: presentes || 0, faltas: faltas || 0 };
        })
      );
      setTurmasPresenca(presencaData.filter((t) => t.presentes > 0 || t.faltas > 0));
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pendente: "bg-warning/10 text-warning border-warning/20",
      aprovada: "bg-success/10 text-success border-success/20",
      correcao_solicitada: "bg-destructive/10 text-destructive border-destructive/20",
    };
    const labels: Record<string, string> = {
      pendente: "Pendente",
      aprovada: "Aprovada",
      correcao_solicitada: "Correção",
    };
    return <Badge className={map[status] || ""} variant="outline">{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Painel do Coordenador</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral em tempo real — Núcleo Cidade do Povo</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total de Alunos" value={stats.totalAlunos} icon={<Users className="w-5 h-5" />} variant="primary" />
        <StatCard title="Presenças Hoje" value={stats.presencasHoje} icon={<ClipboardCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Atividades Pendentes" value={stats.atividadesPendentes} icon={<FileText className="w-5 h-5" />} variant="warning" />
        <StatCard title="Fotos (Mês)" value={stats.fotosEsteMes} icon={<Camera className="w-5 h-5" />} variant="default" />
        <StatCard title="Estoque Baixo" value={stats.itensEstoqueBaixo} icon={<AlertTriangle className="w-5 h-5" />} variant="destructive" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Presença por Turma (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            {turmasPresenca.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={turmasPresenca}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="presentes" fill="hsl(142, 72%, 40%)" name="Presentes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="faltas" fill="hsl(0, 72%, 51%)" name="Faltas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma chamada registrada hoje
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Atividades Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {atividadesRecentes.length > 0 ? (
              <div className="space-y-3">
                {atividadesRecentes.map((atv) => (
                  <div key={atv.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{atv.nome_atividade}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(atv.data_inicio).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {statusBadge(atv.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma atividade pendente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;

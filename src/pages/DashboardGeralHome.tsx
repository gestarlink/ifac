import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import { Users, ClipboardCheck, Camera, Package, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const COLORS = ["hsl(142, 72%, 40%)", "hsl(0, 72%, 51%)", "hsl(200, 72%, 50%)", "hsl(45, 90%, 50%)", "hsl(270, 60%, 55%)"];

const DashboardGeralHome = () => {
  const [stats, setStats] = useState({
    totalAlunos: 0, presencasHoje: 0, faltasHoje: 0,
    atividadesPendentes: 0, atividadesAprovadas: 0, atividadesCorrecao: 0,
    fotosEsteMes: 0, itensEstoqueBaixo: 0, totalEstoque: 0,
  });
  const [turmasPresenca, setTurmasPresenca] = useState<{ name: string; presentes: number; faltas: number }[]>([]);
  const [atividadesPorCargo, setAtividadesPorCargo] = useState<{ name: string; pendente: number; aprovada: number; correcao: number }[]>([]);
  const [estoqueItems, setEstoqueItems] = useState<{ name: string; quantidade: number; minimo: number }[]>([]);
  const [presencaMensal, setPresencaMensal] = useState<{ dia: string; presentes: number; faltas: number }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [alunosRes, presencasRes, faltasRes, atividadesRes, fotosRes, estoqueRes, turmasRes, profilesRes, rolesRes, presencasMesRes] = await Promise.all([
      supabase.from("beneficiarios").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("presencas").select("id", { count: "exact", head: true }).eq("data", today).eq("presente", true),
      supabase.from("presencas").select("id", { count: "exact", head: true }).eq("data", today).eq("presente", false),
      supabase.from("atividades").select("*"),
      supabase.from("fotos").select("id", { count: "exact", head: true }).gte("data", startOfMonth),
      supabase.from("estoque").select("*"),
      supabase.from("turmas").select("id, nome"),
      supabase.from("profiles").select("user_id, nome, cargo"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("presencas").select("data, presente").gte("data", startOfMonth).lte("data", endOfMonth),
    ]);

    const estoqueData = estoqueRes.data || [];
    const atividades = atividadesRes.data || [];

    setStats({
      totalAlunos: alunosRes.count || 0,
      presencasHoje: presencasRes.count || 0,
      faltasHoje: faltasRes.count || 0,
      atividadesPendentes: atividades.filter(a => a.status === "pendente").length,
      atividadesAprovadas: atividades.filter(a => a.status === "aprovada").length,
      atividadesCorrecao: atividades.filter(a => a.status === "correcao_solicitada").length,
      fotosEsteMes: fotosRes.count || 0,
      itensEstoqueBaixo: estoqueData.filter(i => i.quantidade <= (i.estoque_minimo || 5)).length,
      totalEstoque: estoqueData.length,
    });

    // Estoque chart
    setEstoqueItems(estoqueData.map(i => ({
      name: i.item.length > 15 ? i.item.slice(0, 15) + "…" : i.item,
      quantidade: i.quantidade,
      minimo: i.estoque_minimo || 5,
    })));

    // Atividades por cargo (coordenador, professor, monitor)
    const roles = rolesRes.data || [];
    const profiles = profilesRes.data || [];
    const roleMap: Record<string, string> = {};
    roles.forEach((r: any) => { roleMap[r.user_id] = r.role; });
    const cargoLabels: Record<string, string> = {
      coordenador: "Coordenador", professor: "Professor", monitor: "Monitor",
    };
    const cargos = ["coordenador", "professor", "monitor"];
    const porCargo = cargos.map(cargo => {
      const userIds = roles.filter((r: any) => r.role === cargo).map((r: any) => r.user_id);
      const cargoAtividades = atividades.filter(a => userIds.includes(a.user_id));
      return {
        name: cargoLabels[cargo] || cargo,
        pendente: cargoAtividades.filter(a => a.status === "pendente").length,
        aprovada: cargoAtividades.filter(a => a.status === "aprovada").length,
        correcao: cargoAtividades.filter(a => a.status === "correcao_solicitada").length,
      };
    });
    setAtividadesPorCargo(porCargo);

    // Presença por turma hoje
    if (turmasRes.data) {
      const presencaData = await Promise.all(
        turmasRes.data.map(async (turma) => {
          const { count: presentes } = await supabase.from("presencas").select("id", { count: "exact", head: true }).eq("turma_id", turma.id).eq("data", today).eq("presente", true);
          const { count: faltas } = await supabase.from("presencas").select("id", { count: "exact", head: true }).eq("turma_id", turma.id).eq("data", today).eq("presente", false);
          return { name: turma.nome, presentes: presentes || 0, faltas: faltas || 0 };
        })
      );
      setTurmasPresenca(presencaData.filter(t => t.presentes > 0 || t.faltas > 0));
    }

    // Presença mensal (line chart)
    const presencasMes = presencasMesRes.data || [];
    const diasMap: Record<string, { presentes: number; faltas: number }> = {};
    presencasMes.forEach((p: any) => {
      const dia = new Date(p.data + "T12:00:00").getDate().toString();
      if (!diasMap[dia]) diasMap[dia] = { presentes: 0, faltas: 0 };
      if (p.presente) diasMap[dia].presentes++;
      else diasMap[dia].faltas++;
    });
    const diasArr = Object.entries(diasMap)
      .map(([dia, v]) => ({ dia, presentes: v.presentes, faltas: v.faltas }))
      .sort((a, b) => parseInt(a.dia) - parseInt(b.dia));
    setPresencaMensal(diasArr);
  };

  const atividadesStatusPie = [
    { name: "Pendentes", value: stats.atividadesPendentes, color: "hsl(45, 90%, 50%)" },
    { name: "Aprovadas", value: stats.atividadesAprovadas, color: "hsl(142, 72%, 40%)" },
    { name: "Correção", value: stats.atividadesCorrecao, color: "hsl(0, 72%, 51%)" },
  ].filter(i => i.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Painel do Coordenador Geral</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral consolidada — somente leitura</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Alunos" value={stats.totalAlunos} icon={<Users className="w-5 h-5" />} variant="primary" />
        <StatCard title="Presenças Hoje" value={stats.presencasHoje} icon={<ClipboardCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Faltas Hoje" value={stats.faltasHoje} icon={<ClipboardCheck className="w-5 h-5" />} variant="destructive" />
        <StatCard title="Estoque Baixo" value={stats.itensEstoqueBaixo} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" />
      </div>

      {/* Presença Mensal - Line Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Presenças e Faltas no Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {presencaMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={presencaMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} label={{ value: "Dia", position: "insideBottomRight", offset: -5, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="presentes" stroke="hsl(142, 72%, 40%)" name="Presentes" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="faltas" stroke="hsl(0, 72%, 51%)" name="Faltas" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma presença registrada este mês</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presença por Turma Hoje */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Presença por Turma (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            {turmasPresenca.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={turmasPresenca}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="presentes" fill="hsl(142, 72%, 40%)" name="Presentes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="faltas" fill="hsl(0, 72%, 51%)" name="Faltas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma chamada registrada hoje</div>
            )}
          </CardContent>
        </Card>

        {/* Atividades por Status - Pie */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Atividades por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {atividadesStatusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={atividadesStatusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {atividadesStatusPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma atividade registrada</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividades por Cargo */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Relatórios de Atividades por Cargo</CardTitle>
        </CardHeader>
        <CardContent>
          {atividadesPorCargo.some(c => c.pendente + c.aprovada + c.correcao > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={atividadesPorCargo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="aprovada" fill="hsl(142, 72%, 40%)" name="Aprovadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendente" fill="hsl(45, 90%, 50%)" name="Pendentes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="correcao" fill="hsl(0, 72%, 51%)" name="Correção" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma atividade registrada</div>
          )}
        </CardContent>
      </Card>

      {/* Estoque em tempo real */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Controle de Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          {estoqueItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estoqueItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="hsl(200, 72%, 50%)" name="Quantidade Atual" radius={[0, 4, 4, 0]} />
                <Bar dataKey="minimo" fill="hsl(0, 72%, 51%)" name="Estoque Mínimo" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Nenhum item de estoque cadastrado</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardGeralHome;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, FileText, Camera, Package, Users } from "lucide-react";

const MobileHome = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({ presencas: 0, atividades: 0, fotos: 0 });
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [profileRes, turmasRes, presRes, atvRes, fotosRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
      supabase.from("turmas").select("*, beneficiarios(id)").order("nome"),
      supabase.from("presencas").select("id", { count: "exact", head: true }).eq("data", today).eq("registrado_por", user!.id),
      supabase.from("atividades").select("id", { count: "exact", head: true }).eq("user_id", user!.id).gte("created_at", today),
      supabase.from("fotos").select("id", { count: "exact", head: true }).eq("uploaded_by", user!.id).eq("data", today),
    ]);

    setProfile(profileRes.data);
    setTurmas(turmasRes.data || []);
    setTodayStats({
      presencas: presRes.count || 0,
      atividades: atvRes.count || 0,
      fotos: fotosRes.count || 0,
    });

    const firstTurma = turmasRes.data?.[0];
    if (firstTurma) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { data: subs } = await supabase
        .from("envios_documentos")
        .select("*, turmas(nome)")
        .eq("nucleo_id", firstTurma.nucleo_id)
        .eq("mes", currentMonth)
        .eq("ano", currentYear);

      setSubmissions(subs || []);
    }
  };

  const handleSend = async (submissionId) => {
    try {
      const { error } = await supabase
        .from('envios_documentos')
        .update({ status: 'enviado' })
        .eq('id', submissionId);
      if (error) throw error;
      // Refresh submissions
      loadData();
    } catch (e) {
      console.error('Erro ao enviar para validação', e);
    }
  };

  const quickActions = [
    { icon: ClipboardCheck, label: "Chamada Diária", path: "/app/chamada", color: "bg-primary/10 text-primary" },
    { icon: FileText, label: "Registrar Atividade", path: "/app/atividades", color: "bg-accent/10 text-accent" },
    { icon: Camera, label: "Enviar Fotos", path: "/app/fotos", color: "bg-success/10 text-success" },
    { icon: Package, label: "Controle de Material", path: "/app/material", color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">
          Olá, {profile?.nome?.split(" ")[0] || "Professor"}! 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile?.cargo || "Equipe"} — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{todayStats.presencas}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Chamadas</p>
        </div>
        <div className="bg-accent/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-accent">{todayStats.atividades}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Atividades</p>
        </div>
        <div className="bg-success/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-success">{todayStats.fotos}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Fotos</p>
        </div>
      </div>

      {/* Status de Validação */}
      {submissions.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          {submissions.map((sub) => {
            if (sub.status === "devolvido") {
              return (
                <div key={sub.id} className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                      ⚠️ AJUSTE NECESSÁRIO
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {sub.tipo === "chamada" ? `Chamada: ${sub.turmas?.nome}` : "Relatório Fotográfico"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 font-medium">
                    O supervisor solicitou correção.
                  </p>
                  {sub.justificativa && (
                    <div className="bg-background/80 text-muted-foreground p-2 rounded text-[11px] font-mono leading-relaxed">
                      <strong>Motivo:</strong> {sub.justificativa}
                    </div>
                  )}
                  {sub.status === "enviado" && (
                      <button className="mt-2 bg-primary text-white text-xs px-2 py-1 rounded" onClick={() => handleSend(sub.id)}>
                        Enviar para Validação
                      </button>
                    )}
                    {sub.status === "devolvido" && (
                      <button className="mt-2 bg-primary text-white text-xs px-2 py-1 rounded" onClick={() => handleSend(sub.id)}>
                        Reenviar
                      </button>
                    )}
                </div>
              );
            }
            if (sub.status === "aprovado") {
              return (
                <div key={sub.id} className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-success flex items-center gap-1.5">
                    ✅ APROVADO PELO SUPERVISOR
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {sub.tipo === "chamada" ? `Chamada: ${sub.turmas?.nome}` : "Relatório Foto"}
                  </span>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Card className="shadow-card hover:shadow-elevated transition-shadow active:scale-[0.98]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Turmas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Turmas do Núcleo</h3>
        <div className="space-y-2">
          {turmas.map((turma) => (
            <Card key={turma.id} className="shadow-card">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{turma.nome}</p>
                  <p className="text-xs text-muted-foreground">{turma.turno}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{turma.beneficiarios?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileHome;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Send } from "lucide-react";

const MobileAtividades = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_atividade: "",
    descricao: "",
    anotacoes: "",
    data_inicio: new Date().toISOString().split("T")[0],
    data_conclusao: "",
    turma_id: "",
    nucleo_id: "",
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [turmasRes, nucleosRes, atvRes] = await Promise.all([
      supabase.from("turmas").select("*").order("nome"),
      supabase.from("nucleos").select("*"),
      supabase.from("atividades").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setTurmas(turmasRes.data || []);
    setNucleos(nucleosRes.data || []);
    setAtividades(atvRes.data || []);
    if (nucleosRes.data?.[0]) {
      setForm((f) => ({ ...f, nucleo_id: nucleosRes.data![0].id }));
    }
  };

  const handleSubmit = async () => {
    if (!user || !form.nome_atividade || !form.nucleo_id) {
      toast.error("Preencha o nome da atividade");
      return;
    }
    setSaving(true);

    const now = new Date();
    const { error } = await supabase.from("atividades").insert({
      nome_atividade: form.nome_atividade,
      descricao: form.descricao || null,
      anotacoes: form.anotacoes || null,
      data_inicio: form.data_inicio,
      data_conclusao: form.data_conclusao || null,
      turma_id: form.turma_id || null,
      nucleo_id: form.nucleo_id,
      user_id: user.id,
      semana: Math.ceil(now.getDate() / 7),
      mes: now.getMonth() + 1,
      ano: now.getFullYear(),
    });

    if (error) {
      toast.error("Erro ao registrar atividade");
    } else {
      toast.success("Atividade enviada para aprovação!");
      setForm({
        nome_atividade: "", descricao: "", anotacoes: "",
        data_inicio: new Date().toISOString().split("T")[0],
        data_conclusao: "", turma_id: "", nucleo_id: form.nucleo_id,
      });
      setShowForm(false);
      loadData();
    }
    setSaving(false);
  };

  const statusStyles: Record<string, string> = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    aprovada: "bg-success/10 text-success border-success/20",
    correcao_solicitada: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const statusLabels: Record<string, string> = {
    pendente: "Pendente", aprovada: "Aprovada", correcao_solicitada: "Correção",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Atividades</h2>
          <p className="text-xs text-muted-foreground">Registre as atividades do dia</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-elevated border-primary/20 animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Nome da Atividade *</Label>
              <Input
                placeholder="Ex: Treino de passes"
                value={form.nome_atividade}
                onChange={(e) => setForm({ ...form, nome_atividade: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Turma (opcional)</Label>
              <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data Início</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Data Conclusão</Label>
                <Input type="date" value={form.data_conclusao} onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Descreva a atividade realizada..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Anotações Detalhadas</Label>
              <Textarea
                placeholder="Observações, resultados, evolução dos alunos..."
                value={form.anotacoes}
                onChange={(e) => setForm({ ...form, anotacoes: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              <Send className="w-4 h-4 mr-2" /> {saving ? "Enviando..." : "Enviar para Aprovação"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My activities */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Minhas Atividades</h3>
        {atividades.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {atividades.map((atv) => (
              <Card key={atv.id} className="shadow-card">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{atv.nome_atividade}</p>
                      <p className="text-xs text-muted-foreground">
                        {atv.data_inicio?.split("-").reverse().join("/")}
                      </p>
                    </div>
                    <Badge className={statusStyles[atv.status]} variant="outline">
                      {statusLabels[atv.status]}
                    </Badge>
                  </div>
                  {atv.feedback_coordenador && (
                    <p className="text-xs mt-2 bg-primary/5 p-2 rounded text-primary border border-primary/10">
                      <strong>Feedback:</strong> {atv.feedback_coordenador}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAtividades;

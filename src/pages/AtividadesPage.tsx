import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, UserCheck, GraduationCap, Eye, CheckCircle, XCircle, Filter } from "lucide-react";
import { generateAtividadesReport } from "@/utils/atividadesReportPDF";
import { Checkbox } from "@/components/ui/checkbox";

const AtividadesPage = () => {
  const { user } = useAuth();
  const [atividades, setAtividades] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"coordenador" | "professor" | "monitor" | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{ open: boolean; id: string; action: "aprovar" | "corrigir" | "" }>({
    open: false,
    id: "",
    action: "",
  });
  const [feedback, setFeedback] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCargo, setFilterCargo] = useState<string>("todos");
  const [filterDataInicio, setFilterDataInicio] = useState<string>("");
  const [filterDataFim, setFilterDataFim] = useState<string>("");

  const [form, setForm] = useState({
    nome_atividade: "", descricao: "", anotacoes: "",
    data_inicio: new Date().toISOString().split("T")[0],
    data_conclusao: "", turma_id: "", nucleo_id: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isCoordenador = currentUserRole === "coordenador";

  const cargoMap = useMemo<Record<string, string>>(() => ({
    coordenador: "Coordenador",
    professor: "Professor",
    monitor: "Monitor",
  }), []);

  const filteredAtividades = useMemo(() => {
    return atividades.filter((atv) => {
      if (filterStatus !== "todos" && atv.status !== filterStatus) return false;
      if (filterCargo !== "todos") {
        const cargo = (atv.profiles as any)?.cargo || "";
        if (!cargo.toLowerCase().includes(filterCargo.toLowerCase())) return false;
      }
      if (filterDataInicio && atv.data_inicio < filterDataInicio) return false;
      if (filterDataFim && atv.data_inicio > filterDataFim) return false;
      return true;
    });
  }, [atividades, filterStatus, filterCargo, filterDataInicio, filterDataFim]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("atividades-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "atividades" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [atvRes, tRes, nRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("atividades").select("*").order("created_at", { ascending: false }),
      supabase.from("turmas").select("*").order("nome"),
      supabase.from("nucleos").select("*"),
      supabase.from("profiles").select("user_id, nome, cargo"),
      user ? supabase.from("user_roles").select("role").eq("user_id", user.id) : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (atvRes.error || tRes.error || nRes.error || profilesRes.error || rolesRes.error) {
      toast.error("Erro ao carregar atividades");
      setLoading(false);
      return;
    }

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const atividadesComPerfil = (atvRes.data || []).map((atv: any) => ({
      ...atv,
      profiles: profilesMap.get(atv.user_id) || null,
    }));

    setAtividades(atividadesComPerfil);
    setTurmas(tRes.data || []);
    setNucleos(nRes.data || []);
    setCurrentUserRole((rolesRes.data?.[0]?.role as "coordenador" | "professor" | "monitor" | undefined) || null);
    if (nRes.data?.[0] && !form.nucleo_id) setForm((f) => ({ ...f, nucleo_id: nRes.data![0].id }));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !form.nome_atividade || !form.nucleo_id) {
      toast.error("Preencha o nome da atividade"); return;
    }
    setSaving(true);
    const now = new Date(`${form.data_inicio}T12:00:00`);
    const { error } = await supabase.from("atividades").insert({
      nome_atividade: form.nome_atividade,
      descricao: form.descricao || null,
      anotacoes: form.anotacoes || null,
      data_inicio: form.data_inicio,
      data_conclusao: form.data_conclusao || null,
      turma_id: form.turma_id || null,
      nucleo_id: form.nucleo_id,
      user_id: user.id,
      status: isCoordenador ? "aprovada" : "pendente",
      semana: Math.ceil(now.getDate() / 7),
      mes: now.getMonth() + 1,
      ano: now.getFullYear(),
    });
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Atividade registrada!");
      setShowForm(false);
      setForm({ nome_atividade: "", descricao: "", anotacoes: "", data_inicio: new Date().toISOString().split("T")[0], data_conclusao: "", turma_id: "", nucleo_id: form.nucleo_id });
      loadData();
    }
    setSaving(false);
  };

  const exportReportByRole = async (role: "coordenador" | "professor" | "monitor") => {
    try {
      // Use filter dates if set, otherwise default to current week
      let startStr = filterDataInicio;
      let endStr = filterDataFim;

      if (!startStr || !endStr) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        startStr = startStr || monday.toISOString().split("T")[0];
        endStr = endStr || sunday.toISOString().split("T")[0];
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("cargo", `%${cargoMap[role]}%`);

      if (!profiles || profiles.length === 0) {
        toast.error(`Nenhum perfil de ${cargoMap[role]} encontrado`);
        return;
      }

      const userIds = profiles.map((p) => p.user_id);

      const { data: roleAtividades } = await supabase
        .from("atividades")
        .select("*")
        .in("user_id", userIds)
        .eq("status", "aprovada")
        .gte("data_inicio", startStr)
        .lte("data_inicio", endStr)
        .order("data_inicio", { ascending: true });

      let activitiesToExport = roleAtividades || [];
      if (selectedIds.length > 0) {
        activitiesToExport = activitiesToExport.filter((atv) => selectedIds.includes(atv.id));
      }

      if (activitiesToExport.length === 0) {
        toast.error(`Nenhuma atividade aprovada selecionada de ${cargoMap[role]} no período ${startStr.split("-").reverse().join("/")} a ${endStr.split("-").reverse().join("/")}`);
        return;
      }

      // Get nucleo name
      const nucleoName = nucleos.length > 0 ? nucleos[0].nome?.toUpperCase() || "CIDADE DO POVO" : "CIDADE DO POVO";

      await generateAtividadesReport(role, activitiesToExport, nucleoName);
      setSelectedIds([]); // Clear selection after export
      toast.success(`Relatório do ${cargoMap[role]} gerado com sucesso!`);
    } catch (err: any) {
      console.error("Erro detalhado do relatório:", err);
      toast.error("Erro ao gerar relatório: " + err.message);
    }
  };

  const handleApprovalAction = async () => {
    if (!feedbackDialog.id || !feedbackDialog.action) return;

    setApprovingId(feedbackDialog.id);

    const status = feedbackDialog.action === "aprovar" ? "aprovada" : "correcao_solicitada";
    const { error } = await supabase
      .from("atividades")
      .update({ status, feedback_coordenador: feedback || null })
      .eq("id", feedbackDialog.id);

    if (error) {
      toast.error("Erro ao atualizar atividade");
    } else {
      toast.success(status === "aprovada" ? "Atividade aprovada!" : "Correção solicitada!");
      await loadData();
    }

    setApprovingId(null);
    setFeedback("");
    setFeedbackDialog({ open: false, id: "", action: "" });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground mt-1">Relatórios de atividades da equipe</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportReportByRole("coordenador")}>
            <Eye className="w-4 h-4 mr-1" /> Relatório Coordenador
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReportByRole("professor")}>
            <GraduationCap className="w-4 h-4 mr-1" /> Relatório Professor
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReportByRole("monitor")}>
            <UserCheck className="w-4 h-4 mr-1" /> Relatório Monitor
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nova Atividade
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filtros</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="correcao_solicitada">Correção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cargo</Label>
              <Select value={filterCargo} onValueChange={setFilterCargo}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Coordenador">Coordenador</SelectItem>
                  <SelectItem value="Professor">Professor</SelectItem>
                  <SelectItem value="Monitor">Monitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data Início</Label>
              <Input type="date" className="h-9" value={filterDataInicio} onChange={(e) => setFilterDataInicio(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data Fim</Label>
              <Input type="date" className="h-9" value={filterDataFim} onChange={(e) => setFilterDataFim(e.target.value)} />
            </div>
          </div>
          {(filterStatus !== "todos" || filterCargo !== "todos" || filterDataInicio || filterDataFim) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{filteredAtividades.length} resultado(s)</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("todos"); setFilterCargo("todos"); setFilterDataInicio(""); setFilterDataFim(""); }}>
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredAtividades.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma atividade registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {selectedIds.length > 0 && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center justify-between text-sm animate-fade-in">
              <span className="font-medium text-primary">
                {selectedIds.length} atividade(s) selecionada(s) para exportação.
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setSelectedIds([])}>
                Limpar seleção
              </Button>
            </div>
          )}
          {filteredAtividades.map((atv) => (
            <Card key={atv.id} className="shadow-card animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {atv.status === "aprovada" && (
                    <Checkbox
                      checked={selectedIds.includes(atv.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => [...prev, atv.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== atv.id));
                        }
                      }}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{atv.nome_atividade}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(atv.profiles as any)?.nome} • {(atv.profiles as any)?.cargo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {atv.data_inicio?.split("-").reverse().join("/")}
                          {atv.data_conclusao && ` → ${atv.data_conclusao?.split("-").reverse().join("/")}`}
                        </p>
                        {atv.anotacoes && (
                          <p className="text-sm mt-2 bg-muted/50 p-2 rounded text-foreground/80">{atv.anotacoes}</p>
                        )}
                        {atv.feedback_coordenador && (
                          <p className="text-sm mt-2 text-primary bg-primary/5 p-2 rounded border border-primary/10">
                            <strong>Feedback:</strong> {atv.feedback_coordenador}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={statusStyles[atv.status]} variant="outline">
                          {statusLabels[atv.status]}
                        </Badge>
                        {isCoordenador && atv.status === "pendente" && atv.user_id !== user?.id && (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              disabled={approvingId === atv.id}
                              onClick={() => setFeedbackDialog({ open: true, id: atv.id, action: "aprovar" })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={approvingId === atv.id}
                              onClick={() => setFeedbackDialog({ open: true, id: atv.id, action: "corrigir" })}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Corrigir
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Activity Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Atividade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome da Atividade *</Label><Input value={form.nome_atividade} onChange={(e) => setForm({ ...form, nome_atividade: e.target.value })} placeholder="Ex: Treino tático" /></div>
            <div>
              <Label className="text-xs">Turma</Label>
              <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label className="text-xs">Data Conclusão</Label><Input type="date" value={form.data_conclusao} onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label className="text-xs">Anotações</Label><Textarea rows={3} value={form.anotacoes} onChange={(e) => setForm({ ...form, anotacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackDialog.open} onOpenChange={(open) => setFeedbackDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{feedbackDialog.action === "aprovar" ? "Aprovar atividade" : "Solicitar correção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Feedback {feedbackDialog.action === "corrigir" ? "*" : "(opcional)"}</Label>
              <Textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={feedbackDialog.action === "aprovar" ? "Observação opcional..." : "Descreva o que precisa ser corrigido"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog({ open: false, id: "", action: "" })}>Cancelar</Button>
            <Button
              onClick={handleApprovalAction}
              disabled={approvingId !== null || (feedbackDialog.action === "corrigir" && !feedback.trim())}
            >
              {approvingId !== null ? "Salvando..." : feedbackDialog.action === "aprovar" ? "Confirmar aprovação" : "Enviar correção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtividadesPage;

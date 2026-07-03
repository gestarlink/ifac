import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardCheck, Camera, CheckCircle, XCircle, Clock, Eye, AlertCircle, Filter } from "lucide-react";

interface EnvioDoc {
  id: string;
  tipo: "chamada" | "relatorio_fotografico";
  nucleo_id: string;
  turma_id: string | null;
  mes: number;
  ano: number;
  status: "enviado" | "em_analise" | "aprovado" | "devolvido" | "reenviado";
  enviado_por: string;
  revisado_por: string | null;
  justificativa: string | null;
  created_at: string;
  updated_at: string;
  nucleos: { nome: string } | null;
  turmas: { nome: string } | null;
  enviado_nome?: string;
  revisado_nome?: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const ValidacoesPage = () => {
  const { user } = useAuth();
  const [envios, setEnvios] = useState<EnvioDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnvio, setSelectedEnvio] = useState<EnvioDoc | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  useEffect(() => {
    loadEnvios();
  }, []);

  const loadEnvios = async () => {
    setLoading(true);
    try {
      const { data: enviosData, error } = await supabase
        .from("envios_documentos")
        .select("*, nucleos(nome), turmas(nome)")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles to map names
      const { data: profiles } = await supabase.from("profiles").select("user_id, nome");
      const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p.nome]));

      const mapped: EnvioDoc[] = (enviosData || []).map((env) => ({
        ...env,
        enviado_nome: profilesMap.get(env.enviado_por) || "Funcionário",
        revisado_nome: env.revisado_por ? profilesMap.get(env.revisado_por) || "Supervisor" : undefined
      }));

      setEnvios(mapped);
    } catch (err: any) {
      toast.error("Erro ao carregar validações: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistorico = async (envioId: string) => {
    setHistoricoLoading(true);
    try {
      const { data, error } = await supabase
        .from("envios_historico")
        .select("*")
        .eq("envio_id", envioId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("user_id, nome");
      const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p.nome]));

      const mapped = (data || []).map((hist) => ({
        ...hist,
        realizado_por_nome: profilesMap.get(hist.realizado_por) || "Usuário"
      }));

      setHistorico(mapped);
    } catch (err: any) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setHistoricoLoading(false);
    }
  };

  const handleOpenReview = async (envio: EnvioDoc) => {
    setSelectedEnvio(envio);
    setJustificativa("");
    setReviewDialogOpen(true);
    loadHistorico(envio.id);

    // If status is 'enviado' or 'reenviado', mark as 'em_analise' automatically
    if (envio.status === "enviado" || envio.status === "reenviado") {
      try {
        const { error } = await supabase
          .from("envios_documentos")
          .update({ status: "em_analise", revisado_por: user?.id })
          .eq("id", envio.id);

        if (!error) {
          // Log in history
          await supabase.from("envios_historico").insert({
            envio_id: envio.id,
            acao: "em_analise",
            realizado_por: user?.id
          });
          loadEnvios();
        }
      } catch (err) {
        console.error("Erro ao alterar para em análise:", err);
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedEnvio || !user) return;

    try {
      const { error } = await supabase
        .from("envios_documentos")
        .update({
          status: "aprovado",
          revisado_por: user.id,
          justificativa: justificativa.trim() || null
        })
        .eq("id", selectedEnvio.id);

      if (error) throw error;

      await supabase.from("envios_historico").insert({
        envio_id: selectedEnvio.id,
        acao: "aprovado",
        realizado_por: user.id,
        justificativa: justificativa.trim() || null
      });

      toast.success("Documento aprovado com sucesso!");
      setReviewDialogOpen(false);
      loadEnvios();
    } catch (err: any) {
      toast.error("Erro ao aprovar: " + err.message);
    }
  };

  const handleReturn = async () => {
    if (!selectedEnvio || !user) return;
    if (!justificativa.trim()) {
      toast.error("Informe a justificativa/motivo para devolução");
      return;
    }

    try {
      const { error } = await supabase
        .from("envios_documentos")
        .update({
          status: "devolvido",
          revisado_por: user.id,
          justificativa: justificativa.trim()
        })
        .eq("id", selectedEnvio.id);

      if (error) throw error;

      await supabase.from("envios_historico").insert({
        envio_id: selectedEnvio.id,
        acao: "devolvido",
        realizado_por: user.id,
        justificativa: justificativa.trim()
      });

      toast.success("Documento devolvido para correção");
      setReviewDialogOpen(false);
      loadEnvios();
    } catch (err: any) {
      toast.error("Erro ao devolver: " + err.message);
    }
  };

  const filteredEnvios = envios.filter((env) => {
    if (filterStatus !== "todos" && env.status !== filterStatus) return false;
    if (filterTipo !== "todos" && env.tipo !== filterTipo) return false;
    return true;
  });

  const statusStyles: Record<string, string> = {
    enviado: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    em_analise: "bg-warning/10 text-warning border-warning/20",
    aprovado: "bg-success/10 text-success border-success/20",
    devolvido: "bg-destructive/10 text-destructive border-destructive/20",
    reenviado: "bg-purple-500/10 text-purple-500 border-purple-500/20"
  };

  const statusLabels: Record<string, string> = {
    enviado: "Enviado",
    em_analise: "Em Análise",
    aprovado: "Aprovado",
    devolvido: "Pendente Correção",
    reenviado: "Reenviado"
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Validações</h1>
        <p className="text-sm text-muted-foreground mt-1">Valide as chamadas e relatórios fotográficos dos núcleos</p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4 flex gap-4 items-end flex-wrap">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Tipo
            </label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="chamada">📋 Chamada</SelectItem>
                <SelectItem value="relatorio_fotografico">📷 Relatório Foto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Status
            </label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="devolvido">Pendente Correção</SelectItem>
                <SelectItem value="reenviado">Reenviado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filterStatus !== "todos" || filterTipo !== "todos") && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setFilterStatus("todos"); setFilterTipo("todos"); }}>
              Limpar Filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Validations list */}
      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Núcleo</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Modificado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filteredEnvios.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma submissão pendente</TableCell></TableRow>
              ) : (
                filteredEnvios.map((env) => (
                  <TableRow key={env.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        {env.tipo === "chamada" ? (
                          <ClipboardCheck className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Camera className="w-4 h-4 text-purple-500" />
                        )}
                        {env.tipo === "chamada" ? "Chamada Mensal" : "Relatório Fotográfico"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{env.nucleos?.nome || "Cidade do Povo"}</TableCell>
                    <TableCell className="text-muted-foreground">{env.turmas?.nome || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{MESES[env.mes - 1]} / {env.ano}</TableCell>
                    <TableCell className="text-sm">{env.enviado_nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(env.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[env.status]} variant="outline">
                        {statusLabels[env.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => handleOpenReview(env)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-5 pb-2 border-b">
            <DialogTitle>Revisar Documentação</DialogTitle>
          </DialogHeader>

          {selectedEnvio && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Submission details */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-xl border">
                <div>
                  <p className="text-xs text-muted-foreground">Documento</p>
                  <p className="font-semibold text-foreground">
                    {selectedEnvio.tipo === "chamada" ? "Chamada Mensal" : "Relatório Fotográfico"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Núcleo</p>
                  <p className="font-semibold text-foreground">{selectedEnvio.nucleos?.nome}</p>
                </div>
                {selectedEnvio.turma_id && (
                  <div>
                    <p className="text-xs text-muted-foreground">Turma</p>
                    <p className="font-semibold text-foreground">{selectedEnvio.turmas?.nome}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Período de Referência</p>
                  <p className="font-semibold text-foreground">
                    {MESES[selectedEnvio.mes - 1]} / {selectedEnvio.ano}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enviado por</p>
                  <p className="text-foreground">{selectedEnvio.enviado_nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Submissão</p>
                  <p className="text-foreground">
                    {new Date(selectedEnvio.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Action Justification Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Justificativa / Comentário de Revisão
                </label>
                <Textarea
                  placeholder="Escreva comentários adicionais ou o motivo de solicitar a correção..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={4}
                />
              </div>

              {/* History list */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Histórico de Validação
                </h4>
                {historicoLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando histórico...</p>
                ) : historico.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum histórico registrado</p>
                ) : (
                  <div className="relative border-l border-border pl-4 space-y-4">
                    {historico.map((hist) => (
                      <div key={hist.id} className="relative">
                        <div className="absolute -left-[21px] mt-1.5 w-2.5 h-2.5 rounded-full bg-border border-2 border-background" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Badge variant="outline" className={statusStyles[hist.acao]}>
                              {statusLabels[hist.acao]}
                            </Badge>
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(hist.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-1 font-medium">Por: {hist.realizado_por_nome}</p>
                        {hist.justificativa && (
                          <div className="mt-1 bg-muted p-2 rounded text-xs text-muted-foreground font-mono">
                            {hist.justificativa}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Fechar
            </Button>
            <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleReturn}>
              <XCircle className="w-4 h-4 mr-1" /> Devolver para Correção
            </Button>
            <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={handleApprove}>
              <CheckCircle className="w-4 h-4 mr-1" /> Aprovar e Validar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ValidacoesPage;

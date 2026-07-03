import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Download, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import ReportPreviewDialog from "@/components/ReportPreviewDialog";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const rotateImage = (imageUrl: string, degrees: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      if (degrees % 180 !== 0) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob null")), "image/jpeg", 0.95);
    };
    img.onerror = (e) => reject(e);
    img.src = imageUrl.includes("?") ? `${imageUrl}&t=${Date.now()}` : `${imageUrl}?t=${Date.now()}`;
  });
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const FotosPage = () => {
  const { user } = useAuth();
  const [fotos, setFotos] = useState<any[]>([]);
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState(String(new Date().getMonth()));
  const [editDialog, setEditDialog] = useState<{ open: boolean; foto: any }>({ open: false, foto: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [editDescricao, setEditDescricao] = useState("");
  const [editData, setEditData] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [nucleoId, setNucleoId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedMonthNum = parseInt(mesSelecionado) + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    supabase.from("nucleos").select("id").limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        setNucleoId(data[0].id);
      }
    });
  }, []);

  const loadSubmissionStatus = async () => {
    if (!nucleoId) return;
    const { data, error } = await supabase
      .from("envios_documentos")
      .select("*")
      .eq("tipo", "relatorio_fotografico")
      .eq("nucleo_id", nucleoId)
      .is("turma_id", null)
      .eq("mes", selectedMonthNum)
      .eq("ano", currentYear)
      .maybeSingle();

    if (!error) {
      setSubmission(data);
    }
  };

  useEffect(() => {
    loadSubmissionStatus();
  }, [nucleoId, mesSelecionado]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("fotos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fotos" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    const [fotosRes, relatoriosRes] = await Promise.all([
      supabase.from("fotos").select("*, turmas(nome, modalidade, turno)").order("created_at", { ascending: false }).limit(100),
      supabase.from("relatorios_fotograficos").select("*").order("created_at", { ascending: false }),
    ]);
    setFotos(fotosRes.data || []);
    setRelatorios(relatoriosRes.data || []);
    setLoading(false);
  };

  const fotosFiltradas = fotos.filter((f) => {
    const d = new Date(f.data);
    return d.getMonth() === parseInt(mesSelecionado);
  });

  const handleEdit = (foto: any) => {
    setEditDescricao(foto.descricao || "");
    setEditData(foto.data || "");
    setRotation(0);
    setSelectedFile(null);
    setPreviewUrl(foto.url);
    setEditDialog({ open: true, foto });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.foto) return;
    setSavingEdit(true);
    try {
      let finalUrl = editDialog.foto.url;

      if (selectedFile || rotation !== 0) {
        let uploadBlob: Blob | File | null = selectedFile;
        let filename = selectedFile ? selectedFile.name : `rotated-${Date.now()}.jpg`;

        if (rotation !== 0) {
          const imageToRotate = previewUrl || editDialog.foto.url;
          uploadBlob = await rotateImage(imageToRotate, rotation);
        }

        if (uploadBlob) {
          const ext = filename.split(".").pop() || "jpg";
          const path = `relatorios/${user?.id}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("fotos")
            .upload(path, uploadBlob, { contentType: "image/jpeg" });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path);
          finalUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase
        .from("fotos")
        .update({
          descricao: editDescricao,
          data: editData,
          url: finalUrl
        })
        .eq("id", editDialog.foto.id);

      if (error) throw error;

      toast.success("Foto atualizada com sucesso!");
      loadData();
      setEditDialog({ open: false, foto: null });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar foto: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmitValidation = async () => {
    if (!nucleoId || !user) return;
    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("envios_documentos")
        .select("id, status")
        .eq("tipo", "relatorio_fotografico")
        .eq("nucleo_id", nucleoId)
        .is("turma_id", null)
        .eq("mes", selectedMonthNum)
        .eq("ano", currentYear)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("envios_documentos")
          .update({
            status: "reenviado",
            enviado_por: user.id,
            revisado_por: null,
            justificativa: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;

        await supabase.from("envios_historico").insert({
          envio_id: existing.id,
          acao: "reenviado",
          realizado_por: user.id
        });

        toast.success("Relatório fotográfico reenviado com sucesso!");
      } else {
        const { data: inserted, error } = await supabase
          .from("envios_documentos")
          .insert({
            tipo: "relatorio_fotografico",
            nucleo_id: nucleoId,
            turma_id: null,
            mes: selectedMonthNum,
            ano: currentYear,
            status: "enviado",
            enviado_por: user.id
          })
          .select()
          .single();

        if (error) throw error;

        await supabase.from("envios_historico").insert({
          envio_id: inserted.id,
          acao: "enviado",
          realizado_por: user.id
        });

        toast.success("Relatório fotográfico enviado para validação!");
      }
      loadSubmissionStatus();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("fotos").delete().eq("id", deleteDialog.id);
    if (error) {
      toast.error("Erro ao remover foto");
    } else {
      toast.success("Foto removida!");
      loadData();
    }
    setDeleteDialog({ open: false, id: "" });
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-photo-report", {
        body: { mes: parseInt(mesSelecionado), ano: currentYear }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message);
        loadData();
      } else {
        toast.info(data?.message || "Nenhuma foto disponível");
      }
    } catch (err: any) {
      toast.error("Erro ao gerar relatório: " + (err.message || "erro desconhecido"));
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Relatório Fotográfico</h1>
          <p className="text-sm text-muted-foreground mt-1">Fotos enviadas pela equipe de campo — relatório gerado automaticamente no dia 24</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={generating || fotos.length === 0}>
            <Eye className="w-4 h-4 mr-1" />
            Prévia do Relatório
          </Button>
        </div>
      </div>

      {nucleoId && (
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Status do Relatório Fotográfico</h3>
                <p className="text-xs text-muted-foreground">
                  Referente a {MESES[parseInt(mesSelecionado)]} / {currentYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {submission ? (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold",
                      submission.status === "enviado" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                      submission.status === "em_analise" && "bg-warning/10 text-warning border-warning/20",
                      submission.status === "aprovado" && "bg-success/10 text-success border-success/20",
                      submission.status === "devolvido" && "bg-destructive/10 text-destructive border-destructive/20",
                      submission.status === "reenviado" && "bg-purple-500/10 text-purple-500 border-purple-500/20"
                    )}
                  >
                    {submission.status === "enviado" && "Aguardando Análise"}
                    {submission.status === "em_analise" && "Em Análise"}
                    {submission.status === "aprovado" && "Aprovado e Validado"}
                    {submission.status === "devolvido" && "Pendente Correção"}
                    {submission.status === "reenviado" && "Reenviado"}
                  </Badge>

                  {submission.status === "devolvido" && submission.justificativa && (
                    <div className="bg-destructive/5 text-destructive border border-destructive/10 rounded-lg p-2 text-xs font-mono max-w-md">
                      <strong>Motivo da devolução:</strong> {submission.justificativa}
                    </div>
                  )}

                  {(submission.status === "devolvido" || submission.status === "aprovado") && (
                    <Button size="sm" onClick={handleSubmitValidation} disabled={submitting}>
                      {submission.status === "devolvido" ? "Reenviar para Validação" : "Reenviar Relatório"}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    Não Enviado
                  </Badge>
                  <Button size="sm" onClick={handleSubmitValidation} disabled={submitting}>
                    Enviar para Validação
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Reports */}
      {relatorios.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Relatórios Gerados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relatorios.map((r) => (
              <Card key={r.id} className="shadow-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{MESES[(r.mes - 1)] || ""} {r.ano}</p>
                    <p className="text-xs text-muted-foreground">{r.total_fotos} fotos • {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1" /> Baixar
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{fotosFiltradas.length} fotos em {MESES[parseInt(mesSelecionado)]}</p>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : fotosFiltradas.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma foto para este mês</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fotosFiltradas.map((foto) => (
            <Card key={foto.id} className="shadow-card overflow-hidden animate-fade-in">
              <div className="aspect-video bg-muted">
                <img src={foto.url} alt={foto.descricao || "Foto"} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary">{foto.turmas?.nome || "Geral"}</Badge>
                    {foto.turmas?.turno && <Badge variant="outline" className="text-xs">{foto.turmas.turno}</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(foto.data).toLocaleDateString("pt-BR")}</span>
                </div>
                {foto.descricao && <p className="text-sm text-foreground mt-2">{foto.descricao}</p>}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(foto)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, id: foto.id })}>
                    <Trash2 className="w-3 h-3 mr-1" /> Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => {
        if (!o) {
          setSelectedFile(null);
          setPreviewUrl(null);
          setRotation(0);
        }
        setEditDialog({ ...editDialog, open: o });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    Girar 90°
                  </Button>
                  <label className="flex-1">
                    <span className="btn btn-sm btn-outline w-full text-center block border rounded-lg py-1.5 text-sm cursor-pointer hover:bg-muted font-medium">
                      Substituir Imagem
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          setSelectedFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                          setRotation(0);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} placeholder="Descrição da foto..." />
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, foto: null })}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ ...deleteDialog, open: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Preview */}
      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fotos={fotos}
        onConfirm={() => {
          setPreviewOpen(false);
          handleGenerateReport();
        }}
        generating={generating}
      />
    </div>
  );
};

export default FotosPage;

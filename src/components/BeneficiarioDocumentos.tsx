import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image, Trash2, Camera, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  beneficiarioId: string;
  beneficiarioNome: string;
  open: boolean;
  onClose: () => void;
}

const BeneficiarioDocumentos = ({ beneficiarioId, beneficiarioNome, open, onClose }: Props) => {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && beneficiarioId) loadDocumentos();
  }, [open, beneficiarioId]);

  const loadDocumentos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documentos_beneficiarios")
      .select("*")
      .eq("beneficiario_id", beneficiarioId)
      .order("created_at", { ascending: false });
    setDocumentos(data || []);
    setLoading(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); setUploading(false); return; }

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${beneficiarioId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(path, file);

      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);

      const tipo = file.type.startsWith("image/") ? "imagem" : ext === "pdf" ? "pdf" : "documento";

      const { error: dbError } = await supabase.from("documentos_beneficiarios").insert({
        beneficiario_id: beneficiarioId,
        nome_arquivo: file.name,
        tipo,
        url: urlData.publicUrl,
        uploaded_by: user.id,
      });

      if (dbError) {
        toast.error(`Erro ao registrar ${file.name}`);
      }
    }

    toast.success("Documento(s) enviado(s)!");
    loadDocumentos();
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const doc = documentos.find((d) => d.id === deleteId);
    if (doc) {
      // Extract path from URL
      const urlParts = doc.url.split("/documentos/");
      if (urlParts[1]) {
        await supabase.storage.from("documentos").remove([decodeURIComponent(urlParts[1])]);
      }
    }
    const { error } = await supabase.from("documentos_beneficiarios").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao remover");
    else { toast.success("Documento removido!"); loadDocumentos(); }
    setDeleteId(null);
  };

  const getIcon = (tipo: string) => {
    if (tipo === "imagem") return <Image className="w-4 h-4 text-primary" />;
    return <FileText className="w-4 h-4 text-primary" />;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display">Documentos</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{beneficiarioNome}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          <div className="flex gap-2 mt-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-1" /> {uploading ? "Enviando..." : "Enviar Arquivo"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
              <Camera className="w-4 h-4 mr-1" /> Tirar Foto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2 pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento cadastrado</p>
          ) : (
            documentos.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                {getIcon(doc.tipo)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.nome_arquivo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">{doc.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(doc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BeneficiarioDocumentos;

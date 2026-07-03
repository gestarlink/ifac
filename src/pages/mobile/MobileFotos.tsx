import { useEffect, useState, useRef } from "react";
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
import { Camera, Upload, Image, X } from "lucide-react";

const MobileFotos = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({ descricao: "", turma_id: "", nucleo_id: "" });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [turmasRes, nucleosRes, fotosRes] = await Promise.all([
      supabase.from("turmas").select("*").order("nome"),
      supabase.from("nucleos").select("*"),
      supabase.from("fotos").select("*, turmas(nome)").eq("uploaded_by", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setTurmas(turmasRes.data || []);
    setNucleos(nucleosRes.data || []);
    setFotos(fotosRes.data || []);
    if (nucleosRes.data?.[0]) setForm((f) => ({ ...f, nucleo_id: nucleosRes.data![0].id }));
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !form.nucleo_id) {
      toast.error("Selecione uma foto primeiro");
      return;
    }
    if (!form.turma_id) {
      toast.error("Selecione a turma");
      return;
    }
    setUploading(true);

    const ext = selectedFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("fotos").upload(path, selectedFile);
    if (uploadError) {
      toast.error("Erro no upload: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path);

    const { error } = await supabase.from("fotos").insert({
      url: urlData.publicUrl,
      nucleo_id: form.nucleo_id,
      turma_id: form.turma_id || null,
      descricao: form.descricao || null,
      uploaded_by: user.id,
    });

    if (error) {
      toast.error("Erro ao salvar foto");
    } else {
      toast.success("Foto enviada com sucesso!");
      setPreview(null);
      setSelectedFile(null);
      setForm({ ...form, descricao: "", turma_id: "" });
      loadData();
    }
    setUploading(false);
  };

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Fotos</h2>
        <p className="text-xs text-muted-foreground">Envie fotos das atividades</p>
      </div>

      {/* Upload area */}
      <Card className="shadow-card border-dashed border-2 border-primary/20">
        <CardContent className="p-4">
          {preview ? (
            <div className="space-y-3">
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full rounded-lg max-h-48 object-cover" />
                <button onClick={clearPreview} className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Turma</Label>
                <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  placeholder="Descreva a foto..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                <Upload className="w-4 h-4 mr-2" /> {uploading ? "Enviando..." : "Enviar Foto"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Camera className="w-10 h-10 mx-auto text-primary/40 mb-3" />
              <div className="flex gap-3 justify-center">
                <Button size="sm" variant="outline" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> Câmera
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Image className="w-4 h-4 mr-1" /> Galeria
                </Button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent photos */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Fotos Recentes</h3>
        {fotos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma foto enviada</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((foto) => (
              <Card key={foto.id} className="shadow-card overflow-hidden">
                <div className="aspect-square bg-muted">
                  <img src={foto.url} alt={foto.descricao || "Foto"} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-2">
                  <Badge variant="secondary" className="text-[10px]">{foto.turmas?.nome || "Geral"}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(foto.data).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileFotos;

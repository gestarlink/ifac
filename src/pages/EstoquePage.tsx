import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle, ArrowDown, ArrowUp, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EstoquePage = () => {
  const { user } = useAuth();
  const [estoque, setEstoque] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [newDialog, setNewDialog] = useState(false);
  const [editForm, setEditForm] = useState({ item: "", quantidade: 0, unidade: "un", estoque_minimo: 5, foto_url: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    loadEstoque();
  }, []);

  const loadEstoque = async () => {
    const [estoqueRes, movRes, nucRes] = await Promise.all([
      supabase.from("estoque").select("*").order("item"),
      supabase.from("movimentacoes_estoque").select("*, estoque(item)").order("created_at", { ascending: false }).limit(20),
      supabase.from("nucleos").select("*"),
    ]);
    setEstoque(estoqueRes.data || []);
    setMovimentacoes(movRes.data || []);
    setNucleos(nucRes.data || []);
    setLoading(false);
  };

  const handleNewItem = async () => {
    if (!editForm.item) { toast.error("Informe o nome do item"); return; }
    const nucleo_id = nucleos[0]?.id;
    if (!nucleo_id) { toast.error("Nenhum núcleo encontrado"); return; }
    setLoading(true);

    let fotoUrl = editForm.foto_url;
    if (selectedFile) {
      setUploading(true);
      const ext = selectedFile.name.split(".").pop();
      const path = `estoque/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("fotos").upload(path, selectedFile);
      if (uploadError) {
        toast.error("Erro ao subir imagem: " + uploadError.message);
        setUploading(false);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path);
      fotoUrl = urlData.publicUrl;
      setUploading(false);
    }

    const { error } = await supabase.from("estoque").insert({
      item: editForm.item,
      quantidade: editForm.quantidade,
      unidade: editForm.unidade || "un",
      estoque_minimo: editForm.estoque_minimo,
      nucleo_id,
      foto_url: fotoUrl || null,
    });
    if (error) { toast.error("Erro ao cadastrar: " + error.message); }
    else { toast.success("Item cadastrado!"); loadEstoque(); }
    setNewDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditForm({ item: "", quantidade: 0, unidade: "un", estoque_minimo: 5, foto_url: "" });
    setLoading(false);
  };

  const handleEdit = (item: any) => {
    setEditForm({
      item: item.item,
      quantidade: item.quantidade,
      unidade: item.unidade || "",
      estoque_minimo: item.estoque_minimo || 5,
      foto_url: item.foto_url || "",
    });
    setPreviewUrl(item.foto_url || null);
    setEditDialog({ open: true, item });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.item) return;
    setLoading(true);

    let fotoUrl = editForm.foto_url;
    if (selectedFile) {
      setUploading(true);
      const ext = selectedFile.name.split(".").pop();
      const path = `estoque/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("fotos").upload(path, selectedFile);
      if (uploadError) {
        toast.error("Erro ao subir imagem: " + uploadError.message);
        setUploading(false);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path);
      fotoUrl = urlData.publicUrl;
      setUploading(false);
    }

    const { error } = await supabase
      .from("estoque")
      .update({
        item: editForm.item,
        quantidade: editForm.quantidade,
        unidade: editForm.unidade,
        estoque_minimo: editForm.estoque_minimo,
        foto_url: fotoUrl || null,
      })
      .eq("id", editDialog.item.id);
    if (error) {
      toast.error("Erro ao atualizar item");
    } else {
      toast.success("Item atualizado!");
      loadEstoque();
    }
    setEditDialog({ open: false, item: null });
    setSelectedFile(null);
    setPreviewUrl(null);
    setLoading(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("estoque").delete().eq("id", deleteDialog.id);
    if (error) {
      toast.error("Erro ao remover item");
    } else {
      toast.success("Item removido!");
      loadEstoque();
    }
    setDeleteDialog({ open: false, id: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Controle de Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">Materiais e equipamentos do núcleo</p>
        </div>
        <Button size="sm" onClick={() => { setEditForm({ item: "", quantidade: 0, unidade: "un", estoque_minimo: 5 }); setNewDialog(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo Item
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Itens em Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Foto</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : estoque.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum item cadastrado</TableCell></TableRow>
                  ) : (
                    estoque.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.foto_url ? (
                            <img
                              src={item.foto_url}
                              alt={item.item}
                              className="w-10 h-10 object-cover rounded-full border cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setZoomImage(item.foto_url)}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full border bg-muted flex items-center justify-center text-muted-foreground">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.item}</TableCell>
                        <TableCell className="font-mono">{item.quantidade}</TableCell>
                        <TableCell className="text-muted-foreground">{item.unidade}</TableCell>
                        <TableCell>
                          {item.quantidade <= (item.estoque_minimo || 5) ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Baixo
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/20" variant="outline">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, id: item.id })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {movimentacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação</p>
            ) : (
              <div className="space-y-3">
                {movimentacoes.map((mov) => (
                  <div key={mov.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {mov.tipo === "entrada" ? (
                      <ArrowDown className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{(mov.estoque as any)?.item}</p>
                      <p className="text-xs text-muted-foreground">
                        {mov.tipo === "entrada" ? "+" : "-"}{mov.quantidade} — {new Date(mov.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => {
        if (!o) {
          setSelectedFile(null);
          setPreviewUrl(null);
        }
        setEditDialog({ ...editDialog, open: o });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Item</label>
              <Input value={editForm.item} onChange={(e) => setEditForm({ ...editForm, item: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input type="number" value={editForm.quantidade} onChange={(e) => setEditForm({ ...editForm, quantidade: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <Input value={editForm.unidade} onChange={(e) => setEditForm({ ...editForm, unidade: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Estoque Mínimo</label>
              <Input type="number" value={editForm.estoque_minimo} onChange={(e) => setEditForm({ ...editForm, estoque_minimo: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">Foto do Item</label>
              <div className="mt-2 flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setEditForm(prev => ({ ...prev, foto_url: "" }));
                      }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5 rounded-full"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="max-w-[200px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={uploading}>
              {uploading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Item Dialog */}
      <Dialog open={newDialog} onOpenChange={(o) => {
        if (!o) {
          setSelectedFile(null);
          setPreviewUrl(null);
        }
        setNewDialog(o);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Item *</label>
              <Input value={editForm.item} onChange={(e) => setEditForm({ ...editForm, item: e.target.value })} placeholder="Ex: Cones, Bolas..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input type="number" value={editForm.quantidade} onChange={(e) => setEditForm({ ...editForm, quantidade: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <Input value={editForm.unidade} onChange={(e) => setEditForm({ ...editForm, unidade: e.target.value })} placeholder="un" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Estoque Mínimo</label>
              <Input type="number" value={editForm.estoque_minimo} onChange={(e) => setEditForm({ ...editForm, estoque_minimo: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">Foto do Item</label>
              <div className="mt-2 flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setEditForm(prev => ({ ...prev, foto_url: "" }));
                      }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5 rounded-full"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="max-w-[200px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleNewItem} disabled={uploading}>
              {uploading ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zoom Image Dialog */}
      <Dialog open={!!zoomImage} onOpenChange={(o) => !o && setZoomImage(null)}>
        <DialogContent className="max-w-md p-1 overflow-hidden bg-transparent border-none">
          {zoomImage && (
            <img src={zoomImage} alt="Visualização" className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl mx-auto" />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ ...deleteDialog, open: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do estoque?</AlertDialogTitle>
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

export default EstoquePage;

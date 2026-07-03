import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Package, AlertTriangle } from "lucide-react";

const MobileMaterial = () => {
  const { user } = useAuth();
  const [estoque, setEstoque] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [estoqueRes, movRes] = await Promise.all([
      supabase.from("estoque").select("*").order("item"),
      supabase.from("movimentacoes_estoque").select("*, estoque(item)").order("created_at", { ascending: false }).limit(10),
    ]);
    setEstoque(estoqueRes.data || []);
    setMovimentacoes(movRes.data || []);
  };

  const handleRegistrar = async () => {
    if (!user || !selectedItem || !quantidade) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);

    const qtd = parseInt(quantidade);
    const { error } = await supabase.from("movimentacoes_estoque").insert({
      estoque_id: selectedItem,
      tipo,
      quantidade: qtd,
      observacao: observacao || null,
      registrado_por: user.id,
    });

    if (error) {
      toast.error("Erro ao registrar movimentação");
    } else {
      // Update stock quantity
      const item = estoque.find((e) => e.id === selectedItem);
      if (item) {
        const novaQtd = tipo === "entrada" ? item.quantidade + qtd : Math.max(0, item.quantidade - qtd);
        await supabase.from("estoque").update({ quantidade: novaQtd }).eq("id", selectedItem);
      }
      toast.success("Movimentação registrada!");
      setSelectedItem("");
      setQuantidade("");
      setObservacao("");
      loadData();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Controle de Material</h2>
        <p className="text-xs text-muted-foreground">Registre entrada e saída de materiais</p>
      </div>

      {/* Registration form */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Item</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
              <SelectContent>
                {estoque.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item} (Qtd: {item.quantidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              (() => {
                const item = estoque.find((e) => e.id === selectedItem);
                if (item?.foto_url) {
                  return (
                    <div className="mt-2 flex items-center gap-2 animate-fade-in">
                      <img src={item.foto_url} alt={item.item} className="w-10 h-10 object-cover rounded border" />
                      <span className="text-xs text-muted-foreground">Item selecionado</span>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "entrada" | "saida")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">⬇️ Entrada</SelectItem>
                  <SelectItem value="saida">⬆️ Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantidade</Label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Observação</Label>
            <Textarea
              placeholder="Motivo da movimentação..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={handleRegistrar} disabled={saving} className="w-full">
            {saving ? "Registrando..." : "Registrar Movimentação"}
          </Button>
        </CardContent>
      </Card>

      {/* Stock overview */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Estoque Atual</h3>
        <div className="space-y-1.5">
          {estoque.map((item) => (
            <Card key={item.id} className="shadow-card">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {item.foto_url ? (
                    <img src={item.foto_url} alt={item.item} className="w-12 h-12 object-cover rounded-lg border flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.item}</p>
                    <p className="text-xs text-muted-foreground">{item.quantidade} {item.unidade}</p>
                  </div>
                </div>
                {item.quantidade <= (item.estoque_minimo || 5) ? (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 flex-shrink-0" variant="outline">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Baixo
                  </Badge>
                ) : (
                  <Badge className="bg-success/10 text-success border-success/20 flex-shrink-0" variant="outline">OK</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent movements */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Últimas Movimentações</h3>
        {movimentacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação</p>
        ) : (
          <div className="space-y-1.5">
            {movimentacoes.map((mov) => (
              <Card key={mov.id} className="shadow-card">
                <CardContent className="p-3 flex items-center gap-3">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMaterial;

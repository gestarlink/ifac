import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import logoFac from "@/assets/logo-fac.png";
import logoMinisterio from "@/assets/logo-ministerio-esporte.png";
import logoGoverno from "@/assets/logo-governo-federal.png";

const TURMA_HORARIOS: Record<string, string> = {
  "MANHÃ": "09:00 ás 10:00",
  "TARDE": "14:00 ás 15:00",
  "INTEGRAL": "09:00 ás 15:00",
};

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fotos: any[];
  onConfirm: () => void;
  generating: boolean;
}

const ReportPreviewDialog = ({ open, onOpenChange, fotos, onConfirm, generating }: ReportPreviewDialogProps) => {
  // Group photos by modalidade|turno (same logic as edge function)
  const groups: Record<string, any[]> = {};
  for (const foto of fotos) {
    const modalidade = foto.turmas?.modalidade || "GERAL";
    const turno = foto.turmas?.turno || "INTEGRAL";
    const key = `${modalidade}|${turno}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(foto);
  }

  // Select up to 6 per group
  const selectedByGroup: Record<string, any[]> = {};
  let totalSelected = 0;
  for (const [key, groupFotos] of Object.entries(groups)) {
    selectedByGroup[key] = groupFotos.slice(0, 6);
    totalSelected += selectedByGroup[key].length;
  }

  const groupEntries = Object.entries(selectedByGroup);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Prévia do Relatório Fotográfico
            </span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {groupEntries.length} página(s) • {totalSelected} foto(s) selecionadas
          </p>
        </DialogHeader>

        <div className="flex-1 px-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="space-y-6 py-4">
            {groupEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma foto disponível para gerar o relatório.
              </div>
            ) : (
              groupEntries.map(([key, groupFotos], pageIdx) => {
                const [modalidade, turno] = key.split("|");
                const horario = TURMA_HORARIOS[turno] || TURMA_HORARIOS["INTEGRAL"];

                return (
                  <div
                    key={key}
                    className="border rounded-lg bg-white shadow-sm overflow-hidden"
                    style={{ aspectRatio: "595 / 842" }}
                  >
                    {/* Simulated PDF Page */}
                    <div className="flex flex-col h-full p-4">
                      {/* Header - 3 logos */}
                      <div className="flex items-center justify-between mb-2 border-b pb-2">
                        <div className="flex items-center gap-2">
                          <img src={logoFac} alt="FAC" className="h-10 w-auto object-contain" />
                          <div className="text-[8px] font-bold text-blue-900 leading-tight">
                            INSTITUTO<br />FORMANDO ÁGUIAS<br />& CAMPEÕES
                          </div>
                        </div>
                        <img src={logoMinisterio} alt="Ministério do Esporte" className="h-10 w-auto object-contain" />
                        <img src={logoGoverno} alt="Governo Federal" className="h-10 w-auto object-contain" />
                      </div>

                      {/* Title */}
                      <div className="text-center my-2">
                        <h3 className="text-sm font-bold text-blue-700">
                          {modalidade} - {turno} - HORARIO {horario}
                        </h3>
                      </div>

                      {/* Photo Grid 2x3 */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {groupFotos.map((foto: any, i: number) => (
                          <div key={foto.id} className="relative border border-muted rounded overflow-hidden bg-zinc-950 flex items-center justify-center">
                            <img
                              src={foto.url}
                              alt={foto.descricao || `Foto ${i + 1}`}
                              className="w-full h-full object-contain"
                            />
                            <Badge
                              variant="secondary"
                              className="absolute bottom-1 right-1 text-[9px] opacity-80"
                            >
                              {i + 1}/{groupFotos.length}
                            </Badge>
                          </div>
                        ))}
                        {/* Empty slots */}
                        {Array.from({ length: Math.max(0, 6 - groupFotos.length) }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="border border-dashed border-muted-foreground/30 rounded flex items-center justify-center text-muted-foreground/40 text-xs"
                          >
                            Vazio
                          </div>
                        ))}
                      </div>

                      {/* Footer - FAC logo */}
                      <div className="flex justify-center mt-2 pt-2 border-t">
                        <img src={logoFac} alt="FAC" className="h-7 object-contain" />
                      </div>
                    </div>

                    {/* Page indicator */}
                    <div className="bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
                      Página {pageIdx + 1} de {groupEntries.length}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={generating || totalSelected === 0}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Gerando...</>
            ) : (
              <><FileText className="w-4 h-4 mr-1" /> Gerar PDF ({totalSelected} fotos)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewDialog;

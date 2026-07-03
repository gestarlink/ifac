import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Pencil, Trash2, FolderOpen, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRASAO_REPUBLICA_BASE64 } from "@/constants/logos";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import BeneficiarioDocumentos from "@/components/BeneficiarioDocumentos";

const EMPTY_FORM = {
  nome: "", cpf: "", idade: "", sexo: "", modalidade: "FUTEBOL",
  data_nascimento: "", turma_id: "", nucleo_id: "",
  responsavel_nome: "", responsavel_telefone: "",
  peso: "", altura: "", imc: "",
};

const BeneficiariosPage = () => {
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [staff, setStaff] = useState<any[]>([]);
  const [docsOpen, setDocsOpen] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: "", nome: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [bRes, tRes, nRes, pRes, rRes] = await Promise.all([
      supabase.from("beneficiarios").select("*, turmas(nome), nucleos(nome)").eq("ativo", true).order("nome"),
      supabase.from("turmas").select("*").order("nome"),
      supabase.from("nucleos").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);
    setBeneficiarios(bRes.data || []);
    setTurmas(tRes.data || []);
    setNucleos(nRes.data || []);
    // Merge profiles with their roles
    const profiles = pRes.data || [];
    const roles = rRes.data || [];
    const merged = profiles.map((p: any) => ({
      ...p,
      user_roles: roles.filter((r: any) => r.user_id === p.user_id),
    }));
    setStaff(merged);
    if (nRes.data?.[0] && !form.nucleo_id) {
      setForm((f) => ({ ...f, nucleo_id: nRes.data![0].id }));
    }
    setLoading(false);
  };

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      nome: b.nome || "",
      cpf: b.cpf || "",
      idade: b.idade?.toString() || "",
      sexo: b.sexo || "",
      modalidade: b.modalidade || "FUTEBOL",
      data_nascimento: b.data_nascimento || "",
      turma_id: b.turma_id || "",
      nucleo_id: b.nucleo_id || "",
      responsavel_nome: b.responsavel_nome || "",
      responsavel_telefone: b.responsavel_telefone || "",
      peso: b.peso?.toString() || "",
      altura: b.altura?.toString() || "",
      imc: b.imc?.toString() || "",
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, nucleo_id: nucleos[0]?.id || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.nucleo_id) {
      toast.error("Preencha o nome e selecione o núcleo");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome,
      cpf: form.cpf || null,
      idade: form.idade ? parseInt(form.idade) : null,
      sexo: form.sexo || null,
      modalidade: form.modalidade,
      data_nascimento: form.data_nascimento || null,
      turma_id: form.turma_id || null,
      nucleo_id: form.nucleo_id,
      responsavel_nome: form.responsavel_nome || null,
      responsavel_telefone: form.responsavel_telefone || null,
      peso: form.peso ? parseFloat(form.peso) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
      imc: form.imc ? parseFloat(form.imc) : null,
    };

    const { error } = editingId
      ? await supabase.from("beneficiarios").update(payload).eq("id", editingId)
      : await supabase.from("beneficiarios").insert(payload);

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success(editingId ? "Beneficiário atualizado!" : "Beneficiário cadastrado!");
      setShowForm(false);
      setEditingId(null);
      loadData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("beneficiarios").update({ ativo: false }).eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Beneficiário excluído!");
      loadData();
    }
    setDeleteId(null);
  };

  const getStaffByRole = (role: string) => {
    return staff.find((s) => s.user_roles?.some?.((r: any) => r.role === role));
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const w = doc.internal.pageSize.width;
    const nucleo = nucleos[0]?.nome || "Núcleo";
    const coord = getStaffByRole("coordenador");
    const prof = getStaffByRole("professor");
    const monitor = getStaffByRole("monitor");

    // Brasão da República centralizado
    try { doc.addImage(BRASAO_REPUBLICA_BASE64, "PNG", w / 2 - 12, 3, 24, 24); } catch {}

    // Header text below brasão
    let y = 28;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("MINISTÉRIO DO ESPORTE", w / 2, y, { align: "center" });
    y += 4;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DIRETORIA DE ESPORTE AMADOR, LAZER E INCLUSÃO SOCIAL", w / 2, y, { align: "center" });
    y += 4;
    doc.text("COORDENAÇÃO-GERAL DE ACOMPANHAMENTO DE PARCERIAS – TERMOS DE FOMENTO E COLABORAÇÃO", w / 2, y, { align: "center" });

    // Yellow divider line
    y += 3;
    doc.setDrawColor(200, 170, 0);
    doc.setLineWidth(0.8);
    doc.line(14, y, w - 14, y);

    // Entidade / Programa / Termo row (green background)
    y += 4;
    const rowH = 5;
    doc.setFillColor(198, 224, 180);
    doc.rect(14, y - 3.5, w - 28, rowH, "F");
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(14, y - 3.5, w - 28, rowH, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Entidade:", 14 + 1, y);
    doc.text("Programa:", w / 2 - 20, y);
    doc.text("Termo de Fomento Nº:", w - 70, y);
    doc.setFont("helvetica", "normal");
    doc.text("972536/2024", w - 30, y);

    // NÚCLEO CIDADE DO POVO centered (green background)
    y += rowH + 0.5;
    doc.setFillColor(198, 224, 180);
    doc.rect(14, y - 3.5, w - 28, rowH, "F");
    doc.rect(14, y - 3.5, w - 28, rowH, "S");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`NÚCLEO ${nucleo.toUpperCase()}`, w / 2, y, { align: "center" });

    // Núcleo info row (green background)
    y += rowH + 0.5;
    doc.setFillColor(198, 224, 180);
    doc.rect(14, y - 3.5, w - 28, rowH, "F");
    doc.rect(14, y - 3.5, w - 28, rowH, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`Nome do Núcleo/Subnúcleo: ${nucleo.toUpperCase()}`, 14 + 1, y);
    doc.text("Dia e horário de funcionamento: Seg à Qui das 8h as 17h", w / 2 - 10, y);
    doc.text("Endereço do núcleo:", w - 50, y);

    // Staff table
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["Recursos Humanos/função", "Nome", "Carga Horária", "Telefone", "e-mail:"]],
      body: [
        ["COORDENADOR", coord?.nome?.toUpperCase() || "—", "32h", coord?.telefone || "—", coord?.email || "—"],
        ["PROFESSOR", prof?.nome?.toUpperCase() || "—", "32h", prof?.telefone || "—", prof?.email || "—"],
        ["MONITOR", monitor?.nome?.toUpperCase() || "—", "32h", monitor?.telefone || "—", monitor?.email || "—"],
      ],
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [198, 224, 180], textColor: 0, fontStyle: "bold", fontSize: 7 },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });

    // Beneficiaries table
    const staffTableEnd = (doc as any).lastAutoTable?.finalY || y + 20;

    const rows = filtered.map((b, i) => [
      i + 1,
      b.nome?.toUpperCase() || "",
      b.cpf || "—",
      b.idade || "—",
      b.modalidade || "FUTEBOL",
    ]);

    const tableWidth = w - 28;
    autoTable(doc, {
      startY: staffTableEnd + 2,
      head: [["Nome do Beneficiário", "CPF", "Idade", "Modalidade/Atividade Esportiva"]],
      body: rows.map((r) => [r[1], r[2], r[3], r[4]]),
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [198, 224, 180], textColor: 0, fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.45 },
        1: { cellWidth: tableWidth * 0.20 },
        2: { cellWidth: tableWidth * 0.10, halign: "center" },
        3: { cellWidth: tableWidth * 0.25 },
      },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(7);
    doc.text(`Total de beneficiários: ${filtered.length}`, 14, finalY + 8);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, finalY + 12);
    doc.save(`beneficiarios_${nucleo.toLowerCase().replace(/\s/g, "_")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const exportExcel = async () => {
    const nucleo = nucleos[0]?.nome || "Núcleo";
    const coord = getStaffByRole("coordenador");
    const prof = getStaffByRole("professor");
    const monitor = getStaffByRole("monitor");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Beneficiários", { pageSetup: { orientation: "landscape", paperSize: 9 } });

    // Garante que as linhas de grade estejam visíveis no Excel
    ws.views = [{ showGridLines: true }];

    // Define as colunas e suas larguras de acordo com o leiaute da imagem
    ws.columns = [
      { key: "A", width: 25 },
      { key: "B", width: 15 },
      { key: "C", width: 2 },
      { key: "D", width: 15 },
      { key: "E", width: 15 },
      { key: "F", width: 15 },
      { key: "G", width: 18 }, // CPF
      { key: "H", width: 18 }, // Carga Horária / Idade / Telefone
      { key: "I", width: 35 }  // e-mail / Modalidade
    ];

    // Estilos comuns
    const greenColor = "FFC6E0B4";
    const greenFill: ExcelJS.FillPattern = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: greenColor }
    };

    const thinBorder: ExcelJS.Borders = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };

    const fontRegular = { name: "Verdana", size: 8 };
    const fontBold = { name: "Verdana", size: 8, bold: true };

    const alignCenter: ExcelJS.Alignment = { horizontal: "center", vertical: "middle" };
    const alignLeft: ExcelJS.Alignment = { horizontal: "left", vertical: "middle" };

    // Formata o cabeçalho superior verde (linhas 1 a 7)
    for (let r = 1; r <= 7; r++) {
      const row = ws.getRow(r);
      row.height = r === 4 ? 45 : (r <= 3 ? 25 : 20);
      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.fill = greenFill;
        cell.border = thinBorder;
        cell.font = fontBold;
      }
    }

    // Insere e centraliza o Brasão da República (linhas 1-3)
    ws.mergeCells("A1:I3");
    try {
      const cleanBase64 = BRASAO_REPUBLICA_BASE64.replace(/^data:image\/\w+;base64,/, "");
      const imageId = wb.addImage({
        base64: cleanBase64,
        extension: "png",
      });
      ws.addImage(imageId, {
        tl: { col: 4.2, row: 0.2 },
        br: { col: 5.2, row: 2.8 }
      });
    } catch (e) {
      console.error("Erro ao adicionar imagem no Excel", e);
    }

    // Linha 4: Títulos Ministeriais centralizados
    ws.mergeCells("A4:I4");
    const cellA4 = ws.getCell("A4");
    cellA4.value = "MINISTÉRIO DO ESPORTE\nDIRETORIA DE ESPORTE AMADOR, LAZER E INCLUSÃO SOCIAL\nCOORDENAÇÃO-GERAL DE ACOMPANHAMENTO DE PARCERIAS - TERMOS DE FOMENTO E COLABORAÇÃO";
    cellA4.font = { name: "Verdana", size: 9, bold: true };
    cellA4.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Linha 5: Entidade / Programa / Termo de Fomento
    ws.mergeCells("A5:F5");
    ws.getCell("A5").value = "Entidade:";
    ws.getCell("A5").alignment = alignLeft;

    ws.mergeCells("G5:H5");
    ws.getCell("G5").value = "Programa:";
    ws.getCell("G5").alignment = alignLeft;

    ws.getCell("I5").value = "Termo de Fomento Nº:";
    ws.getCell("I5").alignment = alignLeft;

    // Linha 6: Nome do núcleo em destaque
    ws.mergeCells("A6:I6");
    const cellA6 = ws.getCell("A6");
    cellA6.value = `NÚCLEO ${nucleo.toUpperCase()}`;
    cellA6.font = { name: "Verdana", size: 10, bold: true };
    cellA6.alignment = alignCenter;

    // Linha 7: Dados do núcleo
    ws.mergeCells("A7:F7");
    ws.getCell("A7").value = `Nome do Núcleo/Subnúcleo: ${nucleo.toUpperCase()}`;
    ws.getCell("A7").alignment = alignLeft;

    ws.mergeCells("G7:H7");
    ws.getCell("G7").value = "Dia e horário de funcionamento: Seg à Qui das 8h as 17h";
    ws.getCell("G7").alignment = alignLeft;

    ws.getCell("I7").value = "Endereço do núcleo:";
    ws.getCell("I7").alignment = alignLeft;

    // Linha 8: Cabeçalho dos Recursos Humanos (Staff)
    const row8 = ws.getRow(8);
    row8.height = 20;
    row8.getCell(1).value = "Recursos Humanos/Função";
    row8.getCell(2).value = "Nome";
    row8.getCell(7).value = "Carga Horária";
    row8.getCell(8).value = "Telefone";
    row8.getCell(9).value = "e-mail:";

    ws.mergeCells("B8:F8");

    for (let c = 1; c <= 9; c++) {
      const cell = row8.getCell(c);
      cell.fill = greenFill;
      cell.border = thinBorder;
      cell.font = fontBold;
      cell.alignment = (c === 7 || c === 8) ? alignCenter : alignLeft;
    }

    // Linhas 9 a 11: Dados da equipe (Staff)
    const staffData = [
      ["COORDENADOR", coord?.nome?.toUpperCase() || "—", "32h", coord?.telefone || "—", coord?.email || "—"],
      ["PROFESSOR", prof?.nome?.toUpperCase() || "—", "32h", prof?.telefone || "—", prof?.email || "—"],
      ["MONITOR", monitor?.nome?.toUpperCase() || "—", "32h", monitor?.telefone || "—", monitor?.email || "—"],
    ];

    staffData.forEach((staffRow, index) => {
      const rNum = 9 + index;
      const r = ws.getRow(rNum);
      r.height = 20;

      r.getCell(1).value = staffRow[0];
      r.getCell(2).value = staffRow[1];
      r.getCell(7).value = staffRow[2];
      r.getCell(8).value = staffRow[3];
      r.getCell(9).value = staffRow[4];

      ws.mergeCells(`B${rNum}:F${rNum}`);

      for (let c = 1; c <= 9; c++) {
        const cell = r.getCell(c);
        cell.border = thinBorder;
        cell.font = c === 1 ? fontBold : fontRegular;
        if (c === 1) {
          cell.alignment = alignLeft;
        } else if (c >= 2 && c <= 8) {
          cell.alignment = alignCenter;
        } else {
          cell.alignment = alignLeft;
        }
      }
    });

    // Linha 12: Cabeçalho dos Beneficiários
    const r12 = ws.getRow(12);
    r12.height = 20;
    r12.getCell(1).value = "Nome do Beneficiário";
    r12.getCell(7).value = "CPF";
    r12.getCell(8).value = "Idade";
    r12.getCell(9).value = "Modalidade/Atividade Esportiva";

    ws.mergeCells("A12:F12");

    for (let c = 1; c <= 9; c++) {
      const cell = r12.getCell(c);
      cell.fill = greenFill;
      cell.border = thinBorder;
      cell.font = fontBold;
      cell.alignment = c === 1 ? alignLeft : alignCenter;
    }

    // Função auxiliar para formatar CPF
    const formatCPF = (cpf: string) => {
      if (!cpf) return "—";
      const clean = cpf.replace(/\D/g, "");
      if (clean.length === 11) {
        return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
      }
      return cpf;
    };

    // Linha 13 em diante: Beneficiários
    filtered.forEach((b, index) => {
      const rNum = 13 + index;
      const r = ws.getRow(rNum);
      r.height = 20;

      r.getCell(1).value = b.nome?.toUpperCase() || "";
      r.getCell(7).value = formatCPF(b.cpf || "");
      r.getCell(8).value = b.idade || "—";
      r.getCell(9).value = b.modalidade || "FUTEBOL";

      ws.mergeCells(`A${rNum}:F${rNum}`);

      for (let c = 1; c <= 9; c++) {
        const cell = r.getCell(c);
        cell.border = thinBorder;
        cell.font = fontRegular;
        if (c === 1) {
          cell.alignment = alignLeft;
        } else if (c === 7 || c === 8 || c === 9) {
          cell.alignment = alignCenter;
        }
      }
    });

    // Linhas de rodapé
    const totalRowIndex = 13 + filtered.length;
    
    ws.addRow([]); // Linha em branco
    
    const rTotal = ws.getRow(totalRowIndex + 1);
    rTotal.getCell(1).value = `Total de beneficiários: ${filtered.length}`;
    rTotal.getCell(1).font = fontBold;
    ws.mergeCells(`A${totalRowIndex + 1}:I${totalRowIndex + 1}`);

    const rGenerated = ws.getRow(totalRowIndex + 2);
    rGenerated.getCell(1).value = `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`;
    rGenerated.getCell(1).font = { name: "Verdana", size: 8, italic: true };
    ws.mergeCells(`A${totalRowIndex + 2}:I${totalRowIndex + 2}`);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beneficiarios_${nucleo.toLowerCase().replace(/\s/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel gerado com sucesso!");
  };

  const filtered = beneficiarios.filter((b) =>
    b.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Beneficiários</h1>
          <p className="text-sm text-muted-foreground mt-1">{beneficiarios.length} alunos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Cadastrar
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno por nome..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell></TableRow>
                ) : (
                  filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium uppercase">{b.nome}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {b.cpf ? "•••.•••." + b.cpf.slice(-5) : "—"}
                      </TableCell>
                      <TableCell>{b.idade || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{b.turmas?.nome || "Sem turma"}</Badge></TableCell>
                      <TableCell>{b.modalidade}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.responsavel_nome || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Documentos" onClick={() => setDocsOpen({ open: true, id: b.id, nome: b.nome })}>
                            <FolderOpen className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Beneficiário" : "Cadastrar Beneficiário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label className="text-xs">Nome Completo *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do aluno" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
              <div><Label className="text-xs">Data Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Idade</Label><Input type="number" value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Modalidade</Label><Input value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value })} /></div>
            </div>
            <div>
              <Label className="text-xs">Núcleo *</Label>
              <Select value={form.nucleo_id} onValueChange={(v) => setForm({ ...form, nucleo_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{nucleos.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Turma</Label>
              <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Peso (kg)</Label><Input type="number" step="0.1" value={form.peso} onChange={(e) => {
                const peso = e.target.value;
                const altura = form.altura;
                let imc = form.imc;
                if (peso && altura) { imc = (parseFloat(peso) / (parseFloat(altura) * parseFloat(altura))).toFixed(1); }
                setForm({ ...form, peso, imc });
              }} /></div>
              <div><Label className="text-xs">Altura (m)</Label><Input type="number" step="0.01" value={form.altura} onChange={(e) => {
                const altura = e.target.value;
                const peso = form.peso;
                let imc = form.imc;
                if (peso && altura) { imc = (parseFloat(peso) / (parseFloat(altura) * parseFloat(altura))).toFixed(1); }
                setForm({ ...form, altura, imc });
              }} /></div>
              <div><Label className="text-xs">IMC</Label><Input type="number" step="0.1" value={form.imc} readOnly className="bg-muted" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome do Responsável</Label><Input value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} /></div>
              <div><Label className="text-xs">Telefone Responsável</Label><Input value={form.responsavel_telefone} onChange={(e) => setForm({ ...form, responsavel_telefone: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir beneficiário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desativar o beneficiário. Ele não aparecerá mais na listagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BeneficiarioDocumentos
        beneficiarioId={docsOpen.id}
        beneficiarioNome={docsOpen.nome}
        open={docsOpen.open}
        onClose={() => setDocsOpen({ open: false, id: "", nome: "" })}
      />
    </div>
  );
};

export default BeneficiariosPage;

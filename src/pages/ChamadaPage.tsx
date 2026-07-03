import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, ClipboardCheck } from "lucide-react";
import ExcelJS from "exceljs";
import { generateSheetForTurma, downloadExcel } from "@/utils/chamadaExcel";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_FAC_BASE64, LOGO_FORMANDO_CAMPEOES_BASE64, LOGO_MINISTERIO_ESPORTE_BASE64 } from "@/constants/logos";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/** Get class days for a given month based on turno schedule string */
const getClassDays = (turno: string, year: number, month: number): number[] => {
  const days: number[] = [];
  const isTerQui = /ter[çc]a/i.test(turno) || /quinta/i.test(turno);
  const isSegQua = /seg/i.test(turno) || /segunda/i.test(turno);
  const targetDows = isTerQui ? [2, 4] : isSegQua ? [1, 3] : [1, 2, 3, 4, 5];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (targetDows.includes(dow)) days.push(d);
  }
  return days;
};

const ChamadaPage = () => {
  const { user, userRole } = useAuth();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [presencas, setPresencas] = useState<any[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempAttendance, setTempAttendance] = useState<Record<string, Record<number, "P" | "F" | "">>>({});
  const [submission, setSubmission] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = userRole === "coordenador" || userRole === "coordenador_geral";

  // Derived values - computed from state, always available
  const [year, month] = selectedMonth.split("-").map(Number);
  const turma = turmas.find((t) => t.id === selectedTurma) || null;
  const classDays = turma ? getClassDays(turma.turno, year, month) : [];
  const monthName = new Date(year, month - 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .toUpperCase()
    .replace(" DE ", " ");

  // Load turmas on mount
  useEffect(() => {
    supabase.from("turmas").select("*").order("nome").then(({ data }) => setTurmas(data || []));
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedTurma || selectedTurma === "__all__" || !selectedMonth) {
      setBeneficiarios([]);
      setPresencas([]);
      return;
    }
    setLoading(true);
    const [y, m] = selectedMonth.split("-").map(Number);
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

    const [benRes, presRes] = await Promise.all([
      supabase.from("beneficiarios").select("*").eq("turma_id", selectedTurma).eq("ativo", true).order("nome"),
      supabase.from("presencas")
        .select("*, profiles:registrado_por(nome, cargo)")
        .eq("turma_id", selectedTurma)
        .gte("data", startDate)
        .lte("data", endDate),
    ]);

    setBeneficiarios(benRes.data || []);
    setPresencas(presRes.data || []);
    setLoading(false);
  }, [selectedTurma, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for presencas
  useEffect(() => {
    const channel = supabase
      .channel("chamada-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "presencas" }, () => {
        if (selectedTurma && selectedMonth) loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTurma, selectedMonth, loadData]);

  // Load submission status
  const loadSubmissionStatus = useCallback(async () => {
    if (!selectedTurma || selectedTurma === "__all__" || !turma) {
      setSubmission(null);
      return;
    }
    const [y, m] = selectedMonth.split("-").map(Number);
    const { data, error } = await supabase
      .from("envios_documentos")
      .select("*")
      .eq("tipo", "chamada")
      .eq("nucleo_id", turma.nucleo_id)
      .eq("turma_id", selectedTurma)
      .eq("mes", m)
      .eq("ano", y)
      .maybeSingle();

    if (!error) setSubmission(data);
  }, [selectedTurma, selectedMonth, turma]);

  useEffect(() => {
    loadSubmissionStatus();
  }, [loadSubmissionStatus]);

  // Build attendance map: beneficiario_id -> { day -> "P"|"F" }
  const attendanceMap: Record<string, Record<number, string>> = {};
  presencas.forEach((p) => {
    const day = new Date(p.data + "T12:00:00").getDate();
    if (!attendanceMap[p.beneficiario_id]) attendanceMap[p.beneficiario_id] = {};
    attendanceMap[p.beneficiario_id][day] = p.presente ? "P" : "F";
  });

  // Count totals per day
  const dayTotals = classDays.map((day) => {
    let p = 0, f = 0;
    beneficiarios.forEach((b) => {
      const mark = isEditing ? tempAttendance[b.id]?.[day] : attendanceMap[b.id]?.[day];
      if (mark === "P") p++;
      else if (mark === "F") f++;
    });
    return { day, p, f };
  });

  const toggleCell = (alunoId: string, day: number) => {
    setTempAttendance((prev) => {
      const studentMarks = { ...prev[alunoId] };
      const current = studentMarks[day] || "";
      let next: "P" | "F" | "" = "P";
      if (current === "P") next = "F";
      else if (current === "F") next = "";
      else next = "P";
      studentMarks[day] = next;
      return { ...prev, [alunoId]: studentMarks };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const [y, m] = selectedMonth.split("-").map(Number);
    const rowsToUpsert: any[] = [];
    const datesToDelete: string[] = [];
    const studentIdsToDelete: string[] = [];

    for (const alunoId of Object.keys(tempAttendance)) {
      for (const day of Object.keys(tempAttendance[alunoId]).map(Number)) {
        const newVal = tempAttendance[alunoId][day];
        const oldVal = attendanceMap[alunoId]?.[day] || "";
        if (newVal === oldVal) continue;
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (newVal === "P" || newVal === "F") {
          rowsToUpsert.push({
            beneficiario_id: alunoId,
            turma_id: selectedTurma,
            data: dateStr,
            presente: newVal === "P",
            registrado_por: user.id,
          });
        } else if (newVal === "") {
          datesToDelete.push(dateStr);
          studentIdsToDelete.push(alunoId);
        }
      }
    }

    try {
      let hasError = false;
      if (rowsToUpsert.length > 0) {
        const { error } = await supabase.from("presencas").upsert(rowsToUpsert, {
          onConflict: "beneficiario_id, data",
        });
        if (error) { console.error("Upsert error:", error); hasError = true; }
      }

      if (datesToDelete.length > 0) {
        const deletePromises = datesToDelete.map((date, idx) =>
          supabase.from("presencas").delete()
            .eq("beneficiario_id", studentIdsToDelete[idx])
            .eq("data", date)
        );
        const deleteResults = await Promise.all(deletePromises);
        if (deleteResults.find((r) => r.error)) hasError = true;
      }

      if (hasError) {
        toast.error("Erro ao salvar algumas presenças");
      } else {
        toast.success("Chamada atualizada com sucesso!");
        setIsEditing(false);
        await loadData();
      }
    } catch (err: any) {
      toast.error("Erro ao salvar chamada: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitValidation = async () => {
    if (!selectedTurma || !turma || !user) return;
    const [y, m] = selectedMonth.split("-").map(Number);
    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("envios_documentos")
        .select("id, status")
        .eq("tipo", "chamada")
        .eq("nucleo_id", turma.nucleo_id)
        .eq("turma_id", selectedTurma)
        .eq("mes", m)
        .eq("ano", y)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("envios_documentos")
          .update({
            status: "reenviado",
            enviado_por: user.id,
            revisado_por: null,
            justificativa: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        await supabase.from("envios_historico").insert({ envio_id: existing.id, acao: "reenviado", realizado_por: user.id });
        toast.success("Chamada reenviada com sucesso!");
      } else {
        const { data: inserted, error } = await supabase
          .from("envios_documentos")
          .insert({ tipo: "chamada", nucleo_id: turma.nucleo_id, turma_id: selectedTurma, mes: m, ano: y, status: "enviado", enviado_por: user.id })
          .select()
          .single();
        if (error) throw error;
        await supabase.from("envios_historico").insert({ envio_id: inserted.id, acao: "enviado", realizado_por: user.id });
        toast.success("Chamada enviada para validação!");
      }
      loadSubmissionStatus();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const generatePageForTurma = (doc: any, turmaData: any, benefs: any[], preses: any[], isFirstPage: boolean) => {
    if (!isFirstPage) doc.addPage();
    const pw = doc.internal.pageSize.getWidth();
    const margin = 5;
    const tableWidth = pw - margin * 2;

    const turmaClassDays = getClassDays(turmaData.turno, year, month);

    const turmaAttMap: Record<string, Record<number, string>> = {};
    preses.forEach((p) => {
      const day = new Date(p.data + "T12:00:00").getDate();
      if (!turmaAttMap[p.beneficiario_id]) turmaAttMap[p.beneficiario_id] = {};
      turmaAttMap[p.beneficiario_id][day] = p.presente ? "P" : "F";
    });

    const turmaDayTotals = turmaClassDays.map((day) => {
      let p = 0, f = 0;
      benefs.forEach((b) => {
        const mark = turmaAttMap[b.id]?.[day];
        if (mark === "P") p++;
        else if (mark === "F") f++;
      });
      return { day, p, f };
    });

    const logoY = 3;
    try { doc.addImage(LOGO_FAC_BASE64, "PNG", margin + 5, logoY, 30, 22); } catch {}
    try { doc.addImage(LOGO_FORMANDO_CAMPEOES_BASE64, "PNG", pw / 2 - 10, logoY + 1, 20, 20); } catch {}
    try { doc.addImage(LOGO_MINISTERIO_ESPORTE_BASE64, "PNG", pw - margin - 70, logoY + 2, 65, 18); } catch {}

    const barY = 27;
    doc.setFillColor(100, 165, 220);
    doc.rect(margin, barY, tableWidth, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);

    const turnoBase = (turmaData.turno || "")
      .replace(/\s*\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\s*/g, "")
      .replace(/Seg\/Qua/i, "SEGUNDA E QUARTA")
      .replace(/Ter[çc]a\/Quinta/i, "TERÇA E QUINTA")
      .trim();
    const horarioText = turnoBase + " 09:00 às 10:00";

    doc.text("CIDADE DO POVO", margin + 4, barY + 4.2);
    doc.text(horarioText, 70, barY + 4.2);
    doc.text(monthName, pw / 2 + 15, barY + 4.2);
    doc.text("PROF: RODILSON DO N. BARDALES", pw - margin - 2, barY + 4.2, { align: "right" });

    const subY = barY + 6;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, subY, tableWidth, 5, "FD");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.text(turmaData.nome, pw / 2, subY + 3.5, { align: "center" });
    doc.text("CREF: 25006/AC", pw - margin - 45, subY + 3.5);
    doc.text("VAL: 31/12/2029", pw - margin - 2, subY + 3.5, { align: "right" });

    const headRow1 = ["Nº", "NOME DO ALUNO", "PESO", "ALTURA", "IMC", "ANO NASC."];
    turmaClassDays.forEach((d) => headRow1.push(String(d)));
    headRow1.push("RESP. ALUNOS", "WHATSAPP 1", "WHATSAPP 2");

    const bodyRows = benefs.map((b, i) => {
      const row: string[] = [
        String(i + 1),
        (b.nome || "").toUpperCase(),
        b.peso ? String(b.peso).replace(".", ",") : "",
        b.altura ? String(b.altura).replace(".", ",") : "",
        b.imc ? String(Number(b.imc).toFixed(1)).replace(".", ",") : "",
        b.data_nascimento ? new Date(b.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "",
      ];
      turmaClassDays.forEach((day) => { row.push(turmaAttMap[b.id]?.[day] || ""); });
      row.push(b.responsavel_nome || "", b.responsavel_telefone || "", "");
      return row;
    });

    const presentesRow = ["", "PRESENTES", "", "", "", ""];
    const faltasRow = ["", "FALTAS", "", "", "", ""];
    turmaClassDays.forEach((day) => {
      const t = turmaDayTotals.find((dt) => dt.day === day)!;
      presentesRow.push(String(t.p));
      faltasRow.push(String(t.f));
    });
    presentesRow.push("", "", "");
    faltasRow.push("", "", "");
    bodyRows.push(presentesRow, faltasRow);

    const dayColCount = turmaClassDays.length;
    const nCol = 8, nomeCol = 40, pesoCol = 10, altCol = 10, imcCol = 10, nascCol = 16, respCol = 30, wpp1Col = 22;
    const fixedWidthWithoutWpp2 = nCol + nomeCol + pesoCol + altCol + imcCol + nascCol + respCol + wpp1Col;
    const dayColW = dayColCount > 0 ? Math.min(8, Math.floor(((tableWidth - fixedWidthWithoutWpp2 - 22) / dayColCount) * 10) / 10) : 7;
    const usedByDays = dayColW * dayColCount;
    const wpp2Col = tableWidth - fixedWidthWithoutWpp2 - usedByDays;

    const colStyles: any = {
      0: { cellWidth: nCol, halign: "center" },
      1: { cellWidth: nomeCol },
      2: { cellWidth: pesoCol, halign: "center" },
      3: { cellWidth: altCol, halign: "center" },
      4: { cellWidth: imcCol, halign: "center" },
      5: { cellWidth: nascCol, halign: "center" },
    };
    for (let i = 0; i < dayColCount; i++) {
      colStyles[6 + i] = { cellWidth: dayColW, halign: "center", fontStyle: "bold" };
    }
    colStyles[6 + dayColCount] = { cellWidth: respCol };
    colStyles[7 + dayColCount] = { cellWidth: wpp1Col, halign: "center" };
    colStyles[8 + dayColCount] = { cellWidth: wpp2Col, halign: "center" };

    autoTable(doc, {
      startY: subY + 5,
      margin: { left: margin, right: margin },
      tableWidth: tableWidth,
      head: [headRow1],
      body: bodyRows,
      styles: { fontSize: 6, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0], valign: "middle" },
      headStyles: { fillColor: [100, 165, 220], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 5.5, halign: "center", cellPadding: 1 },
      columnStyles: colStyles,
      theme: "grid",
      didParseCell: (data: any) => {
        if (data.section === "body") {
          const val = data.cell.raw;
          if (val === "P") { data.cell.styles.textColor = [0, 0, 0]; data.cell.styles.fontStyle = "bold"; }
          else if (val === "F") { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = "bold"; }
          if (data.row.index >= benefs.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 6;
          }
        }
      },
    });
  };

  const exportPDF = async () => {
    const isAllTurmas = selectedTurma === "__all__";

    if (!isAllTurmas) {
      if (!turma || beneficiarios.length === 0) { toast.error("Selecione uma turma com alunos"); return; }
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      generatePageForTurma(doc, turma, beneficiarios, presencas, true);
      doc.save(`chamada_${turma.nome.replace(/\s/g, "_")}_${selectedMonth}.pdf`);
      toast.success("PDF da chamada gerado!");
      return;
    }

    toast.info("Gerando PDF de todas as turmas...");
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    let pageAdded = false;

    const turmaOrder = (t: any) => {
      const nome = (t.nome || "").toLowerCase();
      const numMatch = nome.match(/sub\s*(\d+)/);
      const num = numMatch ? parseInt(numMatch[1]) : 99;
      const turno = nome.includes("tarde") ? 1 : 0;
      return num * 10 + turno;
    };
    const sortedTurmas = [...turmas].sort((a, b) => turmaOrder(a) - turmaOrder(b));

    for (const t of sortedTurmas) {
      const [benRes, presRes] = await Promise.all([
        supabase.from("beneficiarios").select("*").eq("turma_id", t.id).eq("ativo", true).order("nome"),
        supabase.from("presencas").select("*, profiles:registrado_por(nome, cargo)")
          .eq("turma_id", t.id).gte("data", startDate).lte("data", endDate),
      ]);
      const benefs = benRes.data || [];
      if (benefs.length === 0) continue;
      generatePageForTurma(doc, t, benefs, presRes.data || [], !pageAdded);
      pageAdded = true;
    }

    if (!pageAdded) { toast.error("Nenhuma turma com alunos encontrada"); return; }
    doc.save(`chamada_todas_turmas_${selectedMonth}.pdf`);
    toast.success("PDF de todas as turmas gerado!");
  };

  const exportExcel = async () => {
    const isAllTurmas = selectedTurma === "__all__";
    const workbook = new ExcelJS.Workbook();

    if (!isAllTurmas) {
      if (!turma || beneficiarios.length === 0) { toast.error("Selecione uma turma com alunos"); return; }
      await generateSheetForTurma(workbook, turma, beneficiarios, presencas, year, month, monthName);
      await downloadExcel(workbook, `chamada_${turma.nome.replace(/\s/g, "_")}_${selectedMonth}.xlsx`);
      toast.success("Excel da chamada gerado!");
      return;
    }

    toast.info("Gerando Excel de todas as turmas...");
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    const turmaOrder = (t: any) => {
      const nome = (t.nome || "").toLowerCase();
      const numMatch = nome.match(/sub\s*(\d+)/);
      const num = numMatch ? parseInt(numMatch[1]) : 99;
      const turno = nome.includes("tarde") ? 1 : 0;
      return num * 10 + turno;
    };
    const sortedTurmas = [...turmas].sort((a, b) => turmaOrder(a) - turmaOrder(b));
    let hasData = false;

    for (const t of sortedTurmas) {
      const [benRes, presRes] = await Promise.all([
        supabase.from("beneficiarios").select("*").eq("turma_id", t.id).eq("ativo", true).order("nome"),
        supabase.from("presencas").select("*, profiles:registrado_por(nome, cargo)")
          .eq("turma_id", t.id).gte("data", startDate).lte("data", endDate),
      ]);
      const benefs = benRes.data || [];
      if (benefs.length === 0) continue;
      await generateSheetForTurma(workbook, t, benefs, presRes.data || [], year, month, monthName);
      hasData = true;
    }

    if (!hasData) { toast.error("Nenhuma turma com alunos encontrada"); return; }
    await downloadExcel(workbook, `chamada_todas_turmas_${selectedMonth}.xlsx`);
    toast.success("Excel de todas as turmas gerado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Chamada</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de chamada mensal por turma</p>
        </div>
        <div className="flex gap-2">
          {canEdit && selectedTurma && selectedTurma !== "__all__" && (
            isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  Salvar Alterações
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => {
                const initialTemp: any = {};
                beneficiarios.forEach((b) => {
                  initialTemp[b.id] = {};
                  classDays.forEach((day) => {
                    initialTemp[b.id][day] = attendanceMap[b.id]?.[day] || "";
                  });
                });
                setTempAttendance(initialTemp);
                setIsEditing(true);
              }}>
                Editar Chamada
              </Button>
            )
          )}
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={isEditing}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={isEditing}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedTurma} onValueChange={setSelectedTurma} disabled={isEditing}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione uma turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">📋 Todas as turmas</SelectItem>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.nome} — {t.turno}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="month" className="w-44" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={isEditing} />
        {beneficiarios.length > 0 && (
          <Badge variant="outline">{beneficiarios.length} alunos</Badge>
        )}
      </div>

      {selectedTurma && selectedTurma !== "__all__" && (
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Status de Validação Mensal</h3>
                <p className="text-xs text-muted-foreground">Referente a {monthName}</p>
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
                      {submission.status === "devolvido" ? "Reenviar para Validação" : "Reenviar Chamada"}
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

      <Card className="shadow-card overflow-x-auto">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Nº</TableHead>
                <TableHead>Nome do Aluno</TableHead>
                {classDays.map((d) => (
                  <TableHead key={d} className="text-center w-10">{d}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedTurma ? (
                <TableRow><TableCell colSpan={2 + classDays.length} className="text-center py-8 text-muted-foreground">Selecione uma turma</TableCell></TableRow>
              ) : loading ? (
                <TableRow><TableCell colSpan={2 + classDays.length} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : beneficiarios.length === 0 ? (
                <TableRow><TableCell colSpan={2 + classDays.length} className="text-center py-8 text-muted-foreground">Nenhum aluno nesta turma</TableCell></TableRow>
              ) : (
                <>
                  {beneficiarios.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-center font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{b.nome}</TableCell>
                      {classDays.map((day) => {
                        const mark = isEditing
                          ? tempAttendance[b.id]?.[day]
                          : attendanceMap[b.id]?.[day];
                        return (
                          <TableCell
                            key={day}
                            className={cn(
                              "text-center font-bold",
                              isEditing && "cursor-pointer hover:bg-muted/50 select-none border-primary/20"
                            )}
                            onClick={() => { if (!isEditing) return; toggleCell(b.id, day); }}
                          >
                            {mark === "P" ? (
                              <span className="text-success">P</span>
                            ) : mark === "F" ? (
                              <span className="text-destructive">F</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell className="font-bold">PRESENTES</TableCell>
                    {dayTotals.map((dt) => (
                      <TableCell key={`p-${dt.day}`} className="text-center text-success font-bold">{dt.p || ""}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell className="font-bold">FALTAS</TableCell>
                    {dayTotals.map((dt) => (
                      <TableCell key={`f-${dt.day}`} className="text-center text-destructive font-bold">{dt.f || ""}</TableCell>
                    ))}
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChamadaPage;

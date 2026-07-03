import ExcelJS from "exceljs";
import {
  LOGO_FAC_BASE64,
  LOGO_FORMANDO_CAMPEOES_BASE64,
  LOGO_MINISTERIO_ESPORTE_BASE64,
} from "@/constants/logos";

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────

const thinBorder: ExcelJS.Borders = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};

const fontRegular8 = { name: "Calibri", size: 8 };
const fontBold8    = { name: "Calibri", size: 8,  bold: true };
const fontBold10   = { name: "Calibri", size: 10, bold: true };

const alignCenter: ExcelJS.Alignment = { horizontal: "center", vertical: "middle" };
const alignLeft:   ExcelJS.Alignment = { horizontal: "left",   vertical: "middle" };

const applyBorderAndFont = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  font: any,
  border: any,
  alignment: any,
) => {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getRow(r).getCell(c);
      if (font)      cell.font      = font;
      if (border)    cell.border    = border;
      if (alignment) cell.alignment = alignment;
    }
  }
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

const getClassDays = (turno: string, year: number, month: number): number[] => {
  const isTerQui = /ter[çc]a/i.test(turno) || /quinta/i.test(turno);
  const isSegQua = /seg/i.test(turno) || /segunda/i.test(turno);
  const targetDows = isTerQui ? [2, 4] : isSegQua ? [1, 3] : [1, 2, 3, 4, 5];
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (targetDows.includes(new Date(year, month - 1, d).getDay())) days.push(d);
  }
  return days;
};

const extractBase64 = (dataUri: string): string => {
  const idx = dataUri.indexOf(",");
  return idx >= 0 ? dataUri.substring(idx + 1) : dataUri;
};

const getHorarioText = (turno: string): string => {
  if (!turno) return "";
  const m = turno.match(/(\d{1,2}:\d{2})\s*[-–\/asàs]*\s*(\d{1,2}:\d{2})/i);
  return m ? `${m[1]} às ${m[2]}` : "";
};

/** Retorna as dimensões naturais (em pixels) de uma imagem base64 */
const getImageNaturalSize = (src: string): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 100, h: 100 });
    img.src = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;
  });

/** Escala a imagem para caber em maxW × maxH preservando o aspecto */
const scaleToFit = (
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } => {
  if (w === 0 || h === 0) return { width: maxW, height: maxH };
  const ratio = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
};

// ─── Geração da aba ───────────────────────────────────────────────────────────

export const generateSheetForTurma = async (
  workbook: ExcelJS.Workbook,
  turmaData: any,
  benefs: any[],
  preses: any[],
  year: number,
  month: number,
  monthName: string,
): Promise<void> => {
  const sheetName = (turmaData.nome || "Turma").substring(0, 31);
  const ws = workbook.addWorksheet(sheetName, {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    properties: { defaultRowHeight: 15 },
  });

  ws.views = [{ showGridLines: true }];

  const classDays  = getClassDays(turmaData.turno, year, month);
  const dayColCount = classDays.length;
  // Colunas: Nº(1) Nome(2) Peso(3) Alt(4) IMC(5) Nasc(6) [dias](7..6+n) Resp(7+n) Wpp1(8+n) Wpp2(9+n)
  const totalCols  = 6 + dayColCount + 3;

  // ── Larguras das colunas (baseadas na imagem de referência) ──────────────
  ws.getColumn(1).width = 5;    // Nº
  ws.getColumn(2).width = 35;   // Nome
  ws.getColumn(3).width = 8;    // Peso
  ws.getColumn(4).width = 8;    // Altura
  ws.getColumn(5).width = 8;    // IMC
  ws.getColumn(6).width = 14;   // Ano Nasc.
  for (let i = 0; i < dayColCount; i++) ws.getColumn(7 + i).width = 4.5;
  ws.getColumn(7 + dayColCount).width = 28;  // Resp. Alunos
  ws.getColumn(8 + dayColCount).width = 18;  // WhatsApp 1
  ws.getColumn(9 + dayColCount).width = 18;  // WhatsApp 2

  // ════════════════════════════════════════════════════════════════════════
  // LINHAS 1 – 7 : Área das Logomarcas (igual à imagem de referência)
  // ════════════════════════════════════════════════════════════════════════
  for (let r = 1; r <= 7; r++) ws.getRow(r).height = 22;

  // Mescla toda a área de logos
  ws.mergeCells(1, 1, 7, totalCols);

  // Borda ao redor da área das logos
  ws.getCell(1, 1).border = {
    top:    { style: "medium" },
    left:   { style: "medium" },
    bottom: { style: "medium" },
    right:  { style: "medium" },
  };

  // 7 linhas × 22 pt × 1,333 px/pt ≈ 205 px → logo cabe em até 160 px de altura
  const LOGO_MAX_H = 160;

  // Logo FAC – esquerda (máx 210 × 160)
  try {
    const nat  = await getImageNaturalSize(LOGO_FAC_BASE64);
    const size = scaleToFit(nat.w, nat.h, 210, LOGO_MAX_H);
    const id   = workbook.addImage({ base64: extractBase64(LOGO_FAC_BASE64), extension: "png" });
    ws.addImage(id, { tl: { col: 0.3, row: 0.2 }, ext: size });
  } catch (_) { /* logo indisponível */ }

  // Logo Formando Campeões – centro (máx 150 × 160)
  try {
    const nat  = await getImageNaturalSize(LOGO_FORMANDO_CAMPEOES_BASE64);
    const size = scaleToFit(nat.w, nat.h, 150, LOGO_MAX_H);
    const centerCol = Math.floor(totalCols / 2) - 1;
    const id   = workbook.addImage({ base64: extractBase64(LOGO_FORMANDO_CAMPEOES_BASE64), extension: "png" });
    ws.addImage(id, { tl: { col: centerCol, row: 0.2 }, ext: size });
  } catch (_) { /* logo indisponível */ }

  // Logo Ministério do Esporte – direita (máx 250 × 160)
  try {
    const nat  = await getImageNaturalSize(LOGO_MINISTERIO_ESPORTE_BASE64);
    const size = scaleToFit(nat.w, nat.h, 250, LOGO_MAX_H);
    const id   = workbook.addImage({ base64: extractBase64(LOGO_MINISTERIO_ESPORTE_BASE64), extension: "png" });
    ws.addImage(id, { tl: { col: totalCols - 5.5, row: 0.3 }, ext: size });
  } catch (_) { /* logo indisponível */ }

  // ════════════════════════════════════════════════════════════════════════
  // LINHA 8 : Barra de Informações Principal
  // ════════════════════════════════════════════════════════════════════════
  const turnoBase = (turmaData.turno || "")
    .replace(/Seg\/Qua/i,           "SEGUNDA E QUARTA")
    .replace(/Ter[çc]a\/Quinta/i,   "TERÇA E QUINTA")
    .replace(/\s*\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\s*/g, "")
    .trim();

  const horario        = getHorarioText(turmaData.turno) || "09:00 às 10:00";
  const finalTurnoText = `${turnoBase.toUpperCase()} ${horario}`;

  ws.getRow(8).height = 22;

  ws.getCell(8, 1).value              = "CIDADE DO POVO";
  ws.getCell(8, 3).value              = finalTurnoText;
  ws.getCell(8, 7).value              = monthName;
  ws.getCell(8, 7 + dayColCount).value = "PROF: RODILSON DO N. BARDALES";

  ws.mergeCells(8, 1, 8, 2);
  applyBorderAndFont(ws, 8, 1, 8, 2, fontBold10, thinBorder, alignCenter);

  ws.mergeCells(8, 3, 8, 6);
  applyBorderAndFont(ws, 8, 3, 8, 6, fontBold10, thinBorder, alignCenter);

  ws.mergeCells(8, 7, 8, 6 + dayColCount);
  applyBorderAndFont(ws, 8, 7, 8, 6 + dayColCount, fontBold10, thinBorder, alignCenter);

  ws.mergeCells(8, 7 + dayColCount, 8, totalCols);
  applyBorderAndFont(ws, 8, 7 + dayColCount, 8, totalCols, fontBold10, thinBorder, alignCenter);

  // ════════════════════════════════════════════════════════════════════════
  // LINHA 9 : Sub-cabeçalho (Nome da turma + CREF + Validade)
  // ════════════════════════════════════════════════════════════════════════
  ws.getRow(9).height = 18;

  ws.getCell(9, 7).value              = (turmaData.nome || "").toUpperCase();
  ws.getCell(9, 7 + dayColCount).value = "CREF: 25006/AC";
  ws.getCell(9, totalCols - 1).value  = "VAL: 31/12/2029";

  ws.mergeCells(9, 1, 9, 6);
  applyBorderAndFont(ws, 9, 1, 9, 6, fontBold8, thinBorder, alignCenter);

  ws.mergeCells(9, 7, 9, 6 + dayColCount);
  applyBorderAndFont(ws, 9, 7, 9, 6 + dayColCount, fontBold8, thinBorder, alignCenter);

  ws.mergeCells(9, 7 + dayColCount, 9, totalCols - 2);
  applyBorderAndFont(ws, 9, 7 + dayColCount, 9, totalCols - 2, fontBold8, thinBorder, alignCenter);

  ws.mergeCells(9, totalCols - 1, 9, totalCols);
  applyBorderAndFont(ws, 9, totalCols - 1, 9, totalCols, fontBold8, thinBorder, alignCenter);

  // ════════════════════════════════════════════════════════════════════════
  // LINHA 10 : Cabeçalho da Tabela
  // ════════════════════════════════════════════════════════════════════════
  const headValues: string[] = ["Nº", "NOME DO ALUNO", "PESO", "ALTURA", "IMC", "ANO NASC."];
  classDays.forEach((d) => headValues.push(String(d)));
  headValues.push("RESP. ALUNOS", "WHATSAPP 1", "WHATSAPP 2");

  const headRow = ws.getRow(10);
  headRow.height = 20;
  headValues.forEach((val, idx) => { headRow.getCell(idx + 1).value = val; });

  for (let c = 1; c <= totalCols; c++) {
    const cell = headRow.getCell(c);
    cell.font      = fontBold8;
    cell.border    = thinBorder;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // ════════════════════════════════════════════════════════════════════════
  // LINHAS 11+ : Dados dos Beneficiários
  // ════════════════════════════════════════════════════════════════════════
  const attMap: Record<string, Record<number, string>> = {};
  preses.forEach((p) => {
    const day = new Date(p.data + "T12:00:00").getDate();
    if (!attMap[p.beneficiario_id]) attMap[p.beneficiario_id] = {};
    attMap[p.beneficiario_id][day] = p.presente ? "P" : "F";
  });

  benefs.forEach((b, i) => {
    const rowValues: (string | number)[] = [
      i + 1,
      (b.nome || "").toUpperCase(),
      b.peso   ? Number(b.peso).toFixed(1).replace(".", ",")  : "",
      b.altura ? Number(b.altura).toFixed(2).replace(".", ",") : "",
      b.imc    ? Number(b.imc).toFixed(1).replace(".", ",")   : "",
      b.data_nascimento
        ? new Date(b.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")
        : "",
    ];
    classDays.forEach((day) => rowValues.push(attMap[b.id]?.[day] || ""));
    rowValues.push(b.responsavel_nome || "", b.responsavel_telefone || "", "");

    const rNum    = 11 + i;
    const dataRow = ws.getRow(rNum);
    dataRow.height = 18;
    rowValues.forEach((val, idx) => { dataRow.getCell(idx + 1).value = val; });

    for (let c = 1; c <= totalCols; c++) {
      const cell = dataRow.getCell(c);
      cell.font      = fontRegular8;
      cell.border    = thinBorder;
      cell.alignment = alignCenter;

      if (cell.value === "P") {
        cell.font = fontBold8;
      } else if (cell.value === "F") {
        cell.font = { name: "Calibri", size: 8, bold: true, color: { argb: "FFDC2626" } };
      }
    }
    dataRow.getCell(2).alignment             = alignLeft; // Nome à esquerda
    dataRow.getCell(7 + dayColCount).alignment = alignLeft; // Responsável à esquerda
  });

  // ════════════════════════════════════════════════════════════════════════
  // Linhas de Totais: PRESENTES / FALTAS
  // ════════════════════════════════════════════════════════════════════════
  const dayTotals = classDays.map((day) => {
    let p = 0, f = 0;
    benefs.forEach((b) => {
      const mark = attMap[b.id]?.[day];
      if (mark === "P") p++;
      else if (mark === "F") f++;
    });
    return { p, f };
  });

  const presRowIndex = 11 + benefs.length;
  const faltRowIndex = 12 + benefs.length;

  ws.getCell(presRowIndex, 1).value = "PRESENTES";
  ws.getCell(faltRowIndex, 1).value = "FALTAS";
  classDays.forEach((_, i) => {
    ws.getCell(presRowIndex, 7 + i).value = dayTotals[i].p || "";
    ws.getCell(faltRowIndex, 7 + i).value = dayTotals[i].f || "";
  });

  ws.mergeCells(presRowIndex, 1, presRowIndex, 6);
  ws.mergeCells(faltRowIndex, 1, faltRowIndex, 6);

  [presRowIndex, faltRowIndex].forEach((rIndex, idx) => {
    const r = ws.getRow(rIndex);
    r.height = 18;
    for (let c = 1; c <= totalCols; c++) {
      const cell = r.getCell(c);
      cell.border    = thinBorder;
      cell.alignment = alignCenter;

      if (c === 1) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.font      = fontBold8;
      } else if (c >= 7 && c <= 6 + dayColCount) {
        cell.font = idx === 0
          ? fontBold8
          : { name: "Calibri", size: 8, bold: true, color: { argb: "FFDC2626" } };
      }
    }
  });
};

// ─── Download do workbook ────────────────────────────────────────────────────

export const downloadExcel = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

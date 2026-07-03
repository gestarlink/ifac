import jsPDF from "jspdf";

const PREP_SIGNATURE_IMAGES: Record<string, string> = {
  coordenador: "/signatures/prep-coordenador.png",
  professor: "/signatures/prep-professor.png",
  monitor: "/signatures/prep-monitor.png",
};

const APROV_SIGNATURE_IMAGES: Record<string, string> = {
  coordenador: "/signatures/aprov-coordenador.png",
  professor: "/signatures/aprov-professor.png",
  monitor: "/signatures/aprov-monitor.png",
};

async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("erro");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type RoleType = "coordenador" | "professor" | "monitor";

interface AtividadeData {
  nome_atividade: string;
  data_inicio: string;
  data_conclusao: string | null;
  anotacoes: string | null;
  descricao: string | null;
}

const ROLE_TITLES: Record<RoleType, string> = {
  coordenador: "COORDENADOR DE NÚCLEO",
  professor: "PROFESSOR DE ED. FÍSICA",
  monitor: "MONITOR",
};

const ROLE_PREPARED_NAMES: Record<RoleType, string> = {
  coordenador: "JAY MACHENZLE DO NASCIMENTO LIMA",
  professor: "RODILSON DO NASCIMENTO BARDALES",
  monitor: "FRANCISCO DELCIMARG. DE OLIVEIRA",
};

const ROLE_SIGNATURE_NAMES: Record<RoleType, string> = {
  coordenador: "Jay Machenzle do Nascimento Lima",
  professor: "Rodilson do N. Bardales",
  monitor: "Francisco Delcimar G. de Oliveira",
};

const HEADER_BG: [number, number, number] = [197, 211, 224];
const BORDER_COLOR: [number, number, number] = [160, 160, 160];

function drawCell(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  text: string, options?: {
    fill?: boolean; bold?: boolean; fontSize?: number;
    align?: "left" | "center"; italic?: boolean; multiline?: boolean;
  }
) {
  const { fill = false, bold = false, fontSize = 7, align = "left", italic = false } = options || {};

  if (fill) {
    doc.setFillColor(...HEADER_BG);
    doc.rect(x, y, w, h, "F");
  }
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(x, y, w, h, "S");

  const fontStyle = bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);

  const textX = align === "center" ? x + w / 2 : x + 2;
  const textAlign = align === "center" ? "center" : "left";

  if (options?.multiline) {
    const lines = doc.splitTextToSize(text, w - 4);
    doc.text(lines, textX, y + 3.5, { align: textAlign });
  } else {
    doc.text(text, textX, y + h / 2 + 1, { align: textAlign, maxWidth: w - 4 });
  }
}

export async function generateAtividadesReport(
  role: RoleType,
  atividades: AtividadeData[],
  nucleo: string = "CIDADE DO POVO"
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 10; // margin
  const CW = W - 2 * M; // content width
  let y = M;

  // ===== TITLE BAR =====
  doc.setFillColor(...HEADER_BG);
  doc.rect(M, y, CW, 12, "F");
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(M, y, CW, 12, "S");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`RELATÓRIO DE ATIVIDADES - ${ROLE_TITLES[role]}`, M + 4, y + 8);
  y += 12;

  // ===== TERMO DE FOMENTO / NÚCLEO HEADER =====
  const halfW = CW / 2;
  drawCell(doc, M, y, halfW, 5, "TERMO DEFOMENTO", { bold: true, fontSize: 7 });
  drawCell(doc, M + halfW, y, halfW, 5, "NÚCLEO", { bold: true, fontSize: 7, align: "center" });
  y += 5;

  drawCell(doc, M, y, halfW, 5, "972536/2024 MINISTÉRIO DO ESPORTE - MESP", { fontSize: 7 });
  drawCell(doc, M + halfW, y, halfW, 5, nucleo, { fontSize: 7, align: "center" });
  y += 5;

  // ===== RELATÓRIO SEMANAL =====
  drawCell(doc, M, y, CW, 5, "RELATÓRIO SEMANAL", { fill: true, bold: true, fontSize: 8 });
  y += 5;

  // ===== ACTIVITIES =====
  const labelW = 22;
  const valueW = CW - labelW;
  const notesLabel = role === "monitor" ? "ANO TAÇÕES" : "ANOTAÇÕES";

  for (const atv of atividades) {
    // Estimate height needed for this activity block
    const anotacoes = atv.anotacoes || atv.descricao || "";
    const textLines = doc.splitTextToSize(anotacoes, valueW - 4);
    const anotH = Math.max(8, textLines.length * 3 + 4);
    const blockH = 8 + 5 + anotH; // nome + dates + anotacoes

    // Page break check
    if (y + blockH > 270) {
      doc.addPage();
      y = M;
    }

    // Row 1: NOME DA ATIVIDADE
    drawCell(doc, M, y, labelW, 8, "NOME DA\nATIVIDADE", { fill: true, bold: true, fontSize: 6, multiline: true });
    drawCell(doc, M + labelW, y, valueW, 8, atv.nome_atividade || "", { fontSize: 8 });
    y += 8;

    // Row 2: DATA DE INÍCIO | value | DATA DE CONCLUSÃO | value
    const dateLabelW = 22;
    const dateValW = (CW - dateLabelW * 2) / 2;

    drawCell(doc, M, y, dateLabelW, 5, "DATA DE INÍCIO", { fill: true, bold: true, fontSize: 6 });
    const di = atv.data_inicio ? new Date(atv.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "";
    drawCell(doc, M + dateLabelW, y, dateValW, 5, di, { fontSize: 7, align: "center" });

    const x2 = M + dateLabelW + dateValW;
    drawCell(doc, x2, y, dateLabelW, 5, "DATA DE\nCONCLUSÃO", { fill: true, bold: true, fontSize: 5, multiline: true });
    const dc = atv.data_conclusao ? new Date(atv.data_conclusao + "T12:00:00").toLocaleDateString("pt-BR") : "";
    drawCell(doc, x2 + dateLabelW, y, dateValW, 5, dc, { fontSize: 7, align: "center" });
    y += 5;

    // Row 3: ANOTAÇÕES label + text
    drawCell(doc, M, y, labelW, anotH, notesLabel, { fill: true, bold: true, fontSize: 6 });

    // Draw the text cell manually for multiline
    doc.setDrawColor(...BORDER_COLOR);
    doc.rect(M + labelW, y, valueW, anotH, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(textLines, M + labelW + 2, y + 3.5);
    y += anotH;
  }

  // ===== SIGNATURE BLOCK =====
  if (y > 245) { doc.addPage(); y = M; }
  y += 3;

  const col1 = CW * 0.38;
  const col2 = CW * 0.38;
  const col3 = CW * 0.24;

  // PREPARADO headers
  drawCell(doc, M, y, col1, 5, "PREPARADO PELO NOME E TÍTULO", { fill: true, bold: true, fontSize: 6 });
  drawCell(doc, M + col1, y, col2, 5, "PREPARADO POR ASSINATURA", { fill: true, bold: true, fontSize: 6 });
  drawCell(doc, M + col1 + col2, y, col3, 5, "DATA", { fill: true, bold: true, fontSize: 6 });
  y += 5;

  // Load signature images
  let preparadoSigImg: string | null = null;
  let aprovadoSigImg: string | null = null;
  try {
    preparadoSigImg = await loadImageAsBase64(PREP_SIGNATURE_IMAGES[role]);
  } catch (e) {
    console.warn("Não foi possível carregar imagem de assinatura preparado", e);
  }
  try {
    aprovadoSigImg = await loadImageAsBase64(APROV_SIGNATURE_IMAGES[role]);
  } catch (e) {
    console.warn("Não foi possível carregar imagem de assinatura aprovado", e);
  }

  // PREPARADO values
  const today = new Date().toLocaleDateString("pt-BR");
  drawCell(doc, M, y, col1, 8, ROLE_PREPARED_NAMES[role], { fontSize: 7, bold: true });
  
  // Signature image cell
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(M + col1, y, col2, 8, "S");
  if (preparadoSigImg) {
    try {
      doc.addImage(preparadoSigImg, "PNG", M + col1 + 8, y + 1, col2 - 16, 6);
    } catch (e) {
      console.error(e);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(11);
      doc.text(ROLE_SIGNATURE_NAMES[role], M + col1 + col2 / 2, y + 5.5, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(11);
    doc.text(ROLE_SIGNATURE_NAMES[role], M + col1 + col2 / 2, y + 5.5, { align: "center" });
  }

  drawCell(doc, M + col1 + col2, y, col3, 8, today, { fontSize: 7, bold: true, align: "center" });
  y += 8;

  // APROVADO headers
  drawCell(doc, M, y, col1, 5, "APROVADO POR NOME E TÍTULO", { fill: true, bold: true, fontSize: 6 });
  drawCell(doc, M + col1, y, col2, 5, "APROVADO POR ASSINATURA", { fill: true, bold: true, fontSize: 6 });
  drawCell(doc, M + col1 + col2, y, col3, 5, "DATA", { fill: true, bold: true, fontSize: 6 });
  y += 5;

  // APROVADO values
  drawCell(doc, M, y, col1, 8, "GABRIEL DE ARAÚJO BRITO   COORD. DE PROJETO", { fontSize: 7, bold: true });
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(M + col1, y, col2, 8, "S");
  if (aprovadoSigImg) {
    try {
      doc.addImage(aprovadoSigImg, "PNG", M + col1 + 8, y + 1, col2 - 16, 6);
    } catch (e) {
      console.error(e);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(11);
      doc.text("Gabriel de Araújo Brito", M + col1 + col2 / 2, y + 5.5, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(11);
    doc.text("Gabriel de Araújo Brito", M + col1 + col2 / 2, y + 5.5, { align: "center" });
  }

  drawCell(doc, M + col1 + col2, y, col3, 8, today, { fontSize: 7, bold: true, align: "center" });

  // Save
  const meses = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const now = new Date();
  const semana = Math.ceil(now.getDate() / 7);
  doc.save(`relatorio_atividades_${role}_${semana}a_semana_${meses[now.getMonth()]}_${now.getFullYear()}.pdf`);
}

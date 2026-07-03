import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Turma schedule mapping
const TURMA_HORARIOS: Record<string, string> = {
  "MANHÃ": "09:00 ás 10:00",
  "TARDE": "14:00 ás 15:00",
  "INTEGRAL": "09:00 ás 15:00",
};

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

async function embedImage(pdfDoc: any, url: string) {
  const bytes = await fetchImageBytes(url);
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    let mes = now.getMonth(); // 0-11
    let ano = now.getFullYear();

    try {
      const body = await req.json();
      if (body && typeof body.mes === "number") mes = body.mes;
      if (body && typeof body.ano === "number") ano = body.ano;
    } catch {
      // No body passed, use current month/year
    }

    const startOfMonth = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(ano, mes + 1, 0).getDate();
    const endOfMonth = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Get photos of the selected month with turma info
    const { data: fotos, error: fotosError } = await supabase
      .from("fotos")
      .select("*, turmas(nome, modalidade, turno)")
      .gte("data", startOfMonth)
      .lte("data", endOfMonth)
      .order("created_at", { ascending: false });

    if (fotosError) throw fotosError;
    if (!fotos || fotos.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma foto disponível" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by modalidade + turno
    const groups: Record<string, typeof fotos> = {};
    for (const foto of fotos) {
      const modalidade = foto.turmas?.modalidade || "GERAL";
      const turno = foto.turmas?.turno || "INTEGRAL";
      const key = `${modalidade}|${turno}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(foto);
    }

    // Select up to 6 photos per group
    const selectedByGroup: Record<string, typeof fotos> = {};
    for (const [key, groupFotos] of Object.entries(groups)) {
      selectedByGroup[key] = groupFotos.slice(0, 6);
    }

    const allSelected = Object.values(selectedByGroup).flat();
    if (allSelected.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma foto selecionada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load logos from storage
    const logoBaseUrl = `${supabaseUrl}/storage/v1/object/public/logos`;
    let logoFac: any, logoMinisterio: any, logoGoverno: any;
    try {
      [logoFac, logoMinisterio, logoGoverno] = await Promise.all([
        embedImage(null, ""), // placeholder, will handle below
        embedImage(null, ""),
        embedImage(null, ""),
      ].map(() => null));
    } catch { /* will handle individually */ }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load logos
    try {
      logoFac = await embedImage(pdfDoc, `${logoBaseUrl}/logo-fac.png`);
    } catch (e) { console.error("Failed to load FAC logo:", e); }
    try {
      logoMinisterio = await embedImage(pdfDoc, `${logoBaseUrl}/logo-ministerio-esporte.png`);
    } catch (e) { console.error("Failed to load Ministry logo:", e); }
    try {
      logoGoverno = await embedImage(pdfDoc, `${logoBaseUrl}/logo-governo-federal.png`);
    } catch (e) { console.error("Failed to load Govt logo:", e); }

    // A4 dimensions
    const pageW = 595;
    const pageH = 842;
    const margin = 30;
    const contentW = pageW - 2 * margin;

    // Generate one page per turma group
    for (const [key, groupFotos] of Object.entries(selectedByGroup)) {
      const [modalidade, turno] = key.split("|");
      const horario = TURMA_HORARIOS[turno] || TURMA_HORARIOS["INTEGRAL"];

      const page = pdfDoc.addPage([pageW, pageH]);
      let y = pageH - margin;

      // ===== HEADER WITH 3 LOGOS =====
      const logoH = 55;
      const logoFacW = logoFac ? (logoFac.width / logoFac.height) * logoH : 55;
      const logoMinW = logoMinisterio ? (logoMinisterio.width / logoMinisterio.height) * logoH : 80;
      const logoGovW = logoGoverno ? (logoGoverno.width / logoGoverno.height) * logoH : 80;

      // Draw FAC logo (left)
      if (logoFac) {
        page.drawImage(logoFac, {
          x: margin,
          y: y - logoH,
          width: logoFacW,
          height: logoH,
        });
      }

      // Draw "INSTITUTO FORMANDO ÁGUIAS & CAMPEÕES" text next to FAC logo
      const instText = "INSTITUTO\nFORMANDO ÁGUIAS\n& CAMPEÕES";
      const instLines = instText.split("\n");
      const instX = margin + logoFacW + 5;
      instLines.forEach((line, i) => {
        page.drawText(line, {
          x: instX,
          y: y - 15 - i * 12,
          size: 8,
          font: fontBold,
          color: rgb(0, 0.2, 0.5),
        });
      });

      // Draw Ministry logo (center)
      if (logoMinisterio) {
        const minX = pageW / 2 - logoMinW / 2;
        page.drawImage(logoMinisterio, {
          x: minX,
          y: y - logoH,
          width: logoMinW,
          height: logoH,
        });
      }

      // Draw Government logo (right)
      if (logoGoverno) {
        page.drawImage(logoGoverno, {
          x: pageW - margin - logoGovW,
          y: y - logoH,
          width: logoGovW,
          height: logoH,
        });
      }

      y -= logoH + 15;

      // ===== TITLE: "SUB X - TURNO - HORARIO XX:XX ás XX:XX" =====
      const titulo = `${modalidade} - ${turno} - HORARIO ${horario}`;
      const tituloW = fontBold.widthOfTextAtSize(titulo, 16);
      page.drawText(titulo, {
        x: pageW / 2 - tituloW / 2,
        y,
        size: 16,
        font: fontBold,
        color: rgb(0, 0.35, 0.75),
      });

      y -= 25;

      // ===== PHOTO GRID (2 columns, up to 3 rows = 6 photos) =====
      const gap = 10;
      const photoW = (contentW - gap) / 2;
      const photoH = photoW * 0.7; // aspect ratio ~7:10

      for (let i = 0; i < groupFotos.length && i < 6; i++) {
        const foto = groupFotos[i];
        const col = i % 2;
        const row = Math.floor(i / 2);

        const photoX = margin + col * (photoW + gap);
        const photoY = y - (row + 1) * (photoH + gap);

        // Draw photo border/placeholder
        page.drawRectangle({
          x: photoX,
          y: photoY,
          width: photoW,
          height: photoH,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
        });

        // Try to embed actual photo
        try {
          const imgResponse = await fetch(foto.url);
          const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());
          const contentType = imgResponse.headers.get("content-type") || "";

          let image;
          if (contentType.includes("png")) {
            image = await pdfDoc.embedPng(imgBytes);
          } else {
            image = await pdfDoc.embedJpg(imgBytes);
          }

          // Scale to fit cell while maintaining aspect ratio
          const imgDims = image.scale(1);
          const scaleX = photoW / imgDims.width;
          const scaleY = photoH / imgDims.height;
          const scale = Math.min(scaleX, scaleY);
          const drawW = imgDims.width * scale;
          const drawH = imgDims.height * scale;

          // Center in cell
          const offsetX = (photoW - drawW) / 2;
          const offsetY = (photoH - drawH) / 2;

          page.drawImage(image, {
            x: photoX + offsetX,
            y: photoY + offsetY,
            width: drawW,
            height: drawH,
          });
        } catch (err) {
          console.error(`Failed to embed photo ${foto.id}:`, err);
          // Draw placeholder text
          page.drawText("Foto indisponível", {
            x: photoX + photoW / 2 - 35,
            y: photoY + photoH / 2,
            size: 9,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }

      // ===== FOOTER: small FAC logo centered =====
      const footerLogoH = 35;
      if (logoFac) {
        const footerLogoW = (logoFac.width / logoFac.height) * footerLogoH;
        page.drawImage(logoFac, {
          x: pageW / 2 - footerLogoW / 2,
          y: margin,
          width: footerLogoW,
          height: footerLogoH,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();

    // Upload PDF to storage
    const nomeArquivo = `relatorio_fotografico_${MESES[mes].toLowerCase()}_${ano}.pdf`;
    const storagePath = `relatorios/${ano}/${nomeArquivo}`;

    const { error: uploadError } = await supabase.storage
      .from("fotos")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("fotos")
      .getPublicUrl(storagePath);

    // Save report record
    const { error: insertError } = await supabase
      .from("relatorios_fotograficos")
      .insert({
        mes: mes + 1,
        ano,
        url: urlData.publicUrl,
        nome_arquivo: nomeArquivo,
        total_fotos: allSelected.length,
      });

    if (insertError) throw insertError;

    // We do NOT delete the photos anymore to allow re-emissions and keep history
    // const fotoIds = allSelected.map((f) => f.id);
    // const { error: deleteError } = await supabase.from("fotos").delete().in("id", fotoIds);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatório gerado com ${allSelected.length} fotos`,
        url: urlData.publicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { rooms, propertyType, style, totalDescription } = await req.json();

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: "Aucune pièce fournie" }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // === PAGE DE COUVERTURE ===
    const coverPage = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = coverPage.getSize();

    // Fond sombre élégant
    coverPage.drawRectangle({
      x: 0, y: 0, width, height,
      color: rgb(0.08, 0.08, 0.12),
    });

    // Bande décorative dorée
    coverPage.drawRectangle({
      x: 40, y: height - 80, width: width - 80, height: 3,
      color: rgb(0.85, 0.72, 0.4),
    });

    // Titre principal
    const title = "VEFA Vision";
    const titleSize = 42;
    const titleWidth = font.widthOfTextAtSize(title, titleSize);
    coverPage.drawText(title, {
      x: (width - titleWidth) / 2,
      y: height - 160,
      size: titleSize,
      font,
      color: rgb(0.95, 0.92, 0.85),
    });

    // Sous-titre
    const subtitle = "Home Staging par Intelligence Artificielle";
    const subtitleSize = 16;
    const subtitleWidth = fontRegular.widthOfTextAtSize(subtitle, subtitleSize);
    coverPage.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height - 200,
      size: subtitleSize,
      font: fontRegular,
      color: rgb(0.7, 0.68, 0.6),
    });

    // Type de bien
    const propertyLabel = propertyType === "maison" ? "MAISON INDIVIDUELLE" : "APPARTEMENT";
    const styleLabel = style ? style.toUpperCase() : "MODERNE";
    const propWidth = font.widthOfTextAtSize(propertyLabel, 14);
    coverPage.drawText(propertyLabel, {
      x: (width - propWidth) / 2,
      y: height - 260,
      size: 14,
      font,
      color: rgb(0.85, 0.72, 0.4),
    });

    const styleTxt = "Style : " + styleLabel;
    const styleW = fontRegular.widthOfTextAtSize(styleTxt, 13);
    coverPage.drawText(styleTxt, {
      x: (width - styleW) / 2,
      y: height - 285,
      size: 13,
      font: fontRegular,
      color: rgb(0.7, 0.68, 0.6),
    });

    // Description générale
    if (totalDescription) {
      const descLines = wrapText(totalDescription, fontRegular, 12, width - 120);
      let yPos = height - 350;
      for (const line of descLines.slice(0, 6)) {
        coverPage.drawText(line, {
          x: 60, y: yPos, size: 12, font: fontRegular,
          color: rgb(0.75, 0.73, 0.68),
        });
        yPos -= 20;
      }
    }

    // Nombre de pièces
    const roomCountTxt = `${rooms.length} pièce${rooms.length > 1 ? "s" : ""} décorée${rooms.length > 1 ? "s" : ""}`;
    const rcW = font.widthOfTextAtSize(roomCountTxt, 15);
    coverPage.drawText(roomCountTxt, {
      x: (width - rcW) / 2,
      y: 140,
      size: 15,
      font,
      color: rgb(0.85, 0.72, 0.4),
    });

    // Bande décorative bas
    coverPage.drawRectangle({
      x: 40, y: 60, width: width - 80, height: 3,
      color: rgb(0.85, 0.72, 0.4),
    });

    // Date
    const dateTxt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const dateW = fontRegular.widthOfTextAtSize(dateTxt, 11);
    coverPage.drawText(dateTxt, {
      x: (width - dateW) / 2,
      y: 38,
      size: 11,
      font: fontRegular,
      color: rgb(0.5, 0.48, 0.44),
    });

    // === PAGE PAR PIÈCE ===
    for (const room of rooms) {
      if (!room.imageUrl) continue;

      let imageBytes: ArrayBuffer;
      try {
        const imgRes = await fetch(room.imageUrl);
        if (!imgRes.ok) continue;
        imageBytes = await imgRes.arrayBuffer();
      } catch {
        continue;
      }

      // Détecter PNG vs JPEG
      const header = new Uint8Array(imageBytes.slice(0, 4));
      const isPng = header[0] === 0x89 && header[1] === 0x50;
      
      let embeddedImage;
      try {
        embeddedImage = isPng
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);
      } catch {
        continue;
      }

      const page = pdfDoc.addPage([842, 595]); // A4 paysage pour les images
      const pw = page.getWidth();
      const ph = page.getHeight();

      // Fond sombre
      page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(0.08, 0.08, 0.12) });

      // Zone image (80% de la largeur, centré)
      const imgMaxW = pw - 80;
      const imgMaxH = ph - 100;
      const imgDims = embeddedImage.scaleToFit(imgMaxW, imgMaxH);

      page.drawImage(embeddedImage, {
        x: (pw - imgDims.width) / 2,
        y: (ph - imgDims.height) / 2 + 20,
        width: imgDims.width,
        height: imgDims.height,
      });

      // Bandeau titre en bas
      page.drawRectangle({
        x: 0, y: 0, width: pw, height: 45,
        color: rgb(0.08, 0.08, 0.12),
        opacity: 0.95,
      });

      const roomNameTxt = room.name || "Pièce";
      page.drawText(roomNameTxt, {
        x: 30, y: 15, size: 18, font,
        color: rgb(0.95, 0.92, 0.85),
      });

      if (room.dimensions) {
        page.drawText(room.dimensions, {
          x: 30 + font.widthOfTextAtSize(roomNameTxt, 18) + 15,
          y: 18, size: 12, font: fontRegular,
          color: rgb(0.85, 0.72, 0.4),
        });
      }

      // Style affiché en haut à droite
      const styleStr = styleLabel;
      const sw = fontRegular.widthOfTextAtSize(styleStr, 11);
      page.drawText(styleStr, {
        x: pw - sw - 20, y: ph - 25, size: 11, font: fontRegular,
        color: rgb(0.85, 0.72, 0.4),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({ success: true, pdfBase64: base64 });
  } catch (error: any) {
    console.error("Share API error:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

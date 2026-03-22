import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;
    const files = formData.getAll("files") as File[];
    if (!action) return NextResponse.json({ error: "Action requise" }, { status: 400 });

    if (action === "merge") {
      if (files.length < 2) return NextResponse.json({ error: "Au moins 2 fichiers requis" }, { status: 400 });
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
      return new NextResponse(mergedBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="merged_${Date.now()}.pdf"` } });
    }

    if (action === "split") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const rangeStr = (formData.get("range") as string) || "";
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = sourcePdf.getPageCount();
      if (!rangeStr) return NextResponse.json({ success: true, info: true, totalPages, message: `PDF de ${totalPages} pages. Specifiez une plage (ex: "1-3,5").` });
      const pageIndices: number[] = [];
      for (const part of rangeStr.split(",")) {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
          const [start, end] = trimmed.split("-").map((n) => parseInt(n) - 1);
          for (let i = Math.max(0, start); i <= Math.min(end, totalPages - 1); i++) pageIndices.push(i);
        } else { const idx = parseInt(trimmed) - 1; if (idx >= 0 && idx < totalPages) pageIndices.push(idx); }
      }
      if (pageIndices.length === 0) return NextResponse.json({ error: "Plage invalide" }, { status: 400 });
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(sourcePdf, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));
      const newBytes = await newPdf.save({ useObjectStreams: true });
      return new NextResponse(newBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="split_${Date.now()}.pdf"` } });
    }

    if (action === "compress") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      const ratio = Math.round((1 - compressedBytes.length / buffer.length) * 100);
      return new NextResponse(compressedBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="compressed_${Date.now()}.pdf"`, "X-Original-Size": buffer.length.toString(), "X-Compressed-Size": compressedBytes.length.toString(), "X-Compression-Ratio": `${ratio}%` } });
    }

    if (action === "rotate") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const angle = parseInt((formData.get("angle") as string) || "90");
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pdfDoc.getPages().forEach((page) => page.setRotation(degrees((page.getRotation().angle + angle) % 360)));
      const rotatedBytes = await pdfDoc.save();
      return new NextResponse(rotatedBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="rotated_${Date.now()}.pdf"` } });
    }

    if (action === "watermark") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const text = (formData.get("text") as string) || "CONFIDENTIEL";
      const opacity = parseFloat((formData.get("opacity") as string) || "0.15");
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) * 0.08;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, { x: width / 2 - textWidth / 2, y: height / 2, size: fontSize, font, color: rgb(0.5, 0.5, 0.5), opacity, rotate: degrees(45) });
      }
      const watermarkedBytes = await pdfDoc.save();
      return new NextResponse(watermarkedBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="watermarked_${Date.now()}.pdf"` } });
    }

    if (action === "annotate") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const annotationText = (formData.get("annotationText") as string) || "";
      const pageNum = parseInt((formData.get("page") as string) || "1") - 1;
      const color = (formData.get("color") as string) || "yellow";
      if (!annotationText) return NextResponse.json({ error: "Texte d'annotation requis" }, { status: 400 });
      const colorMap: Record<string, [number, number, number]> = { yellow: [1, 0.9, 0], red: [1, 0.2, 0.2], blue: [0.2, 0.5, 1], green: [0.2, 0.8, 0.3] };
      const [r, g, b] = colorMap[color] || colorMap.yellow;
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const page = pages[Math.min(pageNum, pages.length - 1)];
      const { width, height } = page.getSize();
      const fontSize = 12; const padding = 4;
      const textW = font.widthOfTextAtSize(annotationText, fontSize);
      const x = width * 0.1; const y = height * 0.1;
      page.drawRectangle({ x: x - padding, y: y - padding, width: textW + padding * 2, height: fontSize + padding * 2, color: rgb(r, g, b), opacity: 0.7 });
      page.drawText(annotationText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      const annotatedBytes = await pdfDoc.save();
      return new NextResponse(annotatedBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="annotated_${Date.now()}.pdf"` } });
    }

    if (action === "sign") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const signatureBase64 = formData.get("signatureBase64") as string;
      const pageNum = parseInt((formData.get("page") as string) || "1") - 1;
      const widthPct = parseFloat((formData.get("widthPct") as string) || "20");
      if (!signatureBase64) return NextResponse.json({ error: "Image de signature requise" }, { status: 400 });
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const sigBuffer = Buffer.from(signatureBase64.replace(/^data:image\/[a-z]+;base64,/, ""), "base64");
      const cleanSig = await sharp(sigBuffer).png().toBuffer();
      const sigImage = await pdfDoc.embedPng(cleanSig);
      const pages = pdfDoc.getPages();
      const page = pages[Math.min(pageNum, pages.length - 1)];
      const { width, height } = page.getSize();
      const sigW = (widthPct / 100) * width;
      const sigH = sigW * (sigImage.height / sigImage.width);
      page.drawImage(sigImage, { x: width * 0.6, y: height * 0.1, width: sigW, height: sigH });
      const signedBytes = await pdfDoc.save();
      return new NextResponse(signedBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="signed_${Date.now()}.pdf"` } });
    }

    if (action === "info") {
      if (files.length !== 1) return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      return NextResponse.json({ success: true, pageCount: pdfDoc.getPageCount(), fileName: files[0].name, fileSize: buffer.length, dimensions: pages[0] ? { width: pages[0].getWidth(), height: pages[0].getHeight() } : null });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("PDF tools error:", error);
    if (error?.message?.includes("encrypted")) return NextResponse.json({ error: "PDF protege par mot de passe." }, { status: 422 });
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

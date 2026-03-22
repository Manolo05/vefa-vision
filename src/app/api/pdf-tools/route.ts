import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

export const maxDuration = 120;

function pdfResponse(
  bytes: Uint8Array,
  filename: string,
  extraHeaders?: Record<string, string>
) {
  const buf = Buffer.from(bytes);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...extraHeaders,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;
    const files = formData.getAll("files") as File[];

    if (!action)
      return NextResponse.json({ error: "Action requise" }, { status: 400 });

    // ── MERGE ──────────────────────────────────────────────────────────────
    if (action === "merge") {
      if (files.length < 2)
        return NextResponse.json({ error: "Au moins 2 fichiers requis" }, { status: 400 });
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer());
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(src, src.getPageIndices());
        pages.forEach((p) => mergedPdf.addPage(p));
      }
      return pdfResponse(await mergedPdf.save({ useObjectStreams: true }), `merged_${Date.now()}.pdf`);
    }

    // ── SPLIT ───────────────────────────────────────────────────────────────
    if (action === "split") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const rangeStr = (formData.get("range") as string) || "";
      const buf = Buffer.from(await files[0].arrayBuffer());
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const totalPages = src.getPageCount();
      if (!rangeStr)
        return NextResponse.json({ success: true, info: true, totalPages, message: `PDF de ${totalPages} pages.` });

      const indices: number[] = [];
      for (const part of rangeStr.split(",")) {
        const t = part.trim();
        if (t.includes("-")) {
          const [s, e] = t.split("-").map((n) => parseInt(n) - 1);
          for (let i = Math.max(0, s); i <= Math.min(e, totalPages - 1); i++) indices.push(i);
        } else {
          const idx = parseInt(t) - 1;
          if (idx >= 0 && idx < totalPages) indices.push(idx);
        }
      }
      if (!indices.length)
        return NextResponse.json({ error: "Plage invalide" }, { status: 400 });

      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));
      return pdfResponse(await out.save({ useObjectStreams: true }), `split_${Date.now()}.pdf`);
    }

    // ── COMPRESS ────────────────────────────────────────────────────────────
    if (action === "compress") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const buf = Buffer.from(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const compressed = await doc.save({ useObjectStreams: true });
      const ratio = Math.round((1 - compressed.length / buf.length) * 100);
      return pdfResponse(compressed, `compressed_${Date.now()}.pdf`, {
        "X-Original-Size": buf.length.toString(),
        "X-Compressed-Size": compressed.length.toString(),
        "X-Compression-Ratio": `${ratio}%`,
      });
    }

    // ── ROTATE ──────────────────────────────────────────────────────────────
    if (action === "rotate") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const angle = parseInt((formData.get("angle") as string) || "90");
      const buf = Buffer.from(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + angle) % 360)));
      return pdfResponse(await doc.save(), `rotated_${Date.now()}.pdf`);
    }

    // ── WATERMARK ───────────────────────────────────────────────────────────
    if (action === "watermark") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const text = (formData.get("text") as string) || "CONFIDENTIEL";
      const opacity = parseFloat((formData.get("opacity") as string) || "0.15");
      const buf = Buffer.from(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) * 0.08;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, { x: width / 2 - textWidth / 2, y: height / 2, size: fontSize, font, color: rgb(0.5, 0.5, 0.5), opacity, rotate: degrees(45) });
      }
      return pdfResponse(await doc.save(), `watermarked_${Date.now()}.pdf`);
    }

    // ── ANNOTATE ────────────────────────────────────────────────────────────
    if (action === "annotate") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const annotationText = (formData.get("annotationText") as string) || "";
      const pageNum = parseInt((formData.get("page") as string) || "1") - 1;
      const color = (formData.get("color") as string) || "yellow";
      if (!annotationText)
        return NextResponse.json({ error: "Texte d'annotation requis" }, { status: 400 });

      const colorMap: Record<string, [number, number, number]> = {
        yellow: [1, 0.9, 0], red: [1, 0.2, 0.2], blue: [0.2, 0.5, 1], green: [0.2, 0.8, 0.3],
      };
      const [r, g, b] = colorMap[color] || colorMap.yellow;
      const buf = Buffer.from(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const page = pages[Math.min(pageNum, pages.length - 1)];
      const { width, height } = page.getSize();
      const fontSize = 12;
      const padding = 4;
      const textW = font.widthOfTextAtSize(annotationText, fontSize);
      const x = width * 0.1;
      const y = height * 0.1;
      page.drawRectangle({ x: x - padding, y: y - padding, width: textW + padding * 2, height: fontSize + padding * 2, color: rgb(r, g, b), opacity: 0.7 });
      page.drawText(annotationText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      return pdfResponse(await doc.save(), `annotated_${Date.now()}.pdf`);
    }

    // ── SIGN ────────────────────────────────────────────────────────────────
    if (action === "sign") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const signatureBase64 = formData.get("signatureBase64") as string;
      const pageNum = parseInt((formData.get("page") as string) || "1") - 1;
      const widthPct = parseFloat((formData.get("widthPct") as string) || "20");
      if (!signatureBase64)
        return NextResponse.json({ error: "Image de signature requise" }, { status: 400 });

      const buf = Buffer.from(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      // Strip data URL prefix without using regex with slashes
      const b64data = signatureBase64.includes("base64,")
        ? signatureBase64.split("base64,")[1]
        : signatureBase64;
      const sigBuf = Buffer.from(b64data, "base64");
      const cleanSig = await sharp(sigBuf).png().toBuffer();
      const sigImage = await doc.embedPng(cleanSig);
      const pages = doc.getPages();
      const page = pages[Math.min(pageNum, pages.length - 1)];
      const { width, height } = page.getSize();
      const sigW = (widthPct / 100) * width;
      const sigH = sigW * (sigImage.height / sigImage.width);
      page.drawImage(sigImage, { x: width * 0.6, y: height * 0.1, width: sigW, height: sigH });
      return pdfResponse(await doc.save(), `signed_${Date.now()}.pdf`);
    }

    // ── INFO ────────────────────────────────────────────────────────────────
    if (action === "info") {
      if (files.length !== 1)
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      const buf = Buffer.from(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();
      return NextResponse.json({
        success: true,
        pageCount: doc.getPageCount(),
        fileName: files[0].name,
        fileSize: buf.length,
        dimensions: pages[0] ? { width: pages[0].getWidth(), height: pages[0].getHeight() } : null,
      });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("PDF tools error:", error);
    if (error?.message?.includes("encrypted"))
      return NextResponse.json({ error: "PDF protege par mot de passe." }, { status: 422 });
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

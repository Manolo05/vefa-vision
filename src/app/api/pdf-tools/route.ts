import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees } from "pdf-lib";

export const maxDuration = 60;

// POST /api/pdf-tools
// body: FormData with action + files
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;
    const files = formData.getAll("files") as File[];

    if (!action) {
      return NextResponse.json({ error: "Action requise" }, { status: 400 });
    }

    // ── MERGE ──────────────────────────────────────────────────────────────
    if (action === "merge") {
      if (files.length < 2) {
        return NextResponse.json(
          { error: "Au moins 2 fichiers requis pour fusionner" },
          { status: 400 }
        );
      }

      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();

      return new NextResponse(mergedBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="merged_${Date.now()}.pdf"`,
        },
      });
    }

    // ── SPLIT ──────────────────────────────────────────────────────────────
    if (action === "split") {
      if (files.length !== 1) {
        return NextResponse.json(
          { error: "Un seul fichier requis pour diviser" },
          { status: 400 }
        );
      }

      const rangeStr = formData.get("range") as string || "";
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const sourcePdf = await PDFDocument.load(buffer);
      const totalPages = sourcePdf.getPageCount();

      // Parse range: "1-3,5,7-9" → [[0,1,2],[4],[6,7,8]]
      let pageIndices: number[] = [];

      if (rangeStr) {
        const parts = rangeStr.split(",");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-").map((n) => parseInt(n) - 1);
            for (let i = start; i <= Math.min(end, totalPages - 1); i++) {
              pageIndices.push(i);
            }
          } else {
            const idx = parseInt(trimmed) - 1;
            if (idx >= 0 && idx < totalPages) pageIndices.push(idx);
          }
        }
      } else {
        // Split all — return each page as separate (return info only, client should specify range)
        return NextResponse.json({
          success: true,
          info: true,
          totalPages,
          message: `Ce PDF contient ${totalPages} pages. Spécifiez une plage (ex: "1-3,5").`,
        });
      }

      if (pageIndices.length === 0) {
        return NextResponse.json({ error: "Plage de pages invalide" }, { status: 400 });
      }

      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(sourcePdf, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));

      const newBytes = await newPdf.save();

      return new NextResponse(newBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="split_pages_${rangeStr.replace(/,/g, "_")}.pdf"`,
        },
      });
    }

    // ── COMPRESS ──────────────────────────────────────────────────────────
    if (action === "compress") {
      if (files.length !== 1) {
        return NextResponse.json(
          { error: "Un seul fichier requis pour compresser" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdf = await PDFDocument.load(buffer);

      // pdf-lib "compression" = re-save with useObjectStreams
      const compressedBytes = await pdf.save({ useObjectStreams: true });

      const originalSize = buffer.length;
      const compressedSize = compressedBytes.length;
      const ratio = Math.round((1 - compressedSize / originalSize) * 100);

      return new NextResponse(compressedBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="compressed_${Date.now()}.pdf"`,
          "X-Original-Size": originalSize.toString(),
          "X-Compressed-Size": compressedSize.toString(),
          "X-Compression-Ratio": `${ratio}%`,
        },
      });
    }

    // ── ROTATE ────────────────────────────────────────────────────────────
    if (action === "rotate") {
      if (files.length !== 1) {
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      }

      const angle = parseInt(formData.get("angle") as string || "90");
      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdf = await PDFDocument.load(buffer);

      pdf.getPages().forEach((page) => {
        page.setRotation(degrees((page.getRotation().angle + angle) % 360));
      });

      const rotatedBytes = await pdf.save();

      return new NextResponse(rotatedBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="rotated_${Date.now()}.pdf"`,
        },
      });
    }

    // ── PAGE COUNT (info) ─────────────────────────────────────────────────
    if (action === "info") {
      if (files.length !== 1) {
        return NextResponse.json({ error: "Un seul fichier requis" }, { status: 400 });
      }

      const buffer = Buffer.from(await files[0].arrayBuffer());
      const pdf = await PDFDocument.load(buffer);

      return NextResponse.json({
        success: true,
        pageCount: pdf.getPageCount(),
        fileName: files[0].name,
        fileSize: buffer.length,
      });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("PDF tools error:", error);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

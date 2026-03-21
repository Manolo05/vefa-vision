import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }

    const allowedTypes = ["application/pdf","image/png","image/jpeg","image/jpg","image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non supporté. Utilisez PDF, PNG ou JPG." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let imageBuffer: Buffer;

    if (file.type === "application/pdf") {
      imageBuffer = await pdfToImage(Buffer.from(arrayBuffer));
    } else {
      imageBuffer = Buffer.from(arrayBuffer);
    }

    const optimized = await sharp(imageBuffer)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .normalize()
      .png({ quality: 90 })
      .toBuffer();

    const supabase = createAdminClient();
    const fileName = `plan_${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("plans")
      .upload(fileName, optimized, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload : " + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("plans").getPublicUrl(fileName);

    return NextResponse.json({ success: true, imageUrl: urlData.publicUrl, fileName });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur serveur lors du traitement du fichier" }, { status: 500 });
  }
}

async function pdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  const scale = Math.min(2048 / width, 2048 / height);
  const imgWidth = Math.round(width * scale);
  const imgHeight = Math.round(height * scale);

  const singlePagePdf = await PDFDocument.create();
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [0]);
  singlePagePdf.addPage(copiedPage);
  const singlePdfBytes = await singlePagePdf.save();

  try {
    return await sharp(Buffer.from(singlePdfBytes), { density: 200 })
      .resize(imgWidth, imgHeight, { fit: "inside" })
      .png()
      .toBuffer();
  } catch {
    console.warn("Sharp ne peut pas convertir ce PDF directement.");
    return sharp({
      create: { width: imgWidth, height: imgHeight, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).png().toBuffer();
  }
}

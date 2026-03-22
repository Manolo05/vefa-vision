import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { generateRoomSketchSVG, parseDimensions, RoomData } from "@/lib/room-sketch";

export const maxDuration = 120;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STYLE_PROMPTS: Record<string, { positive: string; negative: string }> = {
  moderne: {
    positive:
      "luxury modern interior design, clean lines, neutral palette, white walls, polished concrete floor, brushed metal fixtures, designer furniture, soft natural light, professional architectural photography, 8k, photorealistic",
    negative:
      "cartoon, illustration, 3d render, painting, sketch, blur, distortion, people, text, watermark, ugly, low quality",
  },
  luxe: {
    positive:
      "ultra luxury interior, Calacatta marble, deep velvet upholstery, gold accents, crystal chandelier, ivory and champagne palette, thick rug, professional magazine photography, Architectural Digest, 8k",
    negative:
      "cartoon, illustration, 3d render, painting, sketch, blur, people, text, watermark, cheap, low quality",
  },
  scandinave: {
    positive:
      "Scandinavian hygge interior, light pine wood floors, linen and wool textiles, white and warm beige palette, green plants, candles, soft diffused light, cozy atmosphere, professional interior photography, 8k",
    negative:
      "cartoon, illustration, 3d render, dark, gloomy, people, text, watermark, cluttered, low quality",
  },
  minimaliste: {
    positive:
      "Japanese wabi-sabi minimalist interior, total simplicity, polished concrete, bleached wood, natural stone, monochrome grey and white palette, architectural void, professional photography, 8k",
    negative:
      "cartoon, illustration, 3d render, cluttered, colorful, people, text, watermark, furniture excess, low quality",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      style = "moderne",
      roomName,
      roomType,
      roomDescription,
      roomArchitecture,
      roomDimensions,
      propertyType,
      windows = 1,
      windowWall = "back",
      hasDoor = true,
      hasBalconyDoor = false,
    } = body;

    // ── 1. Parse dimensions ──────────────────────────────────────────────
    const dims = parseDimensions(roomDimensions || "");
    const roomData: RoomData = {
      name: roomName || "Pièce",
      width: dims?.width || 4,
      length: dims?.length || 5,
      height: 2.5,
      windows: Math.min(windows, 3),
      windowWall,
      hasDoor,
      hasBalconyDoor,
    };

    // ── 2. Generate SVG sketch ──────────────────────────────────────────
    const svgString = generateRoomSketchSVG(roomData);

    // ── 3. Convert SVG → PNG via sharp (800×600) ────────────────────────
    const pngBuffer = await sharp(Buffer.from(svgString))
      .png()
      .toBuffer();

    // ── 4. Upload sketch PNG to Supabase ────────────────────────────────
    const sketchFilename = `sketch_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("plans")
      .upload(`sketches/${sketchFilename}`, pngBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Sketch upload error:", uploadError);
      throw new Error("Failed to upload sketch to Supabase");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("plans")
      .getPublicUrl(`sketches/${sketchFilename}`);

    const sketchUrl = publicUrlData.publicUrl;

    // ── 5. Build prompt ──────────────────────────────────────────────────
    const styleConfig = STYLE_PROMPTS[style] || STYLE_PROMPTS.moderne;

    const propertyHint =
      propertyType === "maison"
        ? "family house interior, exposed beams possible, generous volumes, "
        : "urban apartment interior, optimized space, contemporary finishes, ";

    const roomHint = roomDescription ? `${roomDescription}, ` : "";
    const archHint = roomArchitecture
      ? `room geometry: ${roomArchitecture}, `
      : "";

    const positivePrompt = `${propertyHint}${archHint}${roomHint}${roomName} room, ${styleConfig.positive}`;

    // ── 6. Call Replicate ControlNet ─────────────────────────────────────
    const output = await replicate.run(
      "jagilley/controlnet-canny:aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613",
      {
        input: {
          image: sketchUrl,
          prompt: positivePrompt,
          negative_prompt: styleConfig.negative,
          num_inference_steps: 30,
          guidance_scale: 9,
          controlnet_conditioning_scale: 0.8,
          seed: Math.floor(Math.random() * 1000000),
          image_resolution: 768,
          detect_resolution: 512,
          a_prompt:
            "best quality, extremely detailed, photorealistic, interior design photography",
          n_prompt: styleConfig.negative,
        },
      }
    );

    // Replicate returns array of URLs
    const outputUrls = output as string[];
    const generatedUrl = Array.isArray(outputUrls)
      ? outputUrls[0]
      : (output as string);

    if (!generatedUrl) {
      return NextResponse.json(
        { error: "Aucune image générée par Replicate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedUrl,
      sketchUrl,
      roomName,
      roomType,
    });
  } catch (error: any) {
    console.error("ControlNet API error:", error);

    if (error?.message?.includes("NSFW")) {
      return NextResponse.json(
        { error: "Contenu refusé par le filtre de sécurité." },
        { status: 400 }
      );
    }
    if (error?.status === 429 || error?.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Quota Replicate dépassé. Réessayez dans quelques instants." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Erreur serveur interne." },
      { status: 500 }
    );
  }
}

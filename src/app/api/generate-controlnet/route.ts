import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { analyzePlanWithVision, FloorPlan } from "@/lib/plan-analyzer";
import { renderFloorPlanSVG } from "@/lib/floorplan-renderer";

export const maxDuration = 180;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STYLE_PROMPTS: Record<string, { positive: string; negative: string }> = {
  moderne: {
    positive:
      "Modern luxury interior design, clean lines, neutral palette, polished concrete floor, brushed metal fixtures, designer furniture, soft natural light, professional architectural photography, 8K, photorealistic",
    negative:
      "cartoon, illustration, 3D render, painting, sketch, blur, distortion, people, text, watermark, ugly, low quality",
  },
  luxe: {
    positive:
      "Ultra luxury interior, Calacatta marble, velvet upholstery, gold accents, crystal chandelier, ivory and champagne palette, professional magazine photography, Architectural Digest, 8k",
    negative:
      "cartoon, illustration, 3D render, painting, sketch, blur, people, text, watermark, cheap, low quality",
  },
  scandinave: {
    positive:
      "Scandinavian hygge interior, light pine hardwood floor, linen and wool textiles, white and warm beige palette, green plants, candles, soft diffused light, cozy atmosphere, professional interior photography, 8K",
    negative:
      "cartoon, illustration, 3D render, dark, gloomy, characters, text, watermark, cluttered, low quality",
  },
  minimaliste: {
    positive:
      "Japanese wabi-sabi minimalist interior, total simplicity, polished concrete, bleached wood, natural stone, monochrome grey and white palette, architectural void, professional photography, 8K",
    negative:
      "cartoon, illustration, 3D render, cluttered, colorful, characters, text, watermark, excess furniture, low quality",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      style = "moderne",
      roomName,
      planImageUrl,
      planBase64,
      targetRoomType,
      propertyType = "appartement",
      reanalyzePlan = false,
      cachedPlan,
    } = body;

    if (!planImageUrl && !planBase64) {
      return NextResponse.json(
        { error: "planImageUrl ou planBase64 requis" },
        { status: 400 }
      );
    }

    let plan: FloorPlan;
    if (cachedPlan && !reanalyzePlan) {
      plan = cachedPlan as FloorPlan;
    } else {
      let imageBase64: string;
      let mimeType: "image/png" | "image/jpeg" = "image/png";

      if (planBase64) {
        imageBase64 = planBase64;
      } else {
        const imgResponse = await fetch(planImageUrl);
        if (!imgResponse.ok) throw new Error("Impossible de recuperer le plan");
        const contentType = imgResponse.headers.get("content-type") || "image/png";
        mimeType = contentType.includes("jpeg") ? "image/jpeg" : "image/png";
        const buffer = Buffer.from(await imgResponse.arrayBuffer());
        imageBase64 = buffer.toString("base64");
      }

      plan = await analyzePlanWithVision(imageBase64, mimeType);
    }

    const targetRoom =
      plan.rooms.find(
        (r) =>
          r.type === targetRoomType ||
          r.name.toLowerCase().includes((roomName || "").toLowerCase())
      ) || plan.rooms[0];

    if (!targetRoom) {
      return NextResponse.json(
        { error: "Piece non trouvee dans le plan" },
        { status: 400 }
      );
    }

    const svgString = renderFloorPlanSVG(plan, {
      canvasWidth: 1024,
      canvasHeight: 1024,
      showDimensions: true,
      showRoomNames: true,
    });

    const pngBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();

    const sketchFilename = `topview_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("plans")
      .upload(`sketches/${sketchFilename}`, pngBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError)
      throw new Error(`Upload echoue: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("plans")
      .getPublicUrl(`sketches/${sketchFilename}`);
    const sketchUrl = publicUrlData.publicUrl;

    const styleConfig = STYLE_PROMPTS[style] || STYLE_PROMPTS.moderne;
    const propertyHint =
      propertyType === "maison"
        ? "family house interior, generous volumes, "
        : "urban apartment interior, optimized space, contemporary finishes, ";
    const roomDimPrompt = `${targetRoom.width.toFixed(1)}m x ${targetRoom.length.toFixed(1)}m room (${targetRoom.area.toFixed(1)}m2), `;
    const windowPrompt =
      targetRoom.windows.length > 0
        ? `${targetRoom.windows.length} window(s), `
        : "";
    const positivePrompt = `${propertyHint}${roomDimPrompt}${windowPrompt}${targetRoom.name} room, ${styleConfig.positive}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (replicate.run as any)(
      "jagilley/controlnet-canny:aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613",
      {
        input: {
          image: sketchUrl,
          prompt: positivePrompt,
          negative_prompt: styleConfig.negative,
          num_inference_steps: 35,
          guidance_scale: 9,
          controlnet_conditioning_scale: 0.85,
          seed: Math.floor(Math.random() * 1000000),
          image_resolution: 768,
          detect_resolution: 512,
          a_prompt:
            "best quality, extremely detailed, photorealistic interior design photography",
          n_prompt: styleConfig.negative,
        },
      }
    );

    const generatedUrl = Array.isArray(output) ? (output as string[])[0] : String(output);

    if (!generatedUrl)
      return NextResponse.json(
        { error: "Aucune image generee" },
        { status: 500 }
      );

    await supabaseAdmin.from("plan_analyses").upsert({
      plan_url: planImageUrl,
      floor_plan_json: plan,
      sketch_url: sketchUrl,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      imageUrl: generatedUrl,
      sketchUrl,
      roomName: targetRoom.name,
      roomType: targetRoom.type,
      roomDimensions: {
        width: targetRoom.width,
        length: targetRoom.length,
        area: targetRoom.area,
      },
      floorPlan: plan,
      confidence: plan.confidence,
    });
  } catch (error: any) {
    console.error("ControlNet API error:", error);
    if (error?.message?.includes("NSFW"))
      return NextResponse.json(
        { error: "Contenu refuse par filtre securite." },
        { status: 400 }
      );
    if (
      error?.status === 429 ||
      error?.message?.includes("rate limit")
    )
      return NextResponse.json(
        { error: "Quota Replicate depasse." },
        { status: 429 }
      );
    return NextResponse.json(
      { error: error.message || "Erreur serveur interne." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_MODIFIERS: Record<string, string> = {
  moderne: "style contemporain haut de gamme, lignes epurees, palette neutre (blanc casse, gris perle, taupe), materiaux nobles (beton cire, verre, metal brosse), mobilier design aux formes geometriques",
  luxe: "style luxueux ultra haut de gamme, velours profond, marbre Calacatta veine, boiseries et details dores, luminaires en cristal Murano, palette ivoire creme et or champagne, tapis epais",
  scandinave: "style scandinave hygge chaleureux, bois clair de pin et chene naturel, textiles en lin et laine epaisse, palette blanc neige et beige chaud, plantes vertes, bougies et eclairage tamise",
  minimaliste: "style minimaliste japonais wabi-sabi, epure totale, vide architectural elegant, palette monochrome gris perle et blanc, materiaux bruts authentiques (beton lisse, bois ceruse, pierre naturelle)",
};

function dimensionsToVisualHints(dimensions: string): string {
  if (!dimensions) return "";
  const surfaceMatch = dimensions.match(/(\d+(?:[.,]\d+)?)\s*m2/i);
  const surface = surfaceMatch ? parseFloat(surfaceMatch[1].replace(",", ".")) : null;
  const sidesMatch = dimensions.match(/(\d+(?:[.,]\d+)?)\s*[mx×xX]\s*(\d+(?:[.,]\d+)?)/i);
  const side1 = sidesMatch ? parseFloat(sidesMatch[1].replace(",", ".")) : null;
  const side2 = sidesMatch ? parseFloat(sidesMatch[2].replace(",", ".")) : null;
  const ratio = side1 && side2 ? Math.max(side1, side2) / Math.min(side1, side2) : null;

  let sizeHint = "";
  if (surface !== null) {
    if (surface < 6) sizeHint = "minuscule piece tres compacte, espace extremement intime et serre";
    else if (surface < 10) sizeHint = "petite piece compacte, espace optimise, peu de recul";
    else if (surface < 18) sizeHint = "piece de taille standard confortable";
    else if (surface < 30) sizeHint = "belle piece spacieuse, volumes genereux";
    else if (surface < 50) sizeHint = "grande piece tres spacieuse, large perspective";
    else sizeHint = "tres grand espace ouvert, volumes architecturaux impressionnants";
  }

  let shapeHint = "";
  if (ratio !== null) {
    if (ratio < 1.2) shapeHint = "piece carree equilibree, symetrie parfaite";
    else if (ratio < 1.6) shapeHint = "piece legerement rectangulaire, proportions harmonieuses";
    else if (ratio < 2.2) shapeHint = "piece nettement rectangulaire et allongee";
    else shapeHint = "piece tres allongee, quasi-couloir, grande profondeur de champ";
  }

  return [sizeHint, shapeHint].filter(Boolean).join(", ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, imageUrl, style = "moderne", roomName, roomType, roomDescription, roomArchitecture, roomDimensions, propertyType } = body;

    if (mode === "analyze") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Tu es un architecte expert specialise dans la lecture de plans VEFA.
Ce document est un PLAN ARCHITECTURAL TECHNIQUE 2D.
REGLE ABSOLUE : Lis et transcris EXACTEMENT les chiffres et annotations ecrits sur le plan. Ne devine pas, ne calcule pas.

Retourne UNIQUEMENT du JSON valide :
{
  "propertyType": "appartement",
  "totalSurface": "72 m2",
  "totalDescription": "Appartement T3 de 72m2",
  "rooms": [
    {
      "name": "Sejour/Cuisine",
      "type": "salon",
      "description": "Grand sejour ouvert sur cuisine avec acces balcon",
      "dimensions": "4.80m x 5.20m, 25m2",
      "architecture": "Piece rectangulaire 25m2, 2 fenetres, 1 porte-fenetre"
    }
  ]
}
Types valides pour type : salon, sejour, cuisine, chambre, salle_de_bain, bureau, entree, dressing, wc, cellier, terrasse, garage, salle_a_manger, autre`,
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        }],
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content || '{"rooms":[]}');
      return NextResponse.json({ success: true, rooms: parsed.rooms, propertyType: parsed.propertyType || "appartement", totalSurface: parsed.totalSurface, totalDescription: parsed.totalDescription });
    }

    if (mode === "generate") {
      const styleDesc = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.moderne;
      const visualHints = dimensionsToVisualHints(roomDimensions || "");
      const architectureBlock = roomArchitecture ? `GEOMETRIE EXACTE : ${roomArchitecture}. ` : "";
      const dimensionsBlock = roomDimensions ? `DIMENSIONS REELLES : ${roomDimensions}. PROPORTIONS : ${visualHints}. ` : "";
      const propertyBlock = propertyType === "maison" ? "TYPE : MAISON individuelle, volumes genereux. " : "TYPE : APPARTEMENT urbain, espace optimise. ";
      const descBlock = roomDescription ? `Caracteristiques : ${roomDescription}. ` : "";

      const prompt = `Photographie d'architecture interieure professionnelle haute resolution, rendu photoréaliste qualite magazine.
${propertyBlock}${architectureBlock}${dimensionsBlock}${descBlock}
PIECE : ${roomName}. DECORATION : ${styleDesc}.
Vue grand angle depuis un angle de la piece, montrant 2 murs et le plafond.
Mobilier adapte a la surface reelle. Proportions fideles. Eclairage naturel depuis les fenetres.
Aucune personne, aucun texte, aucun watermark.`.trim();

      const imageRes = await openai.images.generate({ model: "dall-e-3", prompt, n: 1, size: "1792x1024", quality: "hd", style: "natural" });
      const generatedUrl = imageRes.data?.[0]?.url;
      if (!generatedUrl) return NextResponse.json({ error: "Aucune image generee" }, { status: 500 });
      return NextResponse.json({ success: true, imageUrl: generatedUrl, roomName, roomType });
    }

    return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("Decorate API error:", error);
    if (error?.status === 429) return NextResponse.json({ error: "Quota OpenAI depasse." }, { status: 429 });
    if (error?.status === 400) return NextResponse.json({ error: "Contenu refuse par le filtre OpenAI." }, { status: 400 });
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

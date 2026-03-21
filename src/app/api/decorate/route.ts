import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_MODIFIERS: Record<string, string> = {
  moderne: "style contemporain haut de gamme, lignes épurées, palette neutre (blanc cassé, gris perle, taupe), matériaux nobles (béton ciré, verre, métal brossé)",
  luxe: "style luxueux et haut de gamme, velours, marbre Calacatta, boiseries dorées, luminaires en cristal, palette ivoire et or champagne",
  scandinave: "style scandinave hygge, bois clair de pin et chêne, textiles en lin et laine, palette blanc neige et beige chaud, plantes vertes",
  minimaliste: "style minimaliste japonais wabi-sabi, vide architectural, palette monochrome gris clair, matériaux bruts (béton, bois cérusé, pierre)",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode,
      imageUrl,
      style = "moderne",
      roomName,
      roomType,
      roomDescription,
      roomArchitecture,
      roomDimensions,
      propertyType,
    } = body;

    // MODE ANALYZE
    if (mode === "analyze") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Tu es un architecte d'intérieur expert. Analyse ce plan avec précision.

ÉTAPE 1 - Type de bien : Détermine s'il s'agit d'un APPARTEMENT ou d'une MAISON en analysant la structure globale du plan (présence de plusieurs niveaux, jardin/terrasse, type de distribution, surface totale estimée).

ÉTAPE 2 - Pour chaque pièce, extrait :
- Forme exacte (rectangulaire, en L, carrée, trapézoïdale...)
- Dimensions approximatives en m² ET en mètres linéaires (ex: "6m × 4m, 24m²")
- Nombre de fenêtres et position (mur nord/sud/est/ouest, baie vitrée ou fenêtre standard)
- Hauteur de plafond probable (standard 2.5m, ou haute si grande pièce)
- Présence de niches, alcôves, colonnes, poutres
- Orientation et luminosité naturelle

Réponds UNIQUEMENT en JSON valide :
{
  "propertyType": "appartement",
  "totalSurface": "surface totale estimée en m²",
  "totalDescription": "Description globale du bien",
  "rooms": [
    {
      "name": "Salon",
      "type": "salon",
      "description": "description courte",
      "dimensions": "6m × 4m, 24m²",
      "architecture": "Pièce rectangulaire de 24m² (6m×4m), 2 grandes fenêtres sur mur est et 1 baie vitrée au sud, plafond standard 2.5m, accès par porte double depuis l entrée"
    }
  ]
}

Types valides : salon, cuisine, chambre, salle_de_bain, bureau, entree, dressing, wc, cellier, terrasse, garage, sejour, salle_a_manger, autre`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "high" },
              },
            ],
          },
        ],
      });

      const parsed = JSON.parse(
        res.choices[0]?.message?.content || '{"rooms":[]}'
      );
      return NextResponse.json({
        success: true,
        rooms: parsed.rooms,
        propertyType: parsed.propertyType || "appartement",
        totalSurface: parsed.totalSurface,
        totalDescription: parsed.totalDescription,
      });
    }

    // MODE GENERATE
    if (mode === "generate") {
      const styleDesc = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.moderne;

      const architectureContext = roomArchitecture
        ? `ARCHITECTURE RÉELLE DE CETTE PIÈCE (respecter absolument) : ${roomArchitecture}. `
        : "";

      const dimensionsContext = roomDimensions
        ? `DIMENSIONS EXACTES : ${roomDimensions}. Adapter la perspective et la profondeur de champ à ces dimensions réelles. `
        : "";

      const propertyContext =
        propertyType === "maison"
          ? "Bien de type MAISON individuelle : volumes généreux, possibilité de poutres apparentes, esprit maison de famille. "
          : "Bien de type APPARTEMENT : espace optimisé, lumineux, style urbain contemporain. ";

      const roomContext = roomDescription
        ? `Caractéristiques complémentaires : ${roomDescription}. `
        : "";

      const prompt = `Photographie d'architecture intérieure professionnelle, rendu photoréaliste qualité magazine (Architectural Digest, Elle Décoration). ${propertyContext}${architectureContext}${dimensionsContext}${roomContext}PIÈCE : ${roomName}. STYLE DE DÉCORATION : ${styleDesc}. Respecte impérativement la géométrie de la pièce : si 2 fenêtres sur un mur, montre-les toutes les 2 ; si grande pièce lumineuse, traduis par une lumière naturelle abondante ; si petite surface, perspective compacte adaptée. Éclairage naturel réaliste depuis les fenêtres décrites. Mobilier adapté à la surface réelle. Vue grand angle depuis un coin montrant la volumétrie réelle. Pas de texte, pas de personnes, pas de logo.`;

      const imageRes = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
        quality: "hd",
        style: "natural",
      });

      const generatedUrl = imageRes.data?.[0]?.url;
      if (!generatedUrl)
        return NextResponse.json(
          { error: "Aucune image générée" },
          { status: 500 }
        );

      return NextResponse.json({
        success: true,
        imageUrl: generatedUrl,
        roomName,
        roomType,
      });
    }

    return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("Decorate API error:", error);
    if (error?.status === 429)
      return NextResponse.json(
        { error: "Quota OpenAI dépassé. Veuillez réessayer dans quelques instants." },
        { status: 429 }
      );
    if (error?.status === 400)
      return NextResponse.json(
        { error: "Contenu refusé par le filtre OpenAI." },
        { status: 400 }
      );
    return NextResponse.json(
      { error: "Erreur serveur interne." },
      { status: 500 }
    );
  }
}

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
    } = body;

    // MODE ANALYZE
    if (mode === "analyze") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Tu es un architecte d'intérieur expert. Analyse ce plan d'appartement avec précision.

Pour chaque pièce identifiée, extrait les caractéristiques ARCHITECTURALES RÉELLES visibles sur le plan :
- Forme exacte de la pièce (rectangulaire, en L, carrée, trapézoïdale...)
- Surface approximative en m² (déduite des proportions du plan)
- Nombre de fenêtres et leur position (mur nord/sud/est/ouest, grande baie vitrée, fenêtre standard)
- Hauteur de plafond probable (standard 2.5m, ou plafond haut si grande pièce)
- Présence de niches, alcôves, colonnes, poutres apparentes
- Orientation de la pièce et luminosité naturelle
- Accès (portes doubles, simple, ouverte sur séjour...)

Réponds UNIQUEMENT en JSON valide :
{
  "rooms": [
    {
      "name": "Salon",
      "type": "salon",
      "description": "description courte",
      "architecture": "Pièce rectangulaire d environ 25m², double exposition avec 2 grandes fenêtres sur mur est et 1 baie vitrée au sud, plafond standard 2.5m, accès par porte double depuis l entrée"
    }
  ],
  "totalDescription": "Description globale de l appartement"
}

Types valides : salon, cuisine, chambre, salle_de_bain, bureau, entree, dressing, wc, cellier, terrasse, autre`,
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
        totalDescription: parsed.totalDescription,
      });
    }

    // MODE GENERATE
    if (mode === "generate") {
      const styleDesc = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.moderne;

      const architectureContext = roomArchitecture
        ? `ARCHITECTURE RÉELLE DE CETTE PIÈCE (respecter absolument) : ${roomArchitecture}. `
        : "";

      const roomContext = roomDescription
        ? `Caractéristiques complémentaires : ${roomDescription}. `
        : "";

      const prompt = `Photographie d'architecture intérieure professionnelle, rendu photoréaliste qualité magazine (Architectural Digest, Elle Décoration).

${architectureContext}${roomContext}

PIÈCE : ${roomName}.
STYLE DE DÉCORATION : ${styleDesc}.

Respecte impérativement la géométrie de la pièce : si 2 fenêtres sur un mur, montre-les ; si grande pièce lumineuse, traduis-le par une lumière naturelle abondante ; si petite surface, montre une perspective adaptée. Éclairage naturel réaliste depuis les fenêtres décrites. Mobilier adapté à la surface réelle. Vue grand angle depuis un coin montrant la volumétrie réelle. Pas de texte, pas de personnes, pas de logo.`;

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


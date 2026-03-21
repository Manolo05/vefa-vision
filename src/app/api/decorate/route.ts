import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROOM_PROMPTS: Record<string, string> = {
  salon: "Photographie professionnelle d'un salon spacieux et lumineux, vue grand angle depuis un coin de la pièce, canapé design en angle, table basse élégante, lampadaire design, étagères décoratives, lumière naturelle par grandes fenêtres",
  cuisine: "Photographie professionnelle d'une cuisine moderne et fonctionnelle, vue grand angle, plan de travail élégant, façades de qualité, îlot central ou bar si possible, éclairage LED sous les meubles, crédence design",
  chambre: "Photographie professionnelle d'une chambre élégante et cosy, vue grand angle, lit king size avec tête de lit design, tables de nuit assorties, literie de qualité, lumière douce tamisée, dressing ou armoire design",
  salle_de_bain: "Photographie professionnelle d'une salle de bain de standing, vue grand angle, douche à l'italienne avec paroi en verre, vasque posée sur meuble suspendu, carrelage haut de gamme, miroir avec éclairage intégré, robinetterie chromée",
  bureau: "Photographie professionnelle d'un bureau élégant et fonctionnel, vue grand angle, bureau en bois massif, fauteuil ergonomique design, bibliothèque murale, grande fenêtre lumineuse, éclairage soigné",
  entree: "Photographie professionnelle d'une entrée d'appartement élégante, vue grand angle, console design avec miroir, luminaire de caractère, sol en carrelage ou parquet haut de gamme, patère design, plante verte décorative",
  default: "Photographie professionnelle d'une pièce d'intérieur de standing, vue grand angle depuis un coin, décoration contemporaine soignée, lumière naturelle, finitions haut de gamme",
};

const STYLE_MODIFIERS: Record<string, string> = {
  moderne: "style moderne et contemporain, lignes épurées, palette tons neutres gris et blanc, accents dorés ou noirs, matériaux nobles",
  luxe: "style luxueux et haut de gamme, velours, marbre, dorures, cristal, palette crème et or, sophistication maximale",
  scandinave: "style scandinave chaleureux, bois clair naturel, blanc immaculé, textiles naturels laine et lin, plantes vertes, cocooning",
  minimaliste: "style minimaliste japonais épuré, espace vide généreux, lumière zénithale, palette blanc et béton, une seule plante, rien de superflu",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, imageUrl, style = "moderne", roomName, roomType, roomDescription } = body;

    // ── MODE ANALYZE : identify rooms ──────────────────────────────
    if (mode === "analyze") {
      if (!imageUrl) return NextResponse.json({ error: "imageUrl requis" }, { status: 400 });

      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse ce plan d'appartement. Identifie chaque pièce distincte et réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "rooms": [
    {"name": "Salon", "type": "salon", "description": "grande pièce lumineuse avec accès balcon"},
    {"name": "Cuisine", "type": "cuisine", "description": "cuisine ouverte sur séjour"},
    {"name": "Chambre 1", "type": "chambre", "description": "chambre principale avec placard"},
    {"name": "Salle de bain", "type": "salle_de_bain", "description": "salle de bain avec baignoire"}
  ],
  "totalDescription": "Appartement 3 pièces de 65m², lumineux, disposition fonctionnelle."
}
Types autorisés : salon, cuisine, chambre, salle_de_bain, bureau, entree, autre.
Maximum 6 pièces. N'inclure que les pièces clairement identifiables.`
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
          ]
        }]
      });

      const content = res.choices[0]?.message?.content || '{"rooms":[],"totalDescription":""}';
      const parsed = JSON.parse(content);
      return NextResponse.json({ success: true, rooms: parsed.rooms || [], totalDescription: parsed.totalDescription || "" });
    }

    // ── MODE GENERATE : one room image ────────────────────────────
    if (mode === "generate") {
      const basePrompt = ROOM_PROMPTS[roomType] || ROOM_PROMPTS.default;
      const styleMod = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.moderne;
      const descPart = roomDescription ? `Caractéristiques : ${roomDescription}.` : "";

      const prompt = `${basePrompt}, ${styleMod}. ${descPart} Rendu photoréaliste qualité magazine immobilier haut de gamme, éclairage professionnel HDR, 8K.`;

      const imageRes = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
        quality: "hd",
        style: "natural",
      });

      const generatedUrl = imageRes.data?.[0]?.url;
      if (!generatedUrl) return NextResponse.json({ error: "Aucune image générée" }, { status: 500 });

      return NextResponse.json({ success: true, imageUrl: generatedUrl, roomName, roomType });
    }

    return NextResponse.json({ error: "Mode invalide. Utilisez 'analyze' ou 'generate'." }, { status: 400 });

  } catch (error: any) {
    console.error("Decorate error:", error);
    if (error?.status === 429) return NextResponse.json({ error: "Trop de requêtes. Réessayez dans quelques secondes." }, { status: 429 });
    if (error?.status === 400) return NextResponse.json({ error: "L'IA n'a pas pu traiter cette requête." }, { status: 400 });
    return NextResponse.json({ error: "Erreur serveur lors de la génération" }, { status: 500 });
  }
}

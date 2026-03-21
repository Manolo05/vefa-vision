import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_MODIFIERS: Record<string, string> = {
  moderne:
    "style contemporain haut de gamme, lignes épurées, palette neutre (blanc cassé, gris perle, taupe), matériaux nobles (béton ciré, verre, métal brossé), mobilier design aux formes géométriques",
  luxe:
    "style luxueux ultra haut de gamme, velours profond, marbre Calacatta veiné, boiseries et détails dorés, luminaires en cristal Murano, palette ivoire crème et or champagne, tapis épais",
  scandinave:
    "style scandinave hygge chaleureux, bois clair de pin et chêne naturel, textiles en lin et laine épaisse, palette blanc neige et beige chaud, plantes vertes, bougies et éclairage tamisé",
  minimaliste:
    "style minimaliste japonais wabi-sabi, épure totale, vide architectural élégant, palette monochrome gris perle et blanc, matériaux bruts authentiques (béton lissé, bois cérusé, pierre naturelle)",
};

/**
 * Converts dimension string like "4.5m × 6m, 27m²" to visual proportion hints for DALL-E 3
 */
function dimensionsToVisualHints(dimensions: string): string {
  if (!dimensions) return "";

  // Extract surface in m²
  const surfaceMatch = dimensions.match(/(\d+(?:\.\d+)?)\s*m²/);
  const surface = surfaceMatch ? parseFloat(surfaceMatch[1]) : null;

  // Extract length × width
  const sidesMatch = dimensions.match(
    /(\d+(?:\.\d+)?)\s*[mx×]\s*(\d+(?:\.\d++?)/i
  );
  const side1 = sidesMatch ? parseFloat(sidesMatch[1]) : null;
  const side2 = sidesMatch ? parseFloat(sidesMatch[2]) : null;
  const ratio = side1 && side2 ? Math.max(side1, side2) / Math.min(side1, side2) : null;

  let sizeHint = "";
  if (surface !== null) {
    if (surface < 6) sizeHint = "minuscule pièce très compacte, espace extrêmement intime et serré";
    else if (surface < 10) sizeHint = "petite pièce compacte, espace optimisé, peu de recul";
    else if (surface < 18) sizeHint = "pièce de taille standard confortable";
    else if (surface < 30) sizeHint = "belle pièce spacieuse, volumes généreux";
    else if (surface < 50) sizeHint = "grande pièce très spacieuse, large perspective";
    else sizeHint = "très grand espace ouvert, volumes architecturaux impressionnants";
  }

  let shapeHint = "";
  if (ratio !== null) {
    if (ratio < 1.2) shapeHint = "pièce carrée équilibrée, symétrie parfaite";
    else if (ratio < 1.6) shapeHint = "pièce légèrement rectangulaire, proportions harmonieuses";
    else if (ratio < 2.2) shapeHint = "pièce nettement rectangulaire et allongée";
    else shapeHint = "pièce très allongée, quasi-couloir, grande profondeur de champ";
  }

  return [sizeHint, shapeHint].filter(Boolean).join(", ");
}

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

    // ─────────────────────────────────────────────
    // MODE ANALYZE
    // ─────────────────────────────────────────────
    if (mode === "analyze") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Tu es un architecte expert spécialisé dans la lecture de plans VEFA (Vente en État Futur d'Achèvement). Ce document est un PLAN ARCHITECTURAL TECHNIQUE 2D.

RÈGLE ABSOLUE : Lis et transcris EXACTEMENT les chiffres et annotations écrits sur le plan. Ne devine pas, ne calcule pas — RECOPIE ce que tu vois.

ÉTAPE 1 — Type de bien :
Détermine si c'est un APPARTEMENT (dans un immeuble collectif) ou une MAISON (individuelle). Indices : présence d'un couloir collectif, cage d'escalier partagée, numéro de lot = appartement. Jardin privatif, garage intégré, plusieurs niveaux = maison.

ÉTAPE 2 — Surface totale :
Lis la surface totale indiquée sur le plan (souvent en bas ou dans le cartouche). Si non visible, somme les surfaces des pièces.

ÉTAPE 3 — Pour CHAQUE pièce identifiée sur le plan :
- Lis le NOM exact tel qu'écrit sur le plan (ex: "SÉJOUR/CUISINE", "CH1", "SDB", "WC", "DEGT", "ENTRÉE"...)
- Lis les COTES en mètres inscrites sur ou autour de la pièce (ex: "3.60", "4.20", "12.50 m²")
- Si une surface en m² est écrite dans la pièce, recopie-la EXACTEMENT
- Compte les fenêtres (rectangles ouverts sur les murs extérieurs) et les portes (arcs de cercle)
- Note l'orientation approximative (quelle façade est au nord ?)

Retourne UNIQUEMENT du JSON valide sans aucun texte autour :
{
  "propertyType": "appartement",
  "totalSurface": "72 m²",
  "totalDescription": "Appartement T3 de 72m² avec séjour lumineux et 2 chambres",
  "rooms": [
    {
      "name": "Séjour/Cuisine",
      "type": "salon",
      "description": "Grand séjour ouvert sur cuisine avec accès balcon",
      "dimensions": "4.80m × 5.20m, 25m²",
      "architecture": "Pièce rectangulaire 25m² (4.8×5.2m), 2 fenêtres côté façade sud, 1 porte-fenêtre donnant sur balcon, cuisine ouverte en L, plafond 2.5m"
    }
  ]
}

Types valides pour "type" : salon, sejour, cuisine, chambre, salle_de_bain, bureau, entree, dressing, wc, cellier, terrasse, garage, salle_a_manger, autre

IMPORTANT : Si tu vois des cotes comme "3.60 × 4.20" sur le plan, utilise-les directement. Si tu vois "15.20 m²" écrit dans une pièce, utilise exactement cette valeur.`,
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

    //  },
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

    // ─────────────────────────────────────────────
    // MODE GENERATE
    // ─────────────────────────────────────────────
    if (mode === "generate") {
      const styleDesc = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.moderne;

      const visualHints = dimensionsToVisualHints(roomDimensions || "");

      const architectureBlock = roomArchitecture
        ? `GÉOMÉTRIE EXACTE DE LA PIÈCE (respecter impérativement) : ${roomArchitecture}. `
        : "";

      const dimensionsBlock = roomDimensions
        ? `DIMENSIONS RÉELLES : ${roomDimensions}. PROPORTIONS VISUELLES : ${visualHints}. La perspective et la profondeur de champ doivent refléter fidèlement ces proportions — une pièce de 9m² doit sembler petite et compacte, une pièce de 35m² doit sembler vaste et dégagée. `
        : "";

      const propertyBlock =
        propertyType === "maison"
          ? "TYPE DE BIEN : MAISON individuelle — volumes plus généreux, possibilité de poutres apparentes, plafonds potentiellement hauts, esprit maison de famille cosy. "
          : "TYPE DE BIEN : APPARTEMENT urbain — espace optimisé, lumineux, finitions contemporaines, style urbain chic. ";

      const descBlock = roomDescription
        ? `Caractéristiques supplémentaires de la pièce : ${roomDescription}. `
        : "";

      const prompt = `Photographie d'architecture intérieure professionnelle haute résolution, rendu photoréaliste qualité magazine (Architectural Digest, AD France, Elle Décoration). Image de type reportage immobilier de luxe, aucun filtre, aucun rendu 3D visible.

${propertyBlock}${architectureBlock}${dimensionsBlock}${descBlock}

PIÈCE : ${roomName}.
DÉCORATION : ${styleDesc}.

CONTRAINTES VISUELLES ABSOLUES :
- Vue grand angle (objectif 24mm simulé) depuis un angle de la pièce, montrant 2 murs et le plafond
- Si des fenêtres sont décrites : elles doivent être VISIBLES et laisser entrer une lumière naturelle réaliste
- Mobilier strictement adapté à la surface réelle (pas de gros canapé dans 9m²)
- Proportions de la pièce fidèles : largeur/profondeur/hauteur conformes à ${roomDimensions || "la description"}
- Éclairage naturel depuis les fenêtres complété par des luminaires de style
- Finitions soignées, décoration cohérente avec le style
- Aucune personne, aucun texte, aucun logo, aucun watermark`.trim();

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
        {
          error:
            "Quota OpenAI dépassé. Veuillez réessayer dans quelques instants.",
        },
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

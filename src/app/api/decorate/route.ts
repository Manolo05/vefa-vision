import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, style = "moderne" } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl est requis" }, { status: 400 });
    }

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Tu es un architecte d'intérieur expert. Analyse ce plan d'appartement et décris-le en 3-4 phrases : nombre de pièces, surfaces estimées, disposition générale, points forts. Réponse directement utilisable pour générer une image de décoration." },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      }],
    });

    const planDescription = analysisResponse.choices[0]?.message?.content || "Appartement lumineux avec séjour ouvert sur cuisine, deux chambres et une salle de bain.";

    const stylePrompts: Record<string, string> = {
      moderne: "Style moderne et contemporain : lignes épurées, canapé gris anthracite, table basse en verre et métal noir, luminaires design en laiton doré, murs blanc cassé, parquet chêne clair, touches bleu pétrole et moutarde, plantes vertes modernes.",
      luxe: "Style luxe et haut de gamme : canapé en velours émeraude, table basse en marbre blanc veiné d'or, lustres en cristal, murs beige doré, parquet chevron en noyer foncé, rideaux en soie champagne, miroirs dorés.",
      scandinave: "Style scandinave chaleureux : canapé en tissu beige naturel, table basse ronde en bouleau clair, luminaires en rotin, murs blanc pur, parquet pin naturel, plantes suspendues, textiles en laine, tapis berbère crème.",
      minimaliste: "Style minimaliste japonais : lignes pures, canapé bas en lin blanc, table basse en béton ciré, éclairage indirect encastré, murs blanc mat, sol en béton poli gris clair, une seule plante zen, espace ouvert et aéré.",
    };

    const decoPrompt = `Photographie professionnelle d'intérieur, qualité magazine immobilier haut de gamme, rendu photoréaliste.
Scène : ${planDescription}
Décoration : ${stylePrompts[style] || stylePrompts.moderne}
Cadrage : vue grand angle en légère plongée depuis un coin de la pièce, lumière naturelle chaude, ombres douces. Qualité 8K, HDR, rendu architectural professionnel.`;

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: decoPrompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "natural",
    });

    const generatedUrl = imageResponse.data[0]?.url;
    if (!generatedUrl) {
      return NextResponse.json({ error: "Aucune image générée par l'IA" }, { status: 500 });
    }

    return NextResponse.json({ success: true, decoratedImageUrl: generatedUrl, planDescription, style });
  } catch (error: any) {
    console.error("Decorate error:", error);
    if (error?.status === 400) return NextResponse.json({ error: "L'IA n'a pas pu générer l'image. Essayez avec un autre plan ou style." }, { status: 400 });
    if (error?.status === 429) return NextResponse.json({ error: "Trop de requêtes. Réessayez dans quelques secondes." }, { status: 429 });
    return NextResponse.json({ error: "Erreur serveur lors de la génération" }, { status: 500 });
  }
}

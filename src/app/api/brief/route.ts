import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";

export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const clientName = formData.get("clientName") as string || "";
    const projectName = formData.get("projectName") as string || "";
    const briefType = formData.get("briefType") as string || "commercial";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // ── Extract text from all PDFs ──────────────────────────────────────
    const extractedTexts: string[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const pdfData = await pdf(buffer);
        if (pdfData.text && pdfData.text.trim().length > 50) {
          extractedTexts.push(`=== ${file.name} ===\n${pdfData.text.trim()}`);
        }
      } catch (e) {
        console.error(`Failed to parse ${file.name}:`, e);
        // Continue with other files
      }
    }

    if (extractedTexts.length === 0) {
      return NextResponse.json(
        { error: "Impossible d'extraire le texte des fichiers fournis." },
        { status: 400 }
      );
    }

    const combinedText = extractedTexts.join("\n\n").slice(0, 20000); // GPT token limit

    // ── Build brief type prompt ──────────────────────────────────────────
    const briefPrompts: Record<string, string> = {
      commercial: `Tu es un expert en immobilier neuf (VEFA) et en marketing immobilier.
Génère un BRIEF COMMERCIAL complet et percutant pour l'équipe de vente.

Le brief doit inclure :
1. **Résumé exécutif** (3-4 phrases clés pour pitcher rapidement)
2. **Caractéristiques du programme** (localisation, type de bien, nombre de lots, livraison)
3. **Points forts** (atouts de vente majeurs, à mettre en avant)
4. **Description des typologies** (T2, T3, T4... avec surfaces, prix indicatifs si disponibles)
5. **Prestations et équipements** (ce qui est inclus : parquet, cuisine, parking...)
6. **Arguments financiers** (dispositifs fiscaux, frais de notaire réduits VEFA, etc.)
7. **Profil acheteur cible** (investisseur, primo-accédant, famille...)
8. **Objections fréquentes & reponses** (délai de livraison, risques VEFA...)
9. **Call-to-action** (prochaines étapes pour le commercial)

Réponds en français, vormat Markdown structuré, ton professionnel et enthousiaste.`,

      investisseur: `Tu es un consultant en investissement immobilier.
Génère une FICHE INVESTISSEUR dtaillée pour un programme VEFA.

La fiche doit inclure :
1. **Synthèse de l'investissement** (rendement estimé, zone géographique, dispositif fiscal)
2. **Analyse du marché local** (tension locative, prix au m², potentiel de plus-value)
3. **Rentabilité locative** (loyer estimé, rendement brut/net, cash-flow)
4. **Dispositifs fiscaux applicables** (Pinel, PTZ, LMNP, TVA réduite...)
5. **Financement** (apport recommandé, montage crédit, IFI)
6. **Risques et points de vigilance** (délais, revente, vacance locative)
7. **Comparatif vs ancien** (avantages VEFA vs immobilier ancien)
8. **Conclusion et recommandation**

Réponds en français, format Markdown structuré, ton expert et analytique.`,

      presentation: `Tu es un rédacteur spécialisé en communication immobilière.
Génère le CONTENU D'UNE PLAQUETTE COMMERCIALE pour ce programme immobilier.

Le contenu doit inclure :
1. **Accroche principale** (slogan percutant, 1 phrase)
2. **Phrase d'introduction** (100 mots max, évocatrice)
3. **Présentation du programme** (emplacement, concept architectural, ambiance)
4. **Description des appartements** (typologies disponibles, points forts)
5. **Prestations haut de gamme** (liste des équipements et finitions)
6. **Le quartier et ses atouts** (transports, commerces, écoles, vie locale)
7. **Pourquoi acheter en VEFA** (garanties, personnalisation, frais réduits)
8. **Informations pratiques** (prix à partir de, livraison prévue, contact)

Réponds en français, style marketing élégant, format Markdown.`,
    };

    const systemPrompt = briefPrompts[briefType] || briefPrompts.commercial;

    const userPrompt = `${clientName ? `Client : ${clientName}\n` : ""}${projectName ? `Projet : ${projectName}\n\n` : "\n"}Documents fournis :\n\n${combinedText}`;

    // ── GPT-4o generation ────────────────────────────────────────────────
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const briefContent = res.choices[0]?.message?.content || "";

    if (!briefContent) {
      return NextResponse.json({ error: "Génération échouée" }, { status: 500 });
    }

    // ── Save brief to Supabase (optional, for history) \
    const briefRecord = {
      client_name: clientName,
      project_name: projectName,
      brief_type: briefType,
      content: briefContent,
      files_count: files.length,
      created_at: new Date().toISOString(),
    };
    const { data: savedBrief } = await supabaseAdmin
      .from("briefs").insert(briefRecord).select("id").single();
    return NextResponse.json({
      success: true, brief: briefContent,
      briefId: savedBrief?.id, clientName, projectName, briefType,
    });
  } catch (error: any) {
    console.error("Brief API error:", error);
    if (error?.status === 429) return NextResponse.json({ error: "Quota OpenAI dépassé." }, { status: 429 });
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("briefs").select("id, client_name, project_name, brief_type, created_at")
      .order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return NextResponse.json({ success: true, briefs: data || [] });
  } catch (error) {
    console.error("Brief GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

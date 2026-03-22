import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";

export const maxDuration = 120;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function extractTextFromFile(file: File): Promise<{ text: string; method: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === "application/pdf") {
    try {
      const pdfData = await pdf(buffer);
      if (pdfData.text && pdfData.text.trim().length > 150) {
        return { text: pdfData.text.trim(), method: "pdf-parse" };
      }
    } catch { }

    try {
      const base64 = buffer.toString("base64");
      const response = await openai.chat.completions.create({
        model: "gpt-4o", max_tokens: 2000,
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}`, detail: "high" } },
          { type: "text", text: "Transcris TOUS les textes visibles : prix, surfaces, dimensions, adresses, nom programme, promoteur, livraison, typologies, prestations. Texte brut." },
        ]}],
      });
      return { text: response.choices[0]?.message?.content || "", method: "vision-ocr" };
    } catch (e) {
      console.error("Vision OCR failed:", e);
      return { text: "", method: "failed" };
    }
  }

  if (file.type.startsWith("image/")) {
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 2000,
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}`, detail: "high" } },
        { type: "text", text: "Transcris tout le texte visible. Inclus prix, surfaces, dimensions, adresses, prestations." },
      ]}],
    });
    return { text: response.choices[0]?.message?.content || "", method: "vision-image" };
  }

  throw new Error(`Type non supporte: ${file.type}`);
}

async function extractStructuredData(rawText: string): Promise<Record<string, string>> {
  if (!rawText || rawText.length < 50) return {};
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", max_tokens: 600,
      messages: [
        { role: "system", content: "Extrais les donnees d'un document immobilier. JSON uniquement." },
        { role: "user", content: `Texte: ${rawText.slice(0, 6000)}\n\nRetourne ce JSON (null si non trouve): {"programmeName":"","city":"","quartier":"","promoteur":"","livraison":"","typologies":"","prixMin":"","prixMax":"","surfaceMin":"","surfaceMax":"","dispositifFiscal":"","prestations":"","transport":"","totalLots":""}` },
      ],
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch { return {}; }
}

const BRIEF_PROMPTS: Record<string, string> = {
  commercial: `Tu es un expert en immobilier neuf VEFA et en vente. Genere un BRIEF COMMERCIAL complet en Markdown.
## Pitch Express (3 phrases max)
## Presentation du Programme
## Typologies et Surfaces
## Points Forts et Arguments de Vente
## Localisation et Attractivite
## Profil Acheteur Cible
## Arguments Financiers et Dispositifs Fiscaux
## Objections et Reponses Preparees
## Prochaines Etapes
Ton : professionnel, enthousiaste, oriente vente.`,
  investisseur: `Tu es consultant en investissement immobilier VEFA. Genere une FICHE INVESTISSEUR en Markdown.
## Synthese Investissement
## Analyse du Marche Local
## Simulation Locative et Rentabilite
## Dispositifs Fiscaux
## Structure de Financement
## Risques et Points de Vigilance
## Comparatif Neuf vs Ancien
## Recommandation`,
  presentation: `Tu es redacteur specialise en communication immobiliere. Genere le CONTENU D'UNE PLAQUETTE en Markdown.
## Accroche Principale
## Introduction
## Presentation du Programme
## Les Typologies
## Prestations et Finitions
## Le Quartier
## Pourquoi Acheter en VEFA
## Informations Pratiques`,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const clientName = (formData.get("clientName") as string) || "";
    const projectName = (formData.get("projectName") as string) || "";
    const briefType = (formData.get("briefType") as string) || "commercial";

    if (!files || files.length === 0) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const extractResults = await Promise.allSettled(files.map((f) => extractTextFromFile(f)));
    const extractedTexts: string[] = [];
    const methods: string[] = [];

    extractResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value.text.trim().length > 50) {
        extractedTexts.push(`=== ${files[i].name} ===\n${result.value.text.trim()}`);
        methods.push(result.value.method);
      }
    });

    if (extractedTexts.length === 0) return NextResponse.json({ error: "Impossible d'extraire du contenu utile." }, { status: 400 });

    const combinedRaw = extractedTexts.join("\n\n");
    const structuredData = await extractStructuredData(combinedRaw);

    const structuredBlock = Object.entries(structuredData).filter(([, v]) => v && v !== "null").map(([k, v]) => `${k}: ${v}`).join("\n");
    const contextHeader = [
      clientName ? `CLIENT: ${clientName}` : "",
      projectName ? `PROJET: ${projectName}` : "",
      structuredBlock ? `\n=== DONNEES EXTRAITES ===\n${structuredBlock}` : "",
    ].filter(Boolean).join("\n");

    const textBody = combinedRaw.slice(0, 18000 - contextHeader.length);
    const userPrompt = `${contextHeader}\n\n=== TEXTE BRUT ===\n${textBody}`;
    const systemPrompt = BRIEF_PROMPTS[briefType] || BRIEF_PROMPTS.commercial;

    const res = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 3500, temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    });

    const briefContent = res.choices[0]?.message?.content || "";
    if (!briefContent) return NextResponse.json({ error: "Generation echouee" }, { status: 500 });

    const { data: savedBrief } = await supabaseAdmin.from("briefs").insert({
      client_name: clientName, project_name: projectName, brief_type: briefType,
      content: briefContent, structured_data: structuredData,
      files_count: files.length, extraction_methods: methods,
      created_at: new Date().toISOString(),
    }).select("id").single();

    return NextResponse.json({ success: true, brief: briefContent, briefId: savedBrief?.id, structuredData, clientName, projectName, briefType });
  } catch (error: any) {
    console.error("Brief API error:", error);
    if (error?.status === 429) return NextResponse.json({ error: "Quota OpenAI depasse." }, { status: 429 });
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin.from("briefs").select("id, client_name, project_name, brief_type, structured_data, created_at").order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return NextResponse.json({ success: true, briefs: data || [] });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

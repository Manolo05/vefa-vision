import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMAIL_TEMPLATES: Record<string, { system: string; maxTokens: number }> = {
  bienvenue: {
    system: `Expert immobilier VEFA. Email bienvenue chaleureux (150-180 mots). Remerciement, presentation service, proposition RDV. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 500,
  },
  relance_douce: {
    system: `Expert immobilier VEFA. Relance douce apres 1-2 semaines silence (100-140 mots). Rappel subtil, info marche, sans pression. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 400,
  },
  relance_forte: {
    system: `Expert immobilier VEFA. Relance urgence mesuree (120-150 mots). Rarete des lots, opportunite, creneau propose. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 450,
  },
  suivi_visite: {
    system: `Expert immobilier VEFA. Email post-visite (130-160 mots). Remerciement, points positifs, prochaines etapes. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 500,
  },
  confirmation_rdv: {
    system: `Expert immobilier VEFA. Confirmation RDV (100-120 mots). Date/heure/lieu, documents a preparer. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 400,
  },
  relance_courtier: {
    system: `Expert immobilier VEFA. Relance courtier B2B (100-130 mots). Suivi financement, demande avancement. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 400,
  },
  relance_banque: {
    system: `Expert immobilier VEFA. Relance banque (100-130 mots). Suivi demande pret, reference dossier, demande statut. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 400,
  },
  docs_manquants: {
    system: `Expert immobilier VEFA. Demande documents manquants (120-150 mots). Liste claire, delai, instructions, ton rassurant. JSON: {"subject":"...","body":"..."}`,
    maxTokens: 500,
  },
};

export async function POST(req: NextRequest) {
  try {
    const gmailToken = req.headers.get("x-gmail-token") || null;
    const body = await req.json();
    const {
      templateType,
      clientId,
      clientName,
      clientEmail,
      agentName,
      programmeNom,
      customContext,
      missingDocs,
      sendViaGmail = false,
    } = body;

    if (!clientEmail)
      return NextResponse.json({ error: "Email client requis" }, { status: 400 });

    const template = EMAIL_TEMPLATES[templateType] || EMAIL_TEMPLATES.relance_douce;
    const contextParts = [
      clientName ? `Destinataire: ${clientName}` : "",
      agentName ? `Conseiller: ${agentName}` : "",
      programmeNom ? `Programme: ${programmeNom}` : "",
      missingDocs?.length ? `Documents manquants: ${missingDocs.join(", ")}` : "",
      customContext ? `Contexte: ${customContext}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: template.maxTokens,
      messages: [
        { role: "system", content: template.system },
        { role: "user", content: `${contextParts}\n\nGenere l'email en francais. Format JSON strict.` },
      ],
      response_format: { type: "json_object" },
    });

    const emailContent = JSON.parse(
      res.choices[0]?.message?.content || '{"subject":"","body":""}'
    );

    let relanceId: string | null = null;
    if (clientId) {
      const { data } = await supabase
        .from("relances")
        .insert({
          client_id: clientId,
          type: templateType,
          subject: emailContent.subject,
          content: emailContent.body,
          to_email: clientEmail,
          status: "genere",
          sent_at: null,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      relanceId = data?.id || null;
    }

    let sent = false;
    if (sendViaGmail && gmailToken) {
      const rawEmail = [
        `To: ${clientEmail}`,
        `Subject: =?UTF-8?B?${Buffer.from(emailContent.subject).toString("base64")}?=`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(emailContent.body).toString("base64"),
      ].join("\r\n");

      const encoded = Buffer.from(rawEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const gmailRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encoded }),
        }
      );
      if (gmailRes.ok) {
        sent = true;
        if (relanceId)
          await supabase
            .from("relances")
            .update({ status: "envoye", sent_at: new Date().toISOString() })
            .eq("id", relanceId);
      }
    }

    return NextResponse.json({ success: true, emailContent, relanceId, sent });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    let query = supabase
      .from("relances")
      .select("*, client:clients(nom, prenom, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (clientId) query = (query as any).eq("client_id", clientId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, relances: data || [] });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

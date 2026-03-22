import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMAIL_TEMPLATES: Record<string, string> = {
  bienvenue: `Tu es un conseiller immobilier expert en VEFA.
Rédige un email de bienvenue chaleureux et professionnel pour un nouveau prospect.
L'email doit : remercier pour leur intérêt, présenter brièvement les services, proposer un rendez-vous.
Ton : professionnel, chaleureux, personnalisé. Longueur : 150-200 mots.`,

  relance_douce: `Tu es un conseiller immobilier expert en VEFA.
Rédige un email de relance douce pour un prospect silencieux depuis 1-2 semaines.
L'email doit : rappeler subtilement l'intérêt qu'ils ont montré, apporter une info utile ou actualité marché, relancer sans pression.
Ton : bienveillant, non intrusif. Longueur : 100-150 mots.`,

  relance_forte: `Tu es un conseiller immobilier expert en VEFA.
Rédige un email de relance avec un sentiment d'urgence mesuré.
L'email doit : mentionner la rareté des lots disponibles, créer un sentiment d'opportunité à ne pas manquer, proposer un créneau concret.
Ton : dynamique, factuel, sans pression excessive. Longueur : 120-160 mots.`,

  suivi_visite: `Tu es un conseiller immobilier expert en VEFA.
Rédige un email de suivi post-visite (visite d'un appartement témoin ou bureau des ventes).
L'email doit : remercier pour la visite, résumer les points positifs évoqués, proposer les prochaines étapes (réservation, simulation financement).
Ton : enthousiaste, concret, orienté vers l'action. Longueur : 130-180 mots.`,

  confirmation_rdv: `Tu es un conseiller immobilier expert en VEFA.
Rédige un email de confirmation de rendez-vous.
L'email doit : confirmer la date/heure/lieu, préparer le prospect (documents à apporter, questions à préparer), créer de l'impatience positive.
Ton : professionnel, rassurant. Longueur : 100-130 mots.`,
};

// POST /api/email/send — generate & log email (actual sending via Gmail API requires OAuth)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      templateType,
      clientId,
      clientName,
      clientEmail,
      agentName,
      programmeNom,
      customContext,
      sendViaGmail = false, // requires OAuth token
      gmailAccessToken,
    } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: "Email client requis" }, { status: 400 });
    }

    const templatePrompt =
      EMAIL_TEMPLATES[templateType] || EMAIL_TEMPLATES.relance_douce;

    const contextBlock = [
      clientName ? `Destinataire : ${clientName}` : "",
      agentName ? `Conseiller : ${agentName}` : "",
      programmeNom ? `Programme immobilier : ${programmeNom}` : "",
      customContext ? `Contexte spécifique : ${customContext}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        { role: "system", content: templatePrompt },
        {
          role: "user",
          content: `${contextBlock}\n\nGénère l'email complet avec Objet et Corps (en français).
Format de réponse JSON strict :
{
  "subject": "...",
  "body": "..."
}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const emailContent = JSON.parse(
      res.choices[0]?.message?.content || '{"subject":"","body":""}'
    );

    // Log the relance in Supabase
    if (clientId) {
      await supabaseAdmin.from("relances").insert({
        client_id: clientId,
        type: templateType,
        sujet: emailContent.subject,
        contenu: emailContent.body,
        statut: sendViaGmail ? "envoyé" : "brouillon",
        created_at: new Date().toISOString(),
      });
    }

    // Optional: Send via Gmail API if OAuth token provided
    if (sendViaGmail && gmailAccessToken) {
      const emailRaw = [
        `To: ${clientEmail}`,
        `Subject: ${emailContent.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        emailContent.body,
      ].join("\n");

      const encoded = Buffer.from(emailRaw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const gmailRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encoded }),
        }
      );

      if (!gmailRes.ok) {
        const err = await gmailRes.json();
        console.error("Gmail send error:", err);
        return NextResponse.json(
          {
            success: true,
            emailContent,
            sent: false,
            warning: "Email généré mais envoi Gmail échoué. Copiez le contenu manuellement.",
          }
        );
      }

      return NextResponse.json({
        success: true,
        emailContent,
        sent: true,
      });
    }

    return NextResponse.json({
      success: true,
      emailContent,
      sent: false,
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/email/send — list relances history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    let query = supabaseAdmin
      .from("relances")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, relances: data || [] });
  } catch (error) {
    console.error("GET relances error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

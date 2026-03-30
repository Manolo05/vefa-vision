import { NextRequest, NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────────────
interface DocumentCategorie {
  id: string;
  label: string;
  description: string;
  champs_extraits: string[];
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES: DocumentCategorie[] = [
  { id: 'fiche_paie', label: 'Fiche de paie', description: '3 derniers bulletins de salaire', champs_extraits: ['revenu_net', 'revenu_brut', 'employeur', 'date_paie'] },
  { id: 'avis_imposition', label: "Avis d'imposition", description: 'Dernier avis fiscal', champs_extraits: ['revenu_fiscal', 'annee', 'situation_familiale'] },
  { id: 'releve_bancaire', label: 'Relevé bancaire', description: '3 derniers relevés de compte', champs_extraits: ['solde_moyen', 'credits_reguliers', 'debits_importants'] },
  { id: 'justificatif_domicile', label: 'Justificatif de domicile', description: 'Facture ou quittance recente', champs_extraits: ['adresse', 'date_document'] },
  { id: 'contrat_travail', label: 'Contrat de travail', description: 'Contrat CDI/CDD', champs_extraits: ['type_contrat', 'date_debut', 'salaire', 'employeur'] },
  { id: 'compromis', label: 'Compromis de vente', description: 'Avant-contrat signé', champs_extraits: ['prix_vente', 'adresse_bien', 'date_signature'] },
  { id: 'titre_propriete', label: 'Titre de propriété', description: 'Acte notarié', champs_extraits: ['bien_decrit', 'valeur_estimee'] },
  { id: 'autre', label: 'Autre document', description: 'Document non categorise', champs_extraits: [] },
];

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentBase64, documentType, categorie, nomFichier } = body as {
      documentBase64: string;
      documentType: string;
      categorie: string;
      nomFichier: string;
    };

    if (!documentBase64 || !categorie) {
      return NextResponse.json({ error: 'documentBase64 et categorie requis' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 });
    }

    const cat = CATEGORIES.find(c => c.id === categorie);
    const champsATrouver = cat ? cat.champs_extraits : [];
    const isImage = documentType.startsWith('image/');

    let messages: object[];

    if (isImage) {
      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: documentType, data: documentBase64 } },
          { type: 'text', text: `Analyse ce document (catégorie: ${cat?.label || categorie}) et extrait les informations suivantes en JSON: ${champsATrouver.join(', ')}. Si une information n'est pas trouvée, indique null. Réponds UNIQUEMENT avec un JSON valide sans markdown.` }
        ]
      }];
    } else {
      messages = [{
        role: 'user',
        content: `Document PDF (catégorie: ${cat?.label || categorie}, fichier: ${nomFichier}). Extrait ces informations en JSON: ${champsATrouver.join(', ')}. Si non disponible, indique null. Réponds UNIQUEMENT avec un JSON valide sans markdown.`
      }];
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errData.error?.message || `Anthropic API error ${anthropicRes.status}`);
    }

    const anthropicData = await anthropicRes.json() as { content: Array<{ type: string; text: string }> };
    const rawText = anthropicData.content[0]?.type === 'text' ? anthropicData.content[0].text : '';

    let donnees: Record<string, unknown> = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) donnees = JSON.parse(jsonMatch[0]);
    } catch {
      donnees = { raw: rawText };
    }

    return NextResponse.json({ succes: true, categorie, nomFichier, donnees, extractedAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('cortia-extract error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET: return categories ─────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ categories: CATEGORIES });
}

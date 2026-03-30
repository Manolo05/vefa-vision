import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ── Types ──────────────────────────────────────────────────────────────────────
interface DocumentCategorie {
  id: string;
  label: string;
  description: string;
  champs_extraits: string[];
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES_DOCUMENTS: DocumentCategorie[] = [
  { id: 'fiche_paie', label: 'Fiche de paie', description: '3 derniers bulletins de salaire', champs_extraits: ['revenu_net', 'revenu_brut', 'employeur', 'date_paie'] },
  { id: 'avis_imposition', label: "Avis d'imposition", description: 'Dernier avis fiscal', champs_extraits: ['revenu_fiscal', 'annee', 'situation_familiale'] },
  { id: 'releve_bancaire', label: 'Relevé bancaire', description: '3 derniers relevés de compte', champs_extraits: ['solde_moyen', 'credits_reguliers', 'debits_importants'] },
  { id: 'justificatif_domicile', label: 'Justificatif de domicile', description: 'Facture ou quittance recente', champs_extraits: ['adresse', 'date_document'] },
  { id: 'contrat_travail', label: 'Contrat de travail', description: 'Contrat CDI/CDD ou attestation employeur', champs_extraits: ['type_contrat', 'date_debut', 'salaire', 'employeur'] },
  { id: 'compromis', label: 'Compromis de vente', description: 'Avant-contrat signé', champs_extraits: ['prix_vente', 'adresse_bien', 'date_signature', 'conditions_suspensives'] },
  { id: 'titre_propriete', label: 'Titre de propriété', description: 'Acte notarié du bien actuel', champs_extraits: ['bien_decrit', 'valeur_estimee'] },
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

    const cat = CATEGORIES_DOCUMENTS.find(c => c.id === categorie);
    const champsATrouver = cat ? cat.champs_extraits : [];

    const client = new Anthropic({ apiKey });

    // Build message based on document type
    let messageContent: Anthropic.MessageParam['content'];
    const isImage = documentType.startsWith('image/');

    if (isImage) {
      const mediaType = documentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: documentBase64 },
        },
        {
          type: 'text',
          text: `Analyse ce document (catégorie: ${cat?.label || categorie}) et extrait les informations suivantes en JSON: ${champsATrouver.join(', ')}. Si une information n'est pas trouvée, indique null. Réponds UNIQUEMENT avec un JSON valide sans markdown.`,
        },
      ];
    } else {
      // PDF or text: use text extraction prompt
      messageContent = [
        {
          type: 'text',
          text: `Voici le contenu base64 d'un document PDF (catégorie: ${cat?.label || categorie}). Extrait les informations suivantes en JSON: ${champsATrouver.join(', ')}. Fichier: ${nomFichier}. Si une information n'est pas disponible, indique null. Réponds UNIQUEMENT avec un JSON valide sans markdown.`,
        },
      ];
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: messageContent }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    let donnees: Record<string, unknown> = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        donnees = JSON.parse(jsonMatch[0]);
      }
    } catch {
      donnees = { raw: rawText };
    }

    return NextResponse.json({
      succes: true,
      categorie,
      nomFichier,
      donnees,
      extractedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('cortia-extract error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET: return categories ─────────────────────────────────────────────────────
export async function GET() {
  const CATEGORIES_LIST: DocumentCategorie[] = [
    { id: 'fiche_paie', label: 'Fiche de paie', description: '3 derniers bulletins de salaire', champs_extraits: ['revenu_net', 'revenu_brut', 'employeur', 'date_paie'] },
    { id: 'avis_imposition', label: "Avis d'imposition", description: 'Dernier avis fiscal', champs_extraits: ['revenu_fiscal', 'annee', 'situation_familiale'] },
    { id: 'releve_bancaire', label: 'Relevé bancaire', description: '3 derniers relevés de compte', champs_extraits: ['solde_moyen', 'credits_reguliers', 'debits_importants'] },
    { id: 'justificatif_domicile', label: 'Justificatif de domicile', description: 'Facture ou quittance recente', champs_extraits: ['adresse', 'date_document'] },
    { id: 'contrat_travail', label: 'Contrat de travail', description: 'Contrat CDI/CDD ou attestation employeur', champs_extraits: ['type_contrat', 'date_debut', 'salaire', 'employeur'] },
    { id: 'compromis', label: 'Compromis de vente', description: 'Avant-contrat signé', champs_extraits: ['prix_vente', 'adresse_bien', 'date_signature', 'conditions_suspensives'] },
    { id: 'titre_propriete', label: 'Titre de propriété', description: 'Acte notarié du bien actuel', champs_extraits: ['bien_decrit', 'valeur_estimee'] },
    { id: 'autre', label: 'Autre document', description: 'Document non categorise', champs_extraits: [] },
  ];
  return NextResponse.json({ categories: CATEGORIES_LIST });
}

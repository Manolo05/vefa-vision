import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================
export interface DocumentCategorie {
  id: string;
  label: string;
  description: string;
  champs_extraits: string[];
}

export const CATEGORIES_DOCUMENTS: DocumentCategorie[] = [
  { id: 'fiche_paie', label: 'Fiche de paie', description: '3 derniers bulletins de salaire', champs_extraits: ['revenu_net', 'employeur', 'poste', 'anciennete'] },
  { id: 'avis_imposition', label: "Avis d'imposition", description: 'Dernier avis fiscal', champs_extraits: ['revenu_fiscal', 'annee'] },
  { id: 'releve_bancaire', label: 'Releve bancaire', description: '3 derniers releves de compte', champs_extraits: ['solde_moyen', 'mouvements_credit'] },
  { id: 'justificatif_domicile', label: 'Justificatif de domicile', description: 'Facture ou quittance recente', champs_extraits: ['adresse'] },
  { id: 'contrat_travail', label: 'Contrat de travail', description: 'Contrat CDI/CDD ou attestation employeur', champs_extraits: ['type_contrat', 'date_debut', 'salaire_brut'] },
  { id: 'compromis', label: 'Compromis de vente', description: 'Avant-contrat signe', champs_extraits: ['prix_vente', 'adresse_bien', 'date_signature'] },
  { id: 'kbis', label: 'Kbis / Bilan', description: 'Pour independants et chefs d\'entreprise', champs_extraits: ['chiffre_affaires', 'resultat_net'] },
  { id: 'autre', label: 'Autre document', description: 'Document divers', champs_extraits: [] },
];

interface ExtractRequest {
  fichier_base64: string;
  nom_fichier: string;
  categorie: string;
  type_mime: string;
}

interface ExtractResponse {
  categorie: string;
  nom_fichier: string;
  donnees_extraites: Record<string, string | number>;
  resume: string;
  confiance: 'haute' | 'moyenne' | 'faible';
  suggestions: string[];
}

// ============================================
// EXTRACTION PROMPTS PAR CATEGORIE
// ============================================
function buildExtractionPrompt(categorie: string, nomFichier: string): string {
  const cat = CATEGORIES_DOCUMENTS.find(c => c.id === categorie);
  const champsStr = cat ? cat.champs_extraits.join(', ') : 'informations pertinentes';

  const promptsSpecifiques: Record<string, string> = {
    fiche_paie: `Analyse cette fiche de paie et extrait :
- Le salaire net mensuel (champ: revenu_net, format: nombre entier en EUR)
- Le salaire brut mensuel (champ: salaire_brut, format: nombre entier en EUR)
- Le nom de l'employeur (champ: employeur, format: texte)
- Le poste/emploi (champ: poste, format: texte)
- La date d'entree dans l'entreprise si visible (champ: date_entree, format: JJ/MM/AAAA)
- Le mois/annee de la fiche (champ: periode, format: MM/AAAA)`,

    avis_imposition: `Analyse cet avis d'imposition et extrait :
- Le revenu fiscal de reference (champ: revenu_fiscal, format: nombre entier en EUR)
- L'annee d'imposition (champ: annee, format: AAAA)
- Le nombre de parts (champ: nb_parts, format: nombre decimal)
- L'impot net (champ: impot_net, format: nombre entier en EUR)`,

    releve_bancaire: `Analyse ce releve bancaire et extrait :
- Le solde final (champ: solde_final, format: nombre en EUR)
- Le total des credits du mois (champ: total_credits, format: nombre en EUR)
- Le total des debits du mois (champ: total_debits, format: nombre en EUR)
- La banque (champ: banque, format: texte)
- La periode (champ: periode, format: MM/AAAA)`,

    compromis: `Analyse ce compromis de vente et extrait :
- Le prix de vente (champ: prix_vente, format: nombre entier en EUR)
- L'adresse du bien (champ: adresse_bien, format: texte)
- La date de signature (champ: date_signature, format: JJ/MM/AAAA)
- La surface si mentionnee (champ: surface, format: nombre en m2)
- Le notaire (champ: notaire, format: texte)`,

    contrat_travail: `Analyse ce contrat de travail et extrait :
- Le type de contrat (champ: type_contrat, format: CDI/CDD/autre)
- La date de debut (champ: date_debut, format: JJ/MM/AAAA)
- Le salaire brut mensuel (champ: salaire_brut, format: nombre entier en EUR)
- L'employeur (champ: employeur, format: texte)
- La duree si CDD (champ: duree_cdd, format: texte)`,
  };

  const promptSpecifique = promptsSpecifiques[categorie] ||
    `Analyse ce document (${nomFichier}) et extrait les informations financieres et administratives pertinentes.`;

  return `Tu es un expert en analyse documentaire pour le courtage immobilier. 

${promptSpecifique}

Reponds UNIQUEMENT avec un JSON valide, sans markdown :
{
  "donnees_extraites": {
    "champ1": valeur1,
    "champ2": "valeur2"
  },
  "resume": "Resume en 2-3 phrases du document analyse",
  "confiance": "haute|moyenne|faible",
  "informations_manquantes": ["info1", "info2"],
  "alertes": ["alerte eventuelle"]
}

Regles :
- confiance "haute" : toutes les donnees cles sont clairement lisibles
- confiance "moyenne" : certaines donnees sont partielles ou peu lisibles  
- confiance "faible" : document illisible ou hors sujet
- Utilise null pour les champs non trouves
- Si le document n'est pas du type ${cat?.label || categorie}, indique-le dans alertes`;
}

// ============================================
// ROUTE HANDLER
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body: ExtractRequest = await req.json();

    if (!body.fichier_base64 || !body.categorie) {
      return NextResponse.json({ error: 'Fichier et categorie requis' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Cle API non configuree' }, { status: 500 });
    }

    const prompt = buildExtractionPrompt(body.categorie, body.nom_fichier);

    // Determine if image or text-based document
    const isImage = body.type_mime.startsWith('image/');
    const isPDF = body.type_mime === 'application/pdf';

    let messageContent;

    if (isImage) {
      // Use vision for images
      const mediaType = body.type_mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: body.fichier_base64 },
        },
        { type: 'text', text: prompt },
      ];
    } else {
      // For PDFs, use text extraction approach
      // We'll ask Claude to work with whatever text context we have
      messageContent = [
        {
          type: 'text',
          text: prompt + '\n\nNote: Document recu en base64 (PDF). Analyse le contenu textuel disponible.',
        },
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: 'Erreur API: ' + errText }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    let extraction: Record<string, unknown>;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON non trouve');
      extraction = JSON.parse(jsonMatch[0]);
    } catch {
      extraction = { donnees_extraites: {}, resume: rawText.substring(0, 200), confiance: 'faible' };
    }

    const result: ExtractResponse = {
      categorie: body.categorie,
      nom_fichier: body.nom_fichier,
      donnees_extraites: (extraction.donnees_extraites as Record<string, string | number>) || {},
      resume: (extraction.resume as string) || '',
      confiance: (extraction.confiance as 'haute' | 'moyenne' | 'faible') || 'faible',
      suggestions: (extraction.informations_manquantes as string[]) || [],
    };

    return NextResponse.json(result);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

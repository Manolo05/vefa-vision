import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================
interface SyntheseRequest {
  dossier: {
    ref: string;
    titre: string;
    emp: {
      prenom: string; nom: string; contrat: string;
      revenu_net: number; variable?: number; foncier?: number;
      anciennete: number; loyer?: number; enfants?: number;
    };
    proj: {
      type_projet: string; prix: number; apport: number;
      travaux?: number; duree: number;
    };
    analyse: {
      rev: number; cout: number; besoin: number; mens: number;
      te: number; rav: number; ravUc: number; ratioApp: number;
      saut: number; score: number; notaire: number;
      forces: string[]; faiblesses: string[]; recos: string[];
    };
    documents?: Array<{ nom: string; categorie: string; extrait?: string }>;
  };
}

interface SyntheseResponse {
  resume_emprunteur: string;
  resume_financier: string;
  points_forts: string[];
  points_vigilance: string[];
  recommandations_presentation: string[];
  note_bancaire: string;
  score_commentaire: string;
  generated_at: string;
}

const CONTRATS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', fonctionnaire: 'Fonctionnaire',
  independant: 'Independant', liberal: 'Liberal',
  chef_entreprise: "Chef d'entreprise", interim: 'Interim', retraite: 'Retraite',
};

const PROJETS: Record<string, string> = {
  rp: 'Residence principale', rs: 'Residence secondaire', locatif: 'Investissement locatif',
};

// ============================================
// PROMPT ENGINE
// ============================================
function buildPrompt(req: SyntheseRequest): string {
  const { emp, proj, analyse, ref, titre } = req.dossier;
  const dureeAns = Math.round((proj.duree || 240) / 12);
  const contratLabel = CONTRATS[emp.contrat] || emp.contrat;
  const projetLabel = PROJETS[proj.type_projet] || proj.type_projet;
  const ancienneteAns = Math.floor((emp.anciennete || 0) / 12);
  const ancienneteMois = (emp.anciennete || 0) % 12;
  const ancienneteStr = ancienneteAns > 0
    ? ancienneteAns + ' an' + (ancienneteAns > 1 ? 's' : '') + (ancienneteMois > 0 ? ' et ' + ancienneteMois + ' mois' : '')
    : (emp.anciennete || 0) + ' mois';

  const docsSection = req.dossier.documents && req.dossier.documents.length > 0
    ? 'Documents fournis : ' + req.dossier.documents.map(d => d.nom + ' (' + d.categorie + ')').join(', ')
    : 'Aucun document joint';

  return `Tu es un expert-courtier immobilier senior avec 15 ans d'experience. Tu dois produire une analyse bancaire complete et professionnelle pour le dossier suivant.

DOSSIER : ${ref} - ${titre}

=== EMPRUNTEUR ===
Nom : ${emp.prenom} ${emp.nom}
Contrat : ${contratLabel}
Anciennete : ${ancienneteStr}
Revenu net mensuel : ${emp.revenu_net.toLocaleString('fr-FR')} EUR
Revenus variables : ${(emp.variable || 0).toLocaleString('fr-FR')} EUR/mois
Revenus fonciers : ${(emp.foncier || 0).toLocaleString('fr-FR')} EUR/mois
Revenus retenus (calcul) : ${analyse.rev.toLocaleString('fr-FR')} EUR/mois
Loyer actuel : ${(emp.loyer || 0).toLocaleString('fr-FR')} EUR/mois
Personnes a charge : ${emp.enfants || 0}
${docsSection}

=== PROJET ===
Type : ${projetLabel}
Prix acquisition : ${proj.prix.toLocaleString('fr-FR')} EUR
Travaux : ${(proj.travaux || 0).toLocaleString('fr-FR')} EUR
Frais notaire : ${analyse.notaire.toLocaleString('fr-FR')} EUR
Cout total : ${analyse.cout.toLocaleString('fr-FR')} EUR
Apport personnel : ${proj.apport.toLocaleString('fr-FR')} EUR (ratio ${analyse.ratioApp}%)
Besoin financement : ${analyse.besoin.toLocaleString('fr-FR')} EUR sur ${dureeAns} ans
Mensualite estimee : ${analyse.mens.toLocaleString('fr-FR')} EUR/mois (taux 3,5%)

=== ANALYSE FINANCIERE ===
Score de bancabilite : ${analyse.score}/100
Taux d'endettement : ${analyse.te}% (seuil HCSF : 35%)
Reste a vivre mensuel : ${analyse.rav.toLocaleString('fr-FR')} EUR
Reste a vivre par UC : ${analyse.ravUc.toLocaleString('fr-FR')} EUR
Saut de charge : ${analyse.saut >= 0 ? '+' : ''}${analyse.saut} EUR/mois
Forces identifiees : ${analyse.forces.length > 0 ? analyse.forces.join(' | ') : 'Aucune'}
Faiblesses identifiees : ${analyse.faiblesses.length > 0 ? analyse.faiblesses.join(' | ') : 'Aucune'}

=== INSTRUCTIONS ===
Tu dois repondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou apres.
Respecte exactement cette structure JSON :

{
  "resume_emprunteur": "3-4 phrases professionnelles presentant le profil emprunteur",
  "resume_financier": "3-4 phrases analysant la situation financiere et la capacite de financement",
  "points_forts": ["point fort 1", "point fort 2", "point fort 3"],
  "points_vigilance": ["point vigilance 1", "point vigilance 2"],
  "recommandations_presentation": ["recommandation 1", "recommandation 2", "recommandation 3"],
  "note_bancaire": "Note bancaire complete de 400-500 mots, ton professionnel, structure PRESENTATION / PROFIL / SITUATION FINANCIERE / PROJET / ATOUTS / CONCLUSION, sans markdown",
  "score_commentaire": "2 phrases expliquant le score ${analyse.score}/100 et ce qui le fait progresser"
}

Regles :
- Ton professionnel, factuel, adapte a une banque
- Pas de markdown dans les textes
- Points_forts : minimum 3, maximum 6 elements
- Points_vigilance : 0 a 4 elements selon le dossier (vide si dossier excellent)
- Recommandations : 2 a 5 elements concrets et actionnables
- Note bancaire : structuree, fluide, sans bullet points`;
}

// ============================================
// ROUTE HANDLER
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body: SyntheseRequest = await req.json();

    if (!body.dossier?.analyse || !body.dossier?.emp || !body.dossier?.proj) {
      return NextResponse.json({ error: 'Donnees dossier incompletes' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Cle API non configuree' }, { status: 500 });
    }

    const prompt = buildPrompt(body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: 'Erreur API Anthropic: ' + errText }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // Parse JSON response
    let synthese: SyntheseResponse;
    try {
      // Extract JSON even if there's surrounding text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON non trouve dans la reponse');
      synthese = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: return raw text as note_bancaire
      synthese = {
        resume_emprunteur: '',
        resume_financier: '',
        points_forts: body.dossier.analyse.forces,
        points_vigilance: body.dossier.analyse.faiblesses,
        recommandations_presentation: body.dossier.analyse.recos,
        note_bancaire: rawText,
        score_commentaire: 'Score ' + body.dossier.analyse.score + '/100.',
        generated_at: new Date().toISOString(),
      };
    }

    synthese.generated_at = new Date().toISOString();
    return NextResponse.json(synthese);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

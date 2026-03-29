import { NextRequest, NextResponse } from 'next/server';

const CONTRATS: Record<string, string> = {
    cdi: 'CDI', cdd: 'CDD', fonctionnaire: 'Fonctionnaire',
    independant: 'Independant', liberal: 'Liberal',
    chef_entreprise: "Chef d'entreprise", interim: 'Interim', retraite: 'Retraite',
  };

const PROJETS: Record<string, string> = {
    rp: 'Residence principale', rs: 'Residence secondaire', locatif: 'Investissement locatif',
  };

export async function POST(req: NextRequest) {
    try {
          const { analyse, emp, proj } = await req.json();
          if (!analyse || !emp || !proj) {
                  return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 });
                }
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
                  return NextResponse.json({ error: 'Cle API non configuree' }, { status: 500 });
                }
          const faiblesses = analyse.faiblesses.length > 0 ? 'Faiblesses : ' + analyse.faiblesses.join(', ') : '';
          const prompt = `Tu es un courtier immobilier senior. Redige une note bancaire premium (400-500 mots) pour ce dossier :

      Emprunteur : ${emp.prenom} ${emp.nom}, ${CONTRATS[emp.contrat] || emp.contrat}, anciennete ${emp.anciennete || 0} mois
      Revenu net : ${analyse.rev} EUR/mois
      Projet : ${PROJETS[proj.type_projet] || 'RP'}, prix ${proj.prix} EUR, apport ${proj.apport} EUR
      Financement : ${analyse.besoin} EUR sur ${Math.round((proj.duree || 240) / 12)} ans
      Mensualite : ${analyse.mens} EUR/mois
      Endettement : ${analyse.te}%
      Reste a vivre : ${analyse.rav} EUR/mois (${analyse.ravUc} EUR/UC)
      Ratio apport : ${analyse.ratioApp}%
      Score : ${analyse.score}/100
      Forces : ${analyse.forces.join(', ')}
      ${faiblesses}

      Structure : PRESENTATION / PROFIL / SITUATION FINANCIERE / PROJET / ATOUTS / CONCLUSION
      Ton professionnel et factuel. Pas de markdown. Pas de bullet points.`;
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
                            messages: [{ role: 'user', content: prompt }],
                          }),
                });
          if (!response.ok) {
                  const err = await response.text();
                  return NextResponse.json({ error: 'Erreur API: ' + err }, { status: 500 });
                }
          const data = await response.json();
          const note = data.content?.[0]?.text || 'Erreur de generation';
          return NextResponse.json({ note });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erreur inconnue';
          return NextResponse.json({ error: message }, { status: 500 });
        }
  }

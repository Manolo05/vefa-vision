'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const C: Record<string, string> = {
  ink: '#0f0f12', ink90: '#1a1a21', ink70: '#2e2e38', ink50: '#52525e',
  ink30: '#8b8b96', ink15: '#c4c4cc', ink08: '#e4e4e9', ink04: '#f2f2f5',
  ink02: '#f8f8fa', white: '#fff',
  brand: '#1a56db', brandL: '#e8eefb',
  em: '#059669', emL: '#ecfdf5', emD: '#065f46',
  am: '#d97706', amL: '#fffbeb', amD: '#92400e',
  rd: '#dc2626', rdL: '#fef2f2', rdD: '#991b1b',
  pu: '#7c3aed', puL: '#f3f0ff',
  te: '#0d9488', teL: '#f0fdfa',
};

const ST: Record<string, { l: string; bg: string; c: string; d: string }> = {
  nouveau: { l: 'Nouveau', bg: '#dbeafe', c: '#1e40af', d: '#3b82f6' },
  en_collecte: { l: 'En collecte', bg: C.amL, c: C.amD, d: C.am },
  en_analyse: { l: 'En analyse', bg: C.puL, c: '#5b21b6', d: C.pu },
  a_corriger: { l: 'A corriger', bg: C.rdL, c: C.rdD, d: C.rd },
  pret_banque: { l: 'Pret banque', bg: C.emL, c: C.emD, d: C.em },
  envoye: { l: 'Envoye', bg: C.teL, c: '#115e59', d: C.te },
  archive: { l: 'Archive', bg: C.ink04, c: C.ink50, d: C.ink30 },
};

const CONTRATS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', fonctionnaire: 'Fonctionnaire',
  independant: 'Independant', liberal: 'Liberal',
  chef_entreprise: "Chef d'entreprise", interim: 'Interim', retraite: 'Retraite',
};

const PROJETS: Record<string, string> = {
  rp: 'Residence principale', rs: 'Residence secondaire', locatif: 'Investissement locatif',
};

const CATEGORIES_DOCS = [
  { id: 'fiche_paie', label: 'Fiche de paie', icon: '💰' },
  { id: 'avis_imposition', label: "Avis d'imposition", icon: '📋' },
  { id: 'releve_bancaire', label: 'Releve bancaire', icon: '🏦' },
  { id: 'justificatif_domicile', label: 'Justif. domicile', icon: '🏠' },
  { id: 'contrat_travail', label: 'Contrat travail', icon: '📄' },
  { id: 'compromis', label: 'Compromis', icon: '🔑' },
  { id: 'kbis', label: 'Kbis / Bilan', icon: '📊' },
  { id: 'autre', label: 'Autre', icon: '📎' },
];

interface Emprunteur {
  prenom: string; nom: string; contrat: string;
  revenu_net: number; variable: number; foncier: number;
  anciennete: number; loyer: number; enfants: number;
}
interface Projet {
  type_projet: string; prix: number; apport: number;
  travaux: number; duree: number;
}
interface Charge { mensualite: number; soldable: boolean; }
interface Analyse {
  rev: number; cout: number; besoin: number; mens: number;
  te: number; rav: number; ravUc: number; ratioApp: number;
  saut: number; score: number; notaire: number;
  forces: string[]; faiblesses: string[]; recos: string[];
}
interface DocFichier {
  id: string; nom: string; categorie: string;
  taille: number; type_mime: string; date_upload: string;
  donnees_extraites?: Record<string, string | number>;
  resume_extraction?: string; confiance?: string;
  base64?: string;
}
interface SyntheseStructuree {
  resume_emprunteur: string;
  resume_financier: string;
  points_forts: string[];
  points_vigilance: string[];
  recommandations_presentation: string[];
  note_bancaire: string;
  score_commentaire: string;
  generated_at: string;
}
interface Dossier {
  id: string; ref: string; titre: string; statut: string;
  score: number | null; createdAt: string; updatedAt: string;
  analyse: Analyse | null; synthese: SyntheseStructuree | null;
  emp: Emprunteur; proj: Projet; charges: Charge[];
  documents: DocFichier[];
}

function loadData<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch { return fallback; }
}
function saveData<T>(key: string, data: T): void {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(data));
  } catch (e) { console.error('Save error:', e); }
}

function analyser(emp: Emprunteur, proj: Projet, charges: Charge[] = []): Analyse {
  const rev = (emp.revenu_net || 0) + (emp.variable || 0) * 0.7 + (emp.foncier || 0) * 0.7;
  const chTotal = charges.reduce((s, c) => s + (c.soldable ? 0 : c.mensualite), 0);
  const prix = proj.prix || 0;
  const notaire = Math.round(prix * 0.078);
  const cout = prix + (proj.travaux || 0) + notaire;
  const besoin = Math.max(0, cout - (proj.apport || 0));
  const taux = 0.035; const dur = proj.duree || 240; const tm = taux / 12;
  const mens = tm > 0 ? besoin * (tm * Math.pow(1 + tm, dur)) / (Math.pow(1 + tm, dur) - 1) : besoin / dur;
  const te = rev > 0 ? Math.round(((chTotal + mens) / rev) * 10000) / 100 : 0;
  const rav = Math.round((rev - chTotal - mens) * 100) / 100;
  const uc = 1 + (emp.enfants || 0) * 0.3;
  const ravUc = Math.round((rav / uc) * 100) / 100;
  const ratioApp = cout > 0 ? Math.round(((proj.apport || 0) / cout) * 10000) / 100 : 0;
  const saut = Math.round((mens - (emp.loyer || 0)) * 100) / 100;
  let score = 50;
  if (emp.contrat === 'cdi' || emp.contrat === 'fonctionnaire') score += 12;
  if ((emp.anciennete || 0) >= 24) score += 8;
  if (te <= 28) score += 15; else if (te <= 33) score += 5; else if (te > 35) score -= 15;
  if (ratioApp >= 20) score += 10; else if (ratioApp >= 10) score += 5; else if (ratioApp < 5) score -= 8;
  if (ravUc > 1000) score += 5; else if (ravUc < 500) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const forces: string[] = []; const faiblesses: string[] = []; const recos: string[] = [];
  if (emp.contrat === 'cdi' || emp.contrat === 'fonctionnaire') forces.push(CONTRATS[emp.contrat] + ' — stabilite professionnelle');
  if ((emp.anciennete || 0) >= 24) forces.push(Math.floor(emp.anciennete / 12) + " ans d'anciennete");
  if (te < 30) forces.push('Endettement confortable a ' + te + '%');
  if (ratioApp >= 15) forces.push('Apport solide de ' + ratioApp + '%');
  if (saut <= 0) forces.push('Pas de saut de charge');
  if (te > 35) { faiblesses.push('Endettement ' + te + '% > seuil HCSF 35%'); recos.push("Allonger la duree ou augmenter l'apport"); }
  if (ratioApp < 5) { faiblesses.push('Apport faible (' + ratioApp + '%)'); recos.push("Augmenter l'apport pour couvrir les frais"); }
  if (ravUc < 500) faiblesses.push('Reste a vivre insuffisant (' + ravUc + ' EUR/UC)');
  if (emp.contrat === 'cdd' || emp.contrat === 'interim') faiblesses.push('Contrat ' + CONTRATS[emp.contrat] + ' — precaire');
  if (saut > 300) recos.push("Saut de charge important — preparer l'argumentaire");
  return { rev: Math.round(rev), cout, besoin: Math.round(besoin), mens: Math.round(mens), te, rav, ravUc, ratioApp, saut: Math.round(saut), score, forces, faiblesses, recos, notaire };
}

// ============================================
// MICRO COMPONENTS
// ============================================
const Badge = ({ s }: { s: string }) => {
  const x = ST[s] || ST.nouveau;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: x.c, background: x.bg, padding: '2px 9px 2px 7px', borderRadius: 16 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: x.d }} />{x.l}</span>;
};

const Ring = ({ v, sz = 40 }: { v: number | null; sz?: number }) => {
  if (v == null) return <div style={{ width: sz, height: sz, borderRadius: '50%', border: '1.5px dashed ' + C.ink08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.ink15 }}>--</div>;
  const r = (sz - 6) / 2; const circ = 2 * Math.PI * r; const offset = circ - (v / 100) * circ;
  const col = v >= 75 ? C.em : v >= 50 ? C.am : C.rd;
  const bg = v >= 75 ? C.emL : v >= 50 ? C.amL : C.rdL;
  const tc = v >= 75 ? C.emD : v >= 50 ? C.amD : C.rdD;
  return <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}><svg width={sz} height={sz} style={{ position: 'absolute' }}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={bg} strokeWidth={3} /><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={col} strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.8s' }} /></svg><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: sz > 50 ? 16 : 12, fontWeight: 700, color: tc }}>{v}</div></div>;
};

const Kpi = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) => (
  <div style={{ background: C.white, borderRadius: 12, padding: '16px 18px', border: '1px solid ' + C.ink08 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: C.ink30, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: accent || C.ink }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.ink30, marginTop: 3 }}>{sub}</div>}
  </div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder, options }: {
  label: string; value: string | number; onChange: (v: string | number) => void;
  type?: string; placeholder?: string; options?: [string, string][];
}) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink70, marginBottom: 4 }}>{label}</label>
    {options ? (
      <select value={String(value)} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.ink08, fontSize: 13, background: C.white }}>
        {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) || 0 : e.target.value)} placeholder={placeholder} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.ink08, fontSize: 13, boxSizing: 'border-box' }} />
    )}
  </div>
);

const Btn = ({ children, onClick, primary, disabled, full, danger }: {
  children: React.ReactNode; onClick?: () => void;
  primary?: boolean; disabled?: boolean; full?: boolean; danger?: boolean;
}) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: danger ? 'none' : primary ? 'none' : '1px solid ' + C.ink08, background: danger ? C.rd : primary ? C.ink : C.white, color: danger || primary ? C.white : C.ink70, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, width: full ? '100%' : 'auto', transition: 'all 0.15s' }}>{children}</button>
);

const defaultEmp = (): Emprunteur => ({ prenom: '', nom: '', contrat: 'cdi', revenu_net: 0, variable: 0, foncier: 0, anciennete: 0, loyer: 0, enfants: 0 });
const defaultProj = (): Projet => ({ type_projet: 'rp', prix: 0, apport: 0, travaux: 0, duree: 240 });

// ============================================
// MAIN APP
// ============================================
export default function CortIA() {
  const [page, setPage] = useState<string>('dashboard');
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [current, setCurrent] = useState<Dossier | null>(null);
  const [tab, setTab] = useState<string>('emprunteur');
  const [loaded, setLoaded] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    const d = loadData<Dossier[]>('cortia-dossiers-v2', []);
    setDossiers(d);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveData('cortia-dossiers-v2', dossiers);
  }, [dossiers, loaded]);

  const updateDossier = useCallback((id: string, updates: Partial<Dossier>) => {
    setDossiers(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d));
    setCurrent(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, []);

  function createDossier(data: { titre: string; emp: Emprunteur; proj: Projet }) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ref = 'COR-2026-' + String(dossiers.length + 1).padStart(4, '0');
    const d: Dossier = { id, ref, statut: 'en_collecte', score: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), analyse: null, synthese: null, charges: [], documents: [], ...data };
    setDossiers(prev => [d, ...prev]);
    setCurrent(d); setPage('dossier'); setTab('emprunteur');
  }

  function openDossier(d: Dossier) { setCurrent(d); setPage('dossier'); setTab('emprunteur'); }

  function runAnalyse() {
    if (!current?.emp?.nom || !current?.proj?.prix) return;
    const r = analyser(current.emp, current.proj, current.charges || []);
    updateDossier(current.id, { analyse: r, score: r.score, statut: r.te > 35 ? 'a_corriger' : 'en_analyse' });
  }

  async function genererSynthese() {
    if (!current?.analyse) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/cortia-synthese-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dossier: {
            ref: current.ref, titre: current.titre,
            emp: current.emp, proj: current.proj,
            analyse: current.analyse,
            documents: (current.documents || []).map(d => ({ nom: d.nom, categorie: d.categorie, extrait: d.resume_extraction })),
          },
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const synthese = data as SyntheseStructuree;
      updateDossier(current.id, { synthese, statut: 'pret_banque' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      alert('Erreur generation : ' + msg);
    }
    setAiLoading(false);
  }

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'dossiers', label: 'Dossiers', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { id: 'nouveau', label: 'Nouveau', icon: 'M12 4v16m8-8H4' },
  ];

  const scored = dossiers.filter(d => d.score != null);
  const scoreMoy = scored.length > 0 ? Math.round(scored.reduce((s, d) => s + (d.score || 0), 0) / scored.length) : 0;
  const actifs = dossiers.filter(d => !['archive', 'envoye'].includes(d.statut));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, system-ui, sans-serif", background: C.ink02 }}>
      <aside style={{ width: 220, background: C.ink, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: C.ink }}>C</div>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>CortIA</span>
        </div>
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); if (n.id === 'nouveau') { setCurrent(null); } }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 7, border: 'none', marginBottom: 2, background: page === n.id ? 'rgba(255,255,255,0.1)' : 'transparent', color: page === n.id ? C.white : C.ink30, fontSize: 13, fontWeight: page === n.id ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d={n.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: C.ink30 }}>
          {dossiers.length} dossier{dossiers.length !== 1 ? 's' : ''} en base
        </div>
      </aside>
      <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}>
        {page === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Tableau de bord</h1><p style={{ fontSize: 13, color: C.ink30, margin: '3px 0 0' }}>{dossiers.length} dossier{dossiers.length !== 1 ? 's' : ''} au total</p></div>
              <Btn primary onClick={() => setPage('nouveau')}>+ Nouveau dossier</Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <Kpi label="Total" value={dossiers.length} sub="Dossiers" />
              <Kpi label="Actifs" value={actifs.length} sub="En cours" accent={C.brand} />
              <Kpi label="Score moyen" value={scoreMoy || '--'} sub="Financabilite" accent={C.am} />
              <Kpi label="Pret banque" value={dossiers.filter(d => d.statut === 'pret_banque').length} sub="A envoyer" accent={C.em} />
            </div>
            {dossiers.length === 0 ? (
              <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, padding: '48px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: C.ink30, marginBottom: 12 }}>Aucun dossier. Creez votre premier dossier pour commencer.</p>
                <Btn primary onClick={() => setPage('nouveau')}>Creer un dossier</Btn>
              </div>
            ) : (
              <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + C.ink04, fontSize: 13, fontWeight: 600 }}>Dossiers recents</div>
                {dossiers.slice(0, 10).map(d => (
                  <div key={d.id} onClick={() => openDossier(d)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid ' + C.ink04, cursor: 'pointer' }}>
                    <Ring v={d.score} sz={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{d.titre || 'Sans titre'}</div>
                      <div style={{ fontSize: 11, color: C.ink30 }}>{d.ref} — {d.emp?.prenom} {d.emp?.nom} {d.documents?.length > 0 ? '· ' + d.documents.length + ' doc' + (d.documents.length > 1 ? 's' : '') : ''}</div>
                    </div>
                    <Badge s={d.statut} />
                    {d.proj?.prix > 0 && <span style={{ fontSize: 12, color: C.ink50 }}>{Math.round(d.proj.prix / 1000)}k</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {page === 'dossiers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Dossiers</h1>
              <Btn primary onClick={() => setPage('nouveau')}>+ Nouveau</Btn>
            </div>
            <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, overflow: 'hidden' }}>
              {dossiers.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: C.ink30 }}>Aucun dossier</div> : dossiers.map(d => (
                <div key={d.id} onClick={() => openDossier(d)} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px 60px', gap: 10, alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid ' + C.ink04, cursor: 'pointer' }}>
                  <Ring v={d.score} sz={34} />
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.titre}</div><div style={{ fontSize: 11, color: C.ink30 }}>{d.ref}</div></div>
                  <Badge s={d.statut} />
                  <span style={{ fontSize: 12, color: C.ink50 }}>{d.proj?.prix ? Math.round(d.proj.prix / 1000) + 'k' : '--'}</span>
                  <span style={{ fontSize: 12, color: C.ink50, fontWeight: 600 }}>{d.analyse?.te ? d.analyse.te + '%' : '--'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {page === 'nouveau' && <NouveauDossier onCreate={createDossier} />}
        {page === 'dossier' && current && (
          <DossierPage d={current} tab={tab} setTab={setTab}
            onUpdate={(u) => updateDossier(current.id, u)}
            onAnalyse={runAnalyse} onSynthese={genererSynthese}
            aiLoading={aiLoading} />
        )}
      </main>
    </div>
  );
}

// ============================================
// NOUVEAU DOSSIER
// ============================================
function NouveauDossier({ onCreate }: { onCreate: (data: { titre: string; emp: Emprunteur; proj: Projet }) => void }) {
  const [step, setStep] = useState(1);
  const [titre, setTitre] = useState('');
  const [tp, setTp] = useState('rp');
  const [emp, setEmp] = useState<Emprunteur>(defaultEmp());
  const [proj, setProj] = useState<Projet>(defaultProj());
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Nouveau dossier</h1>
      <p style={{ fontSize: 13, color: C.ink30, marginBottom: 20 }}>Etape {step}/3</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? C.ink : C.ink08, transition: 'background 0.3s' }} />)}</div>
      <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, padding: 24, maxWidth: 520 }}>
        {step === 1 && <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Informations generales</h3>
          <Input label="Titre du dossier" value={titre} onChange={v => setTitre(String(v))} placeholder="Dupont — Achat RP Bordeaux" />
          <Input label="Type de projet" value={tp} onChange={v => setTp(String(v))} options={Object.entries(PROJETS)} />
          <div style={{ marginTop: 16 }}><Btn primary onClick={() => { if (titre) { setProj(p => ({ ...p, type_projet: tp })); setStep(2); } }} disabled={!titre}>Suivant</Btn></div>
        </>}
        {step === 2 && <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Emprunteur principal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Prenom" value={emp.prenom} onChange={v => setEmp(p => ({ ...p, prenom: String(v) }))} />
            <Input label="Nom" value={emp.nom} onChange={v => setEmp(p => ({ ...p, nom: String(v) }))} />
          </div>
          <Input label="Contrat" value={emp.contrat} onChange={v => setEmp(p => ({ ...p, contrat: String(v) }))} options={Object.entries(CONTRATS)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Revenu net (EUR/mois)" value={emp.revenu_net} onChange={v => setEmp(p => ({ ...p, revenu_net: Number(v) }))} type="number" />
            <Input label="Anciennete (mois)" value={emp.anciennete} onChange={v => setEmp(p => ({ ...p, anciennete: Number(v) }))} type="number" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><Btn onClick={() => setStep(1)}>Retour</Btn><Btn primary onClick={() => { if (emp.prenom && emp.nom) setStep(3); }}>Suivant</Btn></div>
        </>}
        {step === 3 && <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Projet immobilier</h3>
          <Input label="Prix d'acquisition (EUR)" value={proj.prix} onChange={v => setProj(p => ({ ...p, prix: Number(v) }))} type="number" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Apport personnel (EUR)" value={proj.apport} onChange={v => setProj(p => ({ ...p, apport: Number(v) }))} type="number" />
            <Input label="Duree" value={proj.duree} onChange={v => setProj(p => ({ ...p, duree: Number(v) }))} options={[['120','10 ans'],['180','15 ans'],['240','20 ans'],['300','25 ans']]} />
          </div>
          {proj.prix > 0 && <div style={{ background: C.ink02, borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12, color: C.ink50 }}>Frais notaire est. : {Math.round(proj.prix * 0.078).toLocaleString('fr-FR')} EUR — Besoin : {Math.round(proj.prix * 1.078 - proj.apport).toLocaleString('fr-FR')} EUR</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><Btn onClick={() => setStep(2)}>Retour</Btn><Btn primary onClick={() => onCreate({ titre, emp, proj })}>Creer le dossier</Btn></div>
        </>}
      </div>
    </div>
  );
}

// ============================================
// FICHE DOSSIER
// ============================================
function DossierPage({ d, tab, setTab, onUpdate, onAnalyse, onSynthese, aiLoading }: {
  d: Dossier; tab: string; setTab: (t: string) => void;
  onUpdate: (u: Partial<Dossier>) => void;
  onAnalyse: () => void; onSynthese: () => void; aiLoading: boolean;
}) {
  const tabs = ['emprunteur', 'projet', 'analyse', 'documents', 'synthese'];
  const [emp, setEmp] = useState<Emprunteur>(d.emp || defaultEmp());
  const [proj, setProj] = useState<Projet>(d.proj || defaultProj());
  useEffect(() => { setEmp(d.emp || defaultEmp()); setProj(d.proj || defaultProj()); }, [d.id]);
  const a = d.analyse;
  const s = d.synthese;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{d.titre}</h1>
        <Badge s={d.statut} />
        <Ring v={d.score} sz={36} />
      </div>
      <p style={{ fontSize: 12, color: C.ink30, marginBottom: 16 }}>{d.ref}</p>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid ' + C.ink08 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? C.ink : C.ink30, borderBottom: tab === t ? '2px solid ' + C.ink : '2px solid transparent', background: 'none', border: 'none', cursor: 'pointer', marginBottom: -1, textTransform: 'capitalize', position: 'relative' }}>
            {t === 'documents' && d.documents?.length > 0 && <span style={{ position: 'absolute', top: 4, right: 2, width: 16, height: 16, background: C.brand, borderRadius: '50%', fontSize: 9, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{d.documents.length}</span>}
            {t}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 700 }}>
        {tab === 'emprunteur' && (
          <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Emprunteur principal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Prenom" value={emp.prenom || ''} onChange={v => setEmp(p => ({ ...p, prenom: String(v) }))} />
              <Input label="Nom" value={emp.nom || ''} onChange={v => setEmp(p => ({ ...p, nom: String(v) }))} />
            </div>
            <Input label="Contrat" value={emp.contrat || 'cdi'} onChange={v => setEmp(p => ({ ...p, contrat: String(v) }))} options={Object.entries(CONTRATS)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Revenu net (EUR/mois)" value={emp.revenu_net || 0} onChange={v => setEmp(p => ({ ...p, revenu_net: Number(v) }))} type="number" />
              <Input label="Variable (EUR/mois)" value={emp.variable || 0} onChange={v => setEmp(p => ({ ...p, variable: Number(v) }))} type="number" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Anciennete (mois)" value={emp.anciennete || 0} onChange={v => setEmp(p => ({ ...p, anciennete: Number(v) }))} type="number" />
              <Input label="Loyer actuel (EUR)" value={emp.loyer || 0} onChange={v => setEmp(p => ({ ...p, loyer: Number(v) }))} type="number" />
              <Input label="Enfants" value={emp.enfants || 0} onChange={v => setEmp(p => ({ ...p, enfants: Number(v) }))} type="number" />
            </div>
            <div style={{ marginTop: 16 }}><Btn primary onClick={() => onUpdate({ emp })}>Enregistrer</Btn></div>
          </div>
        )}
        {tab === 'projet' && (
          <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Projet immobilier</h3>
            <Input label="Type" value={proj.type_projet || 'rp'} onChange={v => setProj(p => ({ ...p, type_projet: String(v) }))} options={Object.entries(PROJETS)} />
            <Input label="Prix acquisition (EUR)" value={proj.prix || 0} onChange={v => setProj(p => ({ ...p, prix: Number(v) }))} type="number" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Apport (EUR)" value={proj.apport || 0} onChange={v => setProj(p => ({ ...p, apport: Number(v) }))} type="number" />
              <Input label="Travaux (EUR)" value={proj.travaux || 0} onChange={v => setProj(p => ({ ...p, travaux: Number(v) }))} type="number" />
            </div>
            <Input label="Duree" value={proj.duree || 240} onChange={v => setProj(p => ({ ...p, duree: Number(v) }))} options={[['120','10 ans'],['180','15 ans'],['240','20 ans'],['300','25 ans']]} />
            <div style={{ marginTop: 16 }}><Btn primary onClick={() => onUpdate({ proj })}>Enregistrer</Btn></div>
          </div>
        )}
        {tab === 'analyse' && (
          <div>
            {!a ? (
              <div style={{ background: C.white, borderRadius: 12, border: '1px solid ' + C.ink08, padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: C.ink30, marginBottom: 12 }}>Completez emprunteur + projet puis lancez l\'analyse</p>
                <Btn primary onClick={onAnalyse} disabled={!d.emp?.nom || !d.proj?.prix}>Lancer l\'analyse</Btn>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <Ring v={a.score} sz={64} />
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>Score : {a.score}/100</div><div style={{ fontSize: 12, color: C.ink30 }}>Financabilite</div></div>
                  <div style={{ marginLeft: 'auto' }}><Btn onClick={onAnalyse}>Recalculer</Btn></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { l: 'Endettement', v: a.te + '%', ok: a.te <= 35 ? (a.te <= 33 ? 'good' : 'warn') : 'bad' },
                    { l: 'RAV / UC', v: a.ravUc + ' EUR', ok: a.ravUc >= 800 ? 'good' : a.ravUc >= 500 ? 'warn' : 'bad' },
                    { l: 'Ratio apport', v: a.ratioApp + '%', ok: a.ratioApp >= 15 ? 'good' : a.ratioApp >= 5 ? 'warn' : 'bad' },
                    { l: 'Mensualite', v: a.mens + ' EUR', ok: 'neutral' },
                  ].map((r, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 10, padding: '12px 14px', border: '1px solid ' + C.ink08, boxShadow: 'inset 3px 0 0 ' + (r.ok === 'good' ? C.em : r.ok === 'warn' ? C.am : r.ok === 'bad' ? C.rd : C.ink15) }}>
                      <div style={{ fontSize: 10, color: C.ink30, marginBottom: 2 }}>{r.l}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f0f12' }}>{r.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { l: 'Cout total', v: a.cout.toLocaleString('fr-FR') + ' EUR' },
                    { l: 'Besoin financement', v: a.besoin.toLocaleString('fr-FR') + ' EUR' },
                    { l: 'Saut de charge', v: (a.saut >= 0 ? '+' : '') + a.saut + ' EUR/mois' },
                    { l: 'Revenus retenus', v: a.rev.toLocaleString('fr-FR') + ' EUR/mois' },
                  ].map((r, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 10, padding: '12px 14px', border: '1px solid ' + C.ink08 }}>
                      <div style={{ fontSize: 10, color: C.ink30, marginBottom: 2 }}>{r.l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f0f12' }}>{r.v}</div>
                    </div>
                  ))}
                </div>
                {a.forces.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.emD, marginBottom: 6 }}>Forces</div>{a.forces.map((f, i) => <div key={i} style={{ fontSize: 12, background: C.emL, color: C.emD, padding: '6px 10px', borderRadius: 6, marginBottom: 4 }}>{f}</div>)}</div>}
                {a.faiblesses.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.rdD, marginBottom: 6 }}>Faiblesses</div>{a.faiblesses.map((f, i) => <div key={i} style={{ fontSize: 12, background: C.rdL, color: C.rdD, padding: '6px 10px', borderRadius: 6, marginBottom: 4 }}>{f}</div>)}</div>}
                {a.recos.length > 0 && <div><div style={{ fontSize: 12, fontWeight: 600, color: C.brand, marginBottom: 6 }}>Recommandations</div>{a.recos.map((r, i) => <div key={i} style={{ fontSize: 12, background: C.brandL, color: C.brand, padding: '6px 10px', borderRadius: 6, marginBottom: 4 }}>{r}</div>)}</div>}
              </div>
            )}
          </div>
        )}
        {tab === 'documents' && <DocumentsTab d={d} onUpdate={onUpdate} />}
        {tab === 'synthese' && <SyntheseTab d={d} onSynthese={onSynthese} aiLoading={aiLoading} />}
      </div>
    </div>
  );
}

// ============================================
// DOCUMENTS TAB
// ============================================
function DocumentsTab({ d, onUpdate }: { d: Dossier; onUpdate: (u: Partial<Dossier>) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState('fiche_paie');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docs = d.documents || [];

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(selectedCat);
    const newDocs: DocFichier[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { alert('Fichier trop lourd (max 10MB) : ' + file.name); continue; }
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const doc: DocFichier = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
        nom: file.name, categorie: selectedCat,
        taille: file.size, type_mime: file.type,
        date_upload: new Date().toISOString(),
        base64,
      };
      newDocs.push(doc);
    }
    const updated = [...docs, ...newDocs];
    onUpdate({ documents: updated });
    setUploading(null);
  }

  async function extraireDocument(docId: string) {
    const doc = docs.find(d => d.id === docId);
    if (!doc || !doc.base64) return;
    setExtracting(docId);
    try {
      const response = await fetch('/api/cortia-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fichier_base64: doc.base64, nom_fichier: doc.nom, categorie: doc.categorie, type_mime: doc.type_mime }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const updated = docs.map(dd => dd.id === docId ? { ...dd, donnees_extraites: data.donnees_extraites, resume_extraction: data.resume, confiance: data.confiance } : dd);
      onUpdate({ documents: updated });
    } catch (err) { alert('Extraction echouee : ' + (err instanceof Error ? err.message : 'Erreur')); }
    setExtracting(null);
  }

  function supprimerDocument(docId: string) {
    onUpdate({ documents: docs.filter(dd => dd.id !== docId) });
  }

  const catLabel = (id: string) => CATEGORIES_DOCS.find(c => c.id === id)?.label || id;
  const catIcon = (id: string) => CATEGORIES_DOCS.find(c => c.id === id)?.icon || '📎';

  return (
    <div>
      {/* Upload zone */}
      <div style={{ background: C.white, borderRadius: 12, border: '2px dashed ' + C.ink08, padding: 24, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 12 }}>Ajouter des documents</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: C.ink30, marginRight: 8 }}>Categorie :</label>
          <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid ' + C.ink08, fontSize: 13 }}>
            {CATEGORIES_DOCS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <Btn primary onClick={() => fileInputRef.current?.click()} disabled={!!uploading}>
          {uploading ? 'Chargement...' : '+ Choisir des fichiers'}
        </Btn>
        <p style={{ fontSize: 11, color: C.ink30, marginTop: 8 }}>PDF, JPG, PNG — max 10MB par fichier</p>
      </div>

      {/* Liste documents */}
      {docs.length === 0 ? (
        <div style={{ background: C.ink02, borderRadius: 10, padding: '24px', textAlign: 'center', color: C.ink30, fontSize: 13 }}>Aucun document. Commencez par ajouter des pieces justificatives.</div>
      ) : (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink30, marginBottom: 8 }}>{docs.length} document{docs.length > 1 ? 's' : ''}</div>
          {docs.map(doc => (
            <div key={doc.id} style={{ background: C.white, borderRadius: 10, border: '1px solid ' + C.ink08, padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{catIcon(doc.categorie)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{doc.nom}</div>
                  <div style={{ fontSize: 11, color: C.ink30 }}>{catLabel(doc.categorie)} — {formatSize(doc.taille)} — {new Date(doc.date_upload).toLocaleDateString('fr-FR')}</div>
                  {doc.confiance && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: doc.confiance === 'haute' ? C.emL : doc.confiance === 'moyenne' ? C.amL : C.rdL, color: doc.confiance === 'haute' ? C.emD : doc.confiance === 'moyenne' ? C.amD : C.rdD }}>
                        Confiance {doc.confiance}
                      </span>
                    </div>
                  )}
                  {doc.resume_extraction && <div style={{ fontSize: 12, color: C.ink50, marginTop: 6, lineHeight: 1.5 }}>{doc.resume_extraction}</div>}
                  {doc.donnees_extraites && Object.keys(doc.donnees_extraites).length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(doc.donnees_extraites).filter(([, v]) => v != null).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 11, background: C.brandL, color: C.brand, padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
                          {k.replace(/_/g, ' ')}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {doc.base64 && !doc.resume_extraction && (
                    <button onClick={() => extraireDocument(doc.id)} disabled={extracting === doc.id}
                      style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, border: '1px solid ' + C.brand, color: C.brand, background: C.brandL, cursor: extracting === doc.id ? 'not-allowed' : 'pointer', opacity: extracting === doc.id ? 0.6 : 1 }}>
                      {extracting === doc.id ? '...' : '✦ Extraire'}
                    </button>
                  )}
                  {doc.base64 && doc.resume_extraction && (
                    <button onClick={() => extraireDocument(doc.id)} disabled={extracting === doc.id}
                      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid ' + C.ink08, color: C.ink50, background: C.white, cursor: 'pointer' }}>
                      {extracting === doc.id ? '...' : '↻'}
                    </button>
                  )}
                  <button onClick={() => supprimerDocument(doc.id)}
                    style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid ' + C.rdL, color: C.rd, background: C.rdL, cursor: 'pointer' }}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── P7 SYNTHESE TAB ──────────────────────────────────────────────────────────
function SyntheseTab({ dossier, onUpdateDossier }: { dossier: Dossier; onUpdateDossier: (d: Dossier) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const synthese = dossier.synthese;

  async function generer() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cortia-synthese-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error((err as { error: string }).error || 'Erreur serveur');
      }
      const data = await res.json() as SyntheseStructuree;
      const updated: Dossier = {
        ...dossier,
        synthese: { ...data, generated_at: new Date().toISOString() },
        updatedAt: new Date().toISOString(),
      };
      onUpdateDossier(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  function copierNote() {
    if (!synthese?.note_bancaire) return;
    navigator.clipboard.writeText(synthese.note_bancaire).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sectionCard = (title: string, icon: string, children: React.ReactNode) => (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const tagList = (items: string[], bg: string, col: string) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((item, i) => (
        <span key={i} style={{ background: bg, color: col, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
          {item}
        </span>
      ))}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>Synthèse bancaire IA</h2>
          {synthese?.generated_at && (
            <span style={{ fontSize: 12, color: C.muted, marginTop: 4, display: 'block' }}>
              Générée le {new Date(synthese.generated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {synthese?.note_bancaire && (
            <button onClick={copierNote} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer' }}>
              {copied ? '✓ Copié !' : '📋 Copier la note'}
            </button>
          )}
          <button
            onClick={generer}
            disabled={loading}
            style={{ fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', background: loading ? C.border : C.accent, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '⏳ Génération...' : synthese ? '🔄 Regénérer' : '✨ Générer la synthèse'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid ' + C.rd, borderRadius: 10, padding: 14, marginBottom: 20, color: C.rd, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>Analyse en cours...</div>
          <div style={{ fontSize: 13 }}>Claude analyse le dossier et génère la synthèse bancaire complète</div>
        </div>
      )}

      {!loading && !synthese && !error && (
        <div style={{ textAlign: 'center', padding: 60, background: C.surface, borderRadius: 16, border: '2px dashed ' + C.border }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 8 }}>Aucune synthèse générée</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Cliquez pour obtenir une analyse bancaire IA structurée en 6 sections</div>
          <button onClick={generer} style={{ fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer' }}>
            ✨ Générer la synthèse
          </button>
        </div>
      )}

      {!loading && synthese && (
        <div>
          {synthese.resume_emprunteur && sectionCard('Résumé emprunteur', '👤', (
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0 }}>{synthese.resume_emprunteur}</p>
          ))}
          {synthese.resume_financier && sectionCard('Résumé financier', '💶', (
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0 }}>{synthese.resume_financier}</p>
          ))}
          {synthese.points_forts && synthese.points_forts.length > 0 && sectionCard('Points forts', '✅', (
            tagList(synthese.points_forts, '#e8f5e9', '#2e7d32')
          ))}
          {synthese.points_vigilance && synthese.points_vigilance.length > 0 && sectionCard('Points de vigilance', '⚠️', (
            tagList(synthese.points_vigilance, '#fff3e0', '#e65100')
          ))}
          {synthese.recommandations_presentation && synthese.recommandations_presentation.length > 0 && sectionCard('Recommandations', '💡', (
            tagList(synthese.recommandations_presentation, '#e3f2fd', '#1565c0')
          ))}
          {synthese.note_bancaire && sectionCard('Note bancaire premium', '🏦', (
            <div>
              <div style={{ background: C.bg, borderRadius: 8, padding: 16, fontSize: 13, color: C.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {synthese.note_bancaire}
              </div>
              {synthese.score_commentaire && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: C.accent, fontWeight: 600 }}>
                  📊 {synthese.score_commentaire}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

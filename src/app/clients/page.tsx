"use client";
import { useState, useEffect } from "react";
import { Users, Plus, Search, Mail, Phone, Building2, Loader2, X, CheckCircle2, Send, FileText, Sparkles, FolderOpen } from "lucide-react";
import Link from "next/link";

type ClientStatut = "prospect" | "contacté" | "visité" | "réservé" | "signé" | "livré";
interface Client { id: string; nom: string; prenom: string; email: string; telephone?: string; source?: string; statut: ClientStatut; budget?: string; projet?: string; notes?: string; created_at: string; }
interface Dossier { id: string; programme: string; lot?: string; typologie?: string; surface?: number; prix?: number; statut: string; date_livraison?: string; }

const STATUT_COLORS: Record<ClientStatut, string> = { prospect:"bg-slate-500/20 text-slate-300", "contacté":"bg-blue-500/20 text-blue-300", visité:"bg-purple-500/20 text-purple-300", réservé:"bg-yellow-500/20 text-yellow-300", signé:"bg-emerald-500/20 text-emerald-300", livré:"bg-green-500/20 text-green-300" };
const DOSSIER_STATUTS: Record<string, string> = { en_cours:"bg-blue-500/20 text-blue-300", banque:"bg-yellow-500/20 text-yellow-300", offre_pret:"bg-purple-500/20 text-purple-300", acte:"bg-emerald-500/20 text-emerald-300", livre:"bg-green-500/20 text-green-300", annule:"bg-red-500/20 text-red-300" };
const EMAIL_TYPES = [
  { id:"bienvenue", label:"Email de bienvenue" }, { id:"relance_douce", label:"Relance douce" },
  { id:"relance_forte", label:"Relance urgente" }, { id:"suivi_visite", label:"Suivi apres visite" },
  { id:"confirmation_rdv", label:"Confirmation RDV" }, { id:"relance_courtier", label:"Relance courtier" },
  { id:"relance_banque", label:"Relance banque" }, { id:"docs_manquants", label:"Documents manquants" },
];
const DOCS_CHECKLIST = [
  { id:"cni", label:"CNI / Passeport", obligatoire:true }, { id:"justif_domicile", label:"Justificatif domicile", obligatoire:true },
  { id:"3_bulletins", label:"3 bulletins de salaire", obligatoire:true }, { id:"avis_imposition", label:"2 avis d'imposition", obligatoire:true },
  { id:"releves_3mois", label:"3 releves bancaires", obligatoire:true }, { id:"apport", label:"Justificatif apport", obligatoire:false },
  { id:"contrat_travail", label:"Contrat travail / K-bis", obligatoire:true }, { id:"contrat_reservation", label:"Contrat reservation signe", obligatoire:true },
  { id:"plan_appartement", label:"Plan appartement", obligatoire:true }, { id:"notice_descriptive", label:"Notice descriptive", obligatoire:false },
  { id:"simulation_pret", label:"Simulation pret", obligatoire:false }, { id:"offre_pret", label:"Offre de pret", obligatoire:false },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [emailType, setEmailType] = useState("relance_douce");
  const [emailLoading, setEmailLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{subject:string;body:string}|null>(null);
  const [copied, setCopied] = useState(false);
  const [newClient, setNewClient] = useState({ nom:"", prenom:"", email:"", telephone:"", source:"direct", budget:"", projet:"", notes:"" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<Dossier|null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showNewDossier, setShowNewDossier] = useState(false);
  const [newDossier, setNewDossier] = useState({ programme:"", lot:"", typologie:"", surface:"", prix:"", statut:"en_cours", date_livraison:"" });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (data.success) setClients(data.clients);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchClients(); }, [search]);

  const addClient = async () => {
    if (!newClient.nom || !newClient.email) { setAddError("Nom et email requis"); return; }
    setAddLoading(true); setAddError("");
    try {
      const res = await fetch("/api/clients", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(newClient) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setClients((p) => [data.client, ...p]);
      setShowAddModal(false);
      setNewClient({ nom:"", prenom:"", email:"", telephone:"", source:"direct", budget:"", projet:"", notes:"" });
    } catch(err:any) { setAddError(err.message||"Erreur"); }
    finally { setAddLoading(false); }
  };

  const updateStatut = async (clientId: string, statut: ClientStatut) => {
    try {
      await fetch("/api/clients", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:clientId, statut }) });
      setClients((p) => p.map((c) => c.id===clientId ? {...c, statut} : c));
    } catch(e) { console.error(e); }
  };

  const generateEmail = async () => {
    if (!selectedClient) return;
    setEmailLoading(true); setGeneratedEmail(null);
    try {
      const res = await fetch("/api/email/send", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ templateType:emailType, clientId:selectedClient.id, clientName:`${selectedClient.prenom} ${selectedClient.nom}`, clientEmail:selectedClient.email, programmeNom:selectedClient.projet||"" }) });
      const data = await res.json();
      if (data.success) setGeneratedEmail(data.emailContent);
    } catch(e) { console.error(e); }
    finally { setEmailLoading(false); }
  };

  const openDossierModal = async (client: Client) => {
    setSelectedClient(client); setShowDossierModal(true); setSelectedDossier(null); setChecklist([]);
    const res = await fetch(`/api/dossiers?clientId=${client.id}`);
    const data = await res.json();
    if (data.success) setDossiers(data.dossiers);
  };

  const loadChecklist = async (dossierId: string) => {
    setLoadingDocs(true);
    const res = await fetch(`/api/dossiers/${dossierId}/documents`);
    const data = await res.json();
    if (data.success) { setChecklist(data.checklist); setCompletionRate(data.completionRate); }
    setLoadingDocs(false);
  };

  const toggleDoc = async (dossierId: string, docId: string, current: string) => {
    const newStatus = current === "recu" ? "manquant" : "recu";
    await fetch(`/api/dossiers/${dossierId}/documents`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ document_type:docId, status:newStatus }) });
    loadChecklist(dossierId);
  };

  const createDossier = async () => {
    if (!selectedClient || !newDossier.programme) return;
    const res = await fetch("/api/dossiers", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ client_id:selectedClient.id, ...newDossier }) });
    const data = await res.json();
    if (data.success) { setDossiers((p) => [data.dossier, ...p]); setShowNewDossier(false); setNewDossier({ programme:"", lot:"", typologie:"", surface:"", prix:"", statut:"en_cours", date_livraison:"" }); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-white"/></div>
            <div><h1 className="font-bold text-lg">CRM Clients</h1><p className="text-xs text-slate-400">VEFA Vision — Module 3</p></div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← Retour</Link>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/>Nouveau client</button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(["prospect","contacté","réservé","signé"] as ClientStatut[]).map((s) => (
            <div key={s} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold">{clients.filter((c) => c.statut===s).length}</div>
              <div className={`text-xs mt-1 capitalize px-2 py-0.5 rounded-full inline-block ${STATUT_COLORS[s]}`}>{s}</div>
            </div>
          ))}
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom, email..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"/>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400"/></div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20"><Users className="w-16 h-16 text-slate-700 mx-auto mb-4"/><p className="text-slate-500">Aucun client pour le moment</p><button onClick={() => setShowAddModal(true)} className="mt-4 text-sm text-blue-400 hover:text-blue-300">Ajouter votre premier client →</button></div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div key={client.id} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-white/8 transition-colors">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-semibold text-sm flex-shrink-0">{(client.prenom?.[0]||client.nom[0]).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-medium">{client.prenom} {client.nom}</span><span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLORS[client.statut]}`}>{client.statut}</span></div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3"/>{client.email}</span>
                    {client.telephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{client.telephone}</span>}
                    {client.projet && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/>{client.projet}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={client.statut} onChange={(e) => updateStatut(client.id, e.target.value as ClientStatut)} onClick={(e) => e.stopPropagation()} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none">
                    {Object.keys(STATUT_COLORS).map((s) => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
                  </select>
                  <button onClick={() => { setSelectedClient(client); setShowEmailModal(true); setGeneratedEmail(null); }} className="flex items-center gap-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 rounded-lg px-3 py-1.5 transition-colors"><Send className="w-3.5 h-3.5"/>Email IA</button>
                  <button onClick={() => openDossierModal(client)} className="flex items-center gap-1.5 text-xs bg-slate-600/20 hover:bg-slate-600/40 border border-slate-500/30 text-slate-300 rounded-lg px-3 py-1.5 transition-colors"><FolderOpen className="w-3.5 h-3.5"/>Dossier</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5"><h2 className="font-semibold text-lg">Nouveau client</h2><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Prenom" value={newClient.prenom} onChange={(e) => setNewClient((p) => ({...p, prenom:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"/>
                <input type="text" placeholder="Nom *" value={newClient.nom} onChange={(e) => setNewClient((p) => ({...p, nom:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"/>
              </div>
              <input type="email" placeholder="Email *" value={newClient.email} onChange={(e) => setNewClient((p) => ({...p, email:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"/>
              <input type="tel" placeholder="Telephone" value={newClient.telephone} onChange={(e) => setNewClient((p) => ({...p, telephone:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"/>
              <input type="text" placeholder="Programme / projet d'interet" value={newClient.projet} onChange={(e) => setNewClient((p) => ({...p, projet:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"/>
              <textarea placeholder="Notes" value={newClient.notes} onChange={(e) => setNewClient((p) => ({...p, notes:e.target.value}))} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"/>
            </div>
            {addError && <p className="text-sm text-red-400 mt-3">{addError}</p>}
            <button onClick={addClient} disabled={addLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Ajouter le client
            </button>
          </div>
        </div>
      )}

      {showEmailModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="font-semibold text-lg">Email IA</h2><p className="text-xs text-slate-400">Pour {selectedClient.prenom} {selectedClient.nom}</p></div>
              <button onClick={() => setShowEmailModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {EMAIL_TYPES.map((t) => (<button key={t.id} onClick={() => setEmailType(t.id)} className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${emailType===t.id ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>{t.label}</button>))}
            </div>
            <button onClick={generateEmail} disabled={emailLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mb-4">
              {emailLoading ? <><Loader2 className="w-4 h-4 animate-spin"/>Generation...</> : <><Sparkles className="w-4 h-4"/>Generer l'email</>}
            </button>
            {generatedEmail && (
              <div className="space-y-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4"><p className="text-xs text-slate-400 mb-1">Objet :</p><p className="text-sm font-medium">{generatedEmail.subject}</p></div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto"><p className="text-xs text-slate-400 mb-1">Corps :</p><pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{generatedEmail.body}</pre></div>
                <button onClick={() => { navigator.clipboard.writeText(`Objet: ${generatedEmail.subject}\n\n${generatedEmail.body}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {copied ? <><CheckCircle2 className="w-4 h-4"/>Copie !</> : <><FileText className="w-4 h-4"/>Copier l'email</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDossierModal && selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div><h2 className="font-semibold text-lg">Dossier — {selectedClient.prenom} {selectedClient.nom}</h2><p className="text-xs text-slate-400">{selectedClient.email}</p></div>
              <button onClick={() => setShowDossierModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
            </div>
            <div className="p-6 space-y-3">
              {dossiers.map((d) => (
                <div key={d.id} onClick={() => { setSelectedDossier(d); loadChecklist(d.id); }} className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedDossier?.id===d.id ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                  <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm">{d.programme}</span><span className={`text-xs px-2 py-0.5 rounded-full ${DOSSIER_STATUTS[d.statut]||"bg-slate-500/20 text-slate-300"}`}>{d.statut.replace("_"," ")}</span></div>
                  <div className="flex gap-4 text-xs text-slate-400">{d.typologie&&<span>{d.typologie}</span>}{d.surface&&<span>{d.surface} m²</span>}{d.prix&&<span>{d.prix.toLocaleString("fr-FR")} €</span>}{d.lot&&<span>Lot {d.lot}</span>}</div>
                </div>
              ))}

              {selectedDossier && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Documents ({completionRate}%)</h3>
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${completionRate}%`}}/></div>
                  </div>
                  {loadingDocs ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400"/></div> : (
                    <div className="space-y-1">
                      {checklist.map((doc) => (
                        <button key={doc.id} onClick={() => toggleDoc(selectedDossier.id, doc.id, doc.status)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${doc.status==="recu" ? "bg-emerald-500 border-emerald-500" : doc.obligatoire ? "border-red-400" : "border-slate-600"}`}>
                            {doc.status==="recu" && <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                          </div>
                          <span className={`text-sm flex-1 text-left ${doc.status==="recu" ? "text-slate-500 line-through" : "text-slate-200"}`}>{doc.label}</span>
                          {doc.obligatoire && doc.status!=="recu" && <span className="text-xs text-red-400">Requis</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!showNewDossier ? (
                <button onClick={() => setShowNewDossier(true)} className="w-full flex items-center justify-center gap-2 text-sm text-blue-400 border border-blue-500/30 rounded-xl py-3 hover:bg-blue-500/10 transition-colors"><Plus className="w-4 h-4"/>Creer un dossier</button>
              ) : (
                <div className="border border-white/10 rounded-xl p-4 space-y-3">
                  <input placeholder="Programme *" value={newDossier.programme} onChange={(e) => setNewDossier((p) => ({...p, programme:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"/>
                  <div className="grid grid-cols-3 gap-2">
                    <input placeholder="Lot" value={newDossier.lot} onChange={(e) => setNewDossier((p) => ({...p, lot:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"/>
                    <input placeholder="T2/T3..." value={newDossier.typologie} onChange={(e) => setNewDossier((p) => ({...p, typologie:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"/>
                    <input placeholder="m²" type="number" value={newDossier.surface} onChange={(e) => setNewDossier((p) => ({...p, surface:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Prix €" type="number" value={newDossier.prix} onChange={(e) => setNewDossier((p) => ({...p, prix:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"/>
                    <input type="date" value={newDossier.date_livraison} onChange={(e) => setNewDossier((p) => ({...p, date_livraison:e.target.value}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"/>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewDossier(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
                    <button onClick={createDossier} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors">Creer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

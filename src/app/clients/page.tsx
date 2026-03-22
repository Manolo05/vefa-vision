"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

type ClientStatut = "prospect" | "contacté" | "visité" | "réservé" | "signé" | "livré";

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  source?: string;
  statut: ClientStatut;
  budget?: string;
  projet?: string;
  notes?: string;
  created_at: string;
}

const STATUT_COLORS: Record<ClientStatut, string> = {
  prospect: "bg-slate-500/20 text-slate-300",
  contacté: "bg-blue-500/20 text-blue-300",
  visité: "bg-purple-500/20 text-purple-300",
  réservé: "bg-yellow-500/20 text-yellow-300",
  signé: "bg-emerald-500/20 text-emerald-300",
  livré: "bg-green-500/20 text-green-300",
};

const EMAIL_TYPES = [
  { id: "bienvenue", label: "Email de bienvenue" },
  { id: "relance_douce", label: "Relance douce" },
  { id: "relance_forte", label: "Relance urgente" },
  { id: "suivi_visite", label: "Suivi après visite" },
  { id: "confirmation_rdv", label: "Confirmation RDV" },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailType, setEmailType] = useState("relance_douce");
  const [emailLoading, setEmailLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // New client form
  const [newClient, setNewClient] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    source: "direct",
    budget: "",
    projet: "",
    notes: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (data.success) setClients(data.clients);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  const addClient = async () => {
    if (!newClient.nom || !newClient.email) {
      setAddError("Nom et email requis");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setClients((prev) => [data.client, ...prev]);
      setShowAddModal(false);
      setNewClient({ nom: "", prenom: "", email: "", telephone: "", source: "direct", budget: "", projet: "", notes: "" });
    } catch (err: any) {
      setAddError(err.message || "Erreur");
    } finally {
      setAddLoading(false);
    }
  };

  const updateStatut = async (clientId: string, statut: ClientStatut) => {
    try {
      await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, statut }),
      });
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, statut } : c))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const generateEmail = async () => {
    if (!selectedClient) return;
    setEmailLoading(true);
    setGeneratedEmail(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: emailType,
          clientId: selectedClient.id,
          clientName: `${selectedClient.prenom} ${selectedClient.nom}`,
          clientEmail: selectedClient.email,
          programmeNom: selectedClient.projet || "",
        }),
      });
      const data = await res.json();
      if (data.success) setGeneratedEmail(data.emailContent);
    } catch (e) {
      console.error(e);
    } finally {
      setEmailLoading(false);
    }
  };

  const copyEmail = () => {
    if (!generatedEmail) return;
    navigator.clipboard.writeText(
      `Objet: ${generatedEmail.subject}\n\n${generatedEmail.body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CRM Clients</h1>
              <p className="text-xs text-slate-400">VEFA Vision — Module 3</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Retour
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau client
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(["prospect", "contacté", "réservé", "signé"] as ClientStatut[]).map((s) => (
            <div key={s} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {clients.filter((c) => c.statut === s).length}
              </div>
              <div className={`text-xs mt-1 capitalize px-2 py-0.5 rounded-full inline-block ${STATUT_COLORS[s]}`}>
                {s}
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Client list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">Aucun client pour le moment</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            >
              Ajouter votre premier client →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-semibold text-sm flex-shrink-0">
                  {(client.prenom?.[0] || client.nom[0]).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {client.prenom} {client.nom}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLORS[client.statut]}`}>
                      {client.statut}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </span>
                    {client.telephone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.telephone}
                      </span>
                    )}
                    {client.projet && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {client.projet}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={client.statut}
                    onChange={(e) =>
                      updateStatut(client.id, e.target.value as ClientStatut)
                    }
                    className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.keys(STATUT_COLORS).map((s) => (
                      <option key={s} value={s} className="bg-slate-800">
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setSelectedClient(client);
                      setShowEmailModal(true);
                      setGeneratedEmail(null);
                    }}
                    className="flex items-center gap-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Email IA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Nouveau client</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={newClient.prenom}
                  onChange={(e) => setNewClient((p) => ({ ...p, prenom: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  value={newClient.nom}
                  onChange={(e) => setNewClient((p) => ({ ...p, nom: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <input
                type="email"
                placeholder="Email *"
                value={newClient.email}
                onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={newClient.telephone}
                onChange={(e) => setNewClient((p) => ({ ...p, telephone: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="text"
                placeholder="Programme / projet d'intérêt"
                value={newClient.projet}
                onChange={(e) => setNewClient((p) => ({ ...p, projet: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <textarea
                placeholder="Notes"
                value={newClient.notes}
                onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
              />
            </div>

            {addError && (
              <p className="text-sm text-red-400 mt-3">{addError}</p>
            )}

            <button
              onClick={addClient}
              disabled={addLoading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Ajouter le client
            </button>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-lg">Email IA</h2>
                <p className="text-xs text-slate-400">
                  Pour {selectedClient.prenom} {selectedClient.nom}
                </p>
              </div>
              <button onClick={() => setShowEmailModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {EMAIL_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEmailType(t.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    emailType === t.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={generateEmail}
              disabled={emailLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mb-4"
            >
              {emailLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Génération...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Générer l'email</>
              )}
            </button>

            {generatedEmail && (
              <div className="space-y-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Objet :</p>
                  <p className="text-sm font-medium">{generatedEmail.subject}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-1">Corps :</p>
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedEmail.body}
                  </pre>
                </div>
                <button
                  onClick={copyEmail}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4" />Copié !</>
                  ) : (
                    <><FileText className="w-4 h-4" />Copier l'email</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

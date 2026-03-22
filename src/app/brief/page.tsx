"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Download,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

type BriefType = "commercial" | "investisseur" | "presentation";

const BRIEF_TYPES: { id: BriefType; label: string; description: string }[] = [
  {
    id: "commercial",
    label: "Brief commercial",
    description: "Pour les équipes de vente — arguments, objections, profil acheteur",
  },
  {
    id: "investisseur",
    label: "Fiche investisseur",
    description: "Rendement, fiscalité, analyse marché — pour les investisseurs",
  },
  {
    id: "presentation",
    label: "Contenu plaquette",
    description: "Textes marketing prêts à intégrer dans une plaquette commerciale",
  },
];

export default function BriefPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [briefType, setBriefType] = useState<BriefType>("commercial");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const generateBrief = async () => {
    if (files.length === 0) {
      setError("Ajoutez au moins un fichier PDF");
      return;
    }
    setLoading(true);
    setError(null);
    setBrief(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("clientName", clientName);
      formData.append("projectName", projectName);
      formData.append("briefType", briefType);

      const res = await fetch("/api/brief", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la génération");
      }

      setBrief(data.brief);
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!brief) return;
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBrief = () => {
    if (!brief) return;
    const blob = new Blob([brief], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brief_${projectName || "programme"}_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Générateur de Briefs</h1>
              <p className="text-xs text-slate-400">VEFA Vision — Module 2</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Retour
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Configuration */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Importer des documents</h2>
            <p className="text-sm text-slate-400">
              Plans, plaquettes commerciales, notices descriptives — tout PDF utile
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-300">
              Glissez vos PDFs ici ou{" "}
              <span className="text-emerald-400 font-medium">cliquez pour parcourir</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Plans VEFA, plaquettes, notices...</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5"
                >
                  <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} Ko
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Project info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                Nom du client
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Dupont Immobilier"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                Nom du projet
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Résidence Les Acacias"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Brief type */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
              Type de brief
            </label>
            <div className="space-y-2">
              {BRIEF_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setBriefType(type.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    briefType === type.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generateBrief}
            disabled={loading || files.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer le brief
              </>
            )}
          </button>
        </div>

        {/* Right: Brief output */}
        <div className="space-y-4">
          {brief ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold">Brief généré</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadBrief}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-h-[70vh] overflow-y-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed text-sm">
                    {brief}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">
                  Importez vos PDFs et cliquez sur Générer
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  Le brief apparaîtra ici
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

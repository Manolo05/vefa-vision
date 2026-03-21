"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Sparkles, Download, RotateCcw, Building2, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, FileText, X } from "lucide-react";

type Step = "upload" | "uploading" | "uploaded" | "decorating" | "done" | "error";
type Style = "moderne" | "luxe" | "scandinave" | "minimaliste";

const STYLES: { id: Style; label: string; icon: string; desc: string }[] = [
  { id: "moderne", label: "Moderne", icon: "◼", desc: "Lignes épurées, tons neutres, accents design" },
  { id: "luxe", label: "Luxe", icon: "✦", desc: "Marbre, velours, dorures, cristal" },
  { id: "scandinave", label: "Scandinave", icon: "△", desc: "Bois clair, blanc, chaleureux" },
  { id: "minimaliste", label: "Minimaliste", icon: "○", desc: "Épuré, espace, lumière" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [style, setStyle] = useState<Style>("moderne");
  const [planUrl, setPlanUrl] = useState<string>("");
  const [decoratedUrl, setDecoratedUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(""); setFileName(file.name); setStep("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      setPlanUrl(data.imageUrl); setStep("uploaded");
    } catch (err: any) { setError(err.message || "Erreur lors de l'upload"); setStep("error"); }
  }, []);

  const handleDecorate = useCallback(async () => {
    if (!planUrl) return;
    setError(""); setStep("decorating");
    try {
      const res = await fetch("/api/decorate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: planUrl, style }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur génération");
      setDecoratedUrl(data.decoratedImageUrl); setDescription(data.planDescription); setStep("done");
    } catch (err: any) { setError(err.message || "Erreur lors de la génération"); setStep("error"); }
  }, [planUrl, style]);

  const reset = () => { setStep("upload"); setPlanUrl(""); setDecoratedUrl(""); setDescription(""); setError(""); setFileName(""); };

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }, [handleFile]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
            <Building2 size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">VEFA Vision</h1>
            <p className="text-xs text-zinc-500">Home Staging IA</p>
          </div>
        </div>
        {step !== "upload" && (
          <button onClick={reset} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
            <RotateCcw size={14} /> Nouveau plan
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {step === "upload" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Transformez votre plan en visuel décoré</h2>
                <p className="text-zinc-400">Uploadez un plan PDF ou image — l'IA fait le reste</p>
              </div>
              <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${dragOver ? "dropzone-active" : "border-zinc-700 hover:border-zinc-500"}`}>
                <Upload size={48} className={`mx-auto mb-4 ${dragOver ? "text-gold" : "text-zinc-500"}`} />
                <p className="text-lg font-medium mb-2">Glissez-déposez votre plan ici</p>
                <p className="text-sm text-zinc-500 mb-4">ou cliquez pour sélectionner un fichier</p>
                <div className="flex gap-2 justify-center">
                  {["PDF","PNG","JPG"].map(f => <span key={f} className="px-3 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400">{f}</span>)}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
              </div>
            </div>
          )}

          {step === "uploading" && (
            <div className="animate-fadeIn text-center py-20">
              <Loader2 size={48} className="mx-auto mb-4 text-gold animate-spin" />
              <p className="text-lg font-medium">Upload en cours...</p>
              <p className="text-sm text-zinc-500 mt-1">{fileName}</p>
            </div>
          )}

          {step === "uploaded" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm mb-3">
                  <CheckCircle2 size={14} /> Plan uploadé
                </div>
                <h2 className="text-2xl font-bold mb-2">Choisissez le style de décoration</h2>
              </div>
              {planUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  <img src={planUrl} alt="Plan uploadé" className="w-full max-h-64 object-contain bg-white" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 ${style === s.id ? "border-gold bg-gold/5" : "border-zinc-800 hover:border-zinc-600 bg-zinc-900"}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl">{s.icon}</span>
                      <span className={`font-semibold ${style === s.id ? "text-gold" : "text-white"}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{s.desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={handleDecorate} className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition">
                <Sparkles size={20} /> Générer la décoration IA
              </button>
            </div>
          )}

          {step === "decorating" && (
            <div className="animate-fadeIn text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <Sparkles size={36} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold" />
                <div className="absolute inset-0 border-2 border-zinc-700 border-t-gold rounded-full animate-spin" />
              </div>
              <p className="text-xl font-semibold mb-2">Génération en cours...</p>
              <p className="text-sm text-zinc-500 mb-6">L'IA analyse votre plan et crée le rendu décoré</p>
              <div className="max-w-xs mx-auto text-left space-y-3">
                {[{label:"Analyse du plan",done:true},{label:"Détection des pièces",done:true},{label:"Application du style",active:true},{label:"Rendu HD final",done:false}].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {item.done ? <CheckCircle2 size={16} className="text-emerald-400" /> : item.active ? <Loader2 size={16} className="text-gold animate-spin" /> : <div className="w-4 h-4 rounded-full border border-zinc-700" />}
                    <span className={item.done ? "text-emerald-400" : item.active ? "text-gold" : "text-zinc-600"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm mb-3">
                  <CheckCircle2 size={14} /> Décoration générée
                </div>
                <h2 className="text-2xl font-bold">Votre bien décoré</h2>
                {description && <p className="text-sm text-zinc-400 mt-2 max-w-lg mx-auto">{description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><FileText size={12} /> Plan original</p>
                  <div className="rounded-xl overflow-hidden border border-zinc-800">
                    <img src={planUrl} alt="Plan original" className="w-full aspect-video object-contain bg-white" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><ImageIcon size={12} /> Rendu décoré — <span className="text-gold capitalize">{style}</span></p>
                  <div className="rounded-xl overflow-hidden border border-gold/30">
                    <img src={decoratedUrl} alt="Rendu décoré" className="w-full aspect-video object-cover" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <a href={decoratedUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition">
                  <Download size={18} /> Télécharger HD
                </a>
                <button onClick={() => setStep("uploaded")} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium flex items-center justify-center gap-2 hover:border-zinc-500 transition">
                  <Sparkles size={18} /> Changer de style
                </button>
              </div>
              <div className="mt-4 flex gap-2 justify-center">
                {STYLES.filter((s) => s.id !== style).map((s) => (
                  <button key={s.id} onClick={() => { setStyle(s.id); setStep("uploaded"); }} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white transition">
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="animate-fadeIn text-center py-16">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
              <p className="text-lg font-semibold text-red-400 mb-2">Erreur</p>
              <p className="text-sm text-zinc-400 mb-6">{error}</p>
              <button onClick={reset} className="px-6 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition">
                <RotateCcw size={16} className="inline mr-2" /> Réessayer
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-600">
        VEFA Vision v1.0 — Powered by OpenAI
      </footer>
    </div>
  );
}

"use client";
import { useState, useCallback, useRef } from "react";
import { Upload, Sparkles, Download, RotateCcw, Building2, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";

type Step = "upload" | "uploading" | "uploaded" | "analyzing" | "generating" | "done" | "error";
type Style = "moderne" | "luxe" | "scandinave" | "minimaliste";

interface RoomImage {
  roomName: string;
  roomType: string;
  roomDescription: string;
  imageUrl: string | null;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
}

const STYLES: { id: Style; label: string; icon: string; desc: string }[] = [
  { id: "moderne", label: "Moderne", icon: "◼", desc: "Lignes épurées, tons neutres, accents design" },
  { id: "luxe", label: "Luxe", icon: "✦", desc: "Marbre, velours, dorures, cristal" },
  { id: "scandinave", label: "Scandinave", icon: "△", desc: "Bois clair, blanc, chaleureux" },
  { id: "minimaliste", label: "Minimaliste", icon: "○", desc: "Épuré, espace, lumière" },
];

const ROOM_ICONS: Record<string, string> = {
  salon: "🛋️", cuisine: "🍳", chambre: "🛏️",
  salle_de_bain: "🚿", bureau: "💻", entree: "🚪", autre: "🏠",
};

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [style, setStyle] = useState<Style>("moderne");
  const [planUrl, setPlanUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [roomImages, setRoomImages] = useState<RoomImage[]>([]);
  const [totalDescription, setTotalDescription] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(""); setFileName(file.name); setStep("uploading");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      setPlanUrl(data.imageUrl); setStep("uploaded");
    } catch (err: any) { setError(err.message); setStep("error"); }
  }, []);

  const handleDecorate = useCallback(async () => {
    if (!planUrl) return;
    setError(""); setStep("analyzing");
    try {
      // 1. Analyze plan → get rooms list
      const analyzeRes = await fetch("/api/decorate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", imageUrl: planUrl }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Erreur analyse");

      const rooms = analyzeData.rooms || [];
      if (rooms.length === 0) throw new Error("Aucune pièce détectée dans ce plan.");
      setTotalDescription(analyzeData.totalDescription || "");

      // 2. Init grid with pending state
      const initial: RoomImage[] = rooms.map((r: any) => ({
        roomName: r.name, roomType: r.type, roomDescription: r.description,
        imageUrl: null, status: "pending",
      }));
      setRoomImages(initial);
      setStep("generating");

      // 3. Generate each room sequentially
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        setRoomImages(prev => prev.map((ri, idx) =>
          idx === i ? { ...ri, status: "generating" } : ri
        ));
        try {
          const genRes = await fetch("/api/decorate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "generate", style,
              roomName: room.name, roomType: room.type, roomDescription: room.description,
            }),
          });
          const genData = await genRes.json();
          if (!genRes.ok) throw new Error(genData.error || "Erreur génération");
          setRoomImages(prev => prev.map((ri, idx) =>
            idx === i ? { ...ri, imageUrl: genData.imageUrl, status: "done" } : ri
          ));
        } catch (roomErr: any) {
          setRoomImages(prev => prev.map((ri, idx) =>
            idx === i ? { ...ri, status: "error", error: roomErr.message } : ri
          ));
        }
        if (i < rooms.length - 1) await new Promise(r => setTimeout(r, 500));
      }
      setStep("done");
    } catch (err: any) { setError(err.message); setStep("error"); }
  }, [planUrl, style]);

  const reset = () => {
    setStep("upload"); setPlanUrl(""); setFileName("");
    setRoomImages([]); setTotalDescription(""); setError("");
  };

  const doneCount = roomImages.filter(r => r.status === "done").length;
  const totalCount = roomImages.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
        <div className="w-full max-w-4xl">

          {/* UPLOAD */}
          {step === "upload" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Décorez chaque pièce de votre appartement</h2>
                <p className="text-zinc-400">L'IA détecte toutes les pièces et génère un rendu décoré pour chacune</p>
              </div>
              <div
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${dragOver ? "dropzone-active" : "border-zinc-700 hover:border-zinc-500"}`}>
                <Upload size={48} className={`mx-auto mb-4 ${dragOver ? "text-gold" : "text-zinc-500"}`} />
                <p className="text-lg font-medium mb-2">Glissez-déposez votre plan ici</p>
                <p className="text-sm text-zinc-500 mb-4">ou cliquez pour sélectionner un fichier</p>
                <div className="flex gap-2 justify-center">
                  {["PDF","PNG","JPG"].map(f => <span key={f} className="px-3 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400">{f}</span>)}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>
          )}

          {/* UPLOADING */}
          {step === "uploading" && (
            <div className="animate-fadeIn text-center py-20">
              <Loader2 size={48} className="mx-auto mb-4 text-gold animate-spin" />
              <p className="text-lg font-medium">Upload en cours...</p>
              <p className="text-sm text-zinc-500 mt-1">{fileName}</p>
            </div>
          )}

          {/* UPLOADED - style selection */}
          {step === "uploaded" && (
            <div className="animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm mb-3">
                  <CheckCircle2 size={14} /> Plan uploadé
                </div>
                <h2 className="text-2xl font-bold mb-1">Choisissez le style</h2>
                <p className="text-zinc-400 text-sm">L'IA va identifier et décorer chaque pièce individuellement</p>
              </div>
              {planUrl && (
                <div className="mb-5 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  <img src={planUrl} alt="Plan" className="w-full max-h-52 object-contain bg-white" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-5">
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
              <button onClick={handleDecorate}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition">
                <Sparkles size={20} /> Analyser et décorer chaque pièce
              </button>
            </div>
          )}

          {/* ANALYZING */}
          {step === "analyzing" && (
            <div className="animate-fadeIn text-center py-20">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <Sparkles size={36} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold" />
                <div className="absolute inset-0 border-2 border-zinc-700 border-t-gold rounded-full animate-spin" />
              </div>
              <p className="text-xl font-semibold mb-2">Analyse du plan...</p>
              <p className="text-sm text-zinc-500">L'IA identifie les pièces de votre appartement</p>
            </div>
          )}

          {/* GENERATING / DONE - progressive room grid */}
          {(step === "generating" || step === "done") && (
            <div className="animate-fadeIn">
              <div className="text-center mb-5">
                {step === "generating" ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-sm mb-3">
                    <Loader2 size={14} className="animate-spin" />
                    Génération en cours... {doneCount}/{totalCount} pièces
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm mb-3">
                    <CheckCircle2 size={14} /> {totalCount} pièces décorées !
                  </div>
                )}
                <h2 className="text-2xl font-bold">
                  {step === "generating" ? "Décoration en cours..." : "Votre appartement décoré"}
                </h2>
                {totalDescription && <p className="text-sm text-zinc-400 mt-1 max-w-xl mx-auto">{totalDescription}</p>}
              </div>

              {/* Plan + style bar */}
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <img src={planUrl} alt="Plan" className="w-16 h-12 object-contain bg-white rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 truncate">{fileName}</p>
                  <p className="text-xs text-zinc-500">Plan d'origine</p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-gold/10 text-gold text-sm font-medium capitalize flex-shrink-0">{style}</span>
              </div>

              {/* Rooms grid */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {roomImages.map((room, i) => (
                  <div key={i} className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                    room.status === "done" ? "border-gold/30" :
                    room.status === "generating" ? "border-gold/60 shadow-lg shadow-gold/10" :
                    room.status === "error" ? "border-red-500/30" : "border-zinc-800"
                  }`}>
                    {room.status === "done" && room.imageUrl ? (
                      <div className="relative group">
                        <img src={room.imageUrl} alt={room.roomName} className="w-full aspect-video object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                          <span className="text-base">{ROOM_ICONS[room.roomType] || "🏠"}</span>
                          <span className="text-sm font-semibold text-white drop-shadow">{room.roomName}</span>
                        </div>
                        <a href={room.imageUrl} target="_blank" rel="noopener noreferrer"
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/80">
                          <Download size={14} />
                        </a>
                      </div>
                    ) : room.status === "generating" ? (
                      <div className="aspect-video flex flex-col items-center justify-center bg-zinc-900 gap-2">
                        <Loader2 size={28} className="text-gold animate-spin" />
                        <p className="text-sm font-medium text-gold">{ROOM_ICONS[room.roomType] || "🏠"} {room.roomName}</p>
                        <p className="text-xs text-zinc-500">Génération en cours...</p>
                      </div>
                    ) : room.status === "error" ? (
                      <div className="aspect-video flex flex-col items-center justify-center bg-zinc-900 gap-2 p-4">
                        <AlertCircle size={24} className="text-red-400" />
                        <p className="text-sm text-white">{room.roomName}</p>
                        <p className="text-xs text-red-400 text-center">{room.error}</p>
                      </div>
                    ) : (
                      <div className="aspect-video flex flex-col items-center justify-center bg-zinc-900/50 gap-2">
                        <span className="text-2xl opacity-30">{ROOM_ICONS[room.roomType] || "🏠"}</span>
                        <p className="text-sm text-zinc-600">{room.roomName}</p>
                        <p className="text-xs text-zinc-700">En attente...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions when done */}
              {step === "done" && (
                <div className="flex gap-3">
                  <button onClick={() => { setStep("uploaded"); setRoomImages([]); }}
                    className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium flex items-center justify-center gap-2 hover:border-zinc-500 transition">
                    <Sparkles size={18} /> Changer de style
                  </button>
                  <button onClick={reset}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition">
                    <RotateCcw size={18} /> Nouveau plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ERROR */}
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
        VEFA Vision v2.0 — Powered by OpenAI
      </footer>
    </div>
  );
          }

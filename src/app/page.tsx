"use client";
import { useState, useCallback, useRef } from "react";
import { Upload, Sparkles, Download, RotateCcw, Building2, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";

type Step = "upload" | "uploading" | "uploaded" | "analyzing" | "generating" | "done" | "error";
type Style = "moderne" | "luxe" | "scandinave" | "minimaliste";

interface RoomImage {
  roomName: string;
  roomType: string;
  roomDescription: string;
  roomArchitecture?: string;
  imageUrl: string | null;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
}

const STYLES: { id: Style; label: string; icon: string; desc: string }[] = [
  { id: "moderne", label: "Moderne", icon: "■", desc: "Lignes épurées, tons neutres, accents design" },
  { id: "luxe", label: "Luxe", icon: "✦", desc: "Marbre, velours, dorures, cristal" },
  { id: "scandinave", label: "Scandinave", icon: "△", desc: "Bois clair, blanc, chaleureux" },
  { id: "minimaliste", label: "Minimaliste", icon: "○", desc: "Vide élégant, matériaux bruts" },
];

const ROOM_ICONS: Record<string, string> = {
  salon: "🛋️", cuisine: "🍳", chambre: "🛏️", salle_de_bain: "🚿",
  bureau: "💼", entree: "🚪", dressing: "👗", wc: "🚽",
  cellier: "📦", terrasse: "🌿", autre: "🏠",
};

async function loadPdfJs(): Promise<any> {
  if (typeof (window as any).pdfjsLib !== "undefined") {
    return (window as any).pdfjsLib;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger PDF.js"));
    document.head.appendChild(script);
  });
  const lib = (window as any).pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return lib;
}

async function pdfToImageFile(file: File): Promise<File> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const scale = 2.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Conversion PDF échouée"));
      resolve(new File([blob], file.name.replace(/\.pdf$/i, ".png"), { type: "image/png" }));
    }, "image/png");
  });
}

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [planUrl, setPlanUrl] = useState<string>("");
  const [style, setStyle] = useState<Style>("moderne");
  const [roomImages, setRoomImages] = useState<RoomImage[]>([]);
  const [error, setError] = useState<string>("");
  const [totalDescription, setTotalDescription] = useState<string>("");
  const [uploadLabel, setUploadLabel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setPlanUrl("");
    setRoomImages([]);
    setError("");
    setTotalDescription("");
    setUploadLabel("");
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep("uploading");
    setError("");
    try {
      let imageFile = file;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setUploadLabel("Conversion PDF en image...");
        imageFile = await pdfToImageFile(file);
      }
      setUploadLabel("Chargement du plan...");
      const formData = new FormData();
      formData.append("file", imageFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) throw new Error(data.error || "Erreur upload");
      setPlanUrl(data.imageUrl);
      setStep("uploaded");
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement");
      setStep("error");
    }
  }, []);

  const handleDecorate = useCallback(async () => {
    setStep("analyzing");
    setError("");
    setRoomImages([]);
    try {
      const analyzeRes = await fetch("/api/decorate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", imageUrl: planUrl }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Erreur analyse");
      const rooms: { name: string; type: string; description: string; architecture?: string }[] = analyzeData.rooms || [];
      if (rooms.length === 0) throw new Error("Aucune pièce détectée dans ce plan");
      setTotalDescription(analyzeData.totalDescription || "");
      setRoomImages(rooms.map((r) => ({
        roomName: r.name,
        roomType: r.type,
        roomDescription: r.description,
        roomArchitecture: r.architecture,
        imageUrl: null,
        status: "pending",
      })));
      setStep("generating");
      for (let i = 0; i < rooms.length; i++) {
        setRoomImages((prev) =>
          prev.map((ri, idx) => (idx === i ? { ...ri, status: "generating" } : ri))
        );
        try {
          const genRes = await fetch("/api/decorate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "generate",
              style,
              roomName: rooms[i].name,
              roomType: rooms[i].type,
              roomDescription: rooms[i].description,
              roomArchitecture: rooms[i].architecture,
            }),
          });
          const genData = await genRes.json();
          if (!genRes.ok) throw new Error(genData.error || "Erreur génération");
          setRoomImages((prev) =>
            prev.map((ri, idx) =>
              idx === i ? { ...ri, imageUrl: genData.imageUrl, status: "done" } : ri
            )
          );
        } catch (genErr: any) {
          setRoomImages((prev) =>
            prev.map((ri, idx) =>
              idx === i ? { ...ri, status: "error", error: genErr.message } : ri
            )
          );
        }
        if (i < rooms.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
      setStep("error");
    }
  }, [planUrl, style]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={28} className="text-[#C9A96E]" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">VEFA Vision</h1>
            <p className="text-xs text-zinc-500">Home Staging IA — par pièce</p>
          </div>
        </div>
        {(step === "uploaded" || step === "generating" || step === "done") && (
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all">
            <RotateCcw size={14} /> Nouveau plan
          </button>
        )}
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">

        {(step === "upload" || step === "uploading") && (
          <div className="animate-fadeIn">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Visualisez chaque pièce <span className="text-[#C9A96E]">décorée</span></h2>
              <p className="text-zinc-400 text-lg">Importez votre plan VEFA — chaque pièce est analysée et décorée fidèlement à son architecture</p>
            </div>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-zinc-700 hover:border-[#C9A96E] rounded-2xl p-16 text-center cursor-pointer transition-all group">
              {step === "uploading" ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 size={48} className="text-[#C9A96E] animate-spin" />
                  <p className="text-zinc-300">{uploadLabel || "Chargement..."}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload size={48} className="text-zinc-600 group-hover:text-[#C9A96E] transition-colors" />
                  <div>
                    <p className="text-xl font-semibold mb-1">Déposez votre plan ici</p>
                    <p className="text-zinc-500">PNG, JPG, WEBP ou <span className="text-[#C9A96E] font-medium">PDF</span></p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" onChange={handleFileChange} className="hidden" />
            </div>
          </div>
        )}

        {step === "uploaded" && (
          <div className="animate-fadeIn">
            <div className="mb-8 flex items-center gap-4">
              <div className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-700 flex-shrink-0">
                <img src={planUrl} alt="Plan" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span className="text-green-400 font-medium">Plan chargé</span>
                </div>
                <p className="text-zinc-400 text-sm">L IA va analyser chaque pièce et générer une image fidèle à son architecture réelle</p>
              </div>
            </div>
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">Style de décoration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)} className={`p-4 rounded-xl border text-left transition-all ${style === s.id ? "border-[#C9A96E] bg-[#C9A96E]/10" : "border-zinc-700 hover:border-zinc-500"}`}>
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-zinc-500 text-xs mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleDecorate} className="w-full py-4 bg-[#C9A96E] hover:bg-[#b8935a] text-zinc-950 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3">
              <Sparkles size={22} /> Analyser et décorer chaque pièce
            </button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="animate-fadeIn text-center py-16">
            <Loader2 size={56} className="text-[#C9A96E] animate-spin mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-3">Analyse architecturale en cours…</h3>
            <p className="text-zinc-400">GPT-4o identifie chaque pièce, ses dimensions, ses fenêtres et sa structure réelle</p>
          </div>
        )}

        {(step === "generating" || step === "done") && (
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">{step === "done" ? "Toutes les pièces générées ✓" : "Génération en cours…"}</h3>
                {totalDescription && (
                  <p className="text-zinc-400 text-sm mt-1 flex items-center gap-2"><FileText size={14} /> {totalDescription}</p>
                )}
              </div>
              {step === "done" && (
                <button onClick={() => setStep("uploaded")} className="px-4 py-2 text-sm border border-zinc-600 hover:border-[#C9A96E] rounded-lg transition-all flex items-center gap-2">
                  <Sparkles size={14} className="text-[#C9A96E]" /> Changer de style
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {roomImages.map((room, idx) => (
                <div key={idx} className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  <div className="relative aspect-video bg-zinc-800">
                    {room.status === "done" && room.imageUrl ? (
                      <div className="relative group w-full h-full">
                        <img src={room.imageUrl} alt={room.roomName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                          <a href={room.imageUrl} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all"><Download size={16} /></a>
                        </div>
                      </div>
                    ) : room.status === "generating" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 size={32} className="text-[#C9A96E] animate-spin" />
                        <p className="text-sm text-zinc-400">Génération en cours…</p>
                      </div>
                    ) : room.status === "error" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                        <AlertCircle size={28} className="text-red-400" />
                        <p className="text-xs text-red-400 text-center">{room.error || "Erreur"}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        <div className="text-3xl opacity-30">{ROOM_ICONS[room.roomType] || "🏠"}</div>
                        <p className="text-xs text-zinc-600">En attente…</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{ROOM_ICONS[room.roomType] || "🏠"}</span>
                      <span className="font-semibold text-sm">{room.roomName}</span>
                      {room.status === "done" && <CheckCircle2 size={14} className="text-green-400 ml-auto" />}
                      {room.status === "generating" && <Loader2 size={14} className="text-[#C9A96E] animate-spin ml-auto" />}
                      {room.status === "error" && <AlertCircle size={14} className="text-red-400 ml-auto" />}
                    </div>
                    {room.roomArchitecture && (
                      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{room.roomArchitecture}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="animate-fadeIn text-center py-16">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
            <p className="text-lg font-semibold text-red-400 mb-2">Erreur</p>
            <p className="text-sm text-zinc-400 mb-6">{error}</p>
            <button onClick={reset} className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-medium transition-all">
              <RotateCcw size={16} className="inline mr-2" /> Réessayer
            </button>
          </div>
        )}

      </main>

      <footer className="border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-600">
        VEFA Vision v2.0 — Powered by OpenAI
      </footer>
    </div>
  );
}


"use client";
import { useState, useRef, useCallback } from "react";
import { FileText, Upload, Download, Loader2, X, CheckCircle2, AlertCircle, Scissors, Layers, Minimize2, RotateCw, PenLine, Stamp, Info } from "lucide-react";
import Link from "next/link";

type Action = "merge" | "split" | "compress" | "rotate" | "watermark" | "annotate" | "sign" | "info";
const TOOLS = [
  { id: "merge" as Action, label: "Fusionner", desc: "Combiner plusieurs PDFs", icon: <Layers className="w-5 h-5"/>, color: "blue", multiple: true },
  { id: "split" as Action, label: "Diviser", desc: "Extraire des pages", icon: <Scissors className="w-5 h-5"/>, color: "purple", multiple: false },
  { id: "compress" as Action, label: "Compresser", desc: "Reduire la taille", icon: <Minimize2 className="w-5 h-5"/>, color: "emerald", multiple: false },
  { id: "rotate" as Action, label: "Pivoter", desc: "Rotation des pages", icon: <RotateCw className="w-5 h-5"/>, color: "orange", multiple: false },
  { id: "watermark" as Action, label: "Filigrane", desc: "Ajouter un tampon", icon: <Stamp className="w-5 h-5"/>, color: "pink", multiple: false },
  { id: "annotate" as Action, label: "Annoter", desc: "Ajouter des notes", icon: <PenLine className="w-5 h-5"/>, color: "yellow", multiple: false },
  { id: "sign" as Action, label: "Signer", desc: "Apposer une signature", icon: <PenLine className="w-5 h-5"/>, color: "teal", multiple: false },
  { id: "info" as Action, label: "Infos", desc: "Metadonnees PDF", icon: <Info className="w-5 h-5"/>, color: "slate", multiple: false },
];
const CB: Record<string, string> = { blue:"border-blue-500 bg-blue-500/10 text-blue-400", purple:"border-purple-500 bg-purple-500/10 text-purple-400", emerald:"border-emerald-500 bg-emerald-500/10 text-emerald-400", orange:"border-orange-500 bg-orange-500/10 text-orange-400", pink:"border-pink-500 bg-pink-500/10 text-pink-400", yellow:"border-yellow-500 bg-yellow-500/10 text-yellow-400", teal:"border-teal-500 bg-teal-500/10 text-teal-400", slate:"border-slate-500 bg-slate-500/10 text-slate-400" };
const BTN: Record<string, string> = { blue:"bg-blue-600 hover:bg-blue-500", purple:"bg-purple-600 hover:bg-purple-500", emerald:"bg-emerald-600 hover:bg-emerald-500", orange:"bg-orange-600 hover:bg-orange-500", pink:"bg-pink-600 hover:bg-pink-500", yellow:"bg-yellow-600 hover:bg-yellow-500", teal:"bg-teal-600 hover:bg-teal-500", slate:"bg-slate-600 hover:bg-slate-500" };

export default function PdfToolsPage() {
  const [activeTool, setActiveTool] = useState<Action>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [splitRange, setSplitRange] = useState("");
  const [rotateAngle, setRotateAngle] = useState<90|180|270>(90);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIEL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.15);
  const [annotText, setAnnotText] = useState("");
  const [annotPage, setAnnotPage] = useState(1);
  const [annotColor, setAnnotColor] = useState("yellow");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string|null>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const currentTool = TOOLS.find((t) => t.id === activeTool)!;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (currentTool.multiple) setFiles((p) => [...p, ...dropped]); else setFiles(dropped.slice(0, 1));
  }, [currentTool.multiple]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter((f) => f.type === "application/pdf");
    if (currentTool.multiple) setFiles((p) => [...p, ...selected]); else setFiles(selected.slice(0, 1));
    e.target.value = "";
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = signCanvasRef.current!.getBoundingClientRect();
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !signCanvasRef.current) return;
    const ctx = signCanvasRef.current.getContext("2d")!;
    const rect = signCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(lastPos.x, lastPos.y); ctx.lineTo(x, y); ctx.stroke();
    setLastPos({ x, y });
  };
  const stopDraw = () => {
    setIsDrawing(false);
    if (signCanvasRef.current) setSignatureDataUrl(signCanvasRef.current.toDataURL("image/png"));
  };

  const run = async () => {
    if (files.length === 0 && activeTool !== "info") { setError("Ajoutez au moins un fichier PDF"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const formData = new FormData();
      formData.append("action", activeTool);
      files.forEach((f) => formData.append("files", f));
      if (activeTool === "split" && splitRange) formData.append("range", splitRange);
      if (activeTool === "rotate") formData.append("angle", rotateAngle.toString());
      if (activeTool === "watermark") { formData.append("text", watermarkText); formData.append("opacity", watermarkOpacity.toString()); }
      if (activeTool === "annotate") { formData.append("annotationText", annotText); formData.append("page", annotPage.toString()); formData.append("color", annotColor); }
      if (activeTool === "sign" && signatureDataUrl) formData.append("signatureBase64", signatureDataUrl);
      const res = await fetch("/api/pdf-tools", { method: "POST", body: formData });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Erreur");
        setResult({ success: true, json: data });
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const disposition = res.headers.get("content-disposition") || "";
        const match = disposition.match(/filename="([^"]+)"/);
        const originalSize = parseInt(res.headers.get("x-original-size") || "0");
        const compressedSize = parseInt(res.headers.get("x-compressed-size") || "0");
        setResult({ success: true, downloadUrl: url, fileName: match?.[1] || "result.pdf", originalSize, compressedSize });
      }
    } catch (err: any) { setError(err.message || "Erreur inattendue"); }
    finally { setLoading(false); }
  };

  const fmt = (b: number) => { if (!b) return "—"; if (b < 1024) return b + " o"; if (b < 1048576) return (b/1024).toFixed(1) + " Ko"; return (b/1048576).toFixed(1) + " Mo"; };
  const reset = (t: Action) => { setActiveTool(t); setFiles([]); setResult(null); setError(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><FileText className="w-4 h-4 text-white"/></div>
            <div><h1 className="font-bold text-lg">Outils PDF</h1><p className="text-xs text-slate-400">VEFA Vision — Module 4</p></div>
          </div>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← Retour</Link>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {TOOLS.map((tool) => (
            <button key={tool.id} onClick={() => reset(tool.id)} className={`p-4 rounded-xl border text-left transition-all ${activeTool === tool.id ? `${CB[tool.color]} border-2` : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
              <div className={`mb-2 ${activeTool === tool.id ? "" : "text-slate-400"}`}>{tool.icon}</div>
              <div className="text-sm font-semibold">{tool.label}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">{tool.desc}</div>
            </button>
          ))}
        </div>
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${isDragging ? "border-orange-500 bg-orange-500/10" : "border-white/20 hover:border-orange-500/50 hover:bg-orange-500/5"}`}>
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3"/>
          <p className="text-sm text-slate-300">{currentTool.multiple ? "Glissez plusieurs PDFs ou " : "Glissez un PDF ou "}<span className="text-orange-400 font-medium">cliquez pour parcourir</span></p>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple={currentTool.multiple} className="hidden" onChange={handleFileSelect}/>
        </div>
        {files.length > 0 && (
          <div className="space-y-2 mb-5">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5">
                <FileText className="w-4 h-4 text-orange-400 flex-shrink-0"/>
                <span className="text-sm text-slate-300 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-slate-500">{fmt(file.size)}</span>
                <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        )}
        {activeTool === "split" && (<div className="mb-5"><label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Pages a extraire (ex: 1-3,5,7-9)</label><input type="text" value={splitRange} onChange={(e) => setSplitRange(e.target.value)} placeholder="1-3,5,7-9" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"/></div>)}
        {activeTool === "rotate" && (<div className="mb-5"><label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Angle de rotation</label><div className="flex gap-3">{([90,180,270] as const).map((a) => (<button key={a} onClick={() => setRotateAngle(a)} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${rotateAngle === a ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-white/10 bg-white/5 text-slate-300"}`}>{a}°</button>))}</div></div>)}
        {activeTool === "watermark" && (<div className="mb-5 space-y-3"><div><label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Texte du filigrane</label><input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"/></div><div><label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Opacite ({Math.round(watermarkOpacity*100)}%)</label><input type="range" min="0.05" max="0.5" step="0.05" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="w-full accent-pink-500"/></div></div>)}
        {activeTool === "annotate" && (<div className="mb-5 space-y-3"><div><label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Texte de l'annotation</label><input type="text" value={annotText} onChange={(e) => setAnnotText(e.target.value)} placeholder="A signer avant le 30/04" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"/></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Page</label><input type="number" min="1" value={annotPage} onChange={(e) => setAnnotPage(parseInt(e.target.value)||1)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"/></div><div><label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Couleur</label><div className="flex gap-2 mt-1">{["yellow","red","blue","green"].map((c) => (<button key={c} onClick={() => setAnnotColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${annotColor===c?"border-white scale-110":"border-transparent"}`} style={{backgroundColor:c==="yellow"?"#EAB308":c==="red"?"#EF4444":c==="blue"?"#3B82F6":"#22C55E"}}/>))}</div></div></div></div>)}
        {activeTool === "sign" && (<div className="mb-5"><label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Dessinez votre signature</label><div className="border border-white/20 rounded-xl overflow-hidden bg-white"><canvas ref={signCanvasRef} width={500} height={150} className="w-full cursor-crosshair touch-none" style={{background:"white"}} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}/></div><button onClick={() => { if(signCanvasRef.current){const ctx=signCanvasRef.current.getContext("2d")!;ctx.clearRect(0,0,500,150);setSignatureDataUrl(null);}}} className="mt-2 text-xs text-slate-400 hover:text-white transition-colors">x Effacer</button></div>)}
        {error && (<div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4"><AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0"/><p className="text-sm text-red-300">{error}</p></div>)}
        <button onClick={run} disabled={loading||(files.length===0&&activeTool!=="info")} className={`w-full ${BTN[currentTool.color]} disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all`}>
          {loading ? <><Loader2 className="w-5 h-5 animate-spin"/>Traitement...</> : <>{currentTool.icon}{currentTool.label}</>}
        </button>
        {result?.success && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-5 h-5 text-emerald-400"/><span className="font-semibold">Operation reussie</span></div>
            {result.json && (<div className="space-y-2 text-sm">{result.json.pageCount && <p className="text-slate-300">Pages : <strong>{result.json.pageCount}</strong></p>}{result.json.fileSize && <p className="text-slate-300">Taille : <strong>{fmt(result.json.fileSize)}</strong></p>}{result.json.message && <p className="text-slate-300">{result.json.message}</p>}</div>)}
            {result.originalSize > 0 && result.compressedSize > 0 && (<div className="flex gap-6 text-sm mb-4"><div><p className="text-slate-400 text-xs">Original</p><p className="font-medium">{fmt(result.originalSize)}</p></div><div><p className="text-slate-400 text-xs">Compresse</p><p className="font-medium text-emerald-400">{fmt(result.compressedSize)}</p></div><div><p className="text-slate-400 text-xs">Reduction</p><p className="font-medium text-emerald-400">{Math.round((1-result.compressedSize/result.originalSize)*100)}%</p></div></div>)}
            {result.downloadUrl && (<a href={result.downloadUrl} download={result.fileName} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"><Download className="w-4 h-4"/>Telecharger {result.fileName}</a>)}
          </div>
        )}
      </div>
    </div>
  );
}
